import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

dotenv.config();

const seedSupportChats = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get users
    const superAdmin = await User.findOne({ role: 'super_admin' });
    const vendors = await User.find({ role: 'vendor' });
    const regularUsers = await User.find({ role: 'user' });

    if (!superAdmin) {
      console.log('Super admin not found. Please seed database first.');
      process.exit(1);
    }

    if (vendors.length === 0) {
      console.log('No vendors found. Please seed database first.');
      process.exit(1);
    }

    if (regularUsers.length === 0) {
      console.log('No regular users found. Please seed database first.');
      process.exit(1);
    }

    console.log(`\nFound: 1 Super Admin, ${vendors.length} Vendors, ${regularUsers.length} Users`);

    // Note: We'll use upsert to avoid conflicts with existing chats
    console.log('✓ Preparing to seed support chats...');

    const chats = [];
    const messages = [];

    // 1. Create support chats between super_admin and vendors
    console.log('\nCreating super_admin <-> vendor chats...');
    for (let i = 0; i < Math.min(vendors.length, 3); i++) {
      const vendor = vendors[i];
      
      // Check if any chat exists with these participants (any type)
      let chat = await Chat.findOne({
        participants: { $all: [superAdmin._id, vendor._id] },
        chatType: 'support_superadmin_vendor',
      });

      if (!chat) {
        // Check if there's a conflicting chat with same participants
        const existingChat = await Chat.findOne({
          participants: { $all: [superAdmin._id, vendor._id] },
        });
        
        if (existingChat) {
          console.log(`  ⚠ Skipping: Chat already exists between Super Admin and ${vendor.companyName || vendor.email} (type: ${existingChat.chatType})`);
          continue;
        }

        try {
          chat = await Chat.create({
            participants: [superAdmin._id, vendor._id],
            chatType: 'support_superadmin_vendor',
            lastMessage: i === 0 ? 'Hello, I need help with my account.' : 'Thank you for your support!',
            lastMessageAt: new Date(Date.now() - i * 3600000),
          });
        } catch (error) {
          if (error.code === 11000) {
            console.log(`  ⚠ Skipping: Duplicate key error for Super Admin <-> ${vendor.companyName || vendor.email}`);
            continue;
          }
          throw error;
        }
      } else {
        chat.lastMessage = i === 0 ? 'Hello, I need help with my account.' : 'Thank you for your support!';
        chat.lastMessageAt = new Date(Date.now() - i * 3600000);
        await chat.save();
      }
      chats.push(chat);

      // Add some messages to first chat
      if (i === 0) {
        messages.push(
          await Message.create({
            chatId: chat._id,
            senderId: vendor._id,
            receiverId: superAdmin._id,
            content: 'Hello, I need help with my account.',
            isRead: false,
          }),
          await Message.create({
            chatId: chat._id,
            senderId: superAdmin._id,
            receiverId: vendor._id,
            content: 'Hi! How can I help you today?',
            isRead: true,
          }),
          await Message.create({
            chatId: chat._id,
            senderId: vendor._id,
            receiverId: superAdmin._id,
            content: 'I cannot access my vendor dashboard.',
            isRead: false,
          })
        );
      }
      console.log(`✓ Created chat: Super Admin <-> ${vendor.companyName || vendor.email}`);
    }

    // 2. Create support chats between super_admin and regular users (only self-created profiles)
    console.log('\nCreating super_admin <-> user chats...');
    const Profile = (await import('../models/Profile.js')).default;
    const selfCreatedUsers = [];
    
    for (const user of regularUsers) {
      const profile = await Profile.findOne({ userId: user._id });
      if (profile && !profile.isVendorCreated) {
        selfCreatedUsers.push(user);
      }
    }

    for (let i = 0; i < Math.min(selfCreatedUsers.length, 3); i++) {
      const user = selfCreatedUsers[i];
      
      // Find or create chat
      let chat = await Chat.findOne({
        participants: { $all: [superAdmin._id, user._id] },
        chatType: 'support_superadmin_user',
      });

      if (!chat) {
        // Check if there's a conflicting chat
        const existingChat = await Chat.findOne({
          participants: { $all: [superAdmin._id, user._id] },
        });
        
        if (existingChat) {
          console.log(`  ⚠ Skipping: Chat already exists between Super Admin and ${user.email} (type: ${existingChat.chatType})`);
          continue;
        }

        try {
          chat = await Chat.create({
            participants: [superAdmin._id, user._id],
            chatType: 'support_superadmin_user',
            lastMessage: i === 0 ? 'I have a question about my subscription.' : 'Thanks for the help!',
            lastMessageAt: new Date(Date.now() - (i + 3) * 3600000),
          });
        } catch (error) {
          if (error.code === 11000) {
            console.log(`  ⚠ Skipping: Duplicate key error for Super Admin <-> ${user.email}`);
            continue;
          }
          throw error;
        }
      } else {
        chat.lastMessage = i === 0 ? 'I have a question about my subscription.' : 'Thanks for the help!';
        chat.lastMessageAt = new Date(Date.now() - (i + 3) * 3600000);
        await chat.save();
      }
      chats.push(chat);

      // Add message to first chat
      if (i === 0) {
        messages.push(
          await Message.create({
            chatId: chat._id,
            senderId: user._id,
            receiverId: superAdmin._id,
            content: 'I have a question about my subscription.',
            isRead: false,
          })
        );
      }
      console.log(`✓ Created chat: Super Admin <-> ${user.email}`);
    }

    // 3. Create support chats between vendors and their users
    console.log('\nCreating vendor <-> user chats...');
    let vendorIndex = 0;
    for (const vendor of vendors) {
      // Find users whose profiles were created by this vendor
      const vendorCreatedProfiles = await Profile.find({
        createdBy: vendor._id,
        isVendorCreated: true,
      }).populate('userId');

      for (let i = 0; i < Math.min(vendorCreatedProfiles.length, 2); i++) {
        const profile = vendorCreatedProfiles[i];
        if (profile.userId) {
          // Find or create chat
          let chat = await Chat.findOne({
            participants: { $all: [vendor._id, profile.userId._id] },
            chatType: 'support_vendor_user',
          });

          if (!chat) {
            // Check if there's a conflicting chat
            const existingChat = await Chat.findOne({
              participants: { $all: [vendor._id, profile.userId._id] },
            });
            
            if (existingChat) {
              console.log(`  ⚠ Skipping: Chat already exists between ${vendor.companyName || vendor.email} and ${profile.userId.email} (type: ${existingChat.chatType})`);
              continue;
            }

            try {
              chat = await Chat.create({
                participants: [vendor._id, profile.userId._id],
                chatType: 'support_vendor_user',
                lastMessage: i === 0 ? 'Hello, I need to update my profile.' : 'Profile updated successfully!',
                lastMessageAt: new Date(Date.now() - (vendorIndex * 2 + i) * 3600000),
              });
            } catch (error) {
              if (error.code === 11000) {
                console.log(`  ⚠ Skipping: Duplicate key error for ${vendor.companyName || vendor.email} <-> ${profile.userId.email}`);
                continue;
              }
              throw error;
            }
          } else {
            chat.lastMessage = i === 0 ? 'Hello, I need to update my profile.' : 'Profile updated successfully!';
            chat.lastMessageAt = new Date(Date.now() - (vendorIndex * 2 + i) * 3600000);
            await chat.save();
          }
          chats.push(chat);

          // Add message to first chat of first vendor
          if (vendorIndex === 0 && i === 0) {
            messages.push(
              await Message.create({
                chatId: chat._id,
                senderId: profile.userId._id,
                receiverId: vendor._id,
                content: 'Hello, I need to update my profile.',
                isRead: false,
              })
            );
          }
          console.log(`✓ Created chat: ${vendor.companyName || vendor.email} <-> ${profile.userId.email}`);
        }
      }
      vendorIndex++;
    }

    console.log(`\n✓ Created ${chats.length} support chats`);
    console.log(`✓ Created ${messages.length} sample messages`);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('SUPPORT CHATS SEEDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nChat Summary:');
    console.log(`  Super Admin <-> Vendor: ${chats.filter(c => c.chatType === 'support_superadmin_vendor').length}`);
    console.log(`  Super Admin <-> User: ${chats.filter(c => c.chatType === 'support_superadmin_user').length}`);
    console.log(`  Vendor <-> User: ${chats.filter(c => c.chatType === 'support_vendor_user').length}`);
    console.log(`  Total: ${chats.length} chats`);
    console.log(`  Total Messages: ${messages.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding support chats:', error);
    process.exit(1);
  }
};

seedSupportChats();

