const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  offerType: {
    type: String,
    enum: ['PRODUCT', 'CATEGORY', 'FESTIVAL', 'BRAND'],
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
    default: null // For percentage discounts, cap the max discount
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  
  // Applicability
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  applicableBrands: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand'
  }],
  
  // Festival specific
  festivalName: {
    type: String,
    enum: ['DIWALI', 'ONAM', 'CHRISTMAS', 'NEW_YEAR', 'HOLI', 'EID', 'DUSSEHRA', 'VALENTINE', 'MOTHERS_DAY', 'FATHERS_DAY']
  },
  
  // Validity
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Status and limits
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  
  // Priority for offer selection (higher number = higher priority)
  priority: {
    type: Number,
    default: 1
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

// Indexes for better performance
offerSchema.index({ offerType: 1, isActive: 1 });
offerSchema.index({ startDate: 1, endDate: 1 });
offerSchema.index({ applicableProducts: 1 });
offerSchema.index({ applicableCategories: 1 });

// Validate dates
offerSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Offers', offerSchema);