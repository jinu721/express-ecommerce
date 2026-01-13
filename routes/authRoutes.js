const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/api/auth/check', (req, res) => {
  res.json({ 
    loggedIn: !!req.session.loggedIn,
    userId: req.session.currentId || null 
  });
});
router.get('/auth/google', authController.whenGoogleLogin);
router.get('/auth/google/callback', authController.whenGoogleCallbacks);

module.exports = router;
