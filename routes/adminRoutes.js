const express = require('express');
const router = express.Router();
const { links, blockedDomains, clicks } = require('../data/store');

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl || '/admin'));
  }

  const user = req.session.user || {};
  const role = (user.role || user.userType || '').toLowerCase();

  if (role === 'admin' || role === 'host') {
    return next();
  }

  return res.status(403).render('error-fallback', {
    page: 'admin',
    type: 'disabled',
    message: 'Access Restricted: Only Administrators can access the Admin & Security Control Center.',
    user: req.session.user,
  });
};

router.use(requireAdmin);

// Admin dashboard
router.get('/', (req, res) => {
  const allLinks = Array.from(links.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.render('admin', {
    page: 'admin',
    links: allLinks,
    blockedDomains: Array.from(blockedDomains.values()),
    message: null,
    user: req.session.user,
  });
});

// Toggle link kill-switch
router.post('/links/:code/toggle', async (req, res) => {
  const code = req.params.code;
  const link = links.get(code);
  if (link) {
    link.status = link.status === 'active' ? 'disabled' : 'active';
    try {
      const { mongoose } = require('../config/db');
      const LinkModel = require('../models/Link');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await LinkModel.updateOne({ shortCode: code }, { status: link.status });
      }
    } catch (err) {
      console.warn('[Admin] MongoDB toggle warning:', err.message);
    }
  }
  res.redirect('/admin');
});

// Delete link
router.post('/links/:code/delete', async (req, res) => {
  const code = req.params.code;
  links.delete(code);
  for (let i = clicks.length - 1; i >= 0; i--) {
    if (clicks[i].linkId === code) {
      clicks.splice(i, 1);
    }
  }
  try {
    const { mongoose } = require('../config/db');
    const LinkModel = require('../models/Link');
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await LinkModel.deleteOne({ shortCode: code });
    }
  } catch (err) {
    console.warn('[Admin] MongoDB delete warning:', err.message);
  }
  res.redirect('/admin');
});

// Block domain
router.post('/domains/block', (req, res) => {
  const { domain, reason } = req.body;
  if (domain) {
    blockedDomains.set(domain.toLowerCase(), {
      domain: domain.toLowerCase(),
      reason: reason || 'Flagged by Administrator',
      createdAt: new Date(),
    });
  }
  res.redirect('/admin');
});

// Unblock domain
router.post('/domains/:domain/unblock', (req, res) => {
  blockedDomains.delete(req.params.domain);
  res.redirect('/admin');
});

module.exports = router;
