const express = require('express');
const router = express.Router();
const { links, campaigns, clicks, generateShortCode } = require('../data/store');

// ── Home / Dashboard ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const allLinks = Array.from(links.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const allCampaigns = Array.from(campaigns.values());
  res.render('dashboard', { links: allLinks, campaigns: allCampaigns, query: req.query });
});

// ── Create Link — Step 1 GET ────────────────────────────────────────────────
router.get('/links/new', (req, res) => {
  const allCampaigns = Array.from(campaigns.values());
  res.render('wizard', { step: 1, error: null, campaigns: allCampaigns, formData: {} });
});

// ── Create Link — Step 1 POST (validate alias) ──────────────────────────────
router.post('/links/step1', (req, res) => {
  const { originalUrl, customAlias } = req.body;
  const allCampaigns = Array.from(campaigns.values());

  if (!originalUrl || !originalUrl.startsWith('http')) {
    return res.render('wizard', {
      step: 1,
      error: 'Please enter a valid URL starting with http:// or https://',
      campaigns: allCampaigns,
      formData: req.body,
    });
  }

  if (customAlias && links.has(customAlias)) {
    return res.render('wizard', {
      step: 1,
      error: `Alias "${customAlias}" is already taken. Choose a different one.`,
      campaigns: allCampaigns,
      formData: req.body,
    });
  }

  res.render('wizard', {
    step: 2,
    error: null,
    campaigns: allCampaigns,
    formData: req.body,
  });
});

// ── Create Link — Step 2 POST (publish) ─────────────────────────────────────
router.post('/links/publish', (req, res) => {
  const {
    originalUrl, customAlias, title,
    campaignId, tags, expiresAt, maxClicks,
    password, mobileUrl,
  } = req.body;

  const shortCode = customAlias
    ? customAlias.trim().toLowerCase().replace(/\s+/g, '-')
    : generateShortCode();

  if (links.has(shortCode)) {
    const allCampaigns = Array.from(campaigns.values());
    return res.render('wizard', {
      step: 2,
      error: `Alias "${shortCode}" was just taken. Please go back and pick another.`,
      campaigns: allCampaigns,
      formData: req.body,
    });
  }

  const link = {
    shortCode,
    originalUrl,
    title: title || originalUrl,
    campaignId: campaignId || null,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    maxClicks: maxClicks ? parseInt(maxClicks, 10) : null,
    passwordHash: password || null,
    mobileUrl: mobileUrl || null,
    currentClicks: 0,
    status: 'active',
    isAbusive: false,
    createdAt: new Date(),
  };

  links.set(shortCode, link);
  res.redirect(`/?created=${shortCode}`);
});

// ── Delete link ─────────────────────────────────────────────────────────────
router.post('/links/:code/delete', (req, res) => {
  const code = req.params.code;
  links.delete(code);
  for (let i = clicks.length - 1; i >= 0; i--) {
    if (clicks[i].linkId === code) {
      clicks.splice(i, 1);
    }
  }
  res.redirect('/?deleted=1');
});

// ── Toggle link status (enable / disable) ────────────────────────────────────
router.post('/links/:code/toggle', (req, res) => {
  const link = links.get(req.params.code);
  if (link) {
    link.status = link.status === 'active' ? 'disabled' : 'active';
  }
  res.redirect('/');
});

// ── Campaign CRUD ────────────────────────────────────────────────────────────
router.get('/campaigns', (req, res) => {
  const allCampaigns = Array.from(campaigns.values());
  const allLinks = Array.from(links.values());
  res.render('campaigns', { campaigns: allCampaigns, links: allLinks });
});

router.post('/campaigns/new', (req, res) => {
  const { name, tags } = req.body;
  const id = `c_${Date.now()}`;
  campaigns.set(id, {
    id,
    name,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    status: 'active',
    createdAt: new Date(),
  });
  res.redirect('/campaigns');
});

module.exports = router;
