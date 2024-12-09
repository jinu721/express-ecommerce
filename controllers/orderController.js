const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const razorpay = require("../services/paymentServiece");
const walletModel = require("../models/walletModel");
const crypto = require("crypto");
const couponModel = require("../models/couponModel");
const notificationModel = require("../models/notificationModel");
const pdf = require("html-pdf");
const ejs = require("ejs");
const path = require("path");
const puppeteer = require('puppeteer');

let orderId = 100;

module.exports = {
  // ~~~ Place Order Controller ~~~
  // Purpose: Handles the placing of an order for the user, including validation of items, and total amount calculation.
  // Response: Returns a success or failure response based on the order process.
  async placeOrder(req, res) {
    const { item, selectedAddressId, selectedPayment, isOfferApplied, code } =
      req.body;
    const userId = req.session.currentId;

    try {
      console.log(isOfferApplied);

      if (!item || !selectedAddressId || !selectedPayment) {
        return res
          .status(400)
          .json({ val: false, msg: "Missing required fields" });
      }

      let parsedItem;
      try {
        parsedItem = JSON.parse(item);
      } catch (err) {
        return res.status(400).json({ val: false, msg: "Invalid item format" });
      }

      console.log(`parsed item :----------- ${parsedItem}`);

      const isArray = Array.isArray(parsedItem);
      let items, totalAmount;

      const validateItem = (product) => {
        if (
          !product._id ||
          typeof product.quantity !== "number" ||
          typeof product.offerPrice !== "number" ||
          !product.size ||
          !product.color
        ) {
          console.log(product._id);
          console.log(typeof product.quantity !== "number");
          console.log(typeof product.offerPrice !== "number");
          console.log(product.size);
          console.log(product.color);
          return res
            .status(400)
            .json({ val: false, msg: "Invalid product data" });
        }
      };

      if (isArray) {
        parsedItem.forEach((product) => {
          const result = validateItem(product);
          if (result) return result;
        });
        items = parsedItem.map((product) => ({
          product: new mongoose.Types.ObjectId(product._id),
          quantity: product.quantity,
          offerPrice: product.offerPrice,
          size: product.size,
          color: product.color,
        }));
        totalAmount = items.reduce(
          (sum, item) => sum + Number(item.offerPrice) * Number(item.quantity),
          0
        );
        await cartModel.deleteMany({ userId });
      } else {
        const result = validateItem(parsedItem);
        if (result) return result;
        items = {
          product: new mongoose.Types.ObjectId(parsedItem._id),
          quantity: parsedItem.quantity,
          offerPrice: parsedItem.offerPrice,
          size: parsedItem.size,
          color: parsedItem.color,
        };
        totalAmount = Number(items.offerPrice) * Number(items.quantity);
        await cartModel.deleteOne({
          userId,
          "items.product": parsedItem._id,
        });
      }

      const user = await userModel.findOne({ _id: userId });
      const address = user.address.find(
        (addr) => addr._id.toString() === selectedAddressId
      );
      if (!address) {
        return res.status(400).json({ val: false, msg: "Invalid address ID" });
      }

      let discountedPrice = totalAmount;

      console.log(isOfferApplied, code);
      console.log(totalAmount);
      if (isOfferApplied) {
        const coupon = await couponModel.findOne({});
        console.log("Its offer Applied");
        if (coupon.discountType === "percentage") {
          const discountPercentage = parseFloat(coupon.discountValue);
          let discountAmount = (totalAmount * discountPercentage) / 100;
          if (coupon.maxDiscount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          }
          discountedPrice = totalAmount - discountAmount;
        } else if (coupon.discountType === "flat") {
          const flatDiscount = parseFloat(coupon.discountValue);
          discountedPrice = totalAmount - flatDiscount;
        }
        discountedPrice = Math.max(discountedPrice, 0);
      } else {
        console.log("not offer Applied");
      }

      console.log(discountedPrice);

      const amountToSend = discountedPrice || totalAmount;

      const couponDetails = isOfferApplied
        ? { code, discountApplied: totalAmount - discountedPrice }
        : null;

      if (selectedPayment === "cash_on_delivery") {
        if (amountToSend > 1000) {
          return res.status(400).json({
            val: false,
            msg: "COD only available for product less than 1000",
          });
        }
        const order = await orderModel.create({
          orderId: orderId++,
          user: userId,
          items: isArray ? items : [items],
          totalAmount: amountToSend,
          paymentMethod: selectedPayment,
          shippingAddress: address,
          coupon: couponDetails,
          orderedAt: new Date(),
          paymentStatus: "pending",
          orderStatus: "processing",
          statusHistory: [{ status: "processing", updatedAt: new Date() }],
        });
        for (let i = 0; i < (isArray ? items : [items]).length; i++) {
          const {
            product: productId,
            size,
            quantity: quantityOrdered,
          } = isArray ? items[i] : items;
          const product = await productModel.findById(productId);

          if (!product || !product.sizes[size]) {
            return res
              .status(404)
              .json({ val: false, msg: "Product or size not found" });
          }

          if (product.sizes[size].stock >= quantityOrdered) {
            product.sizes[size].stock -= quantityOrdered;
            product.markModified("sizes");
            await product.save();
          } else {
            return res.status(400).json({
              val: false,
              msg: `Not enough stock for size ${size}`,
            });
          }
        }

        return res.status(200).json({
          val: true,
          msg: "Order placed successfully with Cash on Delivery",
        });
      } else if (selectedPayment === "razorpay") {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(discountedPrice * 100),
          currency: "INR",
          receipt: `order_rcptid_${Math.random()
            .toString(36)
            .substring(2, 15)}`,
          notes: {
            userId,
            addressId: selectedAddressId,
          },
        });
        const order = await orderModel.create({
          orderId: orderId++,
          user: userId,
          items: items,
          totalAmount: amountToSend,
          paymentMethod: selectedPayment,
          shippingAddress: address,
          coupon: couponDetails,
          razorpayOrderId: razorpayOrder.id,
          orderedAt: new Date(),
          paymentStatus: "pending",
          orderStatus: "processing",
          statusHistory: [{ status: "processing", updatedAt: new Date() }],
        });
        console.log(razorpayOrder);
        return res.status(200).json({
          val: true,
          msg: "Razorpay order created successfully",
          order: razorpayOrder,
          key: "rzp_test_P7m0ieN3xeK18I",
        });
      } else if (selectedPayment === "wallet") {
        let wallet = await walletModel.findOne({
          userId: req.session.currentId,
        });
        if (!wallet) {
          return res.status(404).json({ val: false, msg: "Wallet not found" });
        }
        console.log(wallet.balance);
        console.log(amountToSend);
        if (wallet.balance < amountToSend) {
          return res
            .status(404)
            .json({ val: false, msg: "Not enough money in wallet" });
        }

        wallet.balance -= discountedPrice ? discountedPrice : totalAmount;
        wallet.transactionHistory.push({
          transactionType: "purchase",
          transactionAmount: discountedPrice ? discountedPrice : totalAmount,
          transactionDate: new Date(),
          description: `Purchase of the order ${item.orderId}`,
        });
        console.log(wallet);
        await wallet.save();
        const order = await orderModel.create({
          orderId: orderId++,
          user: userId,
          items: isArray ? items : [items],
          totalAmount: amountToSend,
          paymentMethod: selectedPayment,
          shippingAddress: address,
          coupon: couponDetails,
          orderedAt: new Date(),
          paymentStatus: "paid",
          orderStatus: "processing",
          statusHistory: [{ status: "processing", updatedAt: new Date() }],
        });
        for (let i = 0; i < (isArray ? items : [items]).length; i++) {
          const {
            product: productId,
            size,
            quantity: quantityOrdered,
          } = isArray ? items[i] : items;
          const product = await productModel.findById(productId);

          if (!product || !product.sizes[size]) {
            return res
              .status(404)
              .json({ val: false, msg: "Product or size not found" });
          }

          if (product.sizes[size].stock >= quantityOrdered) {
            product.sizes[size].stock -= quantityOrdered;
            product.markModified("sizes");
            await product.save();
          } else {
            return res.status(400).json({
              val: false,
              msg: `Not enough stock for size ${size}`,
            });
          }
        }

        return res.status(200).json({
          val: true,
          msg: "Order placed successfully with Wallet payment",
        });
      } else {
        return res
          .status(400)
          .json({ val: false, msg: "Invalid payment method" });
      }
    } catch (err) {
      console.error("Error in placing order:", err);
      return res.status(500).json({ val: false, msg: "Server error" });
    }
  },
  // ~~~ Cancel Order Controller ~~~
  // Purpose: Handles the cancellation of an order, including wallet refund if applicable.
  // Response: Returns a success or failure message based on the cancellation process.
  async cancelOrder(req, res) {
    const { orderId } = req.params;
    const { currentId } = req.session;
    console.log(orderId);
    console.log(currentId);

    try {
      const order = await orderModel.findOne({ _id: orderId });
      if (!order) {
        return res.status(404).json({ val: false, msg: "Order not found" });
      }
      if (
        (order.paymentMethod === "razorpay" ||
          order.paymentMethod === "wallet") &&
        order.paymentStatus !== "pending"
      ) {
        let wallet = await walletModel.findOne({
          userId: currentId,
        });
        if (!wallet) {
          wallet = await walletModel.create({
            userId: req.session.currentId,
            balance: order.totalAmount,
            transactionHistory: [
              {
                transactionType: "refund",
                transactionAmount: order.totalAmount,
                transactionDate: new Date(),
                description: `Refund for canceled order ${orderId}`,
              },
            ],
          });
        } else {
          wallet.balance += order.totalAmount;
          wallet.transactionHistory.push({
            transactionType: "refund",
            transactionAmount: order.totalAmount,
            transactionDate: new Date(),
            description: `Refund for canceled order ${orderId}`,
          });
          await wallet.save();
        }
      }
      order.orderStatus = "cancelled";
      order.statusHistory.push({
        status: "cancelled",
        updatedAt: new Date(),
      });
      order.items.forEach((item) => {
        item.itemStatus = "cancelled";
      });
      await order.save();

      res.status(200).json({ val: true, msg: "Order cancellation completed" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Order cancellation failed" });
    }
  },
  // ~~~ View Order Details Controller ~~~
  // Purpose: Retrieves and displays the details of an order by its ID.
  // Response: Returns the order details with shipping address and items, or an error message if not found.
  async viewOrderDetails(req, res) {
    const { orderId } = req.params;
    console.log(orderId);
    try {
      const order = await orderModel.findOne({ _id: orderId }).populate({
        path: "items.product",
        select: "name description price category imageUrl",
      });
      console.log(order);
      if (!order) {
        return res.status(404).json({
          val: false,
          shippingAddress: null,
          items: null,
          msg: "Order not found",
        });
      }
      console.log(order);
      res.status(200).json({
        val: true,
        shippingAddress: order.shippingAddress,
        items: order.items,
        msg: null,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        val: false,
        shippingAddress: null,
        items: null,
        msg: "Order Cancelation failed",
      });
    }
  },
  // ~~~ Request Return Controller ~~~
  // Purpose: Initiates a return request for an order, including reason for return.
  // Response: Returns a success or failure message based on the update process.
  async reqestReturn(req, res) {
    const { orderId } = req.params;
    const { reasonMsg } = req.body;
    console.log(reasonMsg);
    try {
      const updateResult = await orderModel.updateOne(
        { _id: orderId },
        {
          $set: {
            "returnRequest.requestStatus": true,
            "returnRequest.requestMessage": reasonMsg,
            "returnRequest.adminStatus": "pending",
          },
        }
      );
      res.status(200).json({ val: true });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  // ~~~ Admin Orders Load Controller ~~~
  // Purpose: Loads the list of orders for the admin, with pagination.
  // Response: Returns a rendered page with orders and pagination details.
  async adminOrdersLoad(req, res) {
    try {
      const currentPage = parseInt(req.query.page) || 1;
      const ordersPerPage = 10;
      const totalOrders = await orderModel.countDocuments();
      const totalPages = Math.ceil(totalOrders / ordersPerPage);
      const orders = await orderModel
        .find({})
        .populate("user")
        .populate({
          path: "items.product",
          model: "Products",
        })
        .sort({ orderedAt: -1 })
        .skip((currentPage - 1) * ordersPerPage)
        .limit(ordersPerPage);

      res.status(200).render("ordersManagment", {
        order: orders,
        currentPage,
        totalPages,
        pagesToShow: 5,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Server error");
    }
  },
  // ~~~ Admin Orders View Load Controller ~~~
  // Purpose: Loads the details of a specific order for the admin.
  // Response: Returns a rendered page with the detailed order information.
  async adminOrdersViewLoad(req, res) {
    const { orderId } = req.params;
    console.log(orderId);
    try {
      const order = await orderModel
        .findOne({ _id: orderId })
        .populate("items.product");
      console.log(order);
      res.status(404).render("orderView", { order });
    } catch (err) {
      console.log(err);
    }
  },
  // ~~~ Admin Orders Status Update Controller ~~~
  // Purpose: Updates the status of an order by the admin (e.g., processing, shipped, delivered, cancelled).
  // Response: Returns a success or failure message based on the status update.
  async adminOrdersStatusUpdate(req, res) {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    try {
      if (
        !["processing", "shipped", "delivered", "cancelled"].includes(newStatus)
      ) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const order = await orderModel.findOne({ _id: orderId });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (
        order.paymentMethod === "cash_on_delivery" &&
        newStatus === "delivered"
      ) {
        order.paymentStatus = "paid";
      }
      order.orderStatus = newStatus;
      order.items.forEach((item) => {
        item.itemStatus = newStatus;
      });
      order.statusHistory.push({ status: newStatus, updatedAt: new Date() });
      await order.save();
      return res.json({
        val: true,
        status: newStatus,
        updatedAt:
          order.statusHistory[order.statusHistory.length - 1].updatedAt,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
  // ~~~ Verify Payment ~~~
  // Purpose: Verifies the payment for an order using Razorpay's payment gateway.
  // Response: Returns a success message if payment is verified or an error message if failed.
  async verifyPayment(req, res) {
    const { paymentId, orderId, signature, retryOrderId } = req.body;
    const userId = req.session.currentId;
    console.log(paymentId, orderId, signature);
    try {
      if (!paymentId || !orderId || !signature) {
        return res
          .status(400)
          .json({ val: false, msg: "Missing required fields" });
      }
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", "4Tme4oGDBm9a7Uh8xLiOmfyd")
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res
          .status(400)
          .json({ val: false, msg: "Invalid payment signature" });
      }

      const payment = await razorpay.payments.fetch(paymentId);

      if (payment.status !== "captured") {
        return res
          .status(400)
          .json({ val: false, msg: "Payment not captured" });
      }

      const orderGetId = retryOrderId || userId;
      let order;

      if (retryOrderId) {
        order = await orderModel.findOne({ _id: orderGetId });
      } else {
        order = await orderModel
          .findOne({ user: orderGetId })
          .sort({ orderedAt: -1 });
      }

      order.paymentStatus = "paid";

      order.markModified("paymentStatus");
      await order.save();

      res.status(200).json({
        val: true,
        msg: "Payment verified and order placed successfully",
        orderId,
      });
    } catch (err) {
      console.error("Error verifying payment:", err);
      res.status(500).json({
        val: false,
        msg: "Payment verification failed",
        error: err.message,
      });
    }
  },
  // ~~~ Success Page Load ~~~
  // Purpose: Loads the page showing the most recent order after a successful payment.
  // Response: Renders the success page with order details.
  async successPageLoad(req, res) {
    try {
      const { currentId } = req.session;
      if (!currentId) {
        return res.status(400).json("user not found");
      }
      const recentOrder = await orderModel
        .findOne({ user: currentId })
        .sort({ orderedAt: -1 })
        .populate("items.product")
        .lean();

      console.log(recentOrder);

      if (!recentOrder) {
        return res.status(404).send("No recent orders found.");
      }
      res.render("success", {
        order: recentOrder,
      });
    } catch (err) {
      console.log(err);
    }
  },
  // ~~~ Download Receipt ~~~
  // Purpose: Generates and serves a downloadable invoice for an order.
  // Response: Returns the generated invoice as a PDF for download.
  async function downloadRecipt(req, res) {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json("orderId not found");
    }
  
    try {
      // Fetch the order details from the database
      const order = await orderModel
        .findOne({ _id: orderId })
        .sort({ orderedAt: -1 })
        .populate("items.product")
        .lean();
      console.log(order);
  
      // Create the HTML content using template literals
      let itemsHTML = '';
      order.items.forEach(data => {
        itemsHTML += `
          <tr>
            <td>${data.product.name}</td>
            <td>${data.quantity}</td>
            <td>&#8377;${data.product.price}</td>
            <td>&#8377;${data.product.offerPrice}</td>
            <td>&#8377;${data.quantity * data.product.offerPrice}</td>
          </tr>
        `;
      });
  
      let htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Invoice</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; color: #333; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
              .invoice-container { background-color: #fff; border-radius: 10px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); padding: 30px; max-width: 800px; width: 100%; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #007bff; padding-bottom: 15px; margin-bottom: 20px; }
              .logo { max-width: 100px; }
              .invoice-title { font-size: 24px; font-weight: bold; color: #007bff; }
              .billed-to, .payment-info { margin-bottom: 20px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .items th, .items td { padding: 10px; text-align: left; border: 1px solid #ddd; }
              .items th { background-color: #f1f1f1; color: #333; }
              .totals { text-align: right; margin-bottom: 20px; }
              .totals p { font-size: 16px; margin: 5px 0; }
              .totals .total-amount { font-size: 18px; font-weight: bold; color: #007bff; }
              .thank-you { text-align: center; font-size: 18px; color: #007bff; margin-bottom: 20px; }
              .discount { font-size: 10px; color: grey; }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <a class="logo" href="https://imgbb.com/"><img src="https://i.ibb.co/hgn3dqf/image.png" alt="image" border="0" /></a>
                <h1 style="margin-top: 20px" class="invoice-title">Invoice</h1>
              </div>
              <div class="billed-to">
                <p class="section-title">Pay To:</p>
                <p>Male Fashion</p>
              </div>
              <table class="items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Offer Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML} <!-- Dynamically added items -->
                </tbody>
              </table>
              <div class="totals">
                ${order.coupon ? `<p class="discount">Discount: -&#8377;${order.coupon.discountApplied}</p>` : ''}
                <p class="total-amount">Total: &#8377;${order.totalAmount}</p>
              </div>
              <div class="thank-you">Thank you for your Purchase!</div>
              <div class="payment-info">
                <p class="section-title">Payment Information:</p>
                ${order.paymentMethod === 'cash_on_delivery' ? `<p>Cash on delivery</p><p>Payment status: ${order.paymentStatus}</p>` : ''}
                ${order.paymentMethod === 'wallet' ? `<p>wallet</p><p>Male fashion wallet</p><p>Payment status: ${order.paymentStatus}</p>` : ''}
                ${order.paymentMethod === 'razorpay' ? `<p>Razorpay</p><p>Payment status: ${order.paymentStatus}</p>` : ''}
                <p>Order date: ${new Date(order.orderedAt).toLocaleString()}</p>
              </div>
            </div>
          </body>
        </html>
      `;
  
      // Use Puppeteer to generate the PDF
      try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
  
        // Set the content of the page with the generated HTML
        await page.setContent(htmlContent);
  
        // Generate the PDF from the rendered HTML
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          landscape: false,
        });
  
        await browser.close();
  
        // Send the PDF to the user
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");
        res.end(pdfBuffer); // Send the PDF as the response
  
      } catch (err) {
        console.log(err);
        return res.status(500).json({
          val: false,
          msg: "Something went wrong while creating invoice pdf",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  }
  ,
  // ~~~ Admin Return Request ~~~
  // Purpose: Handles the approval or cancellation of return requests for orders.
  // Response: Returns the status of the return request after processing.
  async adminReturnRequest(req, res) {
    const { orderId } = req.params;
    const { status } = req.body;
  
    try {
      const order = await orderModel.findOne({ _id: orderId });
      if (!order) {
        return res.status(400).json({ val: false, msg: "Order not found" });
      }
  
      if (status === "approved") {
        order.orderStatus = "returned";
        order.returnRequest.adminStatus = "approved";
        order.items.forEach((item) => {
          item.itemStatus = "returned";
        });
 
        order.statusHistory.push({
          status: "returned",
          updatedAt: new Date(),
        });
  
        const refundAmount = order.totalAmount;
        const userId = order.user;
  
        let wallet = await walletModel.findOne({ userId });
        if (!wallet) {
          wallet = await walletModel.create({
            userId,
            balance: refundAmount,
            transactionHistory: [
              {
                transactionType: "refund",
                transactionAmount: refundAmount,
                transactionDate: new Date(),
                description: `Refund for returned order ${orderId}`,
              },
            ],
          });
        } else {
          wallet.balance += refundAmount;
          wallet.transactionHistory.push({
            transactionType: "refund",
            transactionAmount: refundAmount,
            transactionDate: new Date(),
            description: `Refund for returned order ${orderId}`,
          });
          await wallet.save();
        }
  
        await order.save();
        return res
          .status(200)
          .json({ val: true, msg: "Order return request approved and refunded" });
      }
      order.returnRequest.adminStatus = "cancelled";
      await order.save();
      res
        .status(200)
        .json({ val: true, msg: "Order return request canceled successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "An error occurred: " + err.message });
    }
  },
  // ~~~ Retry Payment ~~~
  // Purpose: Handles retrying the payment for an order that failed previously.
  // Response: Returns the Razorpay order details for the user to complete the payment.
  async retryPayment(req, res) {
    const { orderId } = req.body;
    const userId = req.session.currentId;

    try {
      let order = await orderModel.findOne({ _id: orderId, user: userId });
      if (!order || order.paymentStatus !== "pending") {
        return res.status(400).json({
          val: false,
          msg: "Invalid order or the payment was not failed",
        });
      }

      console.log(order);

      const razorpayOrder = await razorpay.orders.create({
        amount: order.totalAmount * 100,
        currency: "INR",
        receipt: orderId.toString(),
        notes: {
          orderId: orderId.toString(),
        },
      });
      res.status(200).json({
        val: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        key: "rzp_test_P7m0ieN3xeK18I",
      });
    } catch (err) {
      console.error("Error retrying payment:", err);
      res.status(500).json({
        val: false,
        msg: "Payment retry failed",
        error: err.message,
      });
    }
  },
  // ~~~ Cancel Individual Order ~~~
  // Purpose: Allows the user to cancel an individual item from an order.
  // Response: Returns a message indicating whether the item cancellation was successful or not.
  async cancelIndividualOrder(req, res) {
    const { orderId } = req.params;
    const { itemId } = req.body;
    const { currentId } = req.session;

    try {
      const order = await orderModel.findOne({ _id: orderId });
      if (!order)
        return res.status(404).json({ val: false, msg: "Order not found" });

      const item = order.items.find((i) => i._id.toString() === itemId);
      if (!item)
        return res
          .status(404)
          .json({ val: false, msg: "Item not found in order" });

      if (item.itemStatus === "cancelled") {
        return res
          .status(400)
          .json({ val: false, msg: "Item already canceled" });
      }

      item.itemStatus = "cancelled";
      order.totalAmount -= item.offerPrice * item.quantity;

      if (order.paymentMethod !== "COD") {
        let wallet = await walletModel.findOne({ userId: currentId });
        if (!wallet) {
          wallet = await walletModel.create({
            userId: currentId,
            balance: item.offerPrice * item.quantity,
            transactionHistory: [
              {
                transactionType: "refund",
                transactionAmount: item.offerPrice * item.quantity,
                transactionDate: new Date(),
                description: `Refund for canceled item ${itemId} in order ${orderId}`,
              },
            ],
          });
        } else {
          wallet.balance += item.offerPrice * item.quantity;
          wallet.transactionHistory.push({
            transactionType: "refund",
            transactionAmount: item.offerPrice * item.quantity,
            transactionDate: new Date(),
            description: `Refund for canceled item ${itemId} in order ${orderId}`,
          });
          await wallet.save();
        }
      }

      const allItemsCanceled = order.items.every(
        (i) => i.itemStatus === "cancelled"
      );
      if (allItemsCanceled) {
        order.orderStatus = "cancelled";
        order.statusHistory.push({
          status: "cancelled",
          updatedAt: new Date(),
        });
      }

      await order.save();
      return res
        .status(200)
        .json({ val: true, msg: "Item canceled successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Failed to cancel item" });
    }
  },
  // ~~~ Request Individual Return ~~~
  // Purpose: Allows the user to submit a return request for an item in an order.
  // Response: Returns the status of the return request submission.
  async requestIndividualReturn(req, res) {
    console.log("hii");
    const { orderId } = req.params;
    const { reason, itemId } = req.body;

    console.log(orderId);
    console.log(reason, itemId);

    try {
      const order = await orderModel.findOne({ _id: orderId });
      if (!order)
        return res.status(404).json({ val: false, msg: "Order not found" });

      const item = order.items.find((i) => i._id.toString() === itemId);
      if (!item)
        return res
          .status(404)
          .json({ val: false, msg: "Item not found in order" });

      if (item.itemStatus !== "delivered") {
        return res
          .status(400)
          .json({ val: false, msg: "Only delivered items can be returned" });
      }

      item.returnRequest = {
        requestStatus: true,
        requestMessage: reason,
        adminStatus: "pending",
      };

      await order.save();
      res.status(200).json({ val: true, msg: "Return request submitted" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ val: false, msg: "Failed to submit return request" });
    }
  },
  // ~~~ Admin Handle Return Request ~~~
  // Purpose: Allows the admin to approve or reject a return request for an item.
  // Response: Returns the status of the return request after admin action.
  async requestIndividualReturnAdmin(req, res) {
    try {
      const { orderId, itemId } = req.params;
      const { status } = req.body;

      const order = await orderModel.findById(orderId);
      if (!order) {
        return res.status(404).json({ val: false, msg: "Order not found" });
      }

      const item = order.items.find((item) => item._id.toString() === itemId);
      if (
        !item ||
        !item.returnRequest ||
        item.returnRequest.adminStatus !== "pending"
      ) {
        return res.status(400).json({
          val: false,
          msg: "Invalid return request or already processed",
        });
      }

      if (status === "approved") {
        item.returnRequest.adminStatus = "approved";
        item.itemStatus = "returned";
        const refundAmount = item.offerPrice * item.quantity;
        const userId = order.user;

        let wallet = await walletModel.findOne({ userId });
        if (!wallet) {
          wallet = await walletModel.create({
            userId,
            balance: refundAmount,
            transactionHistory: [
              {
                transactionType: "refund",
                transactionAmount: refundAmount,
                transactionDate: new Date(),
                description: `Refund for returned item ${itemId} in order ${orderId}`,
              },
            ],
          });
        } else {
          wallet.balance += refundAmount;
          wallet.transactionHistory.push({
            transactionType: "refund",
            transactionAmount: refundAmount,
            transactionDate: new Date(),
            description: `Refund for returned item ${itemId} in order ${orderId}`,
          });
          await wallet.save();
        }

        const allReturned = order.items.every(
          (item) =>
            item.itemStatus === "returned" ||
            item.returnRequest.adminStatus === "approved"
        );
        if (allReturned) {
          order.orderStatus = "returned";
          order.statusHistory.push({
            status: "returned",
            updatedAt: new Date(),
          });
        }

        await order.save();
        return res
          .status(200)
          .json({ val: true, msg: "Return request approved successfully" });
      }

      item.returnRequest.adminStatus = "cancelled";
      await order.save();

      return res
        .status(200)
        .json({ val: true, msg: "Return request canceled successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
};
