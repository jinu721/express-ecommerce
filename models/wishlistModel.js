const mongoose = require('mongoose');


const wishlistItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
    size: { type: String, required: true },
    color: { type: String },
});


const wishlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    items: [wishlistItemSchema], 
},{timestamps:true});


module.exports = mongoose.model('Wishlist', wishlistSchema);
