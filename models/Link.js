const mongoose = require('mongoose');

/**
 * LinkPulse Link Schema
 * Associates each link with its owner (userId)
 */
const LinkSchema = new mongoose.Schema({
  userId: {
    type: String, // Can store Mongoose User ObjectId string or Guest id
    ref: 'User',
    required: false,
    index: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  originalUrl: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
    default: 'Untitled Link',
  },
  campaignId: {
    type: String,
    default: null,
  },
  tags: {
    type: [String],
    default: [],
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  maxClicks: {
    type: Number,
    default: null,
  },
  passwordHash: {
    type: String,
    default: null,
  },
  mobileUrl: {
    type: String,
    default: null,
  },
  currentClicks: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'archived'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Link || mongoose.model('Link', LinkSchema);
