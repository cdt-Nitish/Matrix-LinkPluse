const express = require('express');
const router = express.Router();
const { links } = require('../data/store');
const { isBot } = require('../utils/botFilter');
const { logClick } = require('../utils/clickLogger');

// ── GET /:shortCode ──────────────────────────────────────────────────────────
router.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;

  // Skip internal routes
  if (['favicon.ico', 'robots.txt'].includes(shortCode)) return res.sendStatus(204);

  const link = links.get(shortCode);
  if (!link) {
    return res.status(404).render('error-fallback', {
      type: '404',
      message: `Short link "/${shortCode}" does not exist.`,
    });
  }

  // Step 1 — Active status check
  if (link.status !== 'active') {
    return res.render('error-fallback', {
      type: 'disabled',
      message: 'This link has been disabled for safety.',
    });
  }

  // Step 2 — Expiry check
  if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
    return res.render('error-fallback', {
      type: 'expired',
      message: 'This link has expired.',
    });
  }

  // Step 3 — Click cap check
  if (link.maxClicks !== null && link.currentClicks >= link.maxClicks) {
    return res.render('error-fallback', {
      type: 'limit',
      message: 'This link has reached its click limit.',
    });
  }

  // Social bot — serve OpenGraph meta, don't count click
  if (isBot(req.headers['user-agent'])) {
    return res.send(`<!DOCTYPE html><html><head>
      <meta property="og:title" content="${link.title || link.originalUrl}">
      <meta property="og:url" content="${link.originalUrl}">
      <meta http-equiv="refresh" content="0;url=${link.originalUrl}">
    </head><body></body></html>`);
  }

  // Step 4 — Password check
  if (link.passwordHash) {
    const verified = req.query.verified === '1';
    if (!verified) {
      return res.render('password-prompt', { shortCode, error: null });
    }
  }

  // Step 5 — Device routing
  const ua = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPod/i.test(ua);
  const destination = (isMobile && link.mobileUrl) ? link.mobileUrl : link.originalUrl;

  // Atomically increment clicks
  link.currentClicks += 1;

  // PATH A — send redirect immediately (<10ms)
  const cleanDest = destination.split('?')[0] + (destination.includes('?')
    ? '?' + destination.split('?')[1].replace(/src=qr&?/g, '').replace(/&$/, '')
    : '');
  res.redirect(302, cleanDest);

  // PATH B — async telemetry
  logClick(shortCode, link.campaignId, req);
});

// ── POST /:shortCode/unlock (password submit) ────────────────────────────────
router.post('/:shortCode/unlock', (req, res) => {
  const { shortCode } = req.params;
  const { password } = req.body;
  const link = links.get(shortCode);

  if (!link) return res.status(404).render('error-fallback', { type: '404', message: 'Link not found.' });

  if (password === link.passwordHash) {
    return res.redirect(`/${shortCode}?verified=1`);
  }

  res.render('password-prompt', { shortCode, error: 'Incorrect password. Try again.' });
});

module.exports = router;
