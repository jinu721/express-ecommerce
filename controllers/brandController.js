const Brand = require('../models/brandModel');
const Product = require('../models/productModel');
const fs = require('fs').promises;
const path = require('path');

/**
 * Brand Controller
 * Handles brand management operations
 */

module.exports = {
  /**
   * List all active brands (Public)
   * GET /api/brands
   */
  async listBrands(req, res) {
    try {
      const brands = await Brand.find({ isActive: true })
        .select('name slug logo productCount')
        .sort({ name: 1 });

      res.json({
        success: true,
        count: brands.length,
        brands
      });
    } catch (error) {
      console.error('List brands error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch brands',
        error: error.message
      });
    }
  },

  /**
   * Get brand details (Public)
   * GET /api/brands/:brandId
   */
  async getBrandDetails(req, res) {
    try {
      const { brandId } = req.params;

      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      res.json({
        success: true,
        brand
      });
    } catch (error) {
      console.error('Get brand details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch brand details',
        error: error.message
      });
    }
  },

  /**
   * Get products by brand (Public)
   * GET /api/brands/:brandId/products
   */
  async getBrandProducts(req, res) {
    try {
      const { brandId } = req.params;
      const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      const products = await Product.find({
        brand: brandId,
        isDeleted: false
      })
        .populate('category', 'name')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const count = await Product.countDocuments({
        brand: brandId,
        isDeleted: false
      });

      res.json({
        success: true,
        brand: {
          _id: brand._id,
          name: brand.name,
          logo: brand.logo
        },
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      });
    } catch (error) {
      console.error('Get brand products error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch brand products',
        error: error.message
      });
    }
  },

  /**
   * List all brands for admin (Admin)
   * GET /admin/brands
   */
  async adminListBrands(req, res) {
    try {
      const { page = 1, limit = 10, search, isActive } = req.query;

      const query = {};
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      if (isActive !== undefined && isActive !== '') {
        query.isActive = isActive === 'true';
      }

      const brands = await Brand.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const count = await Brand.countDocuments(query);
      const totalPages = Math.ceil(count / limit);

      // If AJAX request, return JSON (useful for search/pagination dynamically)
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
         return res.json({
            success: true,
            brands,
            totalPages,
            currentPage: Number(page),
            total: count
         });
      }

      res.render('brandManagement', {
        brands,
        totalPages,
        currentPage: Number(page),
        total: count,
        searchKey: search || '',
        pagesToShow: 5,
        msg: brands.length === 0 ? "No brands found" : null,
        val: brands.length > 0
      });
    } catch (error) {
      console.error('Admin list brands error:', error);
      res.status(500).render('500', { message: 'Failed to fetch brands' });
    }
  },

  /**
   * Create brand (Admin)
   * POST /admin/brands
   */
  async createBrand(req, res) {
    try {
      const { name, description } = req.body;

      // Check if brand already exists
      const existingBrand = await Brand.findOne({ name });
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: 'Brand with this name already exists'
        });
      }

      const brandData = {
        name,
        description,
        isActive: true
      };

      // Add logo if uploaded
      if (req.file) {
        brandData.logo = `uploads/brands/${req.file.filename}`;
      }

      const brand = await Brand.create(brandData);

      res.status(201).json({
        success: true,
        message: 'Brand created successfully',
        brand
      });
    } catch (error) {
      console.error('Create brand error:', error);
      
      // Delete uploaded file if brand creation fails
      if (req.file) {
        try {
          await fs.unlink(path.join('public', 'uploads', 'brands', req.file.filename));
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create brand',
        error: error.message
      });
    }
  },

  /**
   * Update brand (Admin)
   * PUT /admin/brands/:brandId
   */
  async updateBrand(req, res) {
    try {
      const { brandId } = req.params;
      const { name, description } = req.body;

      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      // Check if new name conflicts with existing brand
      if (name && name !== brand.name) {
        const existingBrand = await Brand.findOne({ name });
        if (existingBrand) {
          return res.status(400).json({
            success: false,
            message: 'Brand with this name already exists'
          });
        }
      }

      const updates = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;

      // Handle logo update
      if (req.file) {
        // Delete old logo if exists
        if (brand.logo) {
          try {
            await fs.unlink(path.join('public', brand.logo));
          } catch (error) {
            console.error('Error deleting old logo:', error);
          }
        }
        updates.logo = `uploads/brands/${req.file.filename}`;
      }

      const updatedBrand = await Brand.findByIdAndUpdate(
        brandId,
        updates,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Brand updated successfully',
        brand: updatedBrand
      });
    } catch (error) {
      console.error('Update brand error:', error);

      // Delete uploaded file if update fails
      if (req.file) {
        try {
          await fs.unlink(path.join('public', 'uploads', 'brands', req.file.filename));
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update brand',
        error: error.message
      });
    }
  },

  /**
   * Delete brand (Admin)
   * DELETE /admin/brands/:brandId
   */
  async deleteBrand(req, res) {
    try {
      const { brandId } = req.params;

      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      // Check if brand has products
      const productCount = await Product.countDocuments({ brand: brandId });
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete brand with ${productCount} associated products. Please reassign or delete products first.`
        });
      }

      // Delete logo file if exists
      if (brand.logo) {
        try {
          await fs.unlink(path.join('public', brand.logo));
        } catch (error) {
          console.error('Error deleting logo:', error);
        }
      }

      await Brand.findByIdAndDelete(brandId);

      res.json({
        success: true,
        message: 'Brand deleted successfully'
      });
    } catch (error) {
      console.error('Delete brand error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete brand',
        error: error.message
      });
    }
  },

  /**
   * Toggle brand status (Admin)
   * POST /admin/brands/:brandId/toggle
   */
  async toggleBrandStatus(req, res) {
    try {
      const { brandId } = req.params;

      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      brand.isActive = !brand.isActive;
      await brand.save();

      res.json({
        success: true,
        message: `Brand ${brand.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: brand.isActive
      });
    } catch (error) {
      console.error('Toggle brand status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle brand status',
        error: error.message
      });
    }
  }
};
