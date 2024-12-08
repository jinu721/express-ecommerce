const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// ~~~ User Profile Page ~~~
// Purpose: Load the user's profile page.
// Response: Renders the profile page with user details.
router.get('/account', accountController.ProfileLoad);

// ~~~ Update User Profile ~~~
// Purpose: Update user profile information.
// Response: Returns success or error messages based on update status.
router.post('/update-profile', accountController.UserUpdate);

// ~~~ Forgot Password Page ~~~
// Purpose: Load the forgot password page.
// Response: Renders the forgot password page.
router.get('/forgot', accountController.ForgotPassLoad);

// ~~~ Forgot Password Request ~~~
// Purpose: Handle password reset request and send OTP or link.
// Response: Returns success or error messages.
router.post('/forgot-request', accountController.ForgetPassRequest);

// ~~~ Verify Forgot Password Request ~~~
// Purpose: Verify the OTP or link for password reset.
// Response: Returns success or error messages.
router.post('/forgot-verify', accountController.ForgetPassverify);

// ~~~ Change Password via Forgot Password ~~~
// Purpose: Change the password after verification.
// Response: Returns success or error messages.
router.patch('/forgot-password', accountController.ForgetPassChange);

// ~~~ Address Management Page ~~~
// Purpose: Load the address management page for the user.
// Response: Renders the page with existing addresses.
router.get('/account/address', accountController.AddressLoad);

// ~~~ Create New Address ~~~
// Purpose: Add a new address for the user.
// Response: Returns success or error messages.
router.post('/create-address', accountController.AddressCreate);

// ~~~ Edit Address Page ~~~
// Purpose: Load the address edit page for a specific address.
// Response: Renders the edit address page.
router.get('/update-address/:addressId', accountController.EditAddressLoad);

// ~~~ Update Address ~~~
// Purpose: Update the details of an existing address.
// Response: Returns success or error messages.
router.post('/update-address', accountController.EditAddress);

// ~~~ Delete Address ~~~
// Purpose: Remove an address from the user's account.
// Response: Returns success or error messages.
router.delete('/delete-address/:addressId', accountController.DeleteAddress);

// ~~~ Change Password ~~~
// Purpose: Allow the user to change their password.
// Response: Returns success or error messages.
router.patch('/change-password', accountController.ChangePassword);

// ~~~ Orders Page ~~~
// Purpose: Load the orders page for the user.
// Response: Renders the page with a list of user orders.
router.get('/account/orders', accountController.ordersPageLoad);

module.exports = router;
