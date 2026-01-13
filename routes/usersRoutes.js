const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


router.get('/register', userController.RegisterLoad);
router.get('/login', userController.RegisterLoad);
router.post('/register', userController.Register);
router.post('/request-otp', userController.RequestOtp);
router.post('/login', userController.Login);
router.get('/ban', userController.banPageLoad);
router.post('/logout', userController.logoutClick);
router.get('/about', userController.aboutLoad);

module.exports = router;
