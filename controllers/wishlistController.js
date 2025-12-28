const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const wishlistModel = require("../models/wishlistModel");
const Variant = require("../models/variantModel");
const pricingService = require("../services/pricingService");
const stockService = require("../services/stockService");

module.exports = {
  // ~~~ Load Wishlist Page ~~~
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
      const products = await productModel.find({ _id: { $in: productIds } });
      
      // Calculate offer prices for wishlist products
      const productsWithOffers = await Promise.all(products.map(async (product) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, currentId);
        return {
          ...product.toObject(),
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

  // ~~~ Remove Item from Wishlist ~~~
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

  // ~~~ Add Item to Wishlist ~~~
  async addToWishlist(req, res) {
    const { productId } = req.params;
    const { size, color, variantId } = req.body; // variantId from body

    try {
      if (!req.session.loggedIn) {
        return res.status(401).json({ val: false, msg: "Please login first" });
      }

      let wishlist = await wishlistModel.findOne({ userId: req.session.currentId });
      
      if (!wishlist) {
        wishlist = await wishlistModel.create({
          userId: req.session.currentId,
          items: [{ productId, size, color, variantId }],
        });

        return res.status(200).json({
          val: true,
          msg: "Item added to wishlist",
          wishlistItemId: wishlist.items[0]._id,
        });
      }

      // Check duplicate (using variantId if available, else size/color)
      const index = wishlist.items.findIndex((item) => {
          if (variantId && item.variantId) {
              return item.variantId.toString() === variantId;
          }
          return item.productId.toString() === productId && item.size === size && item.color === color;
      });

      if (index > -1) {
        return res.status(200).json({ val: false, msg: "Item already in wishlist" });
      }

      wishlist.items.push({ productId, size, color, variantId });
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

  // ~~~ Add Item from Wishlist to Cart (Refactored) ~~~
  async addToCartFromWishlist(req, res) {
    const { wishlistItemId } = req.body;

    try {
      if (!req.session.loggedIn) {
        return res.status(401).json({ val: false, msg: "Please login first" });
      }

      const wishlist = await wishlistModel.findOne({ userId: req.session.currentId });
      if (!wishlist) return res.status(404).json({ val: false, msg: "Wishlist not found" });

      const item = wishlist.items.find((item) => item._id.toString() === wishlistItemId);
      if (!item) return res.status(404).json({ val: false, msg: "Item not found in wishlist" });

      const { productId, size, color, quantity = 1, variantId } = item;
      const product = await productModel.findById(productId);
      if (!product) return res.status(404).json({ val: false, msg: "Product not found" });

      // Resolve Variant
      let variant = null;
      if (variantId) {
          variant = await Variant.findById(variantId);
      } else {
          variant = await Variant.findOne({
              product: productId,
              'attributes.size': size,
              'attributes.color': color
          });
      }

      // Check Stock
      const stockCheck = await stockService.checkStock(product, variant, quantity, size);
      if (!stockCheck.available) {
          return res.status(400).json({ val: false, msg: `Stock unavailable: ${stockCheck.reason}` });
      }

      // Calculate Price
      const pricing = await pricingService.calculateProductPrice(product, variant, quantity, req.user); // req.user might need middleware population

      // Add to Cart Logic (Simplified from cartController)
      let cart = await cartModel.findOne({ userId: req.session.currentId });
      const newItemData = {
          productId,
          variantId: variant ? variant._id : null,
          quantity,
          size,
          color,
          price: pricing.finalPrice,
          total: pricing.finalPrice * quantity
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
              cart.items[existingIndex].quantity += quantity;
              cart.items[existingIndex].total += newItemData.total; // Approx, should recalculate but ok for this flow
          } else {
              cart.items.push(newItemData);
          }
           // Use service to recalculate entire cart total efficiently or manual sum
           // For robust consistency, ideally call calculateCartTotal here too, but simple sum is okay for step 1
       }
       
       // Correct Total Calculation
       const populatedItems = await Promise.all(cart.items.map(async i => {
          const v = i.variantId ? await Variant.findById(i.variantId) : null;
          const p = await productModel.findById(i.productId);
          return { product: p, variant: v, quantity: i.quantity };
       }));
       const cartTotalInfo = await pricingService.calculateCartTotal(populatedItems, req.user);
       cart.cartTotal = Math.round(cartTotalInfo.total * 100) / 100;
       
       await cart.save();

      // Remove from Wishlist
      wishlist.items.pull({ _id: wishlistItemId });
      await wishlist.save();

      return res.status(200).json({ val: true, msg: "Item moved to cart" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ val: false, msg: "Internal server error: " + err.message });
    }
  },
};
