const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const path = require("path");

// New Services & Models
const pricingService = require("../services/pricingService");
const stockService = require("../services/stockService");
const Variant = require("../models/variantModel");
const Wallet = require("../models/walletModel"); // Assuming wallet model exists

module.exports = {
  // ~~~ Checkout Page Load (REFACTORED) ~~~
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

      // 1. Handle Buy Now
      if (isBuyNow) {
        const { productId, quantity, size, color } = req.session.tempCart;
        const product = await productModel.findById(productId);
        
        // Find Variant
        const variant = await Variant.findOne({ 
            product: productId, 
            'attributes.size': size, 
            'attributes.color': color 
        });

        if (!product) {
            return res.redirect('/shop'); // Fallback
        }

        // Calculate Price
        const pricing = await pricingService.calculateBestOffer(product, Number(quantity), req.session.currentId);

        cartItems.push({
            ...product.toObject(),
            variant: variant,
            quantity: Number(quantity),
            size,
            color,
            price: pricing.finalPrice / Number(quantity), // Unit price
            originalPrice: pricing.originalPrice / Number(quantity),
            totalPrice: pricing.finalPrice,
            discount: pricing.discount,
            image: variant && variant.images.length > 0 ? variant.images[0] : product.images[0]
        });

        const deliveryCharge = pricing.originalPrice < 2000 ? 100 : 0;
        summary = {
            subtotal: pricing.originalPrice,
            discount: pricing.discount,
            deliveryCharge: deliveryCharge,
            total: pricing.finalPrice + deliveryCharge
        };
        
        // Clear temp cart after loading? Maybe not, keep until order placed.
        // req.session.tempCart = null; (Wait until order placement)

      } else {
        // 2. Handle Regular Cart
        const cart = await cartModel.findOne({ userId });
        
        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        // Prepare items for pricing service
        const itemsToCalculate = [];
        
        // Enrich items
        for (const item of cart.items) {
           const product = await productModel.findById(item.productId);
           if (!product) continue;
           
           // Try to find variant match
           const variant = await Variant.findOne({
               product: item.productId,
               'attributes.size': item.size,
               'attributes.color': item.color
           });

           itemsToCalculate.push({
               product,
               variant,
               quantity: item.quantity
           });

           cartItems.push({
               ...product.toObject(),
               variant,
               quantity: item.quantity,
               size: item.size,
               color: item.color,
               // Fallback images
               images: product.images
           });
        }

        // Prepare cart items for calculation
        const cartItemsToCalculate = cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId
        }));

        // Calculate totals using pricing service
        const calculation = await pricingService.calculateCartTotal(cartItemsToCalculate, null, req.session.currentId);
        
        const deliveryCharge = calculation.subtotal < 2000 ? 100 : 0;
        summary = {
            subtotal: calculation.subtotal,
            discount: calculation.offerDiscount + calculation.couponDiscount,
            deliveryCharge: deliveryCharge,
            total: calculation.finalTotal + deliveryCharge
        };
      }

      // 3. Get Wallet Balance
      // Check if wallet route/model exists. Assuming logic similar to other models.
      // If WalletModel isn't standard, check import. 
      // I'll assume we can pass 0 if not found for now to avoid crashes.
      let walletBalance = 0;
      try {
          // Check if user has wallet field or separate model
          // Based on userModel, likely separate.
          // Let's safe check
          const wallet = await require("../models/walletModel").findOne({ userId });
          if (wallet) walletBalance = wallet.balance;
      } catch (e) {
          console.warn("Wallet fetch failed", e.message);
      }

      console.log(`Checkout loaded for user ${userId}. Total: ${summary.total}`);

      res.render("checkout", { 
          cartItems, 
          deliveryCharge: summary.deliveryCharge,
          subtotal: summary.subtotal,
          total: summary.total,
          walletBalance,
          discount: summary.discount, // Pass discount for display
          isBuyNow // Pass flag if needed
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Something went wrong loading checkout" });
    }
  },
};
