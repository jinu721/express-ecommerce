const offerModel = require('../models/offerModel');
const couponModel = require('../models/couponModel');
const couponUsageModel = require('../models/couponUsageModel');
const productModel = require('../models/productModel');

const roundToTwoDecimals = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

class PricingService {

  async calculateBestOffer(product, quantity = 1, userId = null, variant = null) {
    try {
      const currentDate = new Date();

      let basePrice = 0;
      if (product.basePrice && !isNaN(product.basePrice) && product.basePrice > 0) {
        basePrice = product.basePrice;
      } else if (product.price && !isNaN(product.price) && product.price > 0) {
        basePrice = product.price;
      } else if (product.sizes && product.sizes.price && !isNaN(product.sizes.price)) {
        basePrice = product.sizes.price;
      }

      if (variant) {
        if (variant.specialPrice && variant.specialPrice > 0) {
          basePrice = variant.specialPrice;
        } else {
          basePrice += (variant.priceAdjustment || 0);
        }
      }

      const totalBasePrice = basePrice * quantity;
      if (isNaN(totalBasePrice) || totalBasePrice <= 0) {
        return {
          originalPrice: 0,
          finalPrice: 0,
          discount: 0,
          discountPercentage: 0,
          offer: null,
          hasOffer: false
        };
      }

      const offers = await this.getApplicableOffers(product, currentDate);

      if (!offers || offers.length === 0) {
        return {
          originalPrice: roundToTwoDecimals(totalBasePrice),
          finalPrice: roundToTwoDecimals(totalBasePrice),
          discount: 0,
          discountPercentage: 0,
          offer: null,
          hasOffer: false
        };
      }

      const offerResults = offers.map(offer => {
        const discount = this.calculateOfferDiscount(offer, totalBasePrice);
        return {
          offer,
          discount,
          priority: offer.offerType === 'FESTIVAL' ? (offer.priority || 0) + 1000 : (offer.priority || 0)
        };
      });

      offerResults.sort((a, b) => {
        if (b.discount !== a.discount) return b.discount - a.discount;
        return b.priority - a.priority;
      });

      const best = offerResults[0];

      if (!best || best.discount <= 0) {
        return {
          originalPrice: roundToTwoDecimals(totalBasePrice),
          finalPrice: roundToTwoDecimals(totalBasePrice),
          discount: 0,
          discountPercentage: 0,
          offer: null,
          hasOffer: false
        };
      }

      const finalPrice = Math.max(0, roundToTwoDecimals(totalBasePrice - best.discount));
      const discountPercentage = Math.round((best.discount / totalBasePrice) * 100);

      return {
        originalPrice: roundToTwoDecimals(totalBasePrice),
        finalPrice: roundToTwoDecimals(finalPrice),
        discount: roundToTwoDecimals(best.discount),
        discountPercentage: discountPercentage,
        offer: best.offer,
        hasOffer: true,
        isPercentageOffer: best.offer.discountType === 'PERCENTAGE',
        isFestivalOffer: best.offer.offerType === 'FESTIVAL',
        festivalName: best.offer.festivalName ? best.offer.festivalName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : null
      };
    } catch (error) {
      console.error('Error in calculateBestOffer:', error);
      const fallback = (product.basePrice || product.price || 0) * quantity;
      return {
        originalPrice: fallback,
        finalPrice: fallback,
        discount: 0,
        discountPercentage: 0,
        offer: null,
        hasOffer: false
      };
    }
  }

  async getApplicableOffers(product, currentDate) {
    try {
      const allActiveOffers = await offerModel.find({ isActive: true });
      const allOffers = allActiveOffers.filter(o => {
        const isStarted = o.startDate <= currentDate;
        const isNotExpired = o.endDate >= currentDate;
        const isUsageOk = !o.usageLimit || (o.usedCount < o.usageLimit);

        return isStarted && isNotExpired && isUsageOk;
      });

      const applicableOffers = allOffers.filter(offer => {
        if (offer.offerType === 'FESTIVAL') {
          return true;
        }

        const productId = product._id.toString();
        if (offer.offerType === 'PRODUCT' && offer.applicableProducts.some(id => id.toString() === productId)) {
          return true;
        }

        const categoryId = (product.category?._id || product.category)?.toString();
        if (categoryId && offer.offerType === 'CATEGORY' && offer.applicableCategories.some(id => id.toString() === categoryId)) {
          return true;
        }

        const brandId = (product.brand?._id || product.brand)?.toString();
        if (brandId && offer.offerType === 'BRAND' && offer.applicableBrands.some(id => id.toString() === brandId)) {
          return true;
        }

        if (offer.applicableProducts.length === 0 &&
          offer.applicableCategories.length === 0 &&
          offer.applicableBrands.length === 0) {
          return true;
        }

        return false;
      });

      return applicableOffers;
    } catch (error) {
      return [];
    }
  }

  calculateOfferDiscount(offer, orderValue) {
    if (orderValue < offer.minOrderValue) {
      return 0;
    }

    let discount = 0;

    if (offer.discountType === 'PERCENTAGE') {
      discount = (orderValue * offer.discountValue) / 100;

      if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
        discount = offer.maxDiscountAmount;
      }
    } else if (offer.discountType === 'FIXED_AMOUNT') {
      discount = offer.discountValue;
    }

    const finalDiscount = Math.min(discount, orderValue);
    return Math.round(finalDiscount * 100) / 100;
  }

  async applyCoupon(couponCode, orderValue, userId, cartItems = []) {
    try {
      const currentDate = new Date();

      const coupon = await couponModel.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate }
      });

      if (!coupon) {
        throw new Error('Invalid or expired coupon code');
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new Error('Coupon usage limit exceeded');
      }

      if (userId) {
        const userUsageCount = await couponUsageModel.countDocuments({
          coupon: coupon._id,
          user: userId
        });

        if (userUsageCount >= coupon.usagePerUser) {
          throw new Error('You have already used this coupon the maximum number of times');
        }
      }

      if (orderValue < coupon.minOrderValue) {
        throw new Error(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`);
      }

      if (coupon.applicableProducts.length > 0 || coupon.applicableCategories.length > 0) {
        const isApplicable = await this.isCouponApplicableToCart(coupon, cartItems);
        if (!isApplicable) {
          throw new Error('This coupon is not applicable to items in your cart');
        }
      }

      if (coupon.applicableUsers.length > 0 && !coupon.applicableUsers.includes(userId)) {
        throw new Error('This coupon is not available for your account');
      }

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


  calculateCouponDiscount(coupon, orderValue) {
    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (orderValue * coupon.discountValue) / 100;

      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discount = coupon.discountValue;
    }

    return Math.min(discount, orderValue);
  }


  async isCouponApplicableToCart(coupon, cartItems) {
    if (coupon.applicableProducts.length === 0 && coupon.applicableCategories.length === 0) {
      return true;
    }

    for (const item of cartItems) {
      const product = await productModel.findById(item.productId);
      if (!product) continue;

      if (coupon.applicableProducts.length > 0) {
        if (coupon.applicableProducts.includes(product._id)) {
          return true;
        }
      }

      if (coupon.applicableCategories.length > 0) {
        if (coupon.applicableCategories.includes(product.category)) {
          return true;
        }
      }
    }

    return false;
  }


  async recordCouponUsage(couponId, userId, orderId, discountAmount, orderValue) {
    try {
      await couponUsageModel.create({
        coupon: couponId,
        user: userId,
        order: orderId,
        discountAmount: discountAmount,
        orderValue: orderValue
      });

      await couponModel.findByIdAndUpdate(couponId, {
        $inc: { usedCount: 1 }
      });
    } catch (error) {
      console.error('Error recording coupon usage:', error);
    }
  }

  async recordOfferUsage(offerId) {
    try {
      await offerModel.findByIdAndUpdate(offerId, {
        $inc: { usedCount: 1 }
      });
    } catch (error) {
      console.error('Error recording offer usage:', error);
    }
  }


  async getAvailableCoupons(userId, orderValue = 0) {
    try {
      const currentDate = new Date();

      const query = {
        isActive: true,
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate },
        minOrderValue: { $lte: orderValue }
      };

      query.$or = [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ];

      let coupons = await couponModel.find(query)
        .select('code name description discountType discountValue maxDiscountAmount minOrderValue expiryDate')
        .sort({ discountValue: -1 });

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

  async getActiveFestivalOffer() {
    try {
      const currentDate = new Date();

      const festivalOffer = await offerModel.findOne({
        offerType: 'FESTIVAL',
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
        ]
      }).sort({ priority: -1, createdAt: -1 });

      return festivalOffer;
    } catch (error) {
      console.error('Error getting active festival offer:', error);
      return null;
    }
  }

  async calculateCartTotal(cartItems, couponCode = null, userId = null) {
    try {
      let subtotal = 0;
      let totalOfferDiscount = 0;
      const itemBreakdown = [];

      for (const item of cartItems) {
        const product = item.product || await productModel.findById(item.productId);
        if (!product) continue;

        const offerResult = await this.calculateBestOffer(product, item.quantity, userId, item.variant);

        const originalPrice = Math.round((isNaN(offerResult.originalPrice) ? 0 : offerResult.originalPrice) * 100) / 100;
        const finalPrice = Math.round((isNaN(offerResult.finalPrice) ? 0 : offerResult.finalPrice) * 100) / 100;
        const discount = Math.round((isNaN(offerResult.discount) ? 0 : offerResult.discount) * 100) / 100;

        subtotal += originalPrice;
        totalOfferDiscount += discount;

        itemBreakdown.push({
          product: product,
          quantity: item.quantity,
          originalPrice: originalPrice,
          finalPrice: finalPrice,
          discount: discount,
          offer: offerResult.offer
        });
      }

      subtotal = Math.round(subtotal * 100) / 100;
      totalOfferDiscount = Math.round(totalOfferDiscount * 100) / 100;
      const afterOffers = Math.round(Math.max(0, subtotal - totalOfferDiscount) * 100) / 100;

      let couponDiscount = 0;
      let coupon = null;

      if (couponCode) {
        try {
          const couponResult = await this.applyCoupon(couponCode, afterOffers, userId, cartItems);
          couponDiscount = Math.round((couponResult.discount || 0) * 100) / 100;
          coupon = couponResult.coupon;
        } catch (error) {
          console.log('Coupon application failed:', error.message);
        }
      }

      const finalTotal = Math.round(Math.max(0, afterOffers - couponDiscount) * 100) / 100;
      const totalSavings = Math.round((totalOfferDiscount + couponDiscount) * 100) / 100;

      return {
        subtotal: subtotal,
        offerDiscount: totalOfferDiscount,
        afterOffers: afterOffers,
        couponDiscount: couponDiscount,
        finalTotal: finalTotal,
        total: finalTotal,
        totalSavings: totalSavings,
        itemBreakdown: itemBreakdown,
        appliedCoupon: coupon
      };
    } catch (error) {
      console.error('Error calculating cart total:', error);
      return {
        subtotal: 0,
        offerDiscount: 0,
        afterOffers: 0,
        couponDiscount: 0,
        finalTotal: 0,
        total: 0,
        totalSavings: 0,
        itemBreakdown: [],
        appliedCoupon: null,
        error: error.message
      };
    }
  }
}

module.exports = new PricingService();