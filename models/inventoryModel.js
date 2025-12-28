const mongoose = require('mongoose');

/**
 * Inventory Model - Stock Movement Tracking
 * Tracks all stock movements for audit and analytics
 */
const inventoryMovementSchema = new mongoose.Schema({
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'INITIAL_STOCK',    // Initial stock entry
      'PURCHASE',         // Stock purchased/received
      'SALE',            // Stock sold
      'RETURN',          // Customer return
      'ADJUSTMENT',      // Manual adjustment
      'DAMAGE',          // Damaged goods
      'TRANSFER',        // Transfer between warehouses
      'RESERVATION',     // Stock reserved for order
      'RELEASE'          // Reserved stock released
    ],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reference: {
    type: String, // Order ID, Purchase ID, etc.
    index: true
  },
  reason: {
    type: String,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    index: true
  },
  warehouse: {
    type: String,
    default: 'MAIN'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
inventoryMovementSchema.index({ variant: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1, createdAt: -1 });
inventoryMovementSchema.index({ reference: 1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);