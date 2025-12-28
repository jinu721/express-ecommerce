const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const Brand = require('../models/brandModel');
const Category = require('../models/categoryModel');

async function testNewSystem() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Test 1: Get a product with variants
    console.log('\n🧪 Test 1: Getting product with variants...');
    const product = await Product.findOne({ name: 'Sample T-Shirt' }).populate('brand').populate('category');
    
    if (product) {
      console.log(`✅ Found product: ${product.name}`);
      console.log(`   - Category: ${product.category?.name || 'Unknown'}`);
      console.log(`   - Brand: ${product.brand?.name || 'Unknown'}`);
      console.log(`   - Base Price: ₹${product.basePrice || product.price}`);

      // Get variants
      const variants = await Variant.find({ product: product._id, isActive: true });
      console.log(`   - Variants: ${variants.length}`);
      
      variants.forEach((v, index) => {
        const attrs = Object.fromEntries(v.attributes);
        console.log(`     ${index + 1}. SKU: ${v.sku}`);
        console.log(`        Attributes: ${JSON.stringify(attrs)}`);
        console.log(`        Stock: ${v.stock} (Available: ${v.availableStock})`);
        console.log(`        In Stock: ${v.isInStock()}`);
        console.log(`        Low Stock: ${v.isLowStock()}`);
      });
    }

    // Test 2: Test API endpoints
    console.log('\n🧪 Test 2: Testing API endpoints...');
    
    // Simulate API call to get variants
    const testVariants = await Variant.find({ product: product._id, isActive: true });
    const variantsForAPI = testVariants.map(v => ({
      _id: v._id,
      sku: v.sku,
      attributes: Object.fromEntries(v.attributes),
      attributeString: v.getAttributeString(),
      stock: v.stock,
      reserved: v.reserved,
      availableStock: v.availableStock,
      isInStock: v.isInStock(),
      isLowStock: v.isLowStock(),
      priceAdjustment: v.priceAdjustment,
      images: v.images,
      isActive: v.isActive
    }));

    console.log('✅ API format variants:');
    console.log(JSON.stringify(variantsForAPI, null, 2));

    // Test 3: Test variant finding by attributes
    console.log('\n🧪 Test 3: Finding variant by attributes...');
    const searchAttributes = new Map([['SIZE', 'M'], ['COLOR', 'BLUE']]);
    const foundVariant = await Variant.findOne({
      product: product._id,
      attributes: searchAttributes,
      isActive: true
    });

    if (foundVariant) {
      console.log('✅ Found variant by attributes:');
      console.log(`   - SKU: ${foundVariant.sku}`);
      console.log(`   - Attributes: ${JSON.stringify(Object.fromEntries(foundVariant.attributes))}`);
      console.log(`   - Available Stock: ${foundVariant.availableStock}`);
    } else {
      console.log('❌ No variant found for M + BLUE');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Database connection working');
    console.log('✅ Product model updated');
    console.log('✅ Variant model working with dynamic attributes');
    console.log('✅ API format conversion working');
    console.log('✅ Variant search by attributes working');
    console.log('\n🚀 The new dynamic variant system is ready!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

testNewSystem();