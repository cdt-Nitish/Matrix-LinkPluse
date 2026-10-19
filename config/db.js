require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const getMongoUri = () => process.env.MONGODB_URI || MONGODB_URI;

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri = getMongoUri();
  if (!uri) {
    console.warn('[MongoDB Notice] MONGODB_URI is not set in environment. Running in offline/fallback mode.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.warn('[MongoDB Notice] Offline fallback active:', error.message);
  }
};

module.exports = {
  connectDB,
  MONGODB_URI,
  mongoose,
};
