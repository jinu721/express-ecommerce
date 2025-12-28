const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const Variant = require("../models/variantModel");
const pricingService = require("../services/pricingService");
const stockService = require("../services/stockService");

module.exports = {
  // ~~~ Cart Page Load ~~~
  async cartPageLoad(req, res) {
    try {
      let cart = await cartModel
        .findOne({ userId: req.session.currentId })
        .populate("items.productId");

      if (!cart || cart.items.length === 0) {
        return res.status(200).render("cart", {
          isCartEmpty: true,
          msg: "No items found on cart",
          products: null,
          cart: null,
        });
      }

      // Filter out deleted products
      cart.items = cart.items.filter((item) => item.productId && !item.productId.isDeleted);
      
      if (cart.items.length === 0) {
        return res.status(200).render("cart", {
          isCartEmpty: true,
          msg: "No valid items in cart",
          products: null,
          cart: null,
        });
      }

      // Populate variants if needed (though pricing service handles calculations)
      // Populate variants if needed and recalculate pricing
      const populatedItems = await Promise.all(cart.items.map(async item => {
          const variant = item.variantId ? await Variant.findById(item.variantId) : null;
          const product = await productModel.findById(item.productId);
          
          // Calculate current pricing for this item
          const pricing = await pricingService.calculateBestOffer(product, item.quantity, req.session.currentId, variant);
          
          // Update item pricing if needed
          const expectedPrice = pricing.finalPrice / item.quantity;
          if (Math.abs(item.price - expectedPrice) > 0.01) {
            item.price = expectedPrice;
            item.total = expectedPrice * item.quantity;
          }
          
          return {
              product: product,
              variant: variant,
              quantity: item.quantity,
              productId: item.productId
          };
      }));

      // Recalculate Total on Load to ensure accuracy
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, null, req.session.currentId);
      const newTotal = cartTotalInfo.finalTotal || cartTotalInfo.total || 0;
      
      // Update cart total in DB if changed
      if (Math.abs(cart.cartTotal - newTotal) > 0.01) {
          cart.cartTotal = Math.round(newTotal * 100) / 100;
          await cart.save();
      }

      const productIds = cart.items.map((item) => item.productId._id);
      const products = await productModel.find({ _id: { $in: productIds } });
      
      // Calculate offer prices for cart items
      const cartItemsWithOffers = await Promise.all(cart.items.map(async (item) => {
        const product = products.find(p => p._id.toString() === item.productId._id.toString());
        if (!product) return item;
        
        const offerResult = await pricingService.calculateBestOffer(product, item.quantity, req.session.currentId);
        
        return {
          ...item.toObject(),
          originalPrice: offerResult.originalPrice / item.quantity, // Unit price
          finalPrice: offerResult.finalPrice / item.quantity, // Unit price after offers
          totalOriginalPrice: offerResult.originalPrice, // Total original price
          totalFinalPrice: offerResult.finalPrice, // Total price after offers
          discount: offerResult.discount,
          hasOffer: offerResult.hasOffer,
          isFestivalOffer: offerResult.offer && offerResult.offer.offerType === 'FESTIVAL'
        };
      }));
      
      // Calculate shipping charges
      let deliveryCharge = 0;
      let shippingDetails = { hasCustomShipping: false, customShippingTotal: 0 };
      
      // Check if any products have custom shipping
      const productsWithShipping = await Promise.all(cart.items.map(async (item) => {
        const product = await productModel.findById(item.productId);
        return {
          productId: item.productId,
          hasCustomShipping: product.hasCustomShipping,
          shippingPrice: product.shippingPrice || 0,
          quantity: item.quantity
        };
      }));
      
      // Calculate custom shipping total
      const customShippingTotal = productsWithShipping.reduce((total, item) => {
        if (item.hasCustomShipping) {
          return total + (item.shippingPrice * item.quantity);
        }
        return total;
      }, 0);
      
      if (customShippingTotal > 0) {
        deliveryCharge = customShippingTotal;
        shippingDetails.hasCustomShipping = true;
        shippingDetails.customShippingTotal = customShippingTotal;
      } else {
        // Default shipping logic
        if (cart.cartTotal < 2000) {
          deliveryCharge = 100;
        }
      }

      return res.status(200).render("cart", {
          isCartEmpty: false,
          msg: null,
          cart: {
            ...cart.toObject(),
            items: cartItemsWithOffers
          },
          deliveryCharge,
          shippingDetails,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Server Error");
    }
  },

  // ~~~ Add to Cart (REDESIGNED) ~~~
  async addToCart(req, res) {
    const { productId, variantId, quantity, attributes, isBuyNow } = req.body;
    console.log("Add to Cart:", { productId, variantId, quantity, attributes });

    try {
      if (!req.session.loggedIn) {
        return res.status(401).json({ val: false, msg: "Please login first" });
      }

      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ val: false, msg: "Product not found" });
      }

      // 1. Resolve Variant
      let variant = null;
      if (variantId) {
        variant = await Variant.findById(variantId);
      } else if (attributes && Object.keys(attributes).length > 0) {
        // Find variant by attributes
        const attributeMap = new Map(Object.entries(attributes));
        variant = await Variant.findOne({
          product: productId,
          attributes: attributeMap,
          isActive: true
        });
      }

      // 2. Check Stock
      const stockCheck = await stockService.checkStock(product, variant, quantity, attributes);
      if (!stockCheck.available) {
        return res.status(400).json({ val: false, msg: stockCheck.reason });
      }

      // 3. Calculate Price using variant-aware pricing
      const pricing = await pricingService.calculateBestOffer(product, quantity, req.session.currentId, variant);
      const pricePerItem = pricing.finalPrice / quantity; // Get per-item price
      
      // Ensure valid pricing
      if (isNaN(pricePerItem) || pricePerItem <= 0) {
        console.error(`Invalid pricing calculation for product ${product.name}:`, pricing);
        return res.status(400).json({ val: false, msg: "Pricing calculation error. Please try again." });
      }

      // 4. Update Cart
      let cart = await cartModel.findOne({ userId: req.session.currentId });
      
      // Prepare item data with proper variant integration
      const newItemData = {
        productId,
        variantId: variant ? variant._id : null,
        quantity,
        // Map variant attributes to legacy fields for compatibility
        size: variant ? (variant.attributes.get('SIZE') || variant.attributes.get('size') || 'Standard') : 'Standard',
        color: variant ? (variant.attributes.get('COLOR') || variant.attributes.get('color') || 'Standard') : 'Standard',
        // Store all attributes for future use
        attributes: variant ? Object.fromEntries(variant.attributes) : attributes || {},
        price: pricePerItem,
        total: pricePerItem * quantity
      };

      if (!cart) {
        cart = await cartModel.create({
          userId: req.session.currentId,
          items: [newItemData],
          cartTotal: newItemData.total,
        });
      } else {
        // Check if item exists - prioritize variant matching
        const existingItemIndex = cart.items.findIndex(item => {
          if (variant && item.variantId) {
            return item.variantId.toString() === variant._id.toString();
          } else if (variant) {
            // Fallback: match by attributes if variantId missing
            const itemSize = item.size || 'Standard';
            const itemColor = item.color || 'Standard';
            const variantSize = variant.attributes.get('SIZE') || variant.attributes.get('size') || 'Standard';
            const variantColor = variant.attributes.get('COLOR') || variant.attributes.get('color') || 'Standard';
            return item.productId.toString() === productId && 
                   itemSize === variantSize && 
                   itemColor === variantColor;
          } else {
            // No variant - match by product and legacy attributes
            return item.productId.toString() === productId && 
                   item.size === newItemData.size && 
                   item.color === newItemData.color;
          }
        });

        if (existingItemIndex > -1) {
          // Check max quantity/stock for total amount
          const newTotalQuantity = cart.items[existingItemIndex].quantity + quantity;
          const stockReCheck = await stockService.checkStock(product, variant, newTotalQuantity, attributes);
          
          if (!stockReCheck.available) {
            return res.status(400).json({ val: false, msg: `Cannot add more. ${stockReCheck.reason}` });
          }

          cart.items[existingItemIndex].quantity = newTotalQuantity;
          cart.items[existingItemIndex].total = newTotalQuantity * pricePerItem;
          cart.items[existingItemIndex].price = pricePerItem; 
        } else {
          cart.items.push(newItemData);
        }
      }

      // Recalculate Cart Total using proper pricing service
      const populatedItems = await Promise.all(cart.items.map(async item => {
        const variant = item.variantId ? await Variant.findById(item.variantId) : null;
        const product = await productModel.findById(item.productId);
        return { 
          product: product, 
          variant: variant, 
          quantity: item.quantity,
          productId: item.productId // Add for compatibility
        };
      }));
      
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, null, req.session.currentId);
      cart.cartTotal = Math.round((cartTotalInfo.finalTotal || cartTotalInfo.total || 0) * 100) / 100;
      
      // Ensure cart total is a valid number
      if (isNaN(cart.cartTotal)) {
        cart.cartTotal = 0;
      }
      
      await cart.save();
      
      await cart.save();

      if (isBuyNow) {
        req.session.tempCart = { ...newItemData, isBuyNow };
      }

      res.status(200).json({ 
        val: true, 
        msg: "Item added to cart", 
        cartCount: cart.items.length,
        variant: variant ? {
          _id: variant._id,
          sku: variant.sku,
          attributes: Object.fromEntries(variant.attributes),
          attributeString: variant.getAttributeString()
        } : null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Internal server error: " + err.message });
    }
  },

  // ~~~ Delete from Cart ~~~
  async deleteFromCart(req, res) {
    const { cartItemId } = req.params;
    try {
      await cartModel.updateOne(
        { userId: req.session.currentId },
        { $pull: { items: { _id: cartItemId } } }
      );
      
      const cart = await cartModel.findOne({ userId: req.session.currentId });
      
      if (!cart || cart.items.length === 0) {
        return res.status(200).json({
          val: true,
          msg: "Item removed. Cart is empty",
          cart,
          products: [],
        });
      }

      // Recalculate Total
       const populatedItems = await Promise.all(cart.items.map(async item => {
        const v = item.variantId ? await Variant.findById(item.variantId) : null;
        const p = await productModel.findById(item.productId);
        return { product: p, variant: v, quantity: item.quantity };
      }));
      
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, req.user);
      cart.cartTotal = Math.round(cartTotalInfo.total * 100) / 100;
      await cart.save();

      const productIds = cart.items.map((item) => item.productId);
      const products = await productModel.find({ _id: { $in: productIds } });

      res.status(200).json({ val: true, msg: "Item removed from cart", cart, products });
    } catch (err) {
      res.status(500).json({ val: false, msg: err.message, cart: null, products: [] });
    }
  },

  // ~~~ Update Cart Item ~~~
  async updateCartItem(req, res) {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const qty = parseInt(quantity);
    
    try {
      const cart = await cartModel.findOne({ userId: req.session.currentId });
      if (!cart) return res.status(404).json({ val: false, msg: "Cart not found" });

      const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
      if (itemIndex === -1) return res.status(404).json({ val: false, msg: "Item not found in cart" });

      const item = cart.items[itemIndex];
      const product = await productModel.findById(item.productId);
      const variant = item.variantId ? await Variant.findById(item.variantId) : null;

      // Check Stock
      const stockCheck = await stockService.checkStock(product, variant, qty, item.size);
      if (!stockCheck.available) {
           return res.status(400).json({ val: false, msg: stockCheck.reason });
      }

      // Update Quantity
      item.quantity = qty;

      // Recalculate Price (Dynamic pricing might change with quantity e.g. bulk discount)
      const pricing = await pricingService.calculateBestOffer(product, qty, req.session.currentId);
      const unitPrice = Math.round(pricing.finalPrice / qty * 100) / 100; // Round to 2 decimal places
      const totalPrice = Math.round(unitPrice * qty * 100) / 100; // Round to 2 decimal places
      
      item.price = unitPrice;
      item.total = totalPrice;

      // Recalculate Total Cart
      const populatedItems = await Promise.all(cart.items.map(async i => {
          // Optimization: if i is current item, use already fetched product/variant
          if (i._id.toString() === itemId) return { product, variant, quantity: qty };
          
          const v = i.variantId ? await Variant.findById(i.variantId) : null;
          const p = await productModel.findById(i.productId);
          return { product: p, variant: v, quantity: i.quantity };
      }));
      
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, req.user);
      cart.cartTotal = Math.round(cartTotalInfo.total * 100) / 100; // Round to 2 decimal places
      
      await cart.save();

      res.status(200).json({
        val: true,
        updatedTotal: Math.round(totalPrice),
        cartTotal: Math.round(cart.cartTotal),
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  },
};
