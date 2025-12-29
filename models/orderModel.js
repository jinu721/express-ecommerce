const mongoose = require('mongoose');

// ~~~ Enhanced Order Schema with Advanced Tracking ~~~
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', 
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products', 
        required: true,
      },
      variant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variant',
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      originalPrice: {
        type: Number,
        required: false, // Made optional for backward compatibility
        default: 0,
      },
      offerPrice: {
        type: Number,
        required: false, // Made optional for backward compatibility  
        default: 0,
      },
      totalPrice: {
        type: Number,
        required: false, // Made optional for backward compatibility
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      appliedOffer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offers',
      },
      size: {
        type: String,
        required: true,
      },
      color: {
        type: String,
      },
      itemStatus: {
        type: String,
        enum: ['processing', 'order_placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
        default: 'order_placed',
      },
      trackingInfo: {
        trackingNumber: String,
        carrier: String,
        estimatedDelivery: Date,
        currentLocation: String,
        lastUpdated: Date,
      },
      returnRequest: {
        requestStatus: { type: Boolean, default: false },
        requestMessage: { type: String },
        requestDate: { type: Date },
        adminStatus: {
          type: String,
          enum: ['approved', 'cancelled', 'pending'],
          default: 'pending',
        },
        refundAmount: { type: Number },
        refundDate: { type: Date },
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: false, // Made optional for backward compatibility
    default: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  totalDiscount: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card','wallet', 'paypal', 'razorpay', 'cash_on_delivery'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['processing', 'order_placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'order_placed',
  },
  orderId:{
    type:Number,
    required:true,
  },
  razorpayOrderId: {
    type: String,
  },
  coupon: {
    code: { type: String },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupons' },
    discountApplied: { type: Number, default: 0 }
  },
  shippingAddress: {
    street: { type: String },
    country: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String },
    city: { type: String, required: true },
    houseNumber: { type: String },
    landMark: { type: String },
    pinCode: { type: String, required: true },
  },
  // Enhanced tracking information
  trackingInfo: {
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    currentLocation: String,
    lastUpdated: Date,
  },
  orderedAt: {
    type: Date,
    default: Date.now,
  },
  confirmedAt: Date,
  packedAt: Date,
  shippedAt: Date,
  outForDeliveryAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  returnRequest: {
    requestStatus:{type:Boolean,default:false},
    requestMessage:{type:String},
    requestDate: { type: Date },
    adminStatus: {
      type:String,
      enum: ['approved', 'cancelled', 'pending'],
      default: 'pending',
    },
    refundAmount: { type: Number },
    refundDate: { type: Date },
  },
  // Enhanced status history with location tracking
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['processing', 'order_placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
        required: true,
      },
      location: String,
      message: String,
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      updatedBy: {
        type: String,
        enum: ['system', 'admin', 'carrier'],
        default: 'system',
      },
    },
  ],
  // Additional fields for better order management
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  deliveryInstructions: String,
  notes: String, // Admin notes
}, {
  timestamps: true,
});

// Add methods for status updates
orderSchema.methods.updateStatus = function(newStatus, location = '', message = '', updatedBy = 'system') {
  this.orderStatus = newStatus;
  
  // Update timestamp fields
  const now = new Date();
  switch(newStatus) {
    case 'processing':
      // Processing is the initial status, no specific timestamp needed
      break;
    case 'confirmed':
      this.confirmedAt = now;
      break;
    case 'packed':
      this.packedAt = now;
      break;
    case 'shipped':
      this.shippedAt = now;
      break;
    case 'out_for_delivery':
      this.outForDeliveryAt = now;
      break;
    case 'delivered':
      this.deliveredAt = now;
      this.actualDeliveryDate = now;
      break;
    case 'cancelled':
      this.cancelledAt = now;
      break;
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    location,
    message,
    updatedAt: now,
    updatedBy
  });
  
  // Update item statuses
  this.items.forEach(item => {
    if (item.itemStatus !== 'cancelled' && item.itemStatus !== 'returned') {
      item.itemStatus = newStatus;
    }
  });
};

module.exports = mongoose.model('Orders', orderSchema);
