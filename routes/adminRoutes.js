const express = require('express');
const router = express.Router();
const { links, blockedDomains, clicks } = require('../data/store');

// ── Admin Panel ──────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const allLinks = Array.from(links.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const allDomains = Array.from(blockedDomains.values());
  res.render('admin', { links: allLinks, blockedDomains: allDomains, message: null });
});

// ── Toggle link status (Kill-Switch) ─────────────────────────────────────────
router.post('/links/:code/toggle', (req, res) => {
  const link = links.get(req.params.code);
  if (link) {
    link.status = link.status === 'active' ? 'disabled' : 'active';
  }
  res.redirect('/admin');
});

// ── Block domain ─────────────────────────────────────────────────────────────
router.post('/domains/block', (req, res) => {
  const { domain, reason } = req.body;
  if (domain) {
    blockedDomains.set(domain.toLowerCase(), {
      domain: domain.toLowerCase(),
      reason: reason || 'No reason given',
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
