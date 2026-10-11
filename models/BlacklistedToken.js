
const mongoose = require("mongoose");

const blacklistedTokenSchema = new mongoose.Schema(
  {
    token: {type: String,required: true,unique: true},
    tokenType: {type: String,enum: ["access", "refresh"],required: true},
    expiresAt: {type: Date,required: true}
  },
  { timestamps: true }
);

blacklistedTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const BlacklistedToken = mongoose.model("BlacklistedToken",blacklistedTokenSchema);

module.exports = BlacklistedToken