const mongoose = require('mongoose');

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
  attributes: {
    type: Map,
    of: String,
    default: new Map()
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reserved: {
    type: Number, 
    default: 0,
    min: 0
  },
  priceAdjustment: {
    type: Number, 
    default: 0
  },
  specialPrice: {
    type: Number,
    default: null,
    min: 0
  },
  images: [{
    type: String
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

variantSchema.index({ product: 1, attributes: 1 }, { unique: true });

variantSchema.virtual('availableStock').get(function() {
  return Math.max(0, this.stock - this.reserved);
});

variantSchema.methods.getEffectivePrice = function(basePrice) {
  if (this.specialPrice && this.specialPrice > 0) {
    return this.specialPrice;
  }
  return basePrice + (this.priceAdjustment || 0);
};

variantSchema.methods.isInStock = function(quantity = 1) {
  return this.availableStock >= quantity;
};

variantSchema.methods.isLowStock = function() {
  return this.availableStock <= this.lowStockThreshold && this.availableStock > 0;
};

variantSchema.methods.getAttributeString = function() {
  const attrs = [];
  for (const [key, value] of this.attributes) {
    attrs.push(`${key}: ${value}`);
  }
  return attrs.join(', ') || 'Standard';
};

variantSchema.statics.generateSKU = async function(productId, attributes) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const productCode = productId.toString().substring(0, 6).toUpperCase();
  
  let attrCode = '';
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'string' && key !== 'stock') {
      attrCode += value.substring(0, 2).toUpperCase();
    }
  }
  
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${productCode}-${attrCode || 'STD'}-${random}`;
};

module.exports = mongoose.model('Variant', variantSchema);
