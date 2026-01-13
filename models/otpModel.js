const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "5m", 
  },
});

const Otp = mongoose.model("Otp", otpSchema);


module.exports = Otp;