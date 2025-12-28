const mongoose = require('mongoose');

/**
 * Variant Model (REDESIGNED)
 * Represents product variants with dynamic attributes
 * Each variant has its own stock, SKU, and optional price override
 * Supports any combination of attributes (not limited to size/color)
 */
const variantSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    required: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // Dynamic attributes - can be any combination
  attributes: {
    type: Map,
    of: String,
    default: new Map()
    // Examples:
    // { "SIZE": "L", "COLOR": "RED" }
    // { "COLOR": "BLUE" } (only color for caps)
    // { "SIZE": "32" } (only size for belts)
    // {} (no variants for gift cards)
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reserved: {
    type: Number, // Stock reserved in pending orders
    default: 0,
    min: 0
  },
  priceAdjustment: {
    type: Number, // +/- adjustment from base product price
    default: 0
  },
  specialPrice: {
    type: Number, // Override price for this variant (if set, ignores priceAdjustment)
    default: null,
    min: 0
  },
  images: [{
    type: String // Variant-specific images (e.g., color-specific photos)
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  }
}, {
  timestamps: true
});

// Compound index for efficient queries - dynamic attributes
variantSchema.index({ product: 1, attributes: 1 }, { unique: true });

// Virtual for available stock
variantSchema.virtual('availableStock').get(function() {
  return Math.max(0, this.stock - this.reserved);
});

// Method to get effective price for this variant
variantSchema.methods.getEffectivePrice = function(basePrice) {
  if (this.specialPrice && this.specialPrice > 0) {
    return this.specialPrice;
  }
  return basePrice + (this.priceAdjustment || 0);
};

// Method to check if variant is in stock
variantSchema.methods.isInStock = function(quantity = 1) {
  return this.availableStock >= quantity;
};

// Method to check if stock is low
variantSchema.methods.isLowStock = function() {
  return this.availableStock <= this.lowStockThreshold && this.availableStock > 0;
};

// Method to get attribute display string
variantSchema.methods.getAttributeString = function() {
  const attrs = [];
  for (const [key, value] of this.attributes) {
    attrs.push(`${key}: ${value}`);
  }
  return attrs.join(', ') || 'Standard';
};

// Static method to generate SKU
variantSchema.statics.generateSKU = async function(productId, attributes) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const productCode = productId.toString().substring(0, 6).toUpperCase();
  
  // Create attribute code from first 2 chars of each attribute value
  let attrCode = '';
  for (const [key, value] of Object.entries(attributes)) {
    // Skip non-string values and ensure we only process attribute values
    if (typeof value === 'string' && key !== 'stock') {
      attrCode += value.substring(0, 2).toUpperCase();
    }
  }
  
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${productCode}-${attrCode || 'STD'}-${random}`;
};

module.exports = mongoose.model('Variant', variantSchema);
