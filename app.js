const express = require('express');
const path = require('path');

const linkRoutes = require('./routes/linkRoutes');
const redirectRoutes = require('./routes/redirectRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
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

app.listen(PORT, () => {
  console.log(`LinkPulse running at http://localhost:${PORT}`);
});
