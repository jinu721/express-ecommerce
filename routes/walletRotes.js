const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletContrtoller');

// ~~~ Wallet Page ~~~
// Purpose: Load the wallet page for the user to view their balance and transactions.
// Response: Displays the user's wallet details including the balance and transaction history.
router.get('/account/wallet/', walletController.walletPageLoad);

module.exports = router;
