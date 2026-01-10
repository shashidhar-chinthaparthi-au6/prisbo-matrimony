import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

dotenv.config();

const seedSubscriptions = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get all users (excluding super_admin and vendors)
    const users = await User.find({ role: 'user' });
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1 });

    if (users.length === 0) {
      console.log('No users found. Please seed users first.');
      process.exit(1);
    }

    if (plans.length === 0) {
      console.log('No subscription plans found. Please seed plans first.');
      process.exit(1);
    }

    console.log(`\nFound ${users.length} users and ${plans.length} plans`);

    // Clear existing subscriptions
    await Subscription.deleteMany({});
    console.log('✓ Cleared existing subscriptions');

    const subscriptions = [];
    const now = new Date();

    // Create subscriptions for different users with different statuses
    for (let i = 0; i < Math.min(users.length, 15); i++) {
      const user = users[i];
      const plan = plans[i % plans.length];
      
      let status, startDate, endDate, approvedAt, approvedBy;
      
      // Create different statuses
      if (i < 5) {
        // Approved subscriptions
        status = 'approved';
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (i * 10)); // Different start dates
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.duration);
        approvedAt = startDate;
        approvedBy = null; // Admin approved
      } else if (i < 8) {
        // Pending subscriptions
        status = 'pending';
        startDate = null;
        endDate = null;
        approvedAt = null;
        approvedBy = null;
      } else if (i < 10) {
        // Rejected subscriptions
        status = 'rejected';
        startDate = null;
        endDate = null;
        approvedAt = null;
        approvedBy = null;
      } else if (i < 12) {
        // Cancelled subscriptions
        status = 'cancelled';
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 20);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.duration);
        approvedAt = startDate;
        approvedBy = null;
      } else {
        // Expired subscriptions
        status = 'approved';
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (plan.duration + 5)); // Expired
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.duration);
        approvedAt = startDate;
        approvedBy = null;
      }

      // Different payment methods
      const paymentMethods = ['upi', 'cash', 'mixed'];
      const paymentMethod = paymentMethods[i % paymentMethods.length];

      const subscription = {
        userId: user._id,
        planId: plan._id,
        planName: plan.name,
        planDuration: plan.duration,
        amount: plan.price,
        paymentMethod: paymentMethod,
        status: status,
        startDate: startDate,
        endDate: endDate,
        approvedAt: approvedAt,
        approvedBy: approvedBy,
      };

      // Add payment-specific fields
      if (paymentMethod === 'upi' || paymentMethod === 'mixed') {
        subscription.upiAmount = paymentMethod === 'mixed' ? plan.price * 0.5 : plan.price;
        subscription.upiScreenshot = `/uploads/subscriptions/upi_${user._id}_${Date.now()}.jpg`;
      }
      if (paymentMethod === 'cash' || paymentMethod === 'mixed') {
        subscription.cashAmount = paymentMethod === 'mixed' ? plan.price * 0.5 : plan.price;
        subscription.cashReceivedBy = 'Admin';
        subscription.cashReceivedDate = status === 'approved' ? startDate : null;
      }

      subscriptions.push(subscription);
    }

    // Insert subscriptions
    const createdSubscriptions = await Subscription.insertMany(subscriptions);
    console.log(`✓ Created ${createdSubscriptions.length} subscriptions`);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('SUBSCRIPTIONS SEEDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nSubscription Summary:');
    
    const statusCounts = {};
    createdSubscriptions.forEach(sub => {
      statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nPayment Methods:');
    const paymentCounts = {};
    createdSubscriptions.forEach(sub => {
      paymentCounts[sub.paymentMethod] = (paymentCounts[sub.paymentMethod] || 0) + 1;
    });
    Object.entries(paymentCounts).forEach(([method, count]) => {
      console.log(`  ${method}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscriptions:', error);
    process.exit(1);
  }
};

seedSubscriptions();

