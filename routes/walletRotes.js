const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletContrtoller');

router.get('/account/wallet/', walletController.walletPageLoad);

module.exports = router;
