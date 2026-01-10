import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Invoice from '../models/Invoice.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Favorite from '../models/Favorite.js';
import Interest from '../models/Interest.js';
import Notification from '../models/Notification.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Sample image URLs from Unsplash (free placeholder images)
const sampleImages = {
  bride: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop',
  ],
  groom: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=600&fit=crop',
  ],
};

// Download image from URL
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
};

// Sample profiles data
const sampleProfiles = [
  // Bride profiles
  {
    type: 'bride',
    personalInfo: {
      firstName: 'Priya',
      lastName: 'Sharma',
      dateOfBirth: new Date('1995-05-15'),
      height: "5'4\"",
      weight: '55 kg',
      bloodGroup: 'O+',
      complexion: 'Fair',
      physicalStatus: 'Normal',
      maritalStatus: 'Never Married',
      motherTongue: 'Hindi',
      eatingHabits: 'Vegetarian',
      drinkingHabits: 'No',
      smokingHabits: 'No',
      about: 'Software engineer with a passion for music and travel. Looking for a life partner who shares similar values.',
    },
    familyInfo: {
      fatherName: 'Rajesh Sharma',
      fatherOccupation: 'Business',
      motherName: 'Sunita Sharma',
      motherOccupation: 'Teacher',
      siblings: '1 Brother',
      familyType: 'Nuclear',
      familyStatus: 'Upper Middle Class',
      familyValues: 'Traditional',
    },
    education: {
      highestEducation: 'B.Tech',
      college: 'IIT Delhi',
      degree: 'Computer Science',
      specialization: 'Software Engineering',
    },
    career: {
      occupation: 'Software Engineer',
      company: 'Tech Corp',
      annualIncome: '8-12 Lakhs',
      workingLocation: 'Bangalore',
    },
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
    religion: {
      religion: 'Hindu',
      caste: 'Brahmin',
      subCaste: 'Kanyakubj',
      star: 'Rohini',
      raasi: 'Vrishabha',
    },
  },
  {
    type: 'bride',
    personalInfo: {
      firstName: 'Ananya',
      lastName: 'Patel',
      dateOfBirth: new Date('1997-08-22'),
      height: "5'6\"",
      weight: '58 kg',
      bloodGroup: 'B+',
      complexion: 'Wheatish',
      physicalStatus: 'Normal',
      maritalStatus: 'Never Married',
      motherTongue: 'Gujarati',
      eatingHabits: 'Vegetarian',
      drinkingHabits: 'No',
      smokingHabits: 'No',
      about: 'Doctor by profession, love reading and cooking. Seeking a compatible partner.',
    },
    familyInfo: {
      fatherName: 'Kiran Patel',
      fatherOccupation: 'Doctor',
      motherName: 'Meera Patel',
      motherOccupation: 'Homemaker',
      siblings: '1 Sister',
      familyType: 'Joint',
      familyStatus: 'Upper Middle Class',
    },
    education: {
      highestEducation: 'MBBS',
      college: 'AIIMS Delhi',
      degree: 'Medicine',
    },
    career: {
      occupation: 'Doctor',
      company: 'Apollo Hospital',
      annualIncome: '12-15 Lakhs',
      workingLocation: 'Mumbai',
    },
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
    },
    religion: {
      religion: 'Hindu',
      caste: 'Patel',
    },
  },
  {
    type: 'bride',
    personalInfo: {
      firstName: 'Kavya',
      lastName: 'Reddy',
      dateOfBirth: new Date('1996-03-10'),
      height: "5'3\"",
      weight: '52 kg',
      bloodGroup: 'A+',
      complexion: 'Fair',
      physicalStatus: 'Normal',
      maritalStatus: 'Never Married',
      motherTongue: 'Telugu',
      eatingHabits: 'Non-Vegetarian',
      drinkingHabits: 'Occasionally',
      smokingHabits: 'No',
      about: 'Marketing professional, love dancing and exploring new places.',
    },
    familyInfo: {
      fatherName: 'Venkatesh Reddy',
      fatherOccupation: 'Engineer',
      motherName: 'Lakshmi Reddy',
      motherOccupation: 'Teacher',
      siblings: '1 Brother',
      familyType: 'Nuclear',
      familyStatus: 'Middle Class',
    },
    education: {
      highestEducation: 'MBA',
      college: 'IIM Bangalore',
      degree: 'Marketing',
    },
    career: {
      occupation: 'Marketing Manager',
      company: 'Marketing Solutions',
      annualIncome: '10-15 Lakhs',
      workingLocation: 'Hyderabad',
    },
    location: {
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      pincode: '500001',
    },
    religion: {
      religion: 'Hindu',
      caste: 'Reddy',
    },
  },
  // Groom profiles
  {
    type: 'groom',
    personalInfo: {
      firstName: 'Rahul',
      lastName: 'Kumar',
      dateOfBirth: new Date('1993-11-20'),
      height: "5'10\"",
      weight: '75 kg',
      bloodGroup: 'O+',
      complexion: 'Wheatish',
      physicalStatus: 'Normal',
      maritalStatus: 'Never Married',
      motherTongue: 'Hindi',
      eatingHabits: 'Non-Vegetarian',
      drinkingHabits: 'Occasionally',
      smokingHabits: 'No',
      about: 'IT professional working in a leading tech company. Love sports and music.',
    },
    familyInfo: {
      fatherName: 'Amit Kumar',
      fatherOccupation: 'Government Service',
      motherName: 'Rekha Kumar',
      motherOccupation: 'Homemaker',
      siblings: '1 Sister',
      familyType: 'Nuclear',
      familyStatus: 'Middle Class',
    },
    education: {
      highestEducation: 'B.Tech',
      college: 'NIT Delhi',
      degree: 'Computer Science',
    },
    career: {
      occupation: 'Software Engineer',
      company: 'Google',
      annualIncome: '15-20 Lakhs',
      workingLocation: 'Bangalore',
    },
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
    religion: {
      religion: 'Hindu',
      caste: 'Brahmin',
    },
  },
  {
    type: 'groom',
    personalInfo: {
      firstName: 'Arjun',
      lastName: 'Singh',
      dateOfBirth: new Date('1994-07-05'),
      height: "6'0\"",
      weight: '80 kg',
      bloodGroup: 'B+',
      complexion: 'Fair',
      physicalStatus: 'Normal',
      maritalStatus: 'Never Married',
      motherTongue: 'Punjabi',
      eatingHabits: 'Non-Vegetarian',
      drinkingHabits: 'No',
      smokingHabits: 'No',
      about: 'Business owner, passionate about entrepreneurship and fitness.',
    },
    familyInfo: {
      fatherName: 'Harpreet Singh',
      fatherOccupation: 'Business',
      motherName: 'Gurpreet Kaur',
      motherOccupation: 'Homemaker',
      siblings: '1 Brother',
      familyType: 'Joint',
      familyStatus: 'Upper Middle Class',
    },
    education: {
      highestEducation: 'MBA',
      college: 'ISB Hyderabad',
      degree: 'Business Administration',
    },
    career: {
      occupation: 'Business Owner',
      company: 'Singh Enterprises',
      annualIncome: '20-30 Lakhs',
      workingLocation: 'Delhi',
    },
    location: {
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      pincode: '110001',
    },
    religion: {
      religion: 'Sikh',
      caste: 'Jat',
    },
  },
  {
    type: 'groom',
    personalInfo: {
      firstName: 'Vikram',
      lastName: 'Menon',
      dateOfBirth: new Date('1995-02-14'),
      height: "5'11\"",
      weight: '72 kg',
      bloodGroup: 'A+',
      complexion: 'Wheatish',
      physicalStatus: 'Normal',
      maritalStatus: 'Never Married',
      motherTongue: 'Malayalam',
      eatingHabits: 'Non-Vegetarian',
      drinkingHabits: 'No',
      smokingHabits: 'No',
      about: 'Doctor specializing in cardiology. Love reading and traveling.',
    },
    familyInfo: {
      fatherName: 'Ramesh Menon',
      fatherOccupation: 'Doctor',
      motherName: 'Lakshmi Menon',
      motherOccupation: 'Teacher',
      siblings: '1 Sister',
      familyType: 'Nuclear',
      familyStatus: 'Upper Middle Class',
    },
    education: {
      highestEducation: 'MD',
      college: 'AIIMS Delhi',
      degree: 'Cardiology',
    },
    career: {
      occupation: 'Cardiologist',
      company: 'Fortis Hospital',
      annualIncome: '25-35 Lakhs',
      workingLocation: 'Chennai',
    },
    location: {
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      pincode: '600001',
    },
    religion: {
      religion: 'Hindu',
      caste: 'Nair',
    },
  },
];

// Credentials to save
const credentials = {
  super_admin: [],
  admin: [],
  vendor: [],
  users: [],
};

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Clear existing data from ALL collections
    console.log('\nClearing all existing data...');
    await Profile.deleteMany({});
    await User.deleteMany({});
    await Subscription.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await Invoice.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
    await Favorite.deleteMany({});
    await Interest.deleteMany({});
    await Notification.deleteMany({});
    console.log('✓ All collections cleared');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create Super Admin
    console.log('\nCreating Super Admin...');
    const superAdmin = await User.create({
      email: 'superadmin@prisbo.com',
      phone: '9999999999',
      password: 'superadmin123',
      role: 'super_admin',
      isActive: true,
    });
    credentials.super_admin.push({
      email: 'superadmin@prisbo.com',
      phone: '9999999999',
      password: 'superadmin123',
      role: 'super_admin',
    });
    console.log('✓ Super Admin created');

    // Create Vendors (3 vendors, each will have multiple profiles)
    console.log('\nCreating Vendors...');
    const vendors = [];
    
    const vendorData = [
      {
        email: 'vendor1@prisbo.com',
        phone: '7777777777',
        password: 'vendor123',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        companyName: 'Matrimony Services Pvt Ltd',
        vendorContactInfo: 'contact@matrimonyservices.com',
        vendorAddress: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
      },
      {
        email: 'vendor2@prisbo.com',
        phone: '6666666666',
        password: 'vendor123',
        firstName: 'Priya',
        lastName: 'Sharma',
        companyName: 'Wedding Solutions',
        vendorContactInfo: 'info@weddingsolutions.com',
        vendorAddress: {
          city: 'Delhi',
          state: 'Delhi',
          country: 'India',
        },
      },
      {
        email: 'vendor3@prisbo.com',
        phone: '5555555555',
        password: 'vendor123',
        firstName: 'Amit',
        lastName: 'Patel',
        companyName: 'Perfect Match Matrimony',
        vendorContactInfo: 'support@perfectmatch.com',
        vendorAddress: {
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
        },
      },
    ];

    for (const vendorInfo of vendorData) {
      const vendor = await User.create({
        email: vendorInfo.email,
        phone: vendorInfo.phone,
        password: vendorInfo.password,
        firstName: vendorInfo.firstName,
        lastName: vendorInfo.lastName,
        role: 'vendor',
        companyName: vendorInfo.companyName,
        vendorContactInfo: vendorInfo.vendorContactInfo,
        vendorAddress: vendorInfo.vendorAddress,
        isActive: true,
      });
      vendors.push(vendor);
      credentials.vendor.push({
        email: vendorInfo.email,
        phone: vendorInfo.phone,
        password: vendorInfo.password,
        role: 'vendor',
        companyName: vendorInfo.companyName,
        contactPerson: `${vendorInfo.firstName} ${vendorInfo.lastName}`,
      });
    }
    console.log(`✓ Created ${vendors.length} vendors`);

    // Create regular users and profiles
    console.log('\nCreating users and profiles...');
    let imageIndex = 0;

    for (let i = 0; i < sampleProfiles.length; i++) {
      const profileData = sampleProfiles[i];
      const profileType = profileData.type;
      
      // Create user
      const userEmail = `${profileData.personalInfo.firstName.toLowerCase()}${i + 1}@prisbo.com`;
      const userPhone = `9${String(i + 1).padStart(9, '0')}`;
      const userPassword = 'user123';

      const user = await User.create({
        email: userEmail,
        phone: userPhone,
        password: userPassword,
        role: 'user',
        profileType: profileType,
        isActive: true,
      });

      credentials.users.push({
        email: userEmail,
        phone: userPhone,
        password: userPassword,
        name: `${profileData.personalInfo.firstName} ${profileData.personalInfo.lastName}`,
      });

      // Download and save images
      const images = sampleImages[profileType];
      const photos = [];
      
      // Download 2-3 images per profile
      const numImages = Math.min(3, images.length);
      for (let j = 0; j < numImages; j++) {
        try {
          const imageUrl = images[(imageIndex + j) % images.length];
          const filename = `${profileData.personalInfo.firstName.toLowerCase()}_${i}_${j}_${Date.now()}.jpg`;
          const filepath = path.join(uploadsDir, filename);
          
          console.log(`  Downloading image ${j + 1}/${numImages} for ${profileData.personalInfo.firstName}...`);
          await downloadImage(imageUrl, filepath);
          
          const relativePath = `/uploads/profiles/${filename}`;
          photos.push({
            url: relativePath,
            isPrimary: j === 0,
            uploadedAt: new Date(),
          });
        } catch (error) {
          console.warn(`  Failed to download image ${j + 1}: ${error.message}`);
        }
      }

      imageIndex += numImages;

      // All regular profiles are created by users themselves
      const createdBy = user._id;
      const isVendorCreated = false;

      // Create profile
      const profile = await Profile.create({
        userId: user._id,
        createdBy: createdBy,
        isVendorCreated: isVendorCreated,
        ...profileData,
        photos: photos,
        isActive: true,
        verificationStatus: i < 4 ? 'approved' : 'pending', // First 4 approved, rest pending
        verifiedBy: i < 4 ? superAdmin._id : undefined,
        verifiedAt: i < 4 ? new Date() : undefined,
      });

      console.log(`✓ Created profile for ${profileData.personalInfo.firstName} ${profileData.personalInfo.lastName}`);
    }

    // Create vendor-created profiles (each vendor gets 3-4 profiles)
    console.log('\nCreating vendor-created profiles...');
    
    const vendorProfilesData = [
      // Vendor 1 profiles (4 profiles)
      { vendorIndex: 0, type: 'bride', firstName: 'Sneha', lastName: 'Joshi', dob: '1998-01-18', city: 'Pune', state: 'Maharashtra', religion: 'Hindu', caste: 'Brahmin', height: "5'5\"", weight: '56 kg', bloodGroup: 'AB+', motherTongue: 'Marathi' },
      { vendorIndex: 0, type: 'groom', firstName: 'Rohan', lastName: 'Desai', dob: '1995-06-12', city: 'Mumbai', state: 'Maharashtra', religion: 'Hindu', caste: 'Gujarati', height: "5'10\"", weight: '72 kg', bloodGroup: 'B+', motherTongue: 'Gujarati' },
      { vendorIndex: 0, type: 'bride', firstName: 'Meera', lastName: 'Patel', dob: '1997-03-25', city: 'Ahmedabad', state: 'Gujarat', religion: 'Hindu', caste: 'Patel', height: "5'4\"", weight: '54 kg', bloodGroup: 'O+', motherTongue: 'Gujarati' },
      { vendorIndex: 0, type: 'groom', firstName: 'Karan', lastName: 'Shah', dob: '1994-11-08', city: 'Surat', state: 'Gujarat', religion: 'Hindu', caste: 'Bania', height: "5'11\"", weight: '75 kg', bloodGroup: 'A+', motherTongue: 'Gujarati' },
      
      // Vendor 2 profiles (4 profiles)
      { vendorIndex: 1, type: 'bride', firstName: 'Anjali', lastName: 'Singh', dob: '1996-08-15', city: 'Delhi', state: 'Delhi', religion: 'Hindu', caste: 'Rajput', height: "5'6\"", weight: '58 kg', bloodGroup: 'B+', motherTongue: 'Hindi' },
      { vendorIndex: 1, type: 'groom', firstName: 'Aditya', lastName: 'Verma', dob: '1993-09-25', city: 'Lucknow', state: 'Uttar Pradesh', religion: 'Hindu', caste: 'Kayastha', height: "5'9\"", weight: '74 kg', bloodGroup: 'O+', motherTongue: 'Hindi' },
      { vendorIndex: 1, type: 'bride', firstName: 'Pooja', lastName: 'Gupta', dob: '1998-02-20', city: 'Noida', state: 'Uttar Pradesh', religion: 'Hindu', caste: 'Agarwal', height: "5'3\"", weight: '52 kg', bloodGroup: 'A+', motherTongue: 'Hindi' },
      { vendorIndex: 1, type: 'groom', firstName: 'Vishal', lastName: 'Jain', dob: '1995-12-30', city: 'Gurgaon', state: 'Haryana', religion: 'Hindu', caste: 'Jain', height: "6'0\"", weight: '78 kg', bloodGroup: 'AB+', motherTongue: 'Hindi' },
      
      // Vendor 3 profiles (3 profiles)
      { vendorIndex: 2, type: 'bride', firstName: 'Divya', lastName: 'Rao', dob: '1997-05-10', city: 'Bangalore', state: 'Karnataka', religion: 'Hindu', caste: 'Brahmin', height: "5'5\"", weight: '55 kg', bloodGroup: 'O+', motherTongue: 'Kannada' },
      { vendorIndex: 2, type: 'groom', firstName: 'Suresh', lastName: 'Kumar', dob: '1994-07-18', city: 'Mysore', state: 'Karnataka', religion: 'Hindu', caste: 'Vokkaliga', height: "5'10\"", weight: '73 kg', bloodGroup: 'B+', motherTongue: 'Kannada' },
      { vendorIndex: 2, type: 'bride', firstName: 'Lakshmi', lastName: 'Iyer', dob: '1996-10-05', city: 'Chennai', state: 'Tamil Nadu', religion: 'Hindu', caste: 'Iyer', height: "5'4\"", weight: '53 kg', bloodGroup: 'A+', motherTongue: 'Tamil' },
    ];

    let vendorProfileIndex = 0;
    for (const profileInfo of vendorProfilesData) {
      const vendor = vendors[profileInfo.vendorIndex];
      const profileType = profileInfo.type;
      
      // Create user for the person
      const userEmail = `${profileInfo.firstName.toLowerCase()}vendor${vendorProfileIndex + 1}@prisbo.com`;
      const userPhone = `8${String(vendorProfileIndex + 1).padStart(9, '0')}`;
      const userPassword = 'user123';

      const user = await User.create({
        email: userEmail,
        phone: userPhone,
        password: userPassword,
        role: 'user',
        profileType: profileType,
        isActive: true,
      });

      credentials.users.push({
        email: userEmail,
        phone: userPhone,
        password: userPassword,
        name: `${profileInfo.firstName} ${profileInfo.lastName}`,
        createdBy: 'vendor',
        vendorCompany: vendor.companyName,
      });

      // Download images
      const images = sampleImages[profileType];
      const photos = [];
      
      for (let j = 0; j < 2; j++) {
        try {
          const imageUrl = images[(vendorProfileIndex * 2 + j) % images.length];
          const filename = `vendor_${profileInfo.firstName.toLowerCase()}_${vendorProfileIndex}_${j}_${Date.now()}.jpg`;
          const filepath = path.join(uploadsDir, filename);
          
          await downloadImage(imageUrl, filepath);
          
          const relativePath = `/uploads/profiles/${filename}`;
          photos.push({
            url: relativePath,
            isPrimary: j === 0,
            uploadedAt: new Date(),
          });
        } catch (error) {
          console.warn(`  Failed to download image: ${error.message}`);
        }
      }

      // Create profile (created by vendor)
      await Profile.create({
        userId: user._id,
        createdBy: vendor._id,
        isVendorCreated: true,
        type: profileType,
        personalInfo: {
          firstName: profileInfo.firstName,
          lastName: profileInfo.lastName,
          dateOfBirth: new Date(profileInfo.dob),
          height: profileInfo.height,
          weight: profileInfo.weight,
          bloodGroup: profileInfo.bloodGroup,
          complexion: 'Fair',
          physicalStatus: 'Normal',
          maritalStatus: 'Never Married',
          motherTongue: profileInfo.motherTongue,
          eatingHabits: 'Vegetarian',
          drinkingHabits: 'No',
          smokingHabits: 'No',
        },
        location: {
          city: profileInfo.city,
          state: profileInfo.state,
          country: 'India',
        },
        religion: {
          religion: profileInfo.religion,
          caste: profileInfo.caste,
        },
        photos: photos,
        isActive: true,
        verificationStatus: vendorProfileIndex < 3 ? 'approved' : 'pending', // First 3 approved
        verifiedBy: vendorProfileIndex < 3 ? superAdmin._id : undefined,
        verifiedAt: vendorProfileIndex < 3 ? new Date() : undefined,
      });

      console.log(`✓ Created vendor profile for ${profileInfo.firstName} ${profileInfo.lastName} (${vendor.companyName})`);
      vendorProfileIndex++;
    }

    // Save credentials to file
    const credentialsPath = path.join(__dirname, '../credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    console.log(`\n✓ Credentials saved to: ${credentialsPath}`);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('DATABASE SEEDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nCredentials Summary:');
    console.log('\nSuper Admin:');
    credentials.super_admin.forEach(cred => {
      console.log(`  Email: ${cred.email} | Password: ${cred.password}`);
    });
    console.log('\nVendors:');
    credentials.vendor.forEach(cred => {
      console.log(`  Email: ${cred.email} | Password: ${cred.password} | Company: ${cred.companyName}`);
    });
    console.log('\nUsers (All):');
    credentials.users.forEach(cred => {
      console.log(`  ${cred.name}: ${cred.email} | Password: ${cred.password}`);
    });
    const totalVendorProfiles = vendorProfilesData.length;
    console.log(`\nTotal Profiles Created: ${sampleProfiles.length} (user-created) + ${totalVendorProfiles} (vendor-created) = ${sampleProfiles.length + totalVendorProfiles}`);
    console.log(`\nVendor Profile Distribution:`);
    vendors.forEach((vendor, idx) => {
      const count = vendorProfilesData.filter(p => p.vendorIndex === idx).length;
      console.log(`  ${vendor.companyName}: ${count} profiles`);
    });
    console.log(`\nFull credentials saved to: ${credentialsPath}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

