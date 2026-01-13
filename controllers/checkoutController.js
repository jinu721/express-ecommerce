const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const path = require("path");

const pricingService = require("../services/pricingService");
const stockService = require("../services/stockService");
const Variant = require("../models/variantModel");
const Wallet = require("../models/walletModel");


module.exports = {
  async checkoutPageLoad(req, res) {
    try {
      const userId = req.session.currentId;
      const user = await userModel.findById(userId);
      let isBuyNow = !!req.session.tempCart;

      let cartItems = [];
      let summary = {
        subtotal: 0,
        discount: 0,
        deliveryCharge: 0,
        total: 0
      };

      if (isBuyNow) {
        const { productId, quantity, size, color } = req.session.tempCart;
        const product = await productModel.findById(productId);

        const attributeQuery = {};
        if (size) attributeQuery['attributes.SIZE'] = size.toUpperCase();
        if (color) attributeQuery['attributes.COLOR'] = color.toUpperCase();

        const variant = await Variant.findOne({
          product: productId,
          ...attributeQuery,
          isActive: true
        });

        if (!product) {
          return res.redirect('/shop');
        }

        const pricing = await pricingService.calculateBestOffer(product, Number(quantity), req.session.currentId, variant);

        cartItems.push({
          ...product.toObject(),
          variant: variant,
          quantity: Number(quantity),
          size,
          color,
          price: isNaN(pricing.finalPrice) ? 0 : pricing.finalPrice / Number(quantity),
          originalPrice: isNaN(pricing.originalPrice) ? 0 : pricing.originalPrice / Number(quantity),
          totalPrice: isNaN(pricing.finalPrice) ? 0 : pricing.finalPrice,
          discount: isNaN(pricing.discount) ? 0 : pricing.discount,
          image: variant && variant.images.length > 0 ? variant.images[0] : product.images[0]
        });

        const deliveryCharge = product.hasCustomShipping ?
          (product.shippingPrice * Number(quantity)) :
          ((pricing.originalPrice || 0) < 2000 ? 100 : 0);
        summary = {
          subtotal: Math.round(isNaN(pricing.originalPrice) ? 0 : pricing.originalPrice),
          discount: Math.round(isNaN(pricing.discount) ? 0 : pricing.discount),
          deliveryCharge: Math.round(deliveryCharge),
          total: Math.round(isNaN(pricing.finalPrice) ? deliveryCharge : pricing.finalPrice + deliveryCharge)
        };

      } else {
        const cart = await cartModel.findOne({ userId });

        if (!cart || cart.items.length === 0) {
          return res.redirect('/cart');
        }

        const itemsToCalculate = [];

        for (const item of cart.items) {
          const product = await productModel.findById(item.productId);
          if (!product) continue;

          const attributeQuery = {};
          if (item.size) attributeQuery['attributes.SIZE'] = item.size.toUpperCase();
          if (item.color) attributeQuery['attributes.COLOR'] = item.color.toUpperCase();

          const variant = await Variant.findOne({
            product: item.productId,
            ...attributeQuery,
            isActive: true
          });

          itemsToCalculate.push({
            product,
            variant,
            quantity: item.quantity
          });

          let effectivePrice = product.price;
          if (variant) {
            if (variant.specialPrice) {
              effectivePrice = variant.specialPrice;
            } else if (variant.priceAdjustment) {
              effectivePrice += variant.priceAdjustment;
            }
          }

          cartItems.push({
            ...product.toObject(),
            variant,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            price: effectivePrice,
            images: product.images
          });
        }

        const cartItemsToCalculate = cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variantId
        }));

        const calculation = await pricingService.calculateCartTotal(itemsToCalculate, null, req.session.currentId);

        let deliveryCharge = 0;
        let hasCustomShipping = false;

        for (const item of itemsToCalculate) {
          if (item.product.hasCustomShipping) {
            deliveryCharge += (item.product.shippingPrice || 0) * item.quantity;
            hasCustomShipping = true;
          }
        }

        if (!hasCustomShipping && (calculation.subtotal || 0) < 2000) {
          deliveryCharge = 100;
        }

        summary = {
          subtotal: Math.round(isNaN(calculation.subtotal) ? 0 : calculation.subtotal),
          discount: Math.round(isNaN(calculation.offerDiscount + calculation.couponDiscount) ? 0 : calculation.offerDiscount + calculation.couponDiscount),
          deliveryCharge: Math.round(deliveryCharge),
          total: Math.round(isNaN(calculation.finalTotal) ? deliveryCharge : calculation.finalTotal + deliveryCharge)
        };
      }

      let walletBalance = 0;
      try {
        if (user && user.wallet !== undefined) {
          walletBalance = user.wallet || 0;
        } else {
          const walletModel = require("../models/walletModel");
          const wallet = await walletModel.findOne({ userId });
          if (wallet) walletBalance = wallet.balance || 0;
        }
      } catch (e) {
        console.warn("Wallet fetch failed, defaulting to 0:", e.message);
        walletBalance = 0;
      }

      console.log(`Checkout loaded for user ${userId}. Total: ${summary.total}`);

      res.render("checkout", {
        cartItems,
        deliveryCharge: summary.deliveryCharge,
        subtotal: summary.subtotal,
        total: summary.total,
        walletBalance,
        discount: summary.discount,
        isBuyNow
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Something went wrong loading checkout" });
    }
  },
};
