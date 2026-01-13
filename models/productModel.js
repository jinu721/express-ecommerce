const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: { 
    type: String, 
    required: true 
  },
  basePrice: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  price: { 
    type: Number 
  },
  offerPrice: { 
    type: Number 
  },
  sizes: {
    type: Object 
  },
  colors: [{ 
    type: String 
  }],
  
  images: [{ 
    type: String,
    required: true
  }],
  
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  brand: { 
    type: mongoose.Schema.ObjectId,
    ref: 'Brand',
    index: true
  },
  tags: [{ 
    type: String,
    index: true
  }],
  productType: {
    type: String,
    enum: ['SHIRT', 'T-SHIRT', 'JEANS', 'TROUSERS', 'SHORTS', 'JACKET', 'SWEATER', 'SHOES', 'ACCESSORIES', 'OTHER'],
    default: 'OTHER'
  },
  
  cashOnDelivery: { 
    type: Boolean,
    default: true
  },
  warranty: { 
    type: String 
  },
  returnPolicy: { 
    type: String 
  },
  
  hasCustomShipping: {
    type: Boolean,
    default: false
  },
  shippingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  reviews: [
    {
      user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Users" 
      },
      username: { 
        type: String,
        required: true
      },
      rating: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
      },
      comment: { 
        type: String 
      },
      reviewDate: { 
        type: Date, 
        default: Date.now 
      }
    }
  ],
  
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  viewCount: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

productSchema.index({ name: 'text', tags: 'text' });
productSchema.index({ isDeleted: 1, category: 1 });
productSchema.index({ isDeleted: 1, brand: 1 });

productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  
  if (this.isModified('basePrice') && !this.price) {
    this.price = this.basePrice;
  }
  
  next();
});

productSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.reviewCount = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.rating = Math.round((sum / this.reviews.length) * 10) / 10;
    this.reviewCount = this.reviews.length;
  }
};

module.exports = mongoose.model('Products', productSchema);