const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * LinkPulse User Schema
 * Supports User vs Host account types
 */
const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['user', 'host', 'guest', 'admin'],
    default: 'user', // Option: 'user' or 'host'
  },
  userType: {
    type: String,
    enum: ['user', 'host', 'guest', 'admin'],
    default: 'user',
  },
  organization: {
    type: String,
    default: 'Personal',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook: sync names/roles and hash password automatically if modified
UserSchema.pre('save', async function () {
  // Sync names
  if (!this.fullName && (this.firstName || this.lastName)) {
    this.fullName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  } else if (this.fullName && !this.firstName) {
    const parts = this.fullName.split(' ');
    this.firstName = parts[0] || '';
    this.lastName = parts.slice(1).join(' ') || '';
  }

  // Sync role and userType
  if (this.userType && !this.role) {
    this.role = this.userType === 'guest' ? 'user' : this.userType;
  }
  if (this.role && !this.userType) {
    this.userType = this.role;
  }

  if (!this.isModified('password')) {
    return;
  }

  // Guard against double hashing if password was already hashed with bcrypt
  if (typeof this.password === 'string' && /^\$2[abxy]\$\d{2}\$/.test(this.password)) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password in database
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
