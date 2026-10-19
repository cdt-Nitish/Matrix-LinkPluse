const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication routes
router.get('/login', authController.renderLogin);
router.post('/login', authController.loginUser);

router.get('/signup', authController.renderSignup);
router.post('/signup', authController.registerUser);

router.get('/logout', authController.logoutUser);
router.post('/logout', authController.logoutUser);

router.get('/profile', authController.getProfile);

router.get('/auth/login', (req, res) => res.redirect('/login'));
router.get('/auth/signup', (req, res) => res.redirect('/signup'));
router.get('/auth/logout', (req, res) => res.redirect('/logout'));

module.exports = router;
