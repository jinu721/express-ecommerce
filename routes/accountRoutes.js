const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');


router.get('/account', accountController.ProfileLoad);
router.post('/update-profile', accountController.UserUpdate);
router.get('/forgot', accountController.ForgotPassLoad);
router.post('/forgot-request', accountController.ForgetPassRequest);
router.post('/forgot-verify', accountController.ForgetPassverify);
router.patch('/forgot-password', accountController.ForgetPassChange);
router.get('/account/address', accountController.AddressLoad);
router.post('/create-address', accountController.AddressCreate);
router.get('/update-address/:addressId', accountController.EditAddressLoad);
router.post('/update-address', accountController.EditAddress);
router.delete('/delete-address/:addressId', accountController.DeleteAddress);
router.patch('/change-password', accountController.ChangePassword);
router.get('/account/orders', accountController.ordersPageLoad);

module.exports = router;
