const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const Attribute = require('../models/attributeModel');
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');
const Cart = require('../models/cartModel');

async function cleanSampleData() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Cleaning sample data...');

    // Delete sample products
    const sampleProducts = ['Sample T-Shirt', 'Sample Cap', 'Gift Card'];
    const deletedProducts = await Product.deleteMany({ 
      name: { $in: sampleProducts } 
    });
    console.log(`🗑️  Deleted ${deletedProducts.deletedCount} sample products`);

    // Delete all variants (since they're linked to sample products)
    const deletedVariants = await Variant.deleteMany({});
    console.log(`🗑️  Deleted ${deletedVariants.deletedCount} variants`);

    // Delete sample attributes
    const deletedAttributes = await Attribute.deleteMany({});
    console.log(`🗑️  Deleted ${deletedAttributes.deletedCount} attributes`);

    // Delete sample category
    const deletedCategories = await Category.deleteMany({ 
      name: 'Clothing' 
    });
    console.log(`🗑️  Deleted ${deletedCategories.deletedCount} sample categories`);

    // Delete sample brand
    const deletedBrands = await Brand.deleteMany({ 
      name: 'Sample Brand' 
    });
    console.log(`🗑️  Deleted ${deletedBrands.deletedCount} sample brands`);

    // Clean any carts that might reference deleted products
    const updatedCarts = await Cart.updateMany(
      {},
      { $set: { items: [], cartTotal: 0 } }
    );
    console.log(`🧹 Cleaned ${updatedCarts.modifiedCount} carts`);

    console.log('✅ Sample data cleanup completed successfully!');
    
    // Show remaining data
    const remainingProducts = await Product.countDocuments();
    const remainingVariants = await Variant.countDocuments();
    const remainingAttributes = await Attribute.countDocuments();
    const remainingCategories = await Category.countDocuments();
    const remainingBrands = await Brand.countDocuments();

    console.log('\n📊 Remaining data:');
    console.log(`- Products: ${remainingProducts}`);
    console.log(`- Variants: ${remainingVariants}`);
    console.log(`- Attributes: ${remainingAttributes}`);
    console.log(`- Categories: ${remainingCategories}`);
    console.log(`- Brands: ${remainingBrands}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

cleanSampleData();