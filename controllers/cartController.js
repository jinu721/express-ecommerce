const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");

module.exports = {
  // ~~~ Cart Page Load ~~~
  // Purpose: Displays the cart page with items, handles empty or invalid cart scenarios.
  // Response: Renders the cart page, showing a message if the cart is empty or if no valid items are found.
  async cartPageLoad(req, res) {
    try {
      const cart = await cartModel
        .findOne({ userId: req.session.currentId })
        .populate("items.productId");
      if (!cart || cart.items.length === 0) {
        return res
          .status(200)
          .render("cart", {
            isCartEmpty: true,
            msg: "No items found on cart",
            products: null,
            cart: null,
          });
      }
      cart.items = cart.items.filter((item) => !item.productId.isDeleted);
      if (cart.items.length === 0) {
        return res
          .status(200)
          .render("cart", {
            isCartEmpty: true,
            msg: "No valid items in cart",
            products: null,
            cart: null,
          });
      }

      const productIds = cart.items.map((item) => item.productId);
      const products = await productModel.find({ _id: { $in: productIds } });
      let deliveryCharge = 0;
      if (cart.cartTotal < 2000) {
        deliveryCharge = 100;
      }
      console.log(deliveryCharge);
      return res
        .status(200)
        .render("cart", {
          isCartEmpty: false,
          msg: null,
          cart,
          deliveryCharge,
        });
    } catch (err) {
      console.log(err);
    }
  },
  // ~~~ Add to Cart ~~~
  // Purpose: Adds a product to the user's cart, checks stock and cart limits.
  // Response: Updates cart or creates a new one, and handles errors (e.g., login required, stock or quantity issues).
  async addToCart(req, res) {
    const { productId, price, quantity, size, color, isBuyNow } = req.body;
    console.log(productId, price, quantity, size, color);

    try {
      if (!req.session.loggedIn) {
        return res.status(400).json({ val: false, msg: "Please login first" });
      }
      const cart = await cartModel.findOne({ userId: req.session.currentId });
      const product = await productModel.findOne({ _id: productId });

      if (!product) {
        return res.status(404).json({ val: false, msg: "Product not found" });
      }

      const sizeData = product.sizes[size];
      if (!sizeData) {
        return res
          .status(400)
          .json({ val: false, msg: `Invalid size: ${size}` });
      }

      const { stock, maxQuantity } = sizeData;

      if (quantity > stock) {
        return res.status(400).json({
          val: false,
          msg: `Only ${stock} items available for size ${size}`,
        });
      }

      console.log(cart);

      let currentCartQuantity = 0;
      if (cart) {
        const existingItem = cart.items.find(
          (item) =>
            item.productId.toString() === productId &&
            item.size === size &&
            item.color === color
        );
        if (existingItem) {
          currentCartQuantity = existingItem.quantity;
        }
      }

      if (currentCartQuantity + quantity > maxQuantity) {
        return res.status(400).json({
          val: false,
          msg: `You can only purchase up to ${maxQuantity} items for size ${size}. You already have ${currentCartQuantity} in your cart.`,
        });
      }
      if (!cart) {
        await cartModel.create({
          userId: req.session.currentId,
          items: [
            {
              productId,
              quantity,
              size,
              color,
              price,
              total: price * quantity,
            },
          ],
          cartTotal: price * quantity,
        });
        return res.status(200).json({ val: true, msg: "Item added to cart" });
      }

      const index = cart.items.findIndex(
        (item) => item.productId.toString() === productId && item.size === size
      );

      if (index > -1) {
        cart.items[index].quantity += quantity;
        cart.items[index].total += price * quantity;
      } else {
        cart.items.push({
          productId,
          quantity,
          price,
          size,
          color,
          total: price * quantity,
        });
      }

      cart.cartTotal = cart.items.reduce(
        (total, item) => total + item.total,
        0
      );
      await cart.save();

      if (isBuyNow) {
        req.session.tempCart = {
          productId,
          price,
          quantity,
          size,
          color,
          isBuyNow,
        };
      }

      res.status(200).json({ val: true, msg: "Item added to cart" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Internal server error" });
    }
  },
  // ~~~ Delete from Cart ~~~
  // Purpose: Removes a specific item from the cart.
  // Response: Updates the cart after removal and recalculates the total.
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
          msg: "Item not found in cart",
          cart,
          products: [],
        });
      }
      cart.cartTotal = cart.items.reduce(
        (total, item) => total + item.total,
        0
      );
      cart.save();
      const productIds = cart.items.map((item) => item.productId);
      const products = await productModel.find({ _id: { $in: productIds } });
      res
        .status(200)
        .json({ val: true, msg: "Item removed from cart", cart, products });
    } catch (err) {
      res
        .status(500)
        .json({ val: false, msg: err.message, cart: null, products: [] });
    }
  },
  // ~~~ Update Cart Item ~~~
  // Purpose: Updates the quantity of an item in the cart, checks stock and max purchase limits.
  // Response: Updates item details and recalculates the total.
  async updateCartItem(req, res) {
    const { itemId } = req.params;
    const { quantity } = req.body;

    console.log(itemId, quantity);

    try {
      const cart = await cartModel.findOne({ userId: req.session.currentId });
      if (!cart) {
        return res.status(404).json({ val: false, msg: "Cart not found" });
      }

      const itemIndex = cart.items.findIndex(
        (item) => item._id.toString() === itemId
      );
      if (itemIndex === -1) {
        return res
          .status(404)
          .json({ val: false, msg: "Item not found in cart" });
      }

      const item = cart.items[itemIndex];
      console.log(item);
      const product = await productModel.findById(item.productId);
      if (!product) {
        return res.status(404).json({ val: false, msg: "Product not found" });
      }

      const selectedSize = product.sizes[item.size];
      if (!selectedSize) {
        return res
          .status(400)
          .json({ val: false, msg: "Invalid size selected" });
      }

      if (quantity > selectedSize.stock) {
        return res.status(400).json({
          val: false,
          msg: `Only ${selectedSize.stock} items are available for size ${item.size}`,
        });
      }

      if (quantity > selectedSize.maxQuantity) {
        return res.status(400).json({
          val: false,
          msg: `You can only purchase up to ${selectedSize.maxQuantity} items for size ${item.size}`,
        });
      }

      item.price = product.offerPrice;
      item.quantity = quantity;
      item.total = product.offerPrice * quantity;

      cart.cartTotal = cart.items.reduce(
        (total, item) => total + item.total,
        0
      );

      await cart.save();

      res.status(200).json({
        val: true,
        updatedTotal: item.total,
        cartTotal: cart.cartTotal,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  },
};
