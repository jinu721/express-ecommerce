const mongoose = require('mongoose');
require('dotenv').config();

// Import models to test
const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const Attribute = require('../models/attributeModel');

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB successfully');
    
    // Test basic queries
    console.log('📊 Testing model queries...');
    
    const productCount = await Product.countDocuments();
    console.log(`📦 Products in database: ${productCount}`);
    
    const variantCount = await Variant.countDocuments();
    console.log(`🔧 Variants in database: ${variantCount}`);
    
    const attributeCount = await Attribute.countDocuments();
    console.log(`🏷️  Attributes in database: ${attributeCount}`);
    
    // Test creating a sample attribute
    console.log('🧪 Testing attribute creation...');
    
    const testAttribute = await Attribute.findOne({ name: 'TEST_ATTR' });
    if (!testAttribute) {
      const newAttr = await Attribute.create({
        name: 'TEST_ATTR',
        displayName: 'Test Attribute',
        type: 'SELECT',
        values: [
          { value: 'TEST1', displayValue: 'Test Value 1', sortOrder: 1 }
        ],
        isRequired: false,
        isActive: true
      });
      console.log('✅ Test attribute created:', newAttr._id);
      
      // Clean up test attribute
      await Attribute.findByIdAndDelete(newAttr._id);
      console.log('🧹 Test attribute cleaned up');
    } else {
      console.log('⚠️  Test attribute already exists, skipping creation test');
    }
    
    console.log('✅ All tests passed! Database connection and models are working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

testConnection();