const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupons',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Orders',
    required: true
  },
  discountAmount: {
    type: Number,
    required: true
  },
  orderValue: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

couponUsageSchema.index({ coupon: 1, user: 1, order: 1 }, { unique: true });
couponUsageSchema.index({ coupon: 1 });
couponUsageSchema.index({ user: 1 });

module.exports = mongoose.model('CouponUsage', couponUsageSchema);