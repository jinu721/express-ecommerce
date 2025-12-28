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
    default: null // For percentage coupons
  },
  minOrderValue: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Validity
  startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  
  // Usage limits
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usagePerUser: {
    type: Number,
    default: 1 // How many times one user can use this coupon
  },
  usedCount: {
    type: Number,
    default: 0
  },
  
  // User restrictions
  applicableUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }], // Empty array means all users
  
  // Product/Category restrictions
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Admin details
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiryDate: 1 });
couponSchema.index({ startDate: 1, expiryDate: 1 });

// Validate dates
couponSchema.pre('save', function(next) {
  if (this.startDate >= this.expiryDate) {
    next(new Error('Expiry date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Coupons', couponSchema);
