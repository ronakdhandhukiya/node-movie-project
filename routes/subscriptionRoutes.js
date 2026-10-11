const express = require('express')
const { requireLogin } = require("../middleware/auth")
const router = express.Router()
const paidPlans = ["premium","pro"]
const thirtyDays = 30 * 24 * 60 * 60 * 1000

function subscriptionInfo(user){
  return {
    plan : user.plan,
    active : Boolean(
      user.plan !== "free" && user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt > new Date() && !user.subscriptionCancelled
    ),
    expiresAt : user.subscriptionExpiresAt,
    cancelled : user.subscriptionCancelled
  }

}

router.post("/subscribe",requireLogin,async(req,res)=>{
  try {
    const {plan} = req.body

    if(!paidPlans.includes(plan)){
        return res.status(400).json({message :"choose either premium or pro"})
    }

    req.user.plan = plan
    req.user.subscriptionExpiresAt = new Date(Date.now()+thirtyDays)
    req.user.subscriptionCancelled = false


      await req.user.save()

      res.json({message : `${plan} subscription activated for 30 days`,subscription: subscriptionInfo(req.user)
})

  } catch (error) {
 res.status(500).json({message: "Could not activate subscription"
    })    
  }
})


// check subscription status

router.get("/subscription-status",requireLogin,async(req,res)=>{
res.json({subcription : subscriptionInfo(req.user)})
})


// renew active sub
router.patch("/renew",requireLogin,async(req,res)=>{
  try {
    if(!paidPlans.includes(req.user.plan) || !req.user.subscriptionExpiresAt ||
    req.user.subscriptionExpiresAt <= new Date() ||
      req.user.subscriptionCancelled
  ){
    return res.status(400).json({
      message :"Renewal is only allowed before expiry. Buy a new plan if your subscription has expired."
    })
  }


   req.user.subscriptionExpiresAt = new Date(req.user.subscriptionExpiresAt.getTime() + thirtyDays
    );
 
   await req.user.save()

   res.json({message :"Subscription renewed for 30 days",
     subscription: subscriptionInfo(req.user)
   })


  } catch (error) {
     res.status(500).json({message: "Could not renew subscription"})
  }
})


router.post("/cancel-subscription",requireLogin,async(req,res)=>{
  try {
      req.user.plan = "free";
      req.user.subscriptionExpiresAt = null;
      req.user.subscriptionCancelled = true

      await req.user.save()

       res.json({message: "Subscription cancelled, Free access is now active"})

  } catch (error) {
    res.status(500).json({message: "Could not cancel subscription"})
  }
})


module.exports = router