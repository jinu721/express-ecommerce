const mongoose = require('mongoose');

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
      'INITIAL_STOCK',    
      'PURCHASE',         
      'SALE',            
      'RETURN',          
      'ADJUSTMENT',      
      'DAMAGE',          
      'TRANSFER',        
      'RESERVATION',     
      'RELEASE'          
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
    type: String, 
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

inventoryMovementSchema.index({ variant: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1, createdAt: -1 });
inventoryMovementSchema.index({ reference: 1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);