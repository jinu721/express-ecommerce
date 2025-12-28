const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const Attribute = require('../models/attributeModel');
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');

async function createSampleData() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // 1. Create sample category
    console.log('📂 Creating sample category...');
    let category = await Category.findOne({ name: 'Clothing' });
    if (!category) {
      category = await Category.create({
        name: 'Clothing',
        description: 'Clothing items',
        isDeleted: false
      });
      console.log('✅ Created category: Clothing');
    } else {
      console.log('⏭️  Category already exists: Clothing');
    }

    // 2. Create sample brand
    console.log('🏷️  Creating sample brand...');
    let brand = await Brand.findOne({ name: 'Sample Brand' });
    if (!brand) {
      brand = await Brand.create({
        name: 'Sample Brand',
        description: 'A sample brand for testing',
        isActive: true
      });
      console.log('✅ Created brand: Sample Brand');
    } else {
      console.log('⏭️  Brand already exists: Sample Brand');
    }

    // 3. Create sample product
    console.log('👕 Creating sample product...');
    let product = await Product.findOne({ name: 'Sample T-Shirt' });
    if (!product) {
      product = await Product.create({
        name: 'Sample T-Shirt',
        description: 'A comfortable cotton t-shirt perfect for everyday wear',
        basePrice: 29.99,
        price: 29.99, // Backward compatibility
        category: category._id,
        brand: brand._id,
        images: ['/images/sample-tshirt.jpg'],
        tags: ['clothing', 'tshirt', 'cotton'],
        cashOnDelivery: true,
        warranty: '30 days',
        returnPolicy: '7 days return policy',
        isDeleted: false
      });
      console.log('✅ Created product: Sample T-Shirt');
    } else {
      console.log('⏭️  Product already exists: Sample T-Shirt');
    }

    // 4. Create sample variants
    console.log('🔧 Creating sample variants...');
    
    const variantCombinations = [
      { SIZE: 'S', COLOR: 'RED', stock: 10 },
      { SIZE: 'S', COLOR: 'BLUE', stock: 15 },
      { SIZE: 'M', COLOR: 'RED', stock: 20 },
      { SIZE: 'M', COLOR: 'BLUE', stock: 25 },
      { SIZE: 'L', COLOR: 'RED', stock: 12 },
      { SIZE: 'L', COLOR: 'BLUE', stock: 18 }
    ];

    let variantsCreated = 0;
    for (const combo of variantCombinations) {
      const { stock, ...attributes } = combo; // Separate stock from attributes
      const attributeMap = new Map(Object.entries(attributes));

      const existingVariant = await Variant.findOne({
        product: product._id,
        attributes: attributeMap
      });

      if (!existingVariant) {
        const sku = await Variant.generateSKU(product._id, attributes);
        
        await Variant.create({
          product: product._id,
          sku,
          attributes: attributeMap,
          stock: stock,
          reserved: 0,
          priceAdjustment: 0,
          isActive: true
        });
        
        variantsCreated++;
        console.log(`✅ Created variant: ${attributes.SIZE} - ${attributes.COLOR} (Stock: ${stock})`);
      }
    }

    if (variantsCreated === 0) {
      console.log('⏭️  All variants already exist');
    } else {
      console.log(`✅ Created ${variantsCreated} variants`);
    }

    // 5. Create a product with only color variants (like a cap)
    console.log('🧢 Creating cap product with color-only variants...');
    let capProduct = await Product.findOne({ name: 'Sample Cap' });
    if (!capProduct) {
      capProduct = await Product.create({
        name: 'Sample Cap',
        description: 'A stylish cap available in multiple colors',
        basePrice: 19.99,
        price: 19.99,
        category: category._id,
        brand: brand._id,
        images: ['/images/sample-cap.jpg'],
        tags: ['clothing', 'cap', 'accessory'],
        cashOnDelivery: true,
        isDeleted: false
      });
      console.log('✅ Created product: Sample Cap');

      // Create color-only variants for cap
      const capColors = ['BLACK', 'WHITE', 'RED', 'BLUE'];
      for (const color of capColors) {
        const attributeMap = new Map([['COLOR', color]]);
        const sku = await Variant.generateSKU(capProduct._id, { COLOR: color });
        
        await Variant.create({
          product: capProduct._id,
          sku,
          attributes: attributeMap,
          stock: 30,
          reserved: 0,
          priceAdjustment: 0,
          isActive: true
        });
        
        console.log(`✅ Created cap variant: ${color}`);
      }
    } else {
      console.log('⏭️  Cap product already exists');
    }

    // 6. Create a product with no variants (like a gift card)
    console.log('🎁 Creating gift card product with no variants...');
    let giftCard = await Product.findOne({ name: 'Gift Card' });
    if (!giftCard) {
      giftCard = await Product.create({
        name: 'Gift Card',
        description: 'Digital gift card for our store',
        basePrice: 50.00,
        price: 50.00,
        category: category._id,
        images: ['/images/gift-card.jpg'],
        tags: ['gift', 'digital'],
        cashOnDelivery: false,
        isDeleted: false
      });
      console.log('✅ Created product: Gift Card (no variants needed)');
    } else {
      console.log('⏭️  Gift card already exists');
    }

    console.log('🎉 Sample data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Categories: ${await Category.countDocuments()}`);
    console.log(`- Brands: ${await Brand.countDocuments()}`);
    console.log(`- Products: ${await Product.countDocuments()}`);
    console.log(`- Variants: ${await Variant.countDocuments()}`);
    console.log(`- Attributes: ${await Attribute.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

createSampleData();