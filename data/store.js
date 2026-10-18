// In-memory data store (replaces MongoDB for now)
// All data lives here and resets on server restart.

const links = new Map();   // shortCode -> link object
const clicks = [];         // array of click objects
const campaigns = new Map(); // id -> campaign object
const blockedDomains = new Map(); // domain -> entry

let campaignCounter = 1;

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function base62(n) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  while (n > 0) {
    code = chars[n % 62] + code;
    n = Math.floor(n / 62);
  }
  return code.padStart(6, '0');
}

let shortCodeCounter = 100000;
function generateShortCode() {
  return base62(shortCodeCounter++);
}

// ── Seed data ───────────────────────────────────────────────────────────────

// Campaigns
const seedCampaigns = [
  { id: 'c1', name: 'Tech Geeks Fest', tags: ['event', 'hackathon'], status: 'active', createdAt: new Date('2026-09-01') },
  { id: 'c2', name: 'Product Launch Q4', tags: ['marketing'], status: 'active', createdAt: new Date('2026-10-01') },
  { id: 'c3', name: 'Summer Sale 2026', tags: ['promo'], status: 'archived', createdAt: new Date('2026-06-01') },
];
seedCampaigns.forEach(c => campaigns.set(c.id, c));

// Links
const seedLinks = [
  {
    shortCode: 'fest26',
    originalUrl: 'https://techgeeksfest.dev/register',
    title: 'Tech Geeks Fest Registration',
    campaignId: 'c1',
    tags: ['event'],
    expiresAt: new Date('2027-01-01'),
    maxClicks: null,
    passwordHash: null,
    mobileUrl: null,
    currentClicks: 142,
    status: 'active',
    isAbusive: false,
    createdAt: new Date('2026-09-05'),
  },
  {
    shortCode: 'launch4',
    originalUrl: 'https://example.com/product-launch',
    title: 'Q4 Product Launch Page',
    campaignId: 'c2',
    tags: ['marketing'],
    expiresAt: null,
    maxClicks: 500,
    passwordHash: null,
    mobileUrl: 'https://m.example.com/product-launch',
    currentClicks: 317,
    status: 'active',
    isAbusive: false,
    createdAt: new Date('2026-10-02'),
  },
  {
    shortCode: 'sale26',
    originalUrl: 'https://shop.example.com/summer-sale',
    title: 'Summer Sale Landing',
    campaignId: 'c3',
    tags: ['promo'],
    expiresAt: new Date('2026-08-31'),
    maxClicks: 1000,
    passwordHash: null,
    mobileUrl: null,
    currentClicks: 988,
    status: 'disabled',
    isAbusive: false,
    createdAt: new Date('2026-06-10'),
  },
  {
    shortCode: 'secpdf',
    originalUrl: 'https://drive.example.com/secret-report.pdf',
    title: 'Confidential Report',
    campaignId: null,
    tags: [],
    expiresAt: null,
    maxClicks: 2,
    passwordHash: 'pass123',
    mobileUrl: null,
    currentClicks: 1,
    status: 'active',
    isAbusive: false,
    createdAt: new Date('2026-10-10'),
  },
];
seedLinks.forEach(l => links.set(l.shortCode, l));

// Clicks (sample analytics)
const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
const devices = ['Desktop', 'Mobile', 'Tablet'];
const countries = ['IN', 'US', 'GB', 'DE', 'SG'];
const sources = ['direct', 'qr'];
const seedShortCodes = ['fest26', 'launch4', 'sale26'];

for (let i = 0; i < 80; i++) {
  const sc = seedShortCodes[i % 3];
  const link = links.get(sc);
  clicks.push({
    id: `clk${i}`,
    linkId: sc,
    campaignId: link.campaignId,
    timestamp: new Date(Date.now() - Math.random() * 30 * 86400000),
    country: countries[Math.floor(Math.random() * countries.length)],
    deviceType: devices[Math.floor(Math.random() * devices.length)],
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
  });
}

// ── Users ───────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const users = new Map(); // id -> user object

const defaultPasswordHash = bcrypt.hashSync('password123', 10);

const seedUsers = [
  {
    id: 'usr_admin',
    fullName: 'Alex Morgan',
    email: 'admin@linkpulse.io',
    username: 'admin',
    passwordHash: defaultPasswordHash,
    role: 'Admin',
    organization: 'LinkPulse HQ',
    accountType: 'Enterprise',
    createdAt: new Date('2026-01-15'),
  },
  {
    id: 'usr_demo',
    fullName: 'Nitish Joshi',
    email: 'demo@linkpulse.io',
    username: 'demo_user',
    passwordHash: defaultPasswordHash,
    role: 'Creator',
    organization: 'Tech Geeks Team',
    accountType: 'Pro',
    createdAt: new Date('2026-02-01'),
  },
];
seedUsers.forEach(u => users.set(u.id, u));

function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  for (const user of users.values()) {
    if (user.email.toLowerCase() === normalized) return user;
  }
  return null;
}

function findUserByUsername(username) {
  if (!username) return null;
  const normalized = username.trim().toLowerCase();
  for (const user of users.values()) {
    if (user.username && user.username.toLowerCase() === normalized) return user;
  }
  return null;
}

function findUserByLogin(loginId) {
  if (!loginId) return null;
  return findUserByEmail(loginId) || findUserByUsername(loginId);
}

function findUserById(id) {
  return users.get(id) || null;
}

function createUser({ fullName, email, username, password, organization, role, accountType }) {
  const id = 'usr_' + generateId().toLowerCase();
  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = {
    id,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    username: username ? username.trim().toLowerCase() : email.split('@')[0],
    passwordHash,
    role: role || 'Member',
    organization: organization ? organization.trim() : 'Independent',
    accountType: accountType || 'Pro',
    createdAt: new Date(),
  };
  users.set(id, newUser);
  return newUser;
}

function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compareSync(plainPassword, passwordHash);
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  links,
  clicks,
  campaigns,
  blockedDomains,
  users,
  findUserByEmail,
  findUserByUsername,
  findUserByLogin,
  findUserById,
  createUser,
  verifyPassword,
  generateShortCode,
  generateId,
};

