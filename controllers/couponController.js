const couponModel = require('../models/couponModel');
const couponUsageModel = require('../models/couponUsageModel');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const pricingService = require('../services/pricingService');

module.exports = {
  // Load coupons management page
  async couponsLoad(req, res) {
    try {
      const { page = 1 } = req.query;
      const limit = 10;
      const skip = (page - 1) * limit;
      
      const coupons = await couponModel.find()
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const totalCoupons = await couponModel.countDocuments();
      const totalPages = Math.ceil(totalCoupons / limit);
      
      res.render('coupensManagment', {
        coupons,
        currentPage: Number(page),
        totalPages,
        hasCoupons: coupons.length > 0
      });
    } catch (error) {
      console.error('Error loading coupons:', error);
      res.status(500).render('coupensManagment', {
        coupons: [],
        currentPage: 1,
        totalPages: 1,
        hasCoupons: false,
        error: 'Failed to load coupons'
      });
    }
  },
  
  // Create new coupon
  async createCoupon(req, res) {
    try {
      const {
        code,
        name,
        description,
        discountType,
        discountValue,
        maxDiscountAmount,
        minOrderValue,
        startDate,
        expiryDate,
        usageLimit,
        usagePerUser,
        applicableProducts,
        applicableCategories,
        applicableUsers
      } = req.body;
      
      // Validation
      if (!code || !name || !description || !discountType || !discountValue || !startDate || !expiryDate) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided'
        });
      }
      
      if (new Date(startDate) >= new Date(expiryDate)) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date must be after start date'
        });
      }
      
      if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount must be between 0 and 100'
        });
      }
      
      // Check if coupon code already exists
      const existingCoupon = await couponModel.findOne({ code: code.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }
      
      const couponData = {
        code: code.toUpperCase(),
        name,
        description,
        discountType: discountType.toUpperCase(),
        discountValue: Number(discountValue),
        minOrderValue: Number(minOrderValue) || 0,
        startDate: new Date(startDate),
        expiryDate: new Date(expiryDate),
        usagePerUser: Number(usagePerUser) || 1,
        createdBy: req.session.currentId
      };
      
      // Add optional fields
      if (maxDiscountAmount) {
        couponData.maxDiscountAmount = Number(maxDiscountAmount);
      }
      
      if (usageLimit) {
        couponData.usageLimit = Number(usageLimit);
      }
      
      // Handle applicability arrays
      if (applicableProducts && applicableProducts.length > 0) {
        couponData.applicableProducts = Array.isArray(applicableProducts) ? applicableProducts : [applicableProducts];
      }
      
      if (applicableCategories && applicableCategories.length > 0) {
        couponData.applicableCategories = Array.isArray(applicableCategories) ? applicableCategories : [applicableCategories];
      }
      
      if (applicableUsers && applicableUsers.length > 0) {
        couponData.applicableUsers = Array.isArray(applicableUsers) ? applicableUsers : [applicableUsers];
      }
      
      const coupon = await couponModel.create(couponData);
      
      res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        coupon
      });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create coupon',
        error: error.message
      });
    }
  },
  
  // Update coupon
  async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Remove empty arrays and convert types
      Object.keys(updateData).forEach(key => {
        if (Array.isArray(updateData[key]) && updateData[key].length === 0) {
          delete updateData[key];
        }
        if (['discountValue', 'maxDiscountAmount', 'minOrderValue', 'usageLimit', 'usagePerUser'].includes(key)) {
          updateData[key] = Number(updateData[key]);
        }
        if (['startDate', 'expiryDate'].includes(key)) {
          updateData[key] = new Date(updateData[key]);
        }
        if (['discountType'].includes(key)) {
          updateData[key] = updateData[key].toUpperCase();
        }
        if (key === 'code') {
          updateData[key] = updateData[key].toUpperCase();
        }
      });
      
      const coupon = await couponModel.findByIdAndUpdate(id, updateData, { new: true });
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Coupon updated successfully',
        coupon
      });
    } catch (error) {
      console.error('Error updating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update coupon',
        error: error.message
      });
    }
  },
  
  // Toggle coupon status
  async toggleCouponStatus(req, res) {
    try {
      const { id } = req.params;
      const coupon = await couponModel.findById(id);
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      
      coupon.isActive = !coupon.isActive;
      await coupon.save();
      
      res.json({
        success: true,
        message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: coupon.isActive
      });
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update coupon status'
      });
    }
  },
  
  // Delete coupon
  async deleteCoupon(req, res) {
    try {
      const { id } = req.params;
      const coupon = await couponModel.findByIdAndDelete(id);
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete coupon'
      });
    }
  },
  
  // Get coupon details
  async getCoupon(req, res) {
    try {
      const { id } = req.params;
      const coupon = await couponModel.findById(id)
        .populate('applicableProducts', 'name price')
        .populate('applicableCategories', 'name')
        .populate('applicableUsers', 'username email');
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      
      res.json({
        success: true,
        coupon
      });
    } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupon'
      });
    }
  },
  
  // Validate coupon code (for frontend)
  async validateCoupon(req, res) {
    try {
      const { code, orderValue, userId } = req.body;
      
      if (!code || !orderValue || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code, order value, and user ID are required'
        });
      }
      
      try {
        const result = await pricingService.applyCoupon(code, orderValue, userId);
        
        res.json({
          success: true,
          message: 'Coupon is valid',
          discount: result.discount,
          coupon: result.coupon
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate coupon'
      });
    }
  },
  
  // Get available coupons for user
  async getAvailableCoupons(req, res) {
    try {
      const { userId, orderValue = 0 } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      const coupons = await pricingService.getAvailableCoupons(userId, Number(orderValue));
      
      res.json({
        success: true,
        coupons
      });
    } catch (error) {
      console.error('Error fetching available coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available coupons'
      });
    }
  },
  
  // Get coupon usage analytics
  async getCouponAnalytics(req, res) {
    try {
      const { id } = req.params;
      
      const coupon = await couponModel.findById(id);
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      
      const usageData = await couponUsageModel.find({ coupon: id })
        .populate('user', 'username email')
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 });
      
      const analytics = {
        coupon: {
          code: coupon.code,
          name: coupon.name,
          usedCount: coupon.usedCount,
          usageLimit: coupon.usageLimit,
          usagePercentage: coupon.usageLimit 
            ? ((coupon.usedCount / coupon.usageLimit) * 100).toFixed(2)
            : 'Unlimited'
        },
        usage: usageData,
        totalDiscountGiven: usageData.reduce((sum, usage) => sum + usage.discountAmount, 0),
        totalOrderValue: usageData.reduce((sum, usage) => sum + usage.orderValue, 0)
      };
      
      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Error fetching coupon analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }
  }
};