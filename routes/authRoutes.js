const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ~~~ Auth Check API ~~~
// Purpose: Check if user is logged in
router.get('/api/auth/check', (req, res) => {
  res.json({ 
    loggedIn: !!req.session.loggedIn,
    userId: req.session.currentId || null 
  });
});

// ~~~ Google Login ~~~
// Purpose: Initiates the Google login process.
// Response: Redirects the user to Google's login page for authentication.
router.get('/auth/google', authController.whenGoogleLogin);

// ~~~ Google Login Callback ~~~
// Purpose: Handles the callback from Google after user authentication.
// Response: Processes user data, creates or updates the user session, and redirects accordingly.
router.get('/auth/google/callback', authController.whenGoogleCallbacks);

module.exports = router;
