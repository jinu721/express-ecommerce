const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/cart', cartController.cartPageLoad);
router.post('/add-to-cart', cartController.addToCart);
router.delete('/delete-from-cart/:cartItemId', cartController.deleteFromCart);
router.post('/update-cart-item/:itemId', cartController.updateCartItem);

module.exports = router;
