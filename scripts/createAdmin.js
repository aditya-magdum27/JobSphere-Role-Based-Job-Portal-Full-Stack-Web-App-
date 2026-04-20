/**
 * Run once to create the admin account:
 *   node scripts/createAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jobsphere';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jobsphere.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ username: ADMIN_USERNAME });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`✅ Updated existing user "${ADMIN_USERNAME}" to admin role.`);
    } else {
      console.log(`ℹ️  Admin "${ADMIN_USERNAME}" already exists.`);
    }
    await mongoose.disconnect();
    return;
  }

  const admin = new User({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    role: 'admin',
    bio: 'Site Administrator'
  });

  await User.register(admin, ADMIN_PASSWORD);
  console.log(`✅ Admin created! Username: ${ADMIN_USERNAME}, Password: ${ADMIN_PASSWORD}`);
  console.log('⚠️  Change the password immediately after first login via profile.');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
