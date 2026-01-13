const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');

router.get('/api/wishlist', wishlistController.getWishlistAPI);
router.get('/wishlist', wishlistController.wishlistLoad);
router.post('/add-to-wislist/:productId', wishlistController.addToWishlist);
router.delete('/remove-from-wishlist/:wishlistItemId', wishlistController.removeFromWishlist);
router.post('/wishlist/add-to-cart', wishlistController.addToCartFromWishlist);

module.exports = router;
