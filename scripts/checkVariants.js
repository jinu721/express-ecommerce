const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name');

const Variant = require('../models/variantModel');
const Product = require('../models/productModel');

async function checkVariants() {
  try {
    console.log('Checking variants in database...');
    
    const variantCount = await Variant.countDocuments();
    console.log(`Total variants: ${variantCount}`);
    
    if (variantCount > 0) {
      const sampleVariants = await Variant.find().limit(5).populate('product', 'name');
      console.log('\nSample variants:');
      sampleVariants.forEach(variant => {
        console.log(`- Product: ${variant.product?.name || 'Unknown'}`);
        console.log(`  SKU: ${variant.sku}`);
        console.log(`  Attributes:`, variant.attributes);
        console.log(`  Stock: ${variant.stock}`);
        console.log('---');
      });
    }
    
    const productCount = await Product.countDocuments();
    console.log(`\nTotal products: ${productCount}`);
    
    if (productCount > 0) {
      const sampleProducts = await Product.find().limit(3).select('name _id');
      console.log('\nSample products:');
      sampleProducts.forEach(product => {
        console.log(`- ${product.name} (${product._id})`);
      });
      
      // Check if any products have variants
      for (const product of sampleProducts) {
        const variants = await Variant.find({ product: product._id });
        console.log(`  Variants: ${variants.length}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking variants:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkVariants();