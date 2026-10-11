const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const BlacklistedToken = require("../models/BlacklistedToken")
const { requireLogin } = require("../middleware/auth")

const router = express.Router()

function generateToken(user) {
  const tokenInfo = {
    userId: user._id.toString(),
    role: user.role
  }

  return {
    accessToken: jwt.sign(tokenInfo, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" }),
    refreshToken: jwt.sign(tokenInfo, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" })
  }
}


async function blockToken(token, tokenType) {
  const tokenInfo = jwt.decode(token)

  if (!tokenInfo || !tokenInfo.exp) {
    return
  }

  await BlacklistedToken.updateOne({ token },
    {
      $setOnInsert: {
        token, tokenType, expiresAt: new Date(tokenInfo.exp * 1000)
      }
    },
    { upsert: true }
  )
}

// SignUp

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body


    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username email and password are required"});
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be 8 characters"})
    }

    const cleanEmail = String(email).trim().toLowerCase()

    const existingUser = await User.findOne({ email: cleanEmail })

    if (existingUser) {
      return res.status(409).json({ message: "account alreay exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",")
      .map((item) => item.trim().toLowerCase()).filter(Boolean);

   const role = adminEmails.includes(cleanEmail) ? "admin" : "user"

    const newUser = await User.create({
      username: String(username).trim(),
      email: cleanEmail, password: hashedPassword, role
    })

    res.status(201).json({ message: "Account created Successfully", newUser })

  } catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
})

// login

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const existUser = await User.findOne({ email })

    if (!existUser) {
      return res.json({ message: "User does not exist" })
    }

    const comparePassword = await bcrypt.compare(password, existUser.password)

    if (!comparePassword) {
      return res.json({ message: "password is incorrect" })
    }

    if (existUser.plan !== "free" && existUser.subscriptionExpiresAt &&
      existUser.subscriptionExpiresAt <= new Date()
    ) {
      existUser.plan = "free", existUser.subscriptionExpiresAt = null,
        existUser.subscriptionCancelled = false

      await existUser.save()
    }

    res.json({
      message: "Login sucessful", ...generateToken(existUser), user: {
        id: existUser._id,username: existUser.username, email: existUser.email, role: existUser.role,
        plan: existUser.plan
      }
    })
  } catch (error) {
res.json({message : error.message})
  }
})

// logout

router.post("/logout", requireLogin, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await blockToken(req.accessToken, "access");

    if (refreshToken) {
      let refreshInfo;

      try {
        refreshInfo = jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET);
      } catch (error) {
        return res.status(400).json({ message: "Refresh token is invalid or expired" });
      }

      if (refreshInfo.userId !== req.user._id.toString()) {
        return res.json({ message: "Refresh token does not belong to this user" });
      }

      await blockToken(refreshToken, "refresh");
    }

    res.json({message: "Logged out successfully"});
  } catch (error) {
    res.status(500).json({message: "Could not log out"});
  }
});



// refresh access token

router.post("/refresh",async(req,res)=>{
  try {
    const {refreshToken} = req.body

    if (!refreshToken) {
      return res.status(400).json({message: "Refresh token is required"});
    }

     const blockedToken = await BlacklistedToken.findOne({token: refreshToken
    });

    if(blockedToken){
      return res.status(401).json({message : "Refresh token has been revoked"})
    }

    const refreshInfo = jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET
    );

    const foundUser = await User.findById(refreshInfo.userId)

    if(!foundUser){
      return res.status(401).json({message : "User not found"})
    }

    const accessToken = jwt.sign({userId: foundUser._id.toString(),role: foundUser.role},
    process.env.JWT_ACCESS_SECRET,{expiresIn: "15m" }
    )

    res.json({accessToken})
  } catch (error) {
    res.status(401).json({message: "Refresh token is invalid or expired"});
  }
})

module.exports = router