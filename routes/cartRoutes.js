const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// ~~~ Load Cart Page ~~~
// Purpose: Loads the cart page for the user with the items currently in the cart.
// Response: Renders the cart page with cart details or a message if the cart is empty.
router.get('/cart', cartController.cartPageLoad);

// ~~~ Add Item to Cart ~~~
// Purpose: Adds a specified product to the user's cart.
// Response: Returns a success or error message after attempting to add the product.
router.post('/add-to-cart', cartController.addToCart);

// ~~~ Delete Item from Cart ~~~
// Purpose: Removes a specific item from the user's cart based on the item ID.
// Response: Returns a success or error message after attempting to delete the item.
router.delete('/delete-from-cart/:cartItemId', cartController.deleteFromCart);

// ~~~ Update Cart Item ~~~
// Purpose: Updates the quantity or details of a specific cart item.
// Response: Returns the updated cart totals or an error message if the update fails.
router.post('/update-cart-item/:itemId', cartController.updateCartItem);

module.exports = router;
