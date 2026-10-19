const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * ============================================================================
 * AUTHENTICATION & AUTHORIZATION ROUTES
 * Clean route definitions delegating to Mongoose Auth Controller
 * ============================================================================
 */

// Sign In
router.get('/login', authController.renderLogin);
router.post('/login', authController.loginUser);

// Sign Up (Supports User vs Host account selection)
router.get('/signup', authController.renderSignup);
router.post('/signup', authController.registerUser);

// Sign Out
router.get('/logout', authController.logoutUser);
router.post('/logout', authController.logoutUser);

// Profile
router.get('/profile', authController.getProfile);

// Aliases
router.get('/auth/login', (req, res) => res.redirect('/login'));
router.get('/auth/signup', (req, res) => res.redirect('/signup'));
router.get('/auth/logout', (req, res) => res.redirect('/logout'));

module.exports = router;
