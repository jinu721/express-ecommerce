const mongoose = require("mongoose");


// ~~~ OTP Schema ~~~
// Purpose: Defines the structure for storing OTP (One-Time Password) data in the database.
// Features:
// - Tracks the OTP sent to the user's email.
// - Automatically deletes the record after 5 minutes using MongoDB's TTL (Time-to-Live) index.


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