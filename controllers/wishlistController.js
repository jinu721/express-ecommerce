const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const wishlistModel = require("../models/wishlistModel");

module.exports = {
  // ~~~ Load Wishlist Page ~~~
  // Purpose: Retrieves the user's wishlist, checks if there are items,
  // and displays them with product details if available.
  // Response: Renders the wishlist page with the wishlist data or an error message.
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
      console.log(wishlist);
      return res.status(200).render("wishlist", {
        isWishlistEmpty: false,
        msg: null,
        products,
        wishlist,
        wishlistItems: wishlist.items,
      });
    } catch (err) {
      console.log(err);
    }
  },
  // ~~~ Remove Item from Wishlist ~~~
  // Purpose: Removes a specific item from the user's wishlist.
  // Response: Returns success or error messages based on whether the item was removed.
  async removeFromWishlist(req, res) {
    console.log("shhshshs");
    const { wishlistItemId } = req.params;
    const { currentId } = req.session;

    console.log(wishlistItemId);

    try {
      if (!req.session.loggedIn) {
        return res.status(400).json({ val: false, msg: "Please login first" });
      }

      const wishlist = await wishlistModel.findOne({ userId: currentId });
      if (!wishlist) {
        return res.status(404).json({ val: false, msg: "Wishlist not found" });
      }
      wishlist.items.pull({ _id: wishlistItemId });
      await wishlist.save();

      res.status(200).json({ val: true, msg: "Item removed from wishlist" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  },
  // ~~~ Add Item to Wishlist ~~~
  // Purpose: Adds a product to the user's wishlist.
  // Response: Returns success or failure messages, including item details if added.
  async addToWishlist(req, res) {
    const { productId } = req.params;
    const { size, color } = req.body;

    try {
      if (!req.session.loggedIn) {
        return res.status(400).json({ val: false, msg: "Please login first" });
      }

      let wishlist = await wishlistModel.findOne({
        userId: req.session.currentId,
      });
      if (!wishlist) {
        wishlist = await wishlistModel.create({
          userId: req.session.currentId,
          items: [{ productId, size, color }],
        });

        const addedItemId = wishlist.items[0]._id;
        return res.status(200).json({
          val: true,
          msg: "Item added to wishlist",
          wishlistItemId: addedItemId,
        });
      }
      const index = wishlist.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (index > -1) {
        return res
          .status(200)
          .json({ val: false, msg: "Item already in wishlist" });
      }
      wishlist.items.push({ productId, size, color });
      await wishlist.save();

      const addedItemId = wishlist.items[wishlist.items.length - 1]._id;
      return res.status(200).json({
        val: true,
        msg: "Item added to wishlist",
        wishlistItemId: addedItemId,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ val: false, msg: "An error occurred", error: err.message });
    }
  },
  // ~~~ Add Item from Wishlist to Cart ~~~
  // Purpose: Moves an item from the user's wishlist to the cart.
  // Response: Returns success or failure messages based on whether the item was moved.
  async addToCartFromWishlist(req, res) {
    const { wishlistItemId } = req.body;

    try {
      if (!req.session.loggedIn) {
        return res.status(400).json({ val: false, msg: "Please login first" });
      }
      const wishlist = await wishlistModel.findOne({
        userId: req.session.currentId,
      });
      if (!wishlist) {
        return res.status(404).json({ val: false, msg: "Wishlist not found" });
      }

      const item = wishlist.items.find(
        (item) => item._id.toString() === wishlistItemId
      );
      if (!item) {
        return res
          .status(404)
          .json({ val: false, msg: "Item not found in wishlist" });
      }

      const { productId, size, color, quantity = 1 } = item;
      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ val: false, msg: "Product not found" });
      }

      const total = product.price * quantity;
      let cart = await cartModel.findOne({ userId: req.session.currentId });
      if (!cart) {
        cart = await cartModel.create({
          userId: req.session.currentId,
          items: [
            { productId, quantity, size, color, price: product.price, total },
          ],
          cartTotal: total,
        });
      } else {
        const index = cart.items.findIndex(
          (item) => item.productId.toString() === productId
        );
        if (index > -1) {
          cart.items[index].quantity += quantity;
          cart.items[index].total += total;
        } else {
          cart.items.push({
            productId,
            quantity,
            size,
            color,
            price: product.price,
            total,
          });
        }
        cart.cartTotal = cart.items.reduce((sum, item) => sum + item.total, 0);
        await cart.save();
      }
      wishlist.items = wishlist.items.filter(
        (item) => item._id.toString() !== wishlistItemId
      );
      await wishlist.save();

      return res.status(200).json({ val: true, msg: "Item moved to cart" });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ val: false, msg: err.message || "Internal server error" });
    }
  },
};
