const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { connectDB } = require('./config/db');

// ============================================================================
// MONGODB CONNECTION URL
// PASTE YOUR MONGODB PATH / URI HERE:
// ============================================================================
const MONGODB_PATH_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/linkpulse';

// Connect to MongoDB using Mongoose
connectDB();

const linkRoutes = require('./routes/linkRoutes');
const redirectRoutes = require('./routes/redirectRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body & Cookie parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'linkpulse-session-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Provide current user to all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', linkRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminRoutes);
app.use('/', redirectRoutes); // must be last — catches /:shortCode

// 404 fallback
app.use((req, res) => {
  res.status(404).render('error-fallback', {
    type: '404',
    message: 'Page not found.',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LinkPulse running at http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.MONGODB_PATH_URL = MONGODB_PATH_URL;
