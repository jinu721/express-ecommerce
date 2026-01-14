const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const wishlistModel = require("../models/wishlistModel");
const Variant = require("../models/variantModel");
const pricingService = require("../services/pricingService");
const stockService = require("../services/stockService");

module.exports = {
  async getWishlistAPI(req, res) {
    const { currentId } = req.session;
    try {
      if (!req.session.loggedIn) {
        return res.status(200).json({ items: [] });
      }

      const wishlist = await wishlistModel.findOne({ userId: currentId }).populate('items.productId');
      if (!wishlist || wishlist.items.length === 0) {
        return res.status(200).json({ items: [] });
      }

      return res.status(200).json({ items: wishlist.items });
    } catch (err) {
      console.log(err);
      res.status(500).json({ items: [] });
    }
  },
  async wishlistLoad(req, res) {
    const { currentId } = req.session;
    try {
      const wishlist = await wishlistModel.findOne({ userId: currentId });
      if (!wishlist || wishlist.items.length === 0) {
        return res.status(200).render("wishlist", {
          isWishlistEmpty: true,
          msg: "No items found on wishlist",
          products: null,
          wishlist: null,
        });
      }

      const productIds = wishlist.items.map((item) => item.productId);
      const products = await productModel.find({ _id: { $in: productIds } }).populate('category');

      const productsWithOffers = await Promise.all(products.map(async (product) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, currentId);
        const isAvailable = !product.isDeleted && product.category && !product.category.isDeleted;

        return {
          ...product.toObject(),
          isAvailable,
          originalPrice: Math.round(offerResult.originalPrice * 100) / 100,
          finalPrice: Math.round(offerResult.finalPrice * 100) / 100,
          discount: Math.round(offerResult.discount * 100) / 100,
          discountPercentage: offerResult.discount > 0 ? Math.round((offerResult.discount / offerResult.originalPrice) * 100) : 0,
          hasOffer: offerResult.hasOffer,
          offer: offerResult.offer
        };
      }));

      return res.status(200).render("wishlist", {
        isWishlistEmpty: false,
        msg: null,
        products: productsWithOffers,
        wishlist,
        wishlistItems: wishlist.items,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Server Error");
    }
  },

  async removeFromWishlist(req, res) {
    const { wishlistItemId } = req.params;
    const { currentId } = req.session;

    try {
      if (!req.session.loggedIn) {
        return res.status(401).json({ val: false, msg: "Please login first" });
      }

      await wishlistModel.updateOne(
        { userId: currentId },
        { $pull: { items: { _id: wishlistItemId } } }
      );

      res.status(200).json({ val: true, msg: "Item removed from wishlist" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  },

  async addToWishlist(req, res) {
    const { productId } = req.params;
    const { size = 'N/A', color = 'N/A', variantId, attributes = {} } = req.body;

    try {
      if (!req.session.loggedIn) {
        return res.status(401).json({ val: false, msg: "Please login first" });
      }

      let wishlist = await wishlistModel.findOne({ userId: req.session.currentId });

      if (!wishlist) {
        wishlist = await wishlistModel.create({
          userId: req.session.currentId,
          items: [{
            productId,
            size,
            color,
            variantId
          }],
        });

        return res.status(200).json({
          val: true,
          msg: "Item added to wishlist",
          wishlistItemId: wishlist.items[0]._id,
        });
      }

      const existingItem = wishlist.items.find((item) =>
        item.productId.toString() === productId
      );

      if (existingItem) {
        return res.status(200).json({ val: false, msg: "Item already in wishlist" });
      }

      wishlist.items.push({
        productId,
        size,
        color,
        variantId
      });
      await wishlist.save();

      return res.status(200).json({
        val: true,
        msg: "Item added to wishlist",
        wishlistItemId: wishlist.items[wishlist.items.length - 1]._id,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ val: false, msg: "An error occurred", error: err.message });
    }
  },

  async addToCartFromWishlist(req, res) {
    const { wishlistItemId, variantId: requestVariantId, quantity: requestQuantity, attributes: requestAttributes } = req.body;

    try {
      if (!req.session.loggedIn) {
        return res.status(401).json({ val: false, msg: "Please login first" });
      }

      const wishlist = await wishlistModel.findOne({ userId: req.session.currentId });
      if (!wishlist) return res.status(404).json({ val: false, msg: "Wishlist not found" });

      const item = wishlist.items.find((item) => item._id.toString() === wishlistItemId);
      if (!item) return res.status(404).json({ val: false, msg: "Item not found in wishlist" });

      const { productId, size, color, quantity: itemQuantity = 1, variantId: itemVariantId } = item;
      const product = await productModel.findById(productId).populate('category');
      if (!product) return res.status(404).json({ val: false, msg: "Product not found" });

      const isAvailable = !product.isDeleted && product.category && !product.category.isDeleted;
      if (!isAvailable) {
        return res.status(400).json({ val: false, msg: "This product is currently unavailable" });
      }

      const finalQuantity = requestQuantity || itemQuantity;
      const finalVariantId = requestVariantId || itemVariantId;
      const finalAttributes = requestAttributes || {};

      let variant = null;
      if (finalVariantId) {
        variant = await Variant.findById(finalVariantId);
      } else if (Object.keys(finalAttributes).length > 0) {
        const query = { product: productId, isActive: true };
        for (const [key, value] of Object.entries(finalAttributes)) {
          query[`attributes.${key}`] = value;
        }
        variant = await Variant.findOne(query);
      } else if (size !== 'N/A' || color !== 'N/A') {
        variant = await Variant.findOne({
          product: productId,
          'attributes.SIZE': size !== 'N/A' ? size : undefined,
          'attributes.COLOR': color !== 'N/A' ? color : undefined
        });
      }

      const hasVariants = await Variant.countDocuments({ product: productId, isActive: true });

      if (hasVariants > 0 && !variant && !requestVariantId) {
        return res.status(400).json({
          val: false,
          msg: "Please select product options",
          requiresVariantSelection: true,
          productId: productId
        });
      }

      const stockAttributes = Object.keys(finalAttributes).length > 0 ? finalAttributes : {};
      if (!stockAttributes.SIZE && size && size !== 'N/A') stockAttributes.SIZE = size;
      if (!stockAttributes.COLOR && color && color !== 'N/A') stockAttributes.COLOR = color;

      const stockCheck = await stockService.checkStock(product, variant, finalQuantity, stockAttributes);
      if (!stockCheck.available) {
        return res.status(400).json({ val: false, msg: `Stock unavailable: ${stockCheck.reason}` });
      }

      const pricing = await pricingService.calculateBestOffer(product, finalQuantity, req.session.currentId, variant);

      let cart = await cartModel.findOne({ userId: req.session.currentId });
      const newItemData = {
        productId,
        variantId: variant ? variant._id : null,
        quantity: finalQuantity,
        size: variant ? (variant.attributes.get('SIZE') || size) : size,
        color: variant ? (variant.attributes.get('COLOR') || color) : color,
        price: pricing.finalPrice,
        total: pricing.finalPrice * finalQuantity
      };

      if (!cart) {
        cart = await cartModel.create({
          userId: req.session.currentId,
          items: [newItemData],
          cartTotal: newItemData.total
        });
      } else {
        const existingIndex = cart.items.findIndex(i => {
          if (variant) return i.variantId && i.variantId.toString() === variant._id.toString();
          return i.productId.toString() === productId && i.size === size && i.color === color;
        });

        if (existingIndex > -1) {
          cart.items[existingIndex].quantity += finalQuantity;
          cart.items[existingIndex].total += newItemData.total;
        } else {
          cart.items.push(newItemData);
        }
      }

      const populatedItems = await Promise.all(cart.items.map(async i => {
        const v = i.variantId ? await Variant.findById(i.variantId) : null;
        const p = await productModel.findById(i.productId);
        return { product: p, variant: v, quantity: i.quantity };
      }));
      const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, req.user);
      cart.cartTotal = Math.round(cartTotalInfo.total * 100) / 100;

      await cart.save();

      wishlist.items.pull({ _id: wishlistItemId });
      await wishlist.save();

      return res.status(200).json({ val: true, msg: "Item moved to cart" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ val: false, msg: "Internal server error: " + err.message });
    }
  },
};
