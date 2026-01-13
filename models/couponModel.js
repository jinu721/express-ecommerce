const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    default: null 
  },
  minOrderValue: {
    type: Number,
    required: true,
    default: 0
  },
  
  startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  
  usageLimit: {
    type: Number,
    default: null
  },
  usagePerUser: {
    type: Number,
    default: 1 
  },
  usedCount: {
    type: Number,
    default: 0
  },
  
  applicableUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }], 
  
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  }
}, {
  timestamps: true
});

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiryDate: 1 });
couponSchema.index({ startDate: 1, expiryDate: 1 });

couponSchema.pre('save', function(next) {
  if (this.startDate >= this.expiryDate) {
    next(new Error('Expiry date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Coupons', couponSchema);
