const express = require('express');
const router = express.Router();
const {
  users,
  findUserByEmail,
  findUserByUsername,
  findUserByLogin,
  findUserById,
  createUser,
  verifyPassword,
} = require('../data/store');

// ── GET /login ───────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }

  let success = null;
  if (req.query.registered === '1') {
    success = 'Your account has been created successfully! Please sign in.';
  } else if (req.query.logged_out === '1') {
    success = 'You have been logged out successfully.';
  }

  res.render('login', {
    title: 'Log In',
    page: 'login',
    error: null,
    success,
    redirectUrl: req.query.redirect || '/',
    loginId: '',
  });
});

// ── POST /login ──────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { loginId, password, remember, redirectUrl } = req.body;
  const safeRedirect = (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//'))
    ? redirectUrl
    : '/';

  if (!loginId || !password) {
    return res.render('login', {
      title: 'Log In',
      page: 'login',
      error: 'Please provide both your email/username and password.',
      success: null,
      redirectUrl: safeRedirect,
      loginId: loginId || '',
    });
  }

  const user = findUserByLogin(loginId.trim());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.render('login', {
      title: 'Log In',
      page: 'login',
      error: 'Invalid email/username or password.',
      success: null,
      redirectUrl: safeRedirect,
      loginId: loginId.trim(),
    });
  }

  // Create session
  req.session.userId = user.id;
  req.session.user = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    role: user.role,
    organization: user.organization,
    accountType: user.accountType,
    createdAt: user.createdAt,
  };

  if (remember === 'on') {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  res.redirect(safeRedirect);
});

// ── GET /signup ──────────────────────────────────────────────────────────────
router.get('/signup', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }

  res.render('signup', {
    title: 'Create Account',
    page: 'signup',
    error: null,
    formData: {},
  });
});

// ── POST /signup ─────────────────────────────────────────────────────────────
router.post('/signup', (req, res) => {
  const {
    fullName,
    email,
    username,
    organization,
    role,
    accountType,
    password,
    confirmPassword,
    agreeTerms,
  } = req.body;

  const formData = {
    fullName: fullName || '',
    email: email || '',
    username: username || '',
    organization: organization || '',
    role: role || 'Member',
    accountType: accountType || 'Pro',
  };

  // Validation
  if (!fullName || fullName.trim().length < 2) {
    return res.render('signup', {
      title: 'Create Account',
      page: 'signup',
      error: 'Please enter your full name (at least 2 characters).',
      formData,
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.render('signup', {
      title: 'Create Account',
      page: 'signup',
      error: 'Please enter a valid email address.',
      formData,
    });
  }

  if (findUserByEmail(email)) {
    return res.render('signup', {
      title: 'Create Account',
      page: 'signup',
      error: 'An account with this email address already exists.',
      formData,
    });
  }

  const cleanUsername = username ? username.trim().toLowerCase() : '';
  if (cleanUsername) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.render('signup', {
        title: 'Create Account',
        page: 'signup',
        error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.',
        formData,
      });
    }

    if (findUserByUsername(cleanUsername)) {
      return res.render('signup', {
        title: 'Create Account',
        page: 'signup',
        error: `The username "${cleanUsername}" is already taken. Please choose another.`,
        formData,
      });
    }
  }

  if (!password || password.length < 6) {
    return res.render('signup', {
      title: 'Create Account',
      page: 'signup',
      error: 'Password must be at least 6 characters long.',
      formData,
    });
  }

  if (password !== confirmPassword) {
    return res.render('signup', {
      title: 'Create Account',
      page: 'signup',
      error: 'Passwords do not match. Please re-enter them.',
      formData,
    });
  }

  if (!agreeTerms) {
    return res.render('signup', {
      title: 'Create Account',
      page: 'signup',
      error: 'You must agree to the Terms of Service to proceed.',
      formData,
    });
  }

  // Create user
  const newUser = createUser({
    fullName,
    email,
    username: cleanUsername || email.split('@')[0],
    password,
    organization,
    role: role || 'Member',
    accountType: accountType || 'Pro',
  });

  // Automatically log in newly signed up user
  req.session.userId = newUser.id;
  req.session.user = {
    id: newUser.id,
    fullName: newUser.fullName,
    email: newUser.email,
    username: newUser.username,
    role: newUser.role,
    organization: newUser.organization,
    accountType: newUser.accountType,
    createdAt: newUser.createdAt,
  };

  res.redirect('/?welcome=1');
});

// ── GET /logout & POST /logout ───────────────────────────────────────────────
const handleLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/login?logged_out=1');
  });
};

router.get('/logout', handleLogout);
router.post('/logout', handleLogout);

// ── GET /profile ─────────────────────────────────────────────────────────────
router.get('/profile', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login?redirect=/profile');
  }

  const user = findUserById(req.session.userId);
  if (!user) {
    return res.redirect('/logout');
  }

  res.render('profile', {
    title: 'My Profile — LinkPulse',
    page: 'profile',
    profileUser: user,
  });
});

// ── Convenience Aliases ─────────────────────────────────────────────────────
router.get('/auth/login', (req, res) => res.redirect('/login'));
router.get('/auth/signup', (req, res) => res.redirect('/signup'));
router.get('/auth/logout', (req, res) => res.redirect('/logout'));

module.exports = router;
