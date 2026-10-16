const express = require('express');
const router = express.Router();
const { links, clicks, campaigns } = require('../data/store');

router.get('/', (req, res) => {
  const allLinks = Array.from(links.values());
  const allClicks = clicks;

  // Clicks over last 7 days (by date)
  const last7 = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const count = allClicks.filter(c => {
      const cd = new Date(c.timestamp);
      return cd.toDateString() === d.toDateString();
    }).length;
    last7.push({ label, count });
  }

  // Device breakdown
  const deviceMap = {};
  allClicks.forEach(c => {
    deviceMap[c.deviceType] = (deviceMap[c.deviceType] || 0) + 1;
  });

  // Browser breakdown
  const browserMap = {};
  allClicks.forEach(c => {
    browserMap[c.browser] = (browserMap[c.browser] || 0) + 1;
  });

  // Country breakdown
  const countryMap = {};
  allClicks.forEach(c => {
    countryMap[c.country] = (countryMap[c.country] || 0) + 1;
  });

  // Source (QR vs Direct)
  const sourceMap = { qr: 0, direct: 0 };
  allClicks.forEach(c => { sourceMap[c.source] = (sourceMap[c.source] || 0) + 1; });

  // Top links
  const topLinks = [...allLinks]
    .sort((a, b) => b.currentClicks - a.currentClicks)
    .slice(0, 5);

  res.render('analytics', {
    totalClicks: allClicks.length,
    totalLinks: allLinks.length,
    totalCampaigns: campaigns.size,
    activeLinks: allLinks.filter(l => l.status === 'active').length,
    last7,
    deviceMap,
    browserMap,
    countryMap,
    sourceMap,
    topLinks,
  });
});

module.exports = router;
