import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/database.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const email = process.argv[2] || 'admin@prisbo.com';
    const phone = process.argv[3] || '1234567890';
    const password = process.argv[4] || 'admin123';

    // Check if user with email/phone exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      // Update existing user to admin and reset password
      existingUser.role = 'admin';
      existingUser.password = password; // This will be hashed by the pre-save hook
      await existingUser.save();
      console.log('Updated existing user to admin:');
      console.log(`Email: ${existingUser.email}`);
      console.log(`Phone: ${existingUser.phone}`);
      console.log(`Password: ${password}`);
      console.log('\nPlease change the password after first login!');
      process.exit(0);
    }

    // Check if admin already exists (but we're creating a new one)
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Note: Another admin account already exists:');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Phone: ${existingAdmin.phone}`);
      console.log('\nCreating new admin account...\n');
    }

    // Create new admin user
    const admin = await User.create({
      email,
      phone,
      password,
      role: 'admin',
    });

    console.log('Admin account created successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Phone: ${admin.phone}`);
    console.log(`Password: ${password}`);
    console.log('\nPlease change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();

