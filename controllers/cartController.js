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
       // We might want to re-verify prices here to ensure display is accurate
      const populatedItems = await Promise.all(cart.items.map(async item => {
          const variant = item.variantId ? await Variant.findById(item.variantId) : null;
          return {
              product: item.productId,
              variant: variant,
              quantity: item.quantity,
              // Legacy fallback
              size: item.size,
              color: item.color
          };
      }));

      // Recalculate Total on Load to ensure accuracy
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, req.user);
      
      // Update cart total in DB if changed
      if (cart.cartTotal !== cartTotalInfo.total) {
          cart.cartTotal = cartTotalInfo.total;
          await cart.save();
      }

      const productIds = cart.items.map((item) => item.productId._id);
      const products = await productModel.find({ _id: { $in: productIds } });
      
      let deliveryCharge = 0;
      if (cart.cartTotal < 2000) {
        deliveryCharge = 100;
      }

      return res.status(200).render("cart", {
          isCartEmpty: false,
          msg: null,
          cart,
          deliveryCharge,
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

      // 3. Calculate Price
      const pricing = await pricingService.calculateBestOffer(product, quantity, req.session.currentId);
      const pricePerItem = pricing.finalPrice;

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

      // Recalculate Cart Total
      const populatedItems = await Promise.all(cart.items.map(async item => {
        const v = item.variantId ? await Variant.findById(item.variantId) : null;
        const p = await productModel.findById(item.productId);
        return { product: p, variant: v, quantity: item.quantity };
      }));
      
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, req.user);
      cart.cartTotal = cartTotalInfo.total;
      
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
      cart.cartTotal = cartTotalInfo.total;
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
      item.price = pricing.finalPrice;
      item.total = pricing.finalPrice * qty;

      // Recalculate Total Cart
      const populatedItems = await Promise.all(cart.items.map(async i => {
          // Optimization: if i is current item, use already fetched product/variant
          if (i._id.toString() === itemId) return { product, variant, quantity: qty };
          
          const v = i.variantId ? await Variant.findById(i.variantId) : null;
          const p = await productModel.findById(i.productId);
          return { product: p, variant: v, quantity: i.quantity };
      }));
      
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, req.user);
      cart.cartTotal = cartTotalInfo.total;
      
      await cart.save();

      res.status(200).json({
        val: true,
        updatedTotal: item.total,
        cartTotal: cart.cartTotal,
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  },
};
