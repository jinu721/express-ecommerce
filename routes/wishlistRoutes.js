const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');

// ~~~ Wishlist Page ~~~
// Purpose: Load the wishlist page for the user to view all their saved items.
// Response: Displays the user's wishlist with the items they have added.
router.get('/wishlist', wishlistController.wishlistLoad);

// ~~~ Add to Wishlist ~~~
// Purpose: Add a specific product to the user's wishlist.
// Response: Adds the product to the wishlist and returns the updated wishlist.
router.post('/add-to-wislist/:productId', wishlistController.addToWishlist);

// ~~~ Remove from Wishlist ~~~
// Purpose: Remove a specific item from the user's wishlist.
// Response: Deletes the item from the wishlist and returns the updated list.
router.delete('/remove-from-wishlist/:wishlistItemId', wishlistController.removeFromWishlist);

// ~~~ Add to Cart from Wishlist ~~~
// Purpose: Add a product from the wishlist to the user's shopping cart.
// Response: Moves the selected item from the wishlist to the cart.
router.post('/wishlist/add-to-cart', wishlistController.addToCartFromWishlist);

module.exports = router;
