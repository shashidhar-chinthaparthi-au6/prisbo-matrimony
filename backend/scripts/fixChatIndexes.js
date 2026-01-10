import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Chat from '../models/Chat.js';

dotenv.config();

const fixChatIndexes = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get the Chat collection
    const collection = Chat.collection;

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(index => {
      console.log(JSON.stringify(index, null, 2));
    });

    // Check if there's a unique index on just participants
    const participantsOnlyIndex = indexes.find(
      idx => idx.key && idx.key.participants === 1 && !idx.key.chatType && idx.unique
    );

    if (participantsOnlyIndex) {
      console.log('\n⚠ Found unique index on participants only. Dropping it...');
      await collection.dropIndex(participantsOnlyIndex.name);
      console.log('✓ Dropped unique index on participants');
    }

    // Ensure compound index exists (non-unique)
    const compoundIndex = indexes.find(
      idx => idx.key && idx.key.participants === 1 && idx.key.chatType === 1
    );

    if (!compoundIndex) {
      console.log('\nCreating compound index on { participants: 1, chatType: 1 }...');
      await collection.createIndex({ participants: 1, chatType: 1 });
      console.log('✓ Created compound index');
    } else {
      console.log('\n✓ Compound index already exists');
    }

    // Verify final indexes
    const finalIndexes = await collection.indexes();
    console.log('\nFinal indexes:');
    finalIndexes.forEach(index => {
      console.log(JSON.stringify(index, null, 2));
    });

    console.log('\n' + '='.repeat(60));
    console.log('CHAT INDEXES FIXED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nYou can now create multiple chats with the same participants');
    console.log('as long as they have different chatType values.');

    process.exit(0);
  } catch (error) {
    console.error('Error fixing chat indexes:', error);
    process.exit(1);
  }
};

fixChatIndexes();

