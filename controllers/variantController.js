  const Variant = require('../models/variantModel');
const Product = require('../models/productModel');
const Attribute = require('../models/attributeModel');
const stockService = require('../services/stockService');



module.exports = {

  async getProductVariants(req, res) {
    try {
      const { productId } = req.params;
      const { includeInactive } = req.query;

      const query = { product: productId };
      if (!includeInactive) {
        query.isActive = true;
      }

      const variants = await Variant.find(query)
        .populate('product')
        .sort({ createdAt: 1 });

      const Product = require('../models/productModel');
      const product = await Product.findById(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const pricingService = require('../services/pricingService');
      const variantsWithPricing = await Promise.all(variants.map(async (v) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, null, v);
        
        return {
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
          specialPrice: v.specialPrice,
          images: v.images,
          isActive: v.isActive,
          originalPrice: offerResult.originalPrice,
          finalPrice: offerResult.finalPrice,
          discount: offerResult.discount,
          discountPercentage: offerResult.discountPercentage,
          hasOffer: offerResult.hasOffer,
          offer: offerResult.offer,
          isPercentageOffer: offerResult.isPercentageOffer
        };
      }));

      res.json({
        success: true,
        count: variantsWithPricing.length,
        variants: variantsWithPricing
      });
    } catch (error) {
      console.error('Get product variants error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch variants',
        error: error.message
      });
    }
  },

  async getProductAttributes(req, res) {
    try {
      const { productId } = req.params;
      
      const product = await Product.findById(productId).populate('category');
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const attributes = await Attribute.getForCategory(product.category._id);

      res.json({
        success: true,
        attributes: attributes.map(attr => ({
          _id: attr._id,
          name: attr.name,
          displayName: attr.displayName,
          type: attr.type,
          values: attr.values.filter(v => v.isActive),
          isRequired: attr.isRequired
        }))
      });
    } catch (error) {
      console.error('Get product attributes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attributes',
        error: error.message
      });
    }
  },

  async getVariantDetails(req, res) {
    try {
      const { variantId } = req.params;

      const variant = await Variant.findById(variantId).populate('product');

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      res.json({
        success: true,
        variant: {
          ...variant.toObject(),
          attributes: Object.fromEntries(variant.attributes),
          attributeString: variant.getAttributeString(),
          availableStock: variant.availableStock,
          isInStock: variant.isInStock(),
          isLowStock: variant.isLowStock()
        }
      });
    } catch (error) {
      console.error('Get variant details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch variant details',
        error: error.message
      });
    }
  },

  async findVariantByAttributes(req, res) {
    try {
      const { productId } = req.params;
      const { attributes } = req.body;

      if (!attributes || Object.keys(attributes).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Attributes are required'
        });
      }

      const attributeMap = new Map(Object.entries(attributes));

      const variant = await Variant.findOne({
        product: productId,
        attributes: attributeMap,
        isActive: true
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found for selected attributes'
        });
      }

      res.json({
        success: true,
        variant: {
          _id: variant._id,
          sku: variant.sku,
          attributes: Object.fromEntries(variant.attributes),
          attributeString: variant.getAttributeString(),
          stock: variant.stock,
          reserved: variant.reserved,
          availableStock: variant.availableStock,
          isInStock: variant.isInStock(),
          isLowStock: variant.isLowStock(),
          priceAdjustment: variant.priceAdjustment,
          images: variant.images
        }
      });
    } catch (error) {
      console.error('Find variant by attributes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find variant',
        error: error.message
      });
    }
  },

  async getVariantStock(req, res) {
    try {
      const { variantId } = req.params;

      const result = await stockService.getStockStatus(variantId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Get variant stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock status',
        error: error.message
      });
    }
  },

  async createVariant(req, res) {
    try {
      const { productId } = req.params;
      const { attributes, stock, priceAdjustment, specialPrice, images } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      if (!attributes || Object.keys(attributes).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one attribute is required'
        });
      }

      const attributeMap = new Map();
      for (const [key, value] of Object.entries(attributes)) {
        if (value && value.trim()) { 
          attributeMap.set(key.toUpperCase(), value.trim().toUpperCase());
        }
      }

      if (attributeMap.size === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one valid attribute is required'
        });
      }

      const existingVariant = await Variant.findOne({
        product: productId,
        $expr: {
          $and: [
            { $eq: [{ $size: { $objectToArray: "$attributes" } }, attributeMap.size] },
            ...Array.from(attributeMap.entries()).map(([key, value]) => ({
              $eq: [`$attributes.${key}`, value]
            }))
          ]
        }
      });

      if (existingVariant) {
        return res.status(400).json({
          success: false,
          message: 'Variant with these attributes already exists'
        });
      }

      const sku = await Variant.generateSKU(productId, attributes);

      const variant = await Variant.create({
        product: productId,
        sku,
        attributes: attributeMap,
        stock: stock || 0,
        reserved: 0,
        priceAdjustment: priceAdjustment || 0,
        specialPrice: specialPrice || null,
        images: images || [],
        isActive: true
      });

      if (stock > 0) {
        await stockService.recordInventoryMovement(
          variant._id,
          'INITIAL_STOCK',
          stock,
          0,
          stock,
          null,
          'Initial stock entry',
          req.user?._id
        );
      }

      res.status(201).json({
        success: true,
        message: 'Variant created successfully',
        variant: {
          ...variant.toObject(),
          attributes: Object.fromEntries(variant.attributes),
          attributeString: variant.getAttributeString()
        }
      });
    } catch (error) {
      console.error('Create variant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create variant',
        error: error.message
      });
    }
  },

  async updateVariant(req, res) {
    try {
      const { variantId } = req.params;
      const updates = req.body;

      delete updates.product;
      delete updates.sku;
      delete updates.stock;
      delete updates.reserved;

      if (updates.attributes) {
        updates.attributes = new Map(Object.entries(updates.attributes));
      }

      const variant = await Variant.findByIdAndUpdate(
        variantId,
        updates,
        { new: true, runValidators: true }
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      res.json({
        success: true,
        message: 'Variant updated successfully',
        variant: {
          ...variant.toObject(),
          attributes: Object.fromEntries(variant.attributes),
          attributeString: variant.getAttributeString()
        }
      });
    } catch (error) {
      console.error('Update variant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update variant',
        error: error.message
      });
    }
  },

  async deleteVariant(req, res) {
    try {
      const { variantId } = req.params;

      const variant = await Variant.findByIdAndDelete(variantId);

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      res.json({
        success: true,
        message: 'Variant deleted successfully'
      });
    } catch (error) {
      console.error('Delete variant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete variant',
        error: error.message
      });
    }
  },

  async updateVariantStock(req, res) {
    try {
      const { variantId } = req.params;
      const { stock, reason } = req.body;

      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock value'
        });
      }

      const variant = await Variant.findById(variantId);
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      const previousStock = variant.stock;
      variant.stock = stock;
      await variant.save();

      await stockService.recordInventoryMovement(
        variantId,
        'ADJUSTMENT',
        stock - previousStock,
        previousStock,
        stock,
        null,
        reason || 'Manual stock adjustment',
        req.user?._id
      );

      res.json({
        success: true,
        message: 'Stock updated successfully',
        variant: {
          _id: variant._id,
          sku: variant.sku,
          attributes: Object.fromEntries(variant.attributes),
          stock: variant.stock,
          reserved: variant.reserved,
          availableStock: variant.availableStock
        }
      });
    } catch (error) {
      console.error('Update variant stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock',
        error: error.message
      });
    }
  },

  async renderBulkVariants(req, res) {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId).populate('category');
      
      if (!product) {
        return res.status(404).send('Product not found');
      }

      let attributes = [];
      try {
        if (product.category && product.category._id) {
          attributes = await Attribute.getForCategory(product.category._id);
        }
      } catch (attrError) {
        console.warn('Could not load attributes:', attrError.message);
      }

      res.render('bulkVariants', {
        product,
        attributes: attributes.map(attr => ({
          ...attr.toObject(),
          values: attr.values.filter(v => v.isActive)
        }))
      });
    } catch (error) {
       console.error('Bulk variants page error:', error);
       res.status(500).send('Error loading bulk variants page: ' + error.message);
    }
  },

  async bulkCreateVariants(req, res) {
    try {
      const { productId } = req.params;
      const { variants } = req.body; 

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const results = {
        created: [],
        skipped: [],
        errors: []
      };

      for (const variantData of variants) {
        try {
          const { attributes, stock, priceAdjustment } = variantData;

          if (!attributes || Object.keys(attributes).length === 0) {
            results.errors.push({
              variant: variantData,
              error: 'Attributes are required'
            });
            continue;
          }

          const attributeMap = new Map(Object.entries(attributes));

          const existing = await Variant.findOne({
            product: productId,
            attributes: attributeMap
          });

          if (existing) {
            results.skipped.push({ 
              attributes, 
              reason: 'Already exists' 
            });
            continue;
          }

          const sku = await Variant.generateSKU(productId, attributes);
          const variant = await Variant.create({
            product: productId,
            sku,
            attributes: attributeMap,
            stock: stock || 0,
            reserved: 0,
            priceAdjustment: priceAdjustment || 0,
            isActive: true
          });

          if (stock > 0) {
            await stockService.recordInventoryMovement(
              variant._id,
              'INITIAL_STOCK',
              stock,
              0,
              stock,
              null,
              'Bulk creation initial stock',
              req.user?._id
            );
          }

          results.created.push({
            ...variant.toObject(),
            attributes: Object.fromEntries(variant.attributes)
          });
        } catch (error) {
          results.errors.push({
            variant: variantData,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk creation completed: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
        results
      });
    } catch (error) {
      console.error('Bulk create variants error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk create variants',
        error: error.message
      });
    }
  },
  
  async renderVariantManagement(req, res) {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId).populate('category');
      
      if (!product) {
        return res.status(404).send('Product not found');
      }

      const variants = await Variant.find({ product: productId })
        .sort({ createdAt: 1 });

      let attributes = [];
      try {
        if (product.category && product.category._id) {
          attributes = await Attribute.getForCategory(product.category._id);
        }
      } catch (attrError) {
        console.warn('Could not load attributes:', attrError.message);
      }

      const displayVariants = variants.map(v => ({
        ...v.toObject(),
        attributes: Object.fromEntries(v.attributes),
        attributeString: v.getAttributeString(),
        availableStock: v.availableStock,
        isInStock: v.isInStock(),
        isLowStock: v.isLowStock()
      }));

      res.render('variantManagement', {
        product,
        variants: displayVariants,
        attributes: attributes.map(attr => ({
          ...attr.toObject(),
          values: attr.values.filter(v => v.isActive)
        }))
      });
    } catch (error) {
       console.error('Variant management error:', error);
       res.status(500).send('Error loading variant management: ' + error.message);
    }
  },

  async getStockHistory(req, res) {
    try {
      const { variantId } = req.params;
      const { limit = 50 } = req.query;

      const result = await stockService.getStockHistory(variantId, parseInt(limit));

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Get stock history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock history',
        error: error.message
      });
    }
  }
};
