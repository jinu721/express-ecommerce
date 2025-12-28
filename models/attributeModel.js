const mongoose = require('mongoose');

/**
 * Attribute Model - Dynamic Product Attributes
 * Supports any type of attribute (size, color, material, etc.)
 * Completely flexible and not limited to clothing
 */
const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    uppercase: true // SIZE, COLOR, MATERIAL, etc.
  },
  displayName: {
    type: String,
    required: true,
    trim: true // "Size", "Color", "Material"
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
    hexCode: String, // For colors
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

// Compound index for efficient queries
attributeSchema.index({ category: 1, name: 1 });
attributeSchema.index({ isActive: 1, sortOrder: 1 });

// Static method to get attributes for a category
attributeSchema.statics.getForCategory = function(categoryId) {
  return this.find({
    $or: [
      { category: categoryId },
      { category: null } // Global attributes
    ],
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

module.exports = mongoose.model('Attribute', attributeSchema);