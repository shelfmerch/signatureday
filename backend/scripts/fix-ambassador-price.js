/**
 * One-time script: set pricePerMember to 149 for any group that has ambassadorId
 * but currently has pricePerMember 189 (should be 149 for ambassador-linked groups).
 *
 * Run from backend folder: node scripts/fix-ambassador-price.js
 * Or: npm run fix-ambassador-price (if script is added to package.json)
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Group from '../models/groupModel.js';

dotenv.config();

const run = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/signatureday';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const result = await Group.updateMany(
      {
        ambassadorId: { $ne: null, $exists: true },
        pricePerMember: 189,
      },
      { $set: { pricePerMember: 149 } }
    );

    console.log(`Updated ${result.modifiedCount} group(s) to pricePerMember 149 (ambassador-linked).`);
    if (result.matchedCount > 0 && result.modifiedCount === 0) {
      console.log('(No changes needed: matched groups already had pricePerMember 149.)');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
};

run();
