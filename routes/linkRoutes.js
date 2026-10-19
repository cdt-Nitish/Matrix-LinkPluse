const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { links, campaigns, clicks, generateShortCode } = require('../data/store');
const LinkModel = require('../models/Link');
const { mongoose } = require('../config/db');

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Authentication middleware
const requireUserAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl || '/'));
  }
  next();
};

// Home / Landing / Dashboard
router.get('/', async (req, res) => {
  const currentUser = req.session.user || null;
  const currentUserId = req.session.userId || (currentUser ? currentUser.id : null);

  // Guests see Welcome & Services landing page
  if (!currentUser) {
    return res.render('welcome', {
      page: 'welcome',
      currentUser: null,
      user: null,
      title: 'Welcome to LinkPulse — URL Governance & Analytics Engine',
    });
  }

  let allLinks = Array.from(links.values());

  if (isDbConnected()) {
    try {
      const dbLinks = await LinkModel.find({}).sort({ createdAt: -1 }).lean();
      if (dbLinks && dbLinks.length > 0) {
        dbLinks.forEach(dl => {
          if (!links.has(dl.shortCode)) {
            links.set(dl.shortCode, dl);
          }
        });
        allLinks = Array.from(links.values());
      }
    } catch (err) {
      console.warn('Link sync warning:', err.message);
    }
  }

  const role = (currentUser.role || currentUser.userType || 'user').toLowerCase();
  const isAdmin = role === 'admin' || role === 'host';

  const displayedLinks = isAdmin
    ? allLinks
    : allLinks.filter(l => l.userId && l.userId.toString() === currentUserId.toString());

  displayedLinks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.render('dashboard', {
    page: 'dashboard',
    links: displayedLinks,
    campaigns: Array.from(campaigns.values()),
    query: req.query,
    currentUser,
    user: currentUser,
    isAdmin,
  });
});

// Dynamic QR Code Generator endpoint
router.get('/api/qr', async (req, res) => {
  try {
    const text = req.query.url || req.query.text || '';
    if (!text) {
      return res.status(400).send('URL or text parameter required');
    }
    const buffer = await QRCode.toBuffer(text, {
      width: 240,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).send('Error generating QR code');
  }
});

// Create Link — Step 1
router.get('/links/new', requireUserAuth, (req, res) => {
  res.render('wizard', {
    page: 'wizard',
    step: 1,
    error: null,
    campaigns: Array.from(campaigns.values()),
    formData: {},
    user: req.session.user,
  });
});

router.post('/links/step1', requireUserAuth, (req, res) => {
  const { originalUrl, customAlias } = req.body;
  const allCampaigns = Array.from(campaigns.values());

  if (!originalUrl || !originalUrl.startsWith('http')) {
    return res.render('wizard', {
      page: 'wizard',
      step: 1,
      error: 'Please enter a valid URL starting with http:// or https://',
      campaigns: allCampaigns,
      formData: req.body,
      user: req.session.user,
    });
  }

  if (customAlias && links.has(customAlias)) {
    return res.render('wizard', {
      page: 'wizard',
      step: 1,
      error: `Alias "${customAlias}" is already taken. Choose a different one.`,
      campaigns: allCampaigns,
      formData: req.body,
      user: req.session.user,
    });
  }

  res.render('wizard', {
    page: 'wizard',
    step: 2,
    error: null,
    campaigns: allCampaigns,
    formData: req.body,
    user: req.session.user,
  });
});

// Create Link — Step 2 (Publish)
router.post('/links/publish', requireUserAuth, async (req, res) => {
  const {
    originalUrl, customAlias, title,
    campaignId, tags, expiresAt, maxClicks,
    password, mobileUrl,
  } = req.body;

  const currentUserId = req.session.userId || (req.session.user ? req.session.user.id : null);
  const shortCode = customAlias
    ? customAlias.trim().toLowerCase().replace(/\s+/g, '-')
    : generateShortCode();

  if (links.has(shortCode)) {
    return res.render('wizard', {
      page: 'wizard',
      step: 2,
      error: `Alias "${shortCode}" was just taken. Please go back and pick another.`,
      campaigns: Array.from(campaigns.values()),
      formData: req.body,
      user: req.session.user,
    });
  }

  const link = {
    userId: currentUserId,
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

  if (isDbConnected()) {
    try {
      await LinkModel.create(link);
    } catch (err) {
      console.warn('MongoDB save warning:', err.message);
    }
  }

  res.redirect(`/?created=${shortCode}`);
});

// Delete link
router.post('/links/:code/delete', requireUserAuth, async (req, res) => {
  const code = req.params.code;
  const link = links.get(code);
  const currentUser = req.session.user || {};
  const currentUserId = req.session.userId || currentUser.id;
  const role = (currentUser.role || currentUser.userType || 'user').toLowerCase();
  const isAdmin = role === 'admin' || role === 'host';

  if (!link) {
    return res.redirect('/?deleted=1');
  }

  const isOwner = link.userId && link.userId.toString() === currentUserId.toString();
  if (!isAdmin && !isOwner) {
    return res.status(403).render('error-fallback', {
      type: 'disabled',
      message: 'Access Denied: You do not have permission to delete this link.',
    });
  }

  links.delete(code);
  for (let i = clicks.length - 1; i >= 0; i--) {
    if (clicks[i].linkId === code) {
      clicks.splice(i, 1);
    }
  }

  if (isDbConnected()) {
    try {
      await LinkModel.deleteOne({ shortCode: code });
    } catch (err) {
      console.warn('MongoDB delete warning:', err.message);
    }
  }

  res.redirect('/?deleted=1');
});

// Toggle link active/disabled status
router.post('/links/:code/toggle', requireUserAuth, async (req, res) => {
  const code = req.params.code;
  const link = links.get(code);
  const currentUser = req.session.user || {};
  const currentUserId = req.session.userId || currentUser.id;
  const role = (currentUser.role || currentUser.userType || 'user').toLowerCase();
  const isAdmin = role === 'admin' || role === 'host';

  if (!link) {
    return res.redirect('/');
  }

  const isOwner = link.userId && link.userId.toString() === currentUserId.toString();
  if (!isAdmin && !isOwner) {
    return res.status(403).render('error-fallback', {
      type: 'disabled',
      message: 'Access Denied: You do not have permission to modify this link.',
    });
  }

  link.status = link.status === 'active' ? 'disabled' : 'active';
  if (isDbConnected()) {
    try {
      await LinkModel.updateOne({ shortCode: code }, { status: link.status });
    } catch (err) {
      console.warn('MongoDB update warning:', err.message);
    }
  }

  res.redirect('/');
});

// Campaign Management
router.get('/campaigns', requireUserAuth, (req, res) => {
  res.render('campaigns', {
    page: 'campaigns',
    campaigns: Array.from(campaigns.values()),
    links: Array.from(links.values()),
    user: req.session.user,
  });
});

router.post('/campaigns/new', requireUserAuth, (req, res) => {
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
