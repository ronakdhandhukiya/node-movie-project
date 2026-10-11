
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const BlacklistedToken = require("../models/BlacklistedToken");

async function requireLogin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access token is required"
      });
    }

    const accessToken = authHeader.split(" ")[1];

    const blockedToken = await BlacklistedToken.findOne({token: accessToken});

    if (blockedToken) {
      return res.status(401).json({ message: "This token has been logged out" });
    }

    const tokenData = jwt.verify(accessToken,process.env.JWT_ACCESS_SECRET
    );

    const signedInUser = await User.findById(tokenData.userId);

    if (!signedInUser) {
      return res.status(401).json({
        message: "User account was not found"
      });
    }

    
    if (signedInUser.plan !== "free" && signedInUser.subscriptionExpiresAt &&
      signedInUser.subscriptionExpiresAt <= new Date()
    ) {
      signedInUser.plan = "free";
      signedInUser.subscriptionExpiresAt = null;
      signedInUser.subscriptionCancelled = false;

      await signedInUser.save();
    }

    req.user = signedInUser;
    req.accessToken = accessToken;

    next()
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired Please refresh your session"
      });
    }

    return res.status(401).json({ message: "Invalid access token"});
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access is required"});
  }

  next();
}

module.exports = {requireLogin,requireAdmin};
