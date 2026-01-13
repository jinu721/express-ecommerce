const offerModel = require('../models/offerModel');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const brandModel = require('../models/brandModel');
const pricingService = require('../services/pricingService');

module.exports = {
  async offersLoad(req, res) {
    try {
      const { page = 1, type = 'all' } = req.query;
      const limit = 10;
      const skip = (page - 1) * limit;
      
      let query = {};
      if (type !== 'all') {
        query.offerType = type.toUpperCase();
      }
      
      const offers = await offerModel.find(query)
        .populate('applicableProducts', 'name price')
        .populate('applicableCategories', 'name')
        .populate('applicableBrands', 'name')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const totalOffers = await offerModel.countDocuments(query);
      const totalPages = Math.ceil(totalOffers / limit);
      
      res.render('offerManagement', {
        offers,
        currentPage: Number(page),
        totalPages,
        selectedType: type,
        hasOffers: offers.length > 0
      });
    } catch (error) {
      console.error('Error loading offers:', error);
      res.status(500).render('offerManagement', {
        offers: [],
        currentPage: 1,
        totalPages: 1,
        selectedType: 'all',
        hasOffers: false,
        error: 'Failed to load offers'
      });
    }
  },
  
  async createOffer(req, res) {
    try {
      const {
        name,
        description,
        offerType,
        discountType,
        discountValue,
        maxDiscountAmount,
        minOrderValue,
        applicableProducts,
        applicableCategories,
        applicableBrands,
        festivalName,
        startDate,
        endDate,
        usageLimit,
        priority
      } = req.body;
      
      if (!name || !description || !offerType || !discountType || !discountValue || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided'
        });
      }
      
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
      
      if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount must be between 0 and 100'
        });
      }
      
      const offerData = {
        name,
        description,
        offerType: offerType.toUpperCase(),
        discountType: discountType.toUpperCase(),
        discountValue: Number(discountValue),
        minOrderValue: Number(minOrderValue) || 0,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        priority: Number(priority) || 1,
        createdBy: req.session.currentId
      };
      
      if (maxDiscountAmount) {
        offerData.maxDiscountAmount = Number(maxDiscountAmount);
      }
      
      if (usageLimit) {
        offerData.usageLimit = Number(usageLimit);
      }
      
      if (festivalName) {
        offerData.festivalName = festivalName.toUpperCase();
      }
      
      if (applicableProducts && applicableProducts.length > 0) {
        offerData.applicableProducts = Array.isArray(applicableProducts) ? applicableProducts : [applicableProducts];
      }
      
      if (applicableCategories && applicableCategories.length > 0) {
        offerData.applicableCategories = Array.isArray(applicableCategories) ? applicableCategories : [applicableCategories];
      }
      
      if (applicableBrands && applicableBrands.length > 0) {
        offerData.applicableBrands = Array.isArray(applicableBrands) ? applicableBrands : [applicableBrands];
      }
      
      const offer = await offerModel.create(offerData);
      
      res.status(201).json({
        success: true,
        message: 'Offer created successfully',
        offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create offer',
        error: error.message
      });
    }
  },
  
  async updateOffer(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      Object.keys(updateData).forEach(key => {
        if (Array.isArray(updateData[key]) && updateData[key].length === 0) {
          delete updateData[key];
        }
        if (['discountValue', 'maxDiscountAmount', 'minOrderValue', 'usageLimit', 'priority'].includes(key)) {
          updateData[key] = Number(updateData[key]);
        }
        if (['startDate', 'endDate'].includes(key)) {
          updateData[key] = new Date(updateData[key]);
        }
        if (['offerType', 'discountType', 'festivalName'].includes(key)) {
          updateData[key] = updateData[key].toUpperCase();
        }
      });
      
      const offer = await offerModel.findByIdAndUpdate(id, updateData, { new: true });
      
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Offer updated successfully',
        offer
      });
    } catch (error) {
      console.error('Error updating offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update offer',
        error: error.message
      });
    }
  },
  
  async toggleOfferStatus(req, res) {
    try {
      const { id } = req.params;
      const offer = await offerModel.findById(id);
      
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }
      
      offer.isActive = !offer.isActive;
      await offer.save();
      
      res.json({
        success: true,
        message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: offer.isActive
      });
    } catch (error) {
      console.error('Error toggling offer status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update offer status'
      });
    }
  },
  
  async deleteOffer(req, res) {
    try {
      const { id } = req.params;
      const offer = await offerModel.findByIdAndDelete(id);
      
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Offer deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete offer'
      });
    }
  },
  
  async getOffer(req, res) {
    try {
      const { id } = req.params;
      const offer = await offerModel.findById(id)
        .populate('applicableProducts', 'name price')
        .populate('applicableCategories', 'name')
        .populate('applicableBrands', 'name');
      
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }
      
      res.json({
        success: true,
        offer
      });
    } catch (error) {
      console.error('Error fetching offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch offer'
      });
    }
  },
  
  async getOfferFormData(req, res) {
    try {
      const [products, categories, brands] = await Promise.all([
        productModel.find({ isDeleted: false }, 'name price').sort({ name: 1 }),
        categoryModel.find({ isDeleted: false }, 'name').sort({ name: 1 }),
        brandModel.find({ isActive: true }, 'name').sort({ name: 1 })
      ]);
      
      console.log('Form data loaded:', {
        productsCount: products.length,
        categoriesCount: categories.length,
        brandsCount: brands.length
      }); 
      
      const festivals = [
        'DIWALI', 'ONAM', 'CHRISTMAS', 'NEW_YEAR', 'HOLI', 
        'EID', 'DUSSEHRA', 'VALENTINE', 'MOTHERS_DAY', 'FATHERS_DAY'
      ];
      
      res.json({
        success: true,
        data: {
          products,
          categories,
          brands,
          festivals
        }
      });
    } catch (error) {
      console.error('Error fetching form data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch form data: ' + error.message
      });
    }
  },
  
  async getActiveOffers(req, res) {
    try {
      const { type } = req.query;
      const offers = await pricingService.getActiveOffers(type);
      
      res.json({
        success: true,
        offers
      });
    } catch (error) {
      console.error('Error fetching active offers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch offers'
      });
    }
  }
};