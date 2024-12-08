const Razorpay = require("razorpay");

// ~~~ The `Razorpay` module is imported to interact with the Razorpay payment gateway.
// ~~~ Razorpay is a popular payment processing platform that allows businesses to accept payments online.
// ~~~ The module provides methods to create payments, manage orders, handle refunds, and more.

const razorpay = new Razorpay({
  // ~~~ `key_id` is the public API key used to authenticate API requests with Razorpay.
  // ~~~ This key is associated with the merchant's Razorpay account and is required to perform any operations such as creating orders or making payments.
  // ~~~ It is securely stored in the environment variables (`process.env.RAZORPAY_KEY_ID`) to prevent exposing sensitive information in the code.
  key_id: process.env.RAZORPAY_KEY_ID,
  // ~~~ `key_secret` is the private API key used to authenticate API requests along with the `key_id`.
  // ~~~ This key is kept private and should not be exposed to the public. It is used to authorize secure API operations like verifying payments or initiating refunds.
  // ~~~ It is also stored securely in the environment variables (`process.env.RAZORPAY_KEY_SECRET`).
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;
