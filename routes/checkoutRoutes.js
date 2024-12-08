const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

// ~~~ Load Checkout Page ~~~
// Purpose: Displays the checkout page with the user's cart or buy-now item details.
// Response: Renders the checkout page or returns an error message if the cart is empty or invalid.
router.get('/checkout', checkoutController.checkoutPageLoad);

module.exports = router;
