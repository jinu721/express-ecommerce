const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const Attribute = require('../models/attributeModel');

async function testAPI() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Test 1: Get product variants
    console.log('\n🧪 Test 1: Getting product variants...');
    const tshirtProduct = await Product.findOne({ name: 'Sample T-Shirt' });
    if (tshirtProduct) {
      const variants = await Variant.find({ product: tshirtProduct._id, isActive: true });
      console.log(`✅ Found ${variants.length} variants for T-Shirt:`);
      variants.forEach(v => {
        const attrs = Object.fromEntries(v.attributes);
        console.log(`   - SKU: ${v.sku}, Attributes: ${JSON.stringify(attrs)}, Stock: ${v.stock}`);
      });
    }

    // Test 2: Get cap variants (color only)
    console.log('\n🧪 Test 2: Getting cap variants (color only)...');
    const capProduct = await Product.findOne({ name: 'Sample Cap' });
    if (capProduct) {
      const capVariants = await Variant.find({ product: capProduct._id, isActive: true });
      console.log(`✅ Found ${capVariants.length} variants for Cap:`);
      capVariants.forEach(v => {
        const attrs = Object.fromEntries(v.attributes);
        console.log(`   - SKU: ${v.sku}, Attributes: ${JSON.stringify(attrs)}, Stock: ${v.stock}`);
      });
    }

    // Test 3: Find variant by attributes
    console.log('\n🧪 Test 3: Finding variant by attributes...');
    const attributeMap = new Map([['SIZE', 'M'], ['COLOR', 'BLUE']]);
    const foundVariant = await Variant.findOne({
      product: tshirtProduct._id,
      attributes: attributeMap,
      isActive: true
    });
    
    if (foundVariant) {
      console.log('✅ Found variant by attributes:');
      console.log(`   - SKU: ${foundVariant.sku}`);
      console.log(`   - Attributes: ${JSON.stringify(Object.fromEntries(foundVariant.attributes))}`);
      console.log(`   - Stock: ${foundVariant.stock}`);
      console.log(`   - Available Stock: ${foundVariant.availableStock}`);
      console.log(`   - Is In Stock: ${foundVariant.isInStock()}`);
    }

    // Test 4: Test stock operations
    console.log('\n🧪 Test 4: Testing stock operations...');
    if (foundVariant) {
      const originalStock = foundVariant.stock;
      
      // Reserve stock
      foundVariant.reserved = 5;
      await foundVariant.save();
      console.log(`✅ Reserved 5 units. Available stock: ${foundVariant.availableStock}`);
      
      // Release stock
      foundVariant.reserved = 0;
      await foundVariant.save();
      console.log(`✅ Released reservation. Available stock: ${foundVariant.availableStock}`);
    }

    // Test 5: Get attributes
    console.log('\n🧪 Test 5: Getting available attributes...');
    const attributes = await Attribute.find({ isActive: true });
    console.log(`✅ Found ${attributes.length} attributes:`);
    attributes.forEach(attr => {
      console.log(`   - ${attr.name} (${attr.displayName}): ${attr.values.length} values`);
      attr.values.forEach(val => {
        console.log(`     * ${val.value} -> ${val.displayValue}`);
      });
    });

    // Test 6: Test variant methods
    console.log('\n🧪 Test 6: Testing variant methods...');
    if (foundVariant) {
      console.log(`✅ Attribute String: "${foundVariant.getAttributeString()}"`);
      console.log(`✅ Is In Stock (1): ${foundVariant.isInStock(1)}`);
      console.log(`✅ Is In Stock (100): ${foundVariant.isInStock(100)}`);
      console.log(`✅ Is Low Stock: ${foundVariant.isLowStock()}`);
    }

    console.log('\n🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

testAPI();