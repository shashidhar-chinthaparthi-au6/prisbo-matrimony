import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

dotenv.config();
connectDB();

const seedPlans = async () => {
  try {
    // Check if plans already exist
    const existingPlans = await SubscriptionPlan.countDocuments();
    if (existingPlans > 0) {
      console.log('Subscription plans already exist. Skipping seed.');
      process.exit(0);
    }

    const plans = [
      {
        name: '1 Month',
        duration: 30,
        price: 499,
        currency: 'INR',
        isActive: true,
        displayOrder: 1,
      },
      {
        name: '3 Months',
        duration: 90,
        price: 1299,
        currency: 'INR',
        isActive: true,
        displayOrder: 2,
      },
      {
        name: '6 Months',
        duration: 180,
        price: 2199,
        currency: 'INR',
        isActive: true,
        displayOrder: 3,
      },
      {
        name: '12 Months',
        duration: 365,
        price: 3999,
        currency: 'INR',
        isActive: true,
        displayOrder: 4,
      },
    ];

    await SubscriptionPlan.insertMany(plans);
    console.log('Subscription plans seeded successfully!');
    console.log('Plans created:');
    plans.forEach((plan) => {
      console.log(`- ${plan.name}: ₹${plan.price} (${plan.duration} days)`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    process.exit(1);
  }
};

seedPlans();

