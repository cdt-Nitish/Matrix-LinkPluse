const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://nitishjoshi1520_db_user:Vp4HBO69ARP5wUog@ac-pdxdf5z-shard-00-00.qwy5hmi.mongodb.net:27017,ac-pdxdf5z-shard-00-01.qwy5hmi.mongodb.net:27017,ac-pdxdf5z-shard-00-02.qwy5hmi.mongodb.net:27017/?ssl=true&replicaSet=atlas-n6xhe7-shard-0&authSource=admin";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
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
