const express = require('express');
const router = express.Router();
const { links, blockedDomains, clicks } = require('../data/store');

/**
 * Strict RBAC Middleware: Requires Administrator or Host Role
 */
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

// Apply requireAdmin to all routes in this router
router.use(requireAdmin);

// ── Admin Panel ──────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const allLinks = Array.from(links.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const allDomains = Array.from(blockedDomains.values());
  res.render('admin', {
    page: 'admin',
    links: allLinks,
    blockedDomains: allDomains,
    message: null,
    user: req.session.user,
  });
});

// ── Toggle link status (Kill-Switch) ─────────────────────────────────────────
router.post('/links/:code/toggle', (req, res) => {
  const link = links.get(req.params.code);
  if (link) {
    link.status = link.status === 'active' ? 'disabled' : 'active';
  }
  res.redirect('/admin');
});

// ── Delete link (Admin) ───────────────────────────────────────────────────────
router.post('/links/:code/delete', (req, res) => {
  const code = req.params.code;
  links.delete(code);
  // Also clean up any clicks associated with this link
  for (let i = clicks.length - 1; i >= 0; i--) {
    if (clicks[i].linkId === code) {
      clicks.splice(i, 1);
    }
  }
  res.redirect('/admin');
});

// ── Block domain ─────────────────────────────────────────────────────────────
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

// ── Unblock domain ───────────────────────────────────────────────────────────
router.post('/domains/:domain/unblock', (req, res) => {
  blockedDomains.delete(req.params.domain);
  res.redirect('/admin');
});

module.exports = router;
