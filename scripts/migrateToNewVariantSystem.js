const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables
const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const Attribute = require('../models/attributeModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Brand = require('../models/brandModel');

/**
 * Migration Script: Legacy to Dynamic Variant System
 * 
 * This script migrates from the old fixed size/color system to the new dynamic attribute system
 * 
 * IMPORTANT: 
 * - Run this script during maintenance window
 * - Backup your database before running
 * - Test on staging environment first
 */

class VariantMigration {
  constructor() {
    this.stats = {
      productsProcessed: 0,
      variantsCreated: 0,
      cartsUpdated: 0,
      ordersUpdated: 0,
      errors: []
    };
  }

  async run() {
    try {
      console.log('🚀 Starting variant system migration...');
      
      // Step 1: Create default attributes
      await this.createDefaultAttributes();
      
      // Step 2: Migrate products with legacy size/color data
      await this.migrateProducts();
      
      // Step 3: Update existing carts
      await this.migrateCarts();
      
      // Step 4: Update existing orders (for reference)
      await this.migrateOrders();
      
      // Step 5: Clean up legacy fields (optional - keep for rollback)
      // await this.cleanupLegacyFields();
      
      console.log('✅ Migration completed successfully!');
      console.log('📊 Migration Statistics:', this.stats);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async createDefaultAttributes() {
    console.log('📝 Creating default attributes...');
    
    const defaultAttributes = [
      {
        name: 'SIZE',
        displayName: 'Size',
        type: 'SELECT',
        values: [
          { value: 'XS', displayValue: 'Extra Small', sortOrder: 1 },
          { value: 'S', displayValue: 'Small', sortOrder: 2 },
          { value: 'M', displayValue: 'Medium', sortOrder: 3 },
          { value: 'L', displayValue: 'Large', sortOrder: 4 },
          { value: 'XL', displayValue: 'Extra Large', sortOrder: 5 },
          { value: 'XXL', displayValue: '2X Large', sortOrder: 6 },
          { value: 'XXXL', displayValue: '3X Large', sortOrder: 7 },
          // Numeric sizes for pants, etc.
          { value: '28', displayValue: '28', sortOrder: 10 },
          { value: '30', displayValue: '30', sortOrder: 11 },
          { value: '32', displayValue: '32', sortOrder: 12 },
          { value: '34', displayValue: '34', sortOrder: 13 },
          { value: '36', displayValue: '36', sortOrder: 14 },
          { value: '38', displayValue: '38', sortOrder: 15 },
          { value: '40', displayValue: '40', sortOrder: 16 },
          { value: '42', displayValue: '42', sortOrder: 17 },
          { value: 'ONE_SIZE', displayValue: 'One Size', sortOrder: 20 }
        ],
        isRequired: false,
        sortOrder: 1
      },
      {
        name: 'COLOR',
        displayName: 'Color',
        type: 'SELECT',
        values: [
          { value: 'BLACK', displayValue: 'Black', sortOrder: 1 },
          { value: 'WHITE', displayValue: 'White', sortOrder: 2 },
          { value: 'RED', displayValue: 'Red', sortOrder: 3 },
          { value: 'BLUE', displayValue: 'Blue', sortOrder: 4 },
          { value: 'GREEN', displayValue: 'Green', sortOrder: 5 },
          { value: 'YELLOW', displayValue: 'Yellow', sortOrder: 6 },
          { value: 'GRAY', displayValue: 'Gray', sortOrder: 7 },
          { value: 'NAVY', displayValue: 'Navy', sortOrder: 8 },
          { value: 'BROWN', displayValue: 'Brown', sortOrder: 9 },
          { value: 'PINK', displayValue: 'Pink', sortOrder: 10 }
        ],
        isRequired: false,
        sortOrder: 2
      }
    ];

    for (const attrData of defaultAttributes) {
      const existing = await Attribute.findOne({ name: attrData.name, category: null });
      if (!existing) {
        await Attribute.create(attrData);
        console.log(`✅ Created attribute: ${attrData.name}`);
      } else {
        console.log(`⏭️  Attribute already exists: ${attrData.name}`);
      }
    }
  }

  async migrateProducts() {
    console.log('🔄 Migrating products...');
    
    const products = await Product.find({
      $or: [
        { sizes: { $exists: true, $ne: {} } },
        { colors: { $exists: true, $ne: [] } }
      ]
    });

    console.log(`Found ${products.length} products to migrate`);

    for (const product of products) {
      try {
        await this.migrateProduct(product);
        this.stats.productsProcessed++;
      } catch (error) {
        console.error(`Error migrating product ${product._id}:`, error);
        this.stats.errors.push({
          type: 'product',
          id: product._id,
          error: error.message
        });
      }
    }
  }

  async migrateProduct(product) {
    console.log(`Migrating product: ${product.name}`);
    
    const legacySizes = product.sizes || {};
    const legacyColors = product.colors || [];
    
    // If no legacy data, skip
    if (Object.keys(legacySizes).length === 0 && legacyColors.length === 0) {
      return;
    }

    const variants = [];

    if (Object.keys(legacySizes).length > 0 && legacyColors.length > 0) {
      // Product has both sizes and colors - create combinations
      for (const [size, sizeData] of Object.entries(legacySizes)) {
        for (const color of legacyColors) {
          const attributes = new Map([
            ['SIZE', size.toUpperCase()],
            ['COLOR', color.toUpperCase()]
          ]);

          const sku = await Variant.generateSKU(product._id, { SIZE: size, COLOR: color });
          
          variants.push({
            product: product._id,
            sku,
            attributes,
            stock: sizeData.stock || 0,
            reserved: 0,
            priceAdjustment: 0,
            isActive: true
          });
        }
      }
    } else if (Object.keys(legacySizes).length > 0) {
      // Product has only sizes
      for (const [size, sizeData] of Object.entries(legacySizes)) {
        const attributes = new Map([['SIZE', size.toUpperCase()]]);
        const sku = await Variant.generateSKU(product._id, { SIZE: size });
        
        variants.push({
          product: product._id,
          sku,
          attributes,
          stock: sizeData.stock || 0,
          reserved: 0,
          priceAdjustment: 0,
          isActive: true
        });
      }
    } else if (legacyColors.length > 0) {
      // Product has only colors
      for (const color of legacyColors) {
        const attributes = new Map([['COLOR', color.toUpperCase()]]);
        const sku = await Variant.generateSKU(product._id, { COLOR: color });
        
        variants.push({
          product: product._id,
          sku,
          attributes,
          stock: 100, // Default stock for color-only variants
          reserved: 0,
          priceAdjustment: 0,
          isActive: true
        });
      }
    }

    if (variants.length > 0) {
      // Check for existing variants to avoid duplicates
      const existingVariants = await Variant.find({ product: product._id });
      const existingSkus = new Set(existingVariants.map(v => v.sku));
      
      const newVariants = variants.filter(v => !existingSkus.has(v.sku));
      
      if (newVariants.length > 0) {
        await Variant.insertMany(newVariants);
        this.stats.variantsCreated += newVariants.length;
        console.log(`✅ Created ${newVariants.length} variants for ${product.name}`);
      } else {
        console.log(`⏭️  Variants already exist for ${product.name}`);
      }
    }
  }

  async migrateCarts() {
    console.log('🛒 Migrating carts...');
    
    const carts = await Cart.find({
      'items.variantId': { $exists: false }
    });

    console.log(`Found ${carts.length} carts to migrate`);

    for (const cart of carts) {
      try {
        let updated = false;
        
        for (const item of cart.items) {
          if (!item.variantId && (item.size || item.color)) {
            // Try to find matching variant
            const attributes = new Map();
            if (item.size) attributes.set('SIZE', item.size.toUpperCase());
            if (item.color) attributes.set('COLOR', item.color.toUpperCase());
            
            const variant = await Variant.findOne({
              product: item.productId,
              attributes
            });

            if (variant) {
              item.variantId = variant._id;
              // Add new attributes field for future compatibility
              item.attributes = Object.fromEntries(attributes);
              updated = true;
            }
          }
        }

        if (updated) {
          await cart.save();
          this.stats.cartsUpdated++;
        }
      } catch (error) {
        console.error(`Error migrating cart ${cart._id}:`, error);
        this.stats.errors.push({
          type: 'cart',
          id: cart._id,
          error: error.message
        });
      }
    }
  }

  async migrateOrders() {
    console.log('📦 Migrating orders...');
    
    const orders = await Order.find({
      'items.variant': { $exists: false }
    });

    console.log(`Found ${orders.length} orders to migrate`);

    for (const order of orders) {
      try {
        let updated = false;
        
        for (const item of order.items) {
          if (!item.variant && (item.size || item.color)) {
            // Try to find matching variant
            const attributes = new Map();
            if (item.size) attributes.set('SIZE', item.size.toUpperCase());
            if (item.color) attributes.set('COLOR', item.color.toUpperCase());
            
            const variant = await Variant.findOne({
              product: item.product,
              attributes
            });

            if (variant) {
              item.variant = variant._id;
              updated = true;
            }
          }
        }

        if (updated) {
          await order.save();
          this.stats.ordersUpdated++;
        }
      } catch (error) {
        console.error(`Error migrating order ${order._id}:`, error);
        this.stats.errors.push({
          type: 'order',
          id: order._id,
          error: error.message
        });
      }
    }
  }

  async cleanupLegacyFields() {
    console.log('🧹 Cleaning up legacy fields...');
    
    // Remove legacy fields from products (optional - keep for rollback)
    await Product.updateMany(
      {},
      { 
        $unset: { 
          sizes: 1, 
          colors: 1,
          offerPrice: 1 // Also remove deprecated offerPrice
        } 
      }
    );
    
    console.log('✅ Legacy fields cleaned up');
  }

  // Rollback method in case something goes wrong
  async rollback() {
    console.log('🔄 Rolling back migration...');
    
    // Delete all variants created during migration
    await Variant.deleteMany({});
    
    // Remove variantId from carts
    await Cart.updateMany(
      {},
      { $unset: { 'items.$[].variantId': 1, 'items.$[].attributes': 1 } }
    );
    
    // Remove variant from orders
    await Order.updateMany(
      {},
      { $unset: { 'items.$[].variant': 1 } }
    );
    
    console.log('✅ Rollback completed');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new VariantMigration();
  
  // Connect to MongoDB using existing config
  mongoose.connect(process.env.MONGO_URL)
    .then(() => {
      console.log('Connected to MongoDB');
      return migration.run();
    })
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = VariantMigration;