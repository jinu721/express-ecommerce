const mongoose = require('mongoose');
require('dotenv').config();

async function fixVariantIndexes() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('variants');

    console.log('📋 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop old indexes that conflict with new schema
    const indexesToDrop = [
      'product_1_attributes.size_1_attributes.color_1',
      'attributes.size_1_attributes.color_1'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Dropped old index: ${indexName}`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`⏭️  Index ${indexName} doesn't exist, skipping`);
        } else {
          console.log(`⚠️  Error dropping index ${indexName}:`, error.message);
        }
      }
    }

    // Clear any existing variant data to start fresh
    console.log('🧹 Clearing existing variant data...');
    const deleteResult = await collection.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing variants`);

    console.log('✅ Index cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

fixVariantIndexes();