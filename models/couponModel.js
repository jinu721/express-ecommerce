const mongoose = require('mongoose');


// ~~~ Coupon Schema ~~~
// Purpose: Defines the structure for coupon data in the database, used for promotions or discounts.
// Fields:
// - `code`: A unique, trimmed string representing the coupon code (required).
// - `discountType`: Specifies the type of discount ("percentage" or "flat") (required).
// - `discountValue`: The value of the discount (must be a non-negative number, required).
// - `maxDiscount`: The maximum discount value for percentage-based coupons (optional).
// - `minPurchase`: The minimum purchase amount required to use the coupon (default: 0).
// - `startDate`: The date when the coupon becomes active (required).
// - `endDate`: The expiration date of the coupon (required).
// - `usageLimit`: The maximum number of times the coupon can be used (optional).
// - `usedCount`: Tracks how many times the coupon has been used (default: 0).
// - `isActive`: Indicates whether the coupon is currently active (default: true).
// Features:
// - Automatically manages timestamps (`createdAt`, `updatedAt`) using `timestamps: true`.


const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true, 
  },
  discountType: {
    type: String,
    enum: ['percentage', 'flat'], 
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  maxDiscount: {
    type: Number, 
    default: null,
  },
  minPurchase: {
    type: Number, 
    default: 0,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number, 
    default: null,
  },
  usedCount: {
    type: Number, 
    default: 0,
  },
  isActive: {
    type: Boolean, 
    default: true,
  },
}, {
  timestamps: true, 
});

module.exports = mongoose.model('Coupons', couponSchema);
