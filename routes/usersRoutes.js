const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// ~~~ User Registration Page ~~~
// Purpose: Load the registration page for the user.
// Response: Renders the registration form for the user to fill in.
router.get('/register', userController.RegisterLoad);

// ~~~ Register User ~~~
// Purpose: Handle the user registration form submission.
// Response: Registers the user and returns a success or error message.
router.post('/register', userController.Register);

// ~~~ Request OTP ~~~
// Purpose: Request an OTP (One-Time Password) for user verification.
// Response: Sends an OTP to the user's registered contact method.
router.post('/request-otp', userController.RequestOtp);

// ~~~ User Login ~~~
// Purpose: Handle user login.
// Response: Authenticates the user and logs them into the application.
router.post('/login', userController.Login);

// ~~~ Ban Page ~~~
// Purpose: Load the ban page for the user (if applicable).
// Response: Displays the page indicating the user's ban status.
router.get('/ban', userController.banPageLoad);

// ~~~ User Logout ~~~
// Purpose: Handle user logout.
// Response: Logs out the user and clears their session.
router.post('/logout', userController.logoutClick);

// ~~~ About Page ~~~
// Purpose: Load the about page of the application.
// Response: Displays information about the application or service.
router.get('/about', userController.aboutLoad);

module.exports = router;
