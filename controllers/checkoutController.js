const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const path = require("path");

module.exports = {
  // ~~~ Checkout Page Load ~~~
  // Purpose: Loads the checkout page based on the user's cart or if it's a Buy Now scenario.
  // Response: Renders the checkout page with either cart items or a single product, adding delivery charges if necessary.
  async checkoutPageLoad(req, res) {
    let isBuyNow;
    if (req.session.tempCart) {
      isBuyNow = true;
    } else {
      isBuyNow = false;
    }
    try {
      let cart;
      console.log(`hei mahn : --- ${isBuyNow}`);
      let deliveryCharge = 0;
      if (isBuyNow) {
        const { productId, price, quantity, size, color } =
          req.session.tempCart;
        const product = await productModel.findById(productId);
        req.session.tempCart = null;
        console.log(product);
        if (price * quantity < 2000) {
          deliveryCharge = 100;
        }
        return res.render("checkout", {
          product,
          quantity,
          size,
          color,
          deliveryCharge,
        });
      } else {
        cart = await cartModel.findOne({ userId: req.session.currentId });
        if (!cart || cart.items.length === 0) {
          return res.status(400).json({ val: false, msg: "Cart is empty" });
        }
        const productIds = cart.items.map((item) => item.productId);
        const products = await productModel.find({ _id: { $in: productIds } });

        const cartItems = cart.items.map((item) => {
          const product = products.find(
            (p) => p._id.toString() === item.productId.toString()
          );
          return {
            ...product._doc,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          };
        });
        const cartTotal = cart.items.reduce(
          (total, item) => total + item.total,
          0
        );
        if (cartTotal < 2000) {
          deliveryCharge = 100;
        }
        console.log(cartItems);
        return res.render("checkout", { cartItems, deliveryCharge });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
};
