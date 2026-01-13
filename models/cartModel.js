const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
    size: { type: String, required: true },
    color: { type: String },
    total: { type: Number, required: true }  
});

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    items: [cartItemSchema], 
    cartTotal: { type: Number, default: 0 },
},{timestamps:true});


module.exports = mongoose.model('Cart', cartSchema);