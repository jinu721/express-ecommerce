const mongoose = require('mongoose');


// ~~~ Wishlist Item Schema ~~~
// Purpose: Defines the structure for individual items in a user's wishlist.
// Fields:
// - `productId`: The ID of the product that the user has added to the wishlist (required).
// - `size`: The size of the product (required).
// - `color`: The color of the product (optional).

const wishlistItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
    size: { type: String, required: true },
    color: { type: String },
});

// ~~~ Wishlist Schema ~~~
// Purpose: Defines the structure for a user's wishlist, including the user's ID and the items they have added to the wishlist.
// Fields:
// - `userId`: The ID of the user who owns the wishlist (required).
// - `items`: An array of products that the user has added to their wishlist. Each item contains `productId`, `size`, and `color`.
// - `createdAt`: The timestamp when the wishlist was created (default: current date).
// - `updatedAt`: The timestamp when the wishlist was last updated (default: current date).

const wishlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    items: [wishlistItemSchema], 
},{timestamps:true});


module.exports = mongoose.model('Wishlist', wishlistSchema);
