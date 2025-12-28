const offerModel = require('../models/offerModel');
const couponModel = require('../models/couponModel');
const couponUsageModel = require('../models/couponUsageModel');
const productModel = require('../models/productModel');

/**
 * Pricing Service
 * Handles offer and coupon calculations for ecommerce system
 */
class PricingService {
  
  /**
   * Calculate the best offer for a product (SIMPLIFIED)
   * @param {Object} product - Product object
   * @param {Number} quantity - Quantity being purchased
   * @param {String} userId - User ID (for user-specific offers)
   * @param {Object} variant - Optional variant object for variant-specific pricing
   * @returns {Object} Best offer details and calculated price
   */
  async calculateBestOffer(product, quantity = 1, userId = null, variant = null) {
    try {
      const currentDate = new Date();
      
      // Calculate the base price considering variant
      let basePrice = product.basePrice || product.price;
      
      if (variant) {
        // Apply variant price logic
        if (variant.specialPrice && variant.specialPrice > 0) {
          // Use special price if available
          basePrice = variant.specialPrice;
        } else {
          // Apply price adjustment (increment/decrement)
          basePrice = basePrice + (variant.priceAdjustment || 0);
        }
      }
      
      const totalBasePrice = basePrice * quantity;
      
      // Get all applicable offers
      const offers = await this.getApplicableOffers(product, currentDate);
      
      if (offers.length === 0) {
        return {
          originalPrice: totalBasePrice,
          finalPrice: totalBasePrice,
          discount: 0,
          discountPercentage: 0,
          offer: null,
          hasOffer: false
        };
      }
      
      // Sort offers by priority (highest first), then by creation date (latest first)
      offers.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return new Date(b.createdAt) - new Date(a.createdAt); // Latest first for same priority
      });
      
      // Apply the best offer (first in sorted list)
      const bestOffer = offers[0];
      const discount = this.calculateOfferDiscount(bestOffer, totalBasePrice);
      const finalPrice = Math.max(0, totalBasePrice - discount);
      
      // Calculate discount percentage for display
      let discountPercentage = 0;
      if (bestOffer.discountType === 'PERCENTAGE') {
        discountPercentage = bestOffer.discountValue;
      } else if (discount > 0) {
        discountPercentage = Math.round((discount / totalBasePrice) * 100);
      }
      
      return {
        originalPrice: totalBasePrice,
        finalPrice: finalPrice,
        discount: discount,
        discountPercentage: discountPercentage,
        offer: bestOffer,
        hasOffer: discount > 0,
        isPercentageOffer: bestOffer.discountType === 'PERCENTAGE'
      };
    } catch (error) {
      console.error('Error calculating best offer:', error);
      const fallbackPrice = (product.basePrice || product.price) * quantity;
      return {
        originalPrice: fallbackPrice,
        finalPrice: fallbackPrice,
        discount: 0,
        discountPercentage: 0,
        offer: null,
        hasOffer: false,
        isPercentageOffer: false
      };
    }
  }
  
  /**
   * Calculate pricing for a product with all its variants
   * @param {Object} product - Product object
   * @param {Array} variants - Array of variant objects
   * @param {String} userId - User ID
   * @returns {Object} Product pricing with variant information
   */
  async calculateProductPricing(product, variants = [], userId = null) {
    try {
      // Calculate base product pricing (without variants)
      const baseOfferResult = await this.calculateBestOffer(product, 1, userId, null);
      
      // Calculate pricing for each variant
      const variantPricing = await Promise.all(variants.map(async (variant) => {
        const variantOfferResult = await this.calculateBestOffer(product, 1, userId, variant);
        return {
          variantId: variant._id,
          variant: variant,
          originalPrice: variantOfferResult.originalPrice,
          finalPrice: variantOfferResult.finalPrice,
          discount: variantOfferResult.discount,
          offer: variantOfferResult.offer,
          variantPrice: variantOfferResult.variantPrice
        };
      }));
      
      // Find the minimum and maximum prices among variants
      let minPrice = baseOfferResult.finalPrice;
      let maxPrice = baseOfferResult.finalPrice;
      let hasVariantPricing = false;
      
      if (variantPricing.length > 0) {
        const variantPrices = variantPricing.map(v => v.finalPrice);
        minPrice = Math.min(...variantPrices);
        maxPrice = Math.max(...variantPrices);
        hasVariantPricing = true;
      }
      
      return {
        basePrice: baseOfferResult.originalPrice,
        baseFinalPrice: baseOfferResult.finalPrice,
        baseDiscount: baseOfferResult.discount,
        baseOffer: baseOfferResult.offer,
        minPrice: minPrice,
        maxPrice: maxPrice,
        hasVariantPricing: hasVariantPricing,
        variantPricing: variantPricing,
        displayPrice: minPrice, // Show minimum price to user
        priceRange: minPrice !== maxPrice ? `₹${minPrice} - ₹${maxPrice}` : `₹${minPrice}`
      };
    } catch (error) {
      console.error('Error calculating product pricing:', error);
      const fallbackPrice = product.basePrice || product.price;
      return {
        basePrice: fallbackPrice,
        baseFinalPrice: fallbackPrice,
        baseDiscount: 0,
        baseOffer: null,
        minPrice: fallbackPrice,
        maxPrice: fallbackPrice,
        hasVariantPricing: false,
        variantPricing: [],
        displayPrice: fallbackPrice,
        priceRange: `₹${fallbackPrice}`
      };
    }
  }

  /**
   * Get all applicable offers for a product
   * @param {Object} product - Product object
   * @param {Date} currentDate - Current date
   * @returns {Array} Array of applicable offers
   */
  async getApplicableOffers(product, currentDate) {
    try {
      const query = {
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        $or: []
      };
      
      // Product-specific offers (only if product is in applicableProducts array)
      query.$or.push({
        offerType: 'PRODUCT',
        applicableProducts: product._id
      });
      
      // Category offers (only if product's category is in applicableCategories array)
      if (product.category) {
        query.$or.push({
          offerType: 'CATEGORY',
          applicableCategories: product.category._id || product.category
        });
      }
      
      // Brand offers (only if product's brand is in applicableBrands array)
      if (product.brand) {
        query.$or.push({
          offerType: 'BRAND',
          applicableBrands: product.brand._id || product.brand
        });
      }
      
      // Festival offers (apply to all products)
      query.$or.push({
        offerType: 'FESTIVAL'
      });
      
      // Check usage limits
      const usageLimitQuery = {
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
        ]
      };
      
      // Combine queries
      const finalQuery = {
        $and: [query, usageLimitQuery]
      };
      
      const offers = await offerModel.find(finalQuery)
        .sort({ priority: -1, createdAt: -1 });
      
      console.log(`Found ${offers.length} applicable offers for product ${product.name}`);
      
      return offers;
    } catch (error) {
      console.error('Error getting applicable offers:', error);
      return [];
    }
  }
  
  /**
   * Calculate discount amount for an offer
   * @param {Object} offer - Offer object
   * @param {Number} orderValue - Order value
   * @returns {Number} Discount amount
   */
  calculateOfferDiscount(offer, orderValue) {
    // Check minimum order value
    if (orderValue < offer.minOrderValue) {
      return 0;
    }
    
    let discount = 0;
    
    if (offer.discountType === 'PERCENTAGE') {
      discount = (orderValue * offer.discountValue) / 100;
      
      // Apply max discount cap if specified
      if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
        discount = offer.maxDiscountAmount;
      }
    } else if (offer.discountType === 'FIXED_AMOUNT') {
      discount = offer.discountValue;
    }
    
    // Ensure discount doesn't exceed order value
    return Math.min(discount, orderValue);
  }
  
  /**
   * Apply coupon to order
   * @param {String} couponCode - Coupon code
   * @param {Number} orderValue - Order value after offers
   * @param {String} userId - User ID
   * @param {Array} cartItems - Cart items for product/category restrictions
   * @returns {Object} Coupon application result
   */
  async applyCoupon(couponCode, orderValue, userId, cartItems = []) {
    try {
      const currentDate = new Date();
      
      // Find and validate coupon
      const coupon = await couponModel.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate }
      });
      
      if (!coupon) {
        throw new Error('Invalid or expired coupon code');
      }
      
      // Check usage limits
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new Error('Coupon usage limit exceeded');
      }
      
      // Check user-specific usage limit
      if (userId) {
        const userUsageCount = await couponUsageModel.countDocuments({
          coupon: coupon._id,
          user: userId
        });
        
        if (userUsageCount >= coupon.usagePerUser) {
          throw new Error('You have already used this coupon the maximum number of times');
        }
      }
      
      // Check minimum order value
      if (orderValue < coupon.minOrderValue) {
        throw new Error(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`);
      }
      
      // Check product/category restrictions
      if (coupon.applicableProducts.length > 0 || coupon.applicableCategories.length > 0) {
        const isApplicable = await this.isCouponApplicableToCart(coupon, cartItems);
        if (!isApplicable) {
          throw new Error('This coupon is not applicable to items in your cart');
        }
      }
      
      // Check user restrictions
      if (coupon.applicableUsers.length > 0 && !coupon.applicableUsers.includes(userId)) {
        throw new Error('This coupon is not available for your account');
      }
      
      // Calculate discount
      const discount = this.calculateCouponDiscount(coupon, orderValue);
      
      return {
        success: true,
        coupon: coupon,
        discount: discount,
        finalAmount: Math.max(0, orderValue - discount)
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
  
  /**
   * Calculate coupon discount
   * @param {Object} coupon - Coupon object
   * @param {Number} orderValue - Order value
   * @returns {Number} Discount amount
   */
  calculateCouponDiscount(coupon, orderValue) {
    let discount = 0;
    
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (orderValue * coupon.discountValue) / 100;
      
      // Apply max discount cap if specified
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discount = coupon.discountValue;
    }
    
    // Ensure discount doesn't exceed order value
    return Math.min(discount, orderValue);
  }
  
  /**
   * Check if coupon is applicable to cart items
   * @param {Object} coupon - Coupon object
   * @param {Array} cartItems - Cart items
   * @returns {Boolean} Whether coupon is applicable
   */
  async isCouponApplicableToCart(coupon, cartItems) {
    if (coupon.applicableProducts.length === 0 && coupon.applicableCategories.length === 0) {
      return true; // No restrictions
    }
    
    for (const item of cartItems) {
      const product = await productModel.findById(item.productId);
      if (!product) continue;
      
      // Check product restrictions
      if (coupon.applicableProducts.length > 0) {
        if (coupon.applicableProducts.includes(product._id)) {
          return true;
        }
      }
      
      // Check category restrictions
      if (coupon.applicableCategories.length > 0) {
        if (coupon.applicableCategories.includes(product.category)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Record coupon usage
   * @param {String} couponId - Coupon ID
   * @param {String} userId - User ID
   * @param {String} orderId - Order ID
   * @param {Number} discountAmount - Discount amount applied
   * @param {Number} orderValue - Original order value
   */
  async recordCouponUsage(couponId, userId, orderId, discountAmount, orderValue) {
    try {
      // Create usage record
      await couponUsageModel.create({
        coupon: couponId,
        user: userId,
        order: orderId,
        discountAmount: discountAmount,
        orderValue: orderValue
      });
      
      // Increment coupon usage count
      await couponModel.findByIdAndUpdate(couponId, {
        $inc: { usedCount: 1 }
      });
    } catch (error) {
      console.error('Error recording coupon usage:', error);
    }
  }
  
  /**
   * Record offer usage
   * @param {String} offerId - Offer ID
   */
  async recordOfferUsage(offerId) {
    try {
      await offerModel.findByIdAndUpdate(offerId, {
        $inc: { usedCount: 1 }
      });
    } catch (error) {
      console.error('Error recording offer usage:', error);
    }
  }
  
  /**
   * Get available coupons for a user
   * @param {String} userId - User ID
   * @param {Number} orderValue - Current order value
   * @returns {Array} Available coupons
   */
  async getAvailableCoupons(userId, orderValue = 0) {
    try {
      const currentDate = new Date();
      
      const query = {
        isActive: true,
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate },
        minOrderValue: { $lte: orderValue }
      };
      
      // Add usage limit check
      query.$or = [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ];
      
      let coupons = await couponModel.find(query)
        .select('code name description discountType discountValue maxDiscountAmount minOrderValue expiryDate')
        .sort({ discountValue: -1 });
      
      // Filter out coupons user has already used maximum times
      if (userId) {
        const userUsages = await couponUsageModel.aggregate([
          { $match: { user: userId } },
          { $group: { _id: '$coupon', count: { $sum: 1 } } }
        ]);
        
        const usageMap = {};
        userUsages.forEach(usage => {
          usageMap[usage._id.toString()] = usage.count;
        });
        
        coupons = coupons.filter(coupon => {
          const usageCount = usageMap[coupon._id.toString()] || 0;
          return usageCount < coupon.usagePerUser;
        });
      }
      
      return coupons;
    } catch (error) {
      console.error('Error getting available coupons:', error);
      return [];
    }
  }
  
  /**
   * Get active offers for display
   * @param {String} type - Offer type filter
   * @returns {Array} Active offers
   */
  async getActiveOffers(type = null) {
    try {
      const currentDate = new Date();
      
      const query = {
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate }
      };
      
      if (type) {
        query.offerType = type.toUpperCase();
      }
      
      const offers = await offerModel.find(query)
        .populate('applicableProducts', 'name')
        .populate('applicableCategories', 'name')
        .populate('applicableBrands', 'name')
        .sort({ priority: -1, createdAt: -1 });
      
      return offers;
    } catch (error) {
      console.error('Error getting active offers:', error);
      return [];
    }
  }
  
  /**
   * Calculate total cart value with offers and coupons
   * @param {Array} cartItems - Cart items
   * @param {String} couponCode - Optional coupon code
   * @param {String} userId - User ID
   * @returns {Object} Complete pricing breakdown
   */
  async calculateCartTotal(cartItems, couponCode = null, userId = null) {
    try {
      let subtotal = 0;
      let totalOfferDiscount = 0;
      const itemBreakdown = [];
      
      // Calculate offers for each item
      for (const item of cartItems) {
        const product = await productModel.findById(item.productId);
        if (!product) continue;
        
        const offerResult = await this.calculateBestOffer(product, item.quantity, userId);
        
        subtotal += offerResult.originalPrice;
        totalOfferDiscount += offerResult.discount;
        
        itemBreakdown.push({
          product: product,
          quantity: item.quantity,
          originalPrice: offerResult.originalPrice,
          finalPrice: offerResult.finalPrice,
          discount: offerResult.discount,
          offer: offerResult.offer
        });
      }
      
      const afterOffers = subtotal - totalOfferDiscount;
      let couponDiscount = 0;
      let coupon = null;
      
      // Apply coupon if provided
      if (couponCode) {
        try {
          const couponResult = await this.applyCoupon(couponCode, afterOffers, userId, cartItems);
          couponDiscount = couponResult.discount;
          coupon = couponResult.coupon;
        } catch (error) {
          // Coupon application failed, continue without it
          console.log('Coupon application failed:', error.message);
        }
      }
      
      const finalTotal = Math.max(0, afterOffers - couponDiscount);
      
      return {
        subtotal: subtotal,
        offerDiscount: totalOfferDiscount,
        afterOffers: afterOffers,
        couponDiscount: couponDiscount,
        finalTotal: finalTotal,
        totalSavings: totalOfferDiscount + couponDiscount,
        itemBreakdown: itemBreakdown,
        appliedCoupon: coupon
      };
    } catch (error) {
      console.error('Error calculating cart total:', error);
      throw error;
    }
  }
}

module.exports = new PricingService();