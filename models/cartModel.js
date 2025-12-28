const mongoose = require('mongoose');


// ~~~ Cart Schema ~~~
// Purpose: Defines the structure of the shopping cart data for users in the database.
// Fields:
// - `userId`: References the user who owns the cart (required).
// - `items`: An array of `cartItemSchema` objects, each representing an item in the cart.
// - `cartTotal`: The total cost of all items in the cart (default: 0).
// - `createdAt`: The timestamp for when the cart was created (default: current date).
// - `updatedAt`: The timestamp for when the cart was last updated (default: current date).

// ~~~ Cart Item Schema ~~~
// Purpose: Defines the structure of individual items in the shopping cart.
// Fields:
// - `productId`: References the product added to the cart (required).
// - `quantity`: The number of units of the product (default: 1, required).
// - `price`: The price of the product (required).
// - `size`: The size variant of the product (required).
// - `color`: The color variant of the product (optional).
// - `total`: The total price for this item (`quantity * price`, required).

const cartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' }, // Link to Variant Model
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