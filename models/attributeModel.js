const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['SELECT', 'TEXT', 'NUMBER', 'COLOR_PICKER'],
    default: 'SELECT'
  },
  values: [{
    value: {
      type: String,
      required: true,
      trim: true
    },
    displayValue: {
      type: String,
      required: true,
      trim: true
    },
    hexCode: String,
    sortOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

attributeSchema.index({ category: 1, name: 1 });
attributeSchema.index({ isActive: 1, sortOrder: 1 });

attributeSchema.statics.getForCategory = function(categoryId) {
  return this.find({
    $or: [
      { category: categoryId },
      { category: null }
    ],
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

module.exports = mongoose.model('Attribute', attributeSchema);