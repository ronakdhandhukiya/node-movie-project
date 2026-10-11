
const express = require("express");
const Content = require("../models/Content");

const {requireLogin,requireAdmin} = require("../middleware/auth");

const router = express.Router();

router.get("/free", async (req, res) => {
  try {
    const freeContent = await Content.find({category: "free"}).sort({ createdAt: -1 });

    res.json({ content: freeContent });
  } catch (error) {
    res.status(500).json({ message: "Could not load free content" });
  }
});

router.get("/premium", requireLogin, async (req, res) => {
  if (!["premium", "pro"].includes(req.user.plan)) {

    return res.status(403).json({message: "A premium or pro subscription is required"
    });
  }

  try {
    const premiumContent = await Content.find({category: "premium"}).sort({ createdAt: -1 });

    res.json({ content: premiumContent });
  } catch (error) {
    res.status(500).json({message: "Could not load premium content"});
  }


})

// create content

router.post("/", requireLogin, requireAdmin, async (req, res) => {
  try {
    const { title, description, category, price } = req.body;

    if (!title ||!description ||!["free", "premium"].includes(category)) {
      return res.status(400).json({message:"Title description and a valid free/premium category are required"});
    }

    const newContent = await Content.create({title, description, category, price: price === undefined ? 0 : price  });

    res.status(201).json({message: "Content created successfully", content: newContent });

  } catch (error) {

    res.status(400).json({ message: "Could not create content Check the supplied fields"
    })
  }
})

// UPDATE CONTENT 

router.patch("/:id", requireLogin, requireAdmin, async (req, res) => {
  try {
    const allowedChanges = {};
    const {id} = req.params
    for (const field of ["title", "description", "category", "price"]) {

      if (req.body[field] !== undefined) {
        allowedChanges[field] = req.body[field];
      }

    }


    const updatedContent = await Content.findByIdAndUpdate(id,allowedChanges,{new: true});

    if (!updatedContent) {
      return res.status(404).json({message: "Content not found"
      });
    }

    res.json({message: "Content updated successfully",content: updatedContent
    })
  } catch (error) {
    res.status(400).json({
      message: "Could not update content"
    });
  }
});

// DELETE CONTENT 
router.delete("/:id", requireLogin, requireAdmin, async (req, res) => {
  try {

    const {id} = req.params

    const removedContent = await Content.findByIdAndDelete(id);

    if (!removedContent) {
      return res.status(404).json({message: "Content not found"});
    }

    res.json({message: "Content deleted successfully"});
  } catch (error) {
    res.status(400).json({message: "Could not delete content"
    });
  }
});

router.post("/:id/purchase-quote",requireLogin,async (req, res) => {
    try {
      const {id} = req.params
      const selectedContent = await Content.findById(id);

      if (!selectedContent) {
        return res.status(404).json({message: "Content not found"});
      }

      if (selectedContent.category === "premium" &&!["premium", "pro"].includes(req.user.plan) ) {
        return res.status(403).json({
          message: "Subscribe to premium or pro to purchase this content"
        });
      }

      const discountRate = req.user.plan === "pro" ? 0.20 : 0;
      const discountAmount = Number((selectedContent.price * discountRate).toFixed(2));

      const finalPrice = Number((selectedContent.price - discountAmount).toFixed(2));

      res.json({message: "Purchase quote calculated. No payment has been processed.",
        originalPrice: selectedContent.price, discountPercent: discountRate * 100,discountAmount,finalPrice})
        
    } catch (error) {
      res.status(400).json({ message: "Could not calculate purchase quote"});
    }
  }
);

module.exports = router;
