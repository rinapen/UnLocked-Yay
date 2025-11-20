import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    isConnected = true;
    console.log('[✓] MongoDB接続に成功しました。');
  } catch (err) {
    console.error('[×] MongoDB接続に失敗しました:', err);
    throw err;
  }
};