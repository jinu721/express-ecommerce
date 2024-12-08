const mongoose = require('mongoose');

// ~~~ Order Schema ~~~
// Purpose: Defines the structure for storing and managing customer order data in the database.
// Fields:
// - `user`: Links the order to the customer using `ObjectId` referencing the `Users` collection.
// - `items`: Stores details of the products in the order, including quantity, price, size, and status.
// - `totalAmount`: Total cost of the order, required.
// - `paymentMethod`: Specifies how the order was paid (e.g., card, wallet, COD).
// - `paymentStatus`: Tracks the payment state (e.g., pending, paid, failed).
// - `orderStatus`: Tracks the current status of the order (e.g., processing, shipped).
// - `shippingAddress`: Stores details of where the order is shipped.
// - `coupon`: Tracks coupon details and discounts applied.
// - `statusHistory`: Keeps a history of status changes for auditing.
// Features:
// - Includes support for return requests at both item and order level.
// - Timestamp fields automatically track creation and update times for each order.
// - Utilizes enumerated fields for consistent status and payment values.

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
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      offerPrice: {
        type: Number,
        required: true,
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
        enum: ['processing', 'shipped', 'delivered', 'cancelled','returned'],
        default: 'processing',
      },
      returnRequest: {
        requestStatus: { type: Boolean, default: false },
        requestMessage: { type: String },
        adminStatus: {
          type: String,
          enum: ['approved', 'cancelled', 'pending'],
          default: 'pending',
        },
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card','wallet', 'paypal', 'razorpay', 'cash_on_delivery'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['processing', 'shipped', 'delivered', 'cancelled','returned'],
    default: 'processing',
  },
  orderId:{
    type:Number,
    required:true,
  },
  coupon: {
    code: { type: String },
    discountApplied: { type: Number }
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
  orderedAt: {
    type: Date,
    default: Date.now,
  },
  deliveredAt: {
    type: Date,
  },
  returnRequest: {
    requestStatus:{type:Boolean,default:false},
    requestMessage:{type:String},
    adminStatus: {
      type:String,
      enum: ['approved', 'cancelled', 'pending'],
      default: 'pending',
    },
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['processing', 'shipped', 'delivered', 'cancelled','returned'],
        required: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Orders', orderSchema);
