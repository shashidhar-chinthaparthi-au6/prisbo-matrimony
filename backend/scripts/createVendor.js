import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/database.js';

dotenv.config();

const createVendor = async () => {
  try {
    await connectDB();

    const email = process.argv[2] || 'vendor@prisbo.com';
    const phone = process.argv[3] || '9876543210';
    const password = process.argv[4] || 'vendor123';
    const companyName = process.argv[5] || '';

    // Check if user with email/phone exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      // Update existing user to vendor
      existingUser.role = 'vendor';
      existingUser.password = password; // This will be hashed by the pre-save hook
      if (companyName) {
        existingUser.companyName = companyName;
      }
      await existingUser.save();
      console.log('Updated existing user to vendor:');
      console.log(`Email: ${existingUser.email}`);
      console.log(`Phone: ${existingUser.phone}`);
      console.log(`Password: ${password}`);
      if (companyName) {
        console.log(`Company: ${companyName}`);
      }
      console.log('\nPlease change the password after first login!');
      process.exit(0);
    }

    // Create new vendor user
    const vendor = await User.create({
      email,
      phone,
      password,
      role: 'vendor',
      companyName: companyName || undefined,
    });

    console.log('Vendor account created successfully!');
    console.log(`Email: ${vendor.email}`);
    console.log(`Phone: ${vendor.phone}`);
    console.log(`Password: ${password}`);
    if (companyName) {
      console.log(`Company: ${companyName}`);
    }
    console.log('\nPlease change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating vendor:', error.message);
    process.exit(1);
  }
};

createVendor();

