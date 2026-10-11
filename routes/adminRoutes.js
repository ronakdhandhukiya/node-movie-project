
const express = require("express");
const User = require("../models/User");

const { requireLogin, requireAdmin } = require("../middleware/auth")

const router = express.Router();


router.get("/users", requireLogin, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password")
    res.json({ users });

  } catch (error) {
    res.json({ message: error.message});
  }
});


router.patch("/users/:id/subscription", requireLogin, requireAdmin, async (req, res) => {
    try {

      const { plan } = req.body;

      if (!["free", "premium", "pro"].includes(plan)) {
        return res.status(400).json({message: "Plan must be free, premium, or pro"});
      }

      const changes = {plan,subscriptionExpiresAt:plan === "free"? null: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),subscriptionCancelled: plan === "free" };

      const updatedUser = await User.findByIdAndUpdate(req.params.id, changes,{new: true}).select("-password");

      if (!updatedUser) {return res.status(404).json({message: "User not found"});
      }

      res.json({message: "User subscription updated",user: updatedUser});
    } catch (error) {
      res.status(400).json({message: "Could not update subscription"});
    }
  }
);

module.exports = router;
