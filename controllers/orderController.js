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
const PDFDocument = require('pdfkit');

// New Services & Models
const Variant = require("../models/variantModel");
const stockService = require("../services/stockService");
const pricingService = require("../services/pricingService");
const notificationService = require("../services/notificationService");

let orderId = 100;

module.exports = {
  // ~~~ Place Order Controller ~~~
  // Purpose: Handles the placing of an order for the user, including validation of items, and total amount calculation.
  // Response: Returns a success or failure response based on the order process.
  // ~~~ Place Order Controller (REFACTORED) ~~~
  async placeOrder(req, res) {
    const { item, selectedAddressId, selectedPayment, isOfferApplied, code } = req.body;
    const userId = req.session.currentId;

    try {
      if (!item || !selectedAddressId || !selectedPayment) {
        return res.status(400).json({ val: false, msg: "Missing required fields" });
      }

      let parsedItem;
      try {
        parsedItem = JSON.parse(item);
      } catch (err) {
        return res.status(400).json({ val: false, msg: "Invalid item format" });
      }

      const itemsList = Array.isArray(parsedItem) ? parsedItem : [parsedItem];
      
      // 1. Validate Items & Calculate Prices
      const processedItems = [];
      for (const prod of itemsList) {
        if (!prod._id || !prod.quantity || !prod.size || !prod.color) {
            return res.status(400).json({ val: false, msg: "Invalid product data" });
        }

        // Get product details
        const product = await productModel.findById(prod._id);
        if (!product) {
            return res.status(404).json({ val: false, msg: "Product not found" });
        }

        // Find Variant
        const variant = await Variant.findOne({ 
            product: prod._id, 
            'attributes.size': prod.size,
            'attributes.color': prod.color 
        });

        if (!variant) {
            return res.status(404).json({ val: false, msg: `Variant not found: ${prod.size} - ${prod.color}` });
        }

        // Check Stock Availability
        const stockStatus = await stockService.checkAvailability(variant._id, prod.quantity);
        if (!stockStatus.available) {
            return res.status(400).json({ 
                val: false, 
                msg: `Insufficient stock for ${prod.size}/${prod.color}. Available: ${stockStatus.stock}` 
            });
        }

        // Calculate pricing with offers
        const pricingResult = await pricingService.calculateBestOffer(product, Number(prod.quantity), userId);

        processedItems.push({
            product: new mongoose.Types.ObjectId(prod._id),
            variant: variant._id,
            quantity: Number(prod.quantity),
            offerPrice: pricingResult.finalPrice / Number(prod.quantity), // Unit price after offers
            originalPrice: pricingResult.originalPrice / Number(prod.quantity), // Original unit price
            totalPrice: pricingResult.finalPrice, // Total price for this item
            discount: pricingResult.discount, // Total discount for this item
            size: prod.size,
            color: prod.color,
            appliedOffer: pricingResult.offer
        });
      }

      // Calculate Total
      const totalAmount = processedItems.reduce(
        (sum, i) => sum + i.totalPrice, 0
      );
      const originalTotal = processedItems.reduce(
        (sum, i) => sum + (i.originalPrice * i.quantity), 0
      );
      const totalOfferDiscount = processedItems.reduce(
        (sum, i) => sum + i.discount, 0
      );

      // Clear Cart (if from cart)
      if (Array.isArray(parsedItem)) {
          await cartModel.deleteMany({ userId });
      } else {
          await cartModel.deleteOne({ userId, "items.product": parsedItem._id });
      }

      // 2. Address & Coupon Application
      const user = await userModel.findOne({ _id: userId });
      const address = user.address.find(a => a._id.toString() === selectedAddressId);
      if (!address) {
          return res.status(400).json({ val: false, msg: "Invalid address ID" });
      }

      let finalAmount = totalAmount;
      let couponDiscount = 0;
      const couponDetails = isOfferApplied ? { code, discountApplied: 0 } : null;

      if (isOfferApplied && code) {
        try {
            const couponResult = await pricingService.applyCoupon(code, totalAmount, userId, processedItems);
            couponDiscount = couponResult.discount;
            finalAmount = couponResult.finalAmount;
            if (couponDetails) {
                couponDetails.discountApplied = couponDiscount;
                couponDetails.couponId = couponResult.coupon._id;
            }
        } catch (error) {
            return res.status(400).json({ val: false, msg: error.message });
        }
      }

      const amountToSend = finalAmount;

      // 3. Payment Processing
      if (selectedPayment === "cash_on_delivery") {
          if (amountToSend > 1000) {
              return res.status(400).json({ val: false, msg: "COD only available for orders under ₹1000" });
          }

          const order = await orderModel.create({
              orderId: orderId++,
              user: userId,
              items: processedItems,
              totalAmount: amountToSend,
              paymentMethod: selectedPayment,
              shippingAddress: address,
              coupon: couponDetails,
              orderedAt: new Date(),
              paymentStatus: "pending",
              orderStatus: "processing",
              statusHistory: [{ status: "processing", updatedAt: new Date() }]
          });

          // Track offer usage
          for (const item of processedItems) {
              if (item.appliedOffer) {
                  await pricingService.recordOfferUsage(item.appliedOffer._id);
              }
          }

          // Track coupon usage if applied
          if (couponDetails && couponDetails.couponId) {
              await pricingService.recordCouponUsage(
                  couponDetails.couponId,
                  userId,
                  order._id,
                  couponDetails.discountApplied,
                  totalAmount
              );
          }

          // Deduct Stock
          for (const item of processedItems) {
              await stockService.deductStock(item.variant, item.quantity);
          }
          

          // Notify
          notificationService.notifyNewOrder(order);
          notificationService.notifyUser(userId, {
              type: 'order_placed',
              title: 'Order Placed',
              message: `Your order #${order.orderId} has been placed successfully.`,
              data: { orderId: order._id, status: 'processing' }
          });

          return res.status(200).json({ val: true, msg: "Order placed successfully" });

      } else if (selectedPayment === "razorpay") {
          const razorpayOrder = await razorpay.orders.create({
              amount: Math.round(amountToSend * 100),
              currency: "INR",
              receipt: `order_rcptid_${Date.now()}`,
              notes: { userId, addressId: selectedAddressId }
          });

          const order = await orderModel.create({
              orderId: orderId++,
              user: userId,
              items: processedItems,
              totalAmount: amountToSend,
              paymentMethod: selectedPayment,
              shippingAddress: address,
              coupon: couponDetails,
              razorpayOrderId: razorpayOrder.id,
              orderedAt: new Date(),
              paymentStatus: "pending",
              orderStatus: "processing",
              statusHistory: [{ status: "processing", updatedAt: new Date() }]
          });

          // Note: For Razorpay, we'll track usage after payment verification
          // Store order ID for later tracking
          req.session.pendingOrderId = order._id;

          return res.status(200).json({
              val: true,
              msg: "Razorpay order created",
              order: razorpayOrder,
              key: "rzp_test_P7m0ieN3xeK18I"
          });

      } else if (selectedPayment === "wallet") {
          const wallet = await walletModel.findOne({ userId });
          if (!wallet || wallet.balance < amountToSend) {
              return res.status(400).json({ val: false, msg: "Insufficient wallet balance" });
          }

          wallet.balance -= amountToSend;
          wallet.transactionHistory.push({
              transactionType: "purchase",
              transactionAmount: amountToSend,
              transactionDate: new Date(),
              description: `Purchase of order`
          });
          await wallet.save();

          const order = await orderModel.create({
              orderId: orderId++,
              user: userId,
              items: processedItems,
              totalAmount: amountToSend,
              paymentMethod: selectedPayment,
              shippingAddress: address,
              coupon: couponDetails,
              orderedAt: new Date(),
              paymentStatus: "paid",
              orderStatus: "processing",
              statusHistory: [{ status: "processing", updatedAt: new Date() }]
          });

          // Track offer usage
          for (const item of processedItems) {
              if (item.appliedOffer) {
                  await pricingService.recordOfferUsage(item.appliedOffer._id);
              }
          }

          // Track coupon usage if applied
          if (couponDetails && couponDetails.couponId) {
              await pricingService.recordCouponUsage(
                  couponDetails.couponId,
                  userId,
                  order._id,
                  couponDetails.discountApplied,
                  totalAmount
              );
          }

          // Deduct Stock
          for (const item of processedItems) {
              await stockService.deductStock(item.variant, item.quantity);
          }

          // Notify
          notificationService.notifyNewOrder(order);

          return res.status(200).json({ val: true, msg: "Order placed successfully with Wallet" });
      } else {
          return res.status(400).json({ val: false, msg: "Invalid payment method" });
      }

    } catch (err) {
      console.error("Place Order Error:", err);
      return res.status(500).json({ val: false, msg: "Server error: " + err.message });
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
      
      // Notify User
      notificationService.notifyOrderStatusChange(order.user, order, newStatus);

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
  // ~~~ Verify Payment (REFACTORED) ~~~
  async verifyPayment(req, res) {
    const { paymentId, orderId, signature, retryOrderId } = req.body;
    const userId = req.session.currentId;
    
    try {
      if (!paymentId || !orderId || !signature) {
        return res.status(400).json({ val: false, msg: "Missing required fields" });
      }
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", "4Tme4oGDBm9a7Uh8xLiOmfyd")
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ val: false, msg: "Invalid payment signature" });
      }

      const payment = await razorpay.payments.fetch(paymentId);
      if (payment.status !== "captured") {
        return res.status(400).json({ val: false, msg: "Payment not captured" });
      }

      const orderGetId = retryOrderId || userId;
      let order;

      if (retryOrderId) {
        order = await orderModel.findOne({ _id: orderGetId });
      } else {
        // This query logic in original code seems fragile (finding by user and sort).
        // Better to find by razorpayOrderId if stored (we stored it in placeOrder).
        // For backward compatibility, I'll allow finding by user but prefer explicit ID if possible.
        // But here `orderId` variable corresponds to razorpay_order_id, checking placeOrder logic:
        // razorpay.orders.create returns an ID, stored in 'orderId' param here?
        // Wait, Razorpay sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`
        // So `req.body.orderId` IS `razorpay_order_id`.
        order = await orderModel.findOne({ razorpayOrderId: orderId });
        if (!order) {
           // Fallback to original logic if razorpayOrderId not found (legacy orders)
           order = await orderModel.findOne({ user: userId }).sort({ orderedAt: -1 });
        }
      }

      if (!order) {
          return res.status(404).json({ val: false, msg: "Order not found" });
      }

      // Check if already paid to avoid double deduction
      if (order.paymentStatus === 'paid') {
          return res.status(200).json({ val: true, msg: "Order already paid", orderId: order._id });
      }

      order.paymentStatus = "paid";
      await order.save();

      // Track offer and coupon usage after successful payment
      for (const item of order.items) {
          if (item.appliedOffer) {
              await pricingService.recordOfferUsage(item.appliedOffer._id);
          }
      }

      // Track coupon usage if applied
      if (order.coupon && order.coupon.couponId) {
          await pricingService.recordCouponUsage(
              order.coupon.couponId,
              userId,
              order._id,
              order.coupon.discountApplied,
              order.totalAmount + (order.coupon.discountApplied || 0)
          );
      }

      // Deduct Stock (Important!)
      // Need to find variant IDs. If stored in items (new orders), use that.
      // If not (legacy), finding variant is hard. But refactored placeOrder stores variantId.
      for (const item of order.items) {
          if (item.variant) {
              await stockService.deductStock(item.variant, item.quantity);
          } else {
             // Fallback for legacy items: map product/size/color to variant
             // This is best effort.
             const variant = await Variant.findOne({
                 product: item.product,
                 'attributes.size': item.size,
                 'attributes.color': item.color
             });
             if (variant) {
                 await stockService.deductStock(variant._id, item.quantity);
             }
          }
      }

      // Notifications
      notificationService.notifyNewOrder(order);
      notificationService.notifyUser(userId, {
          type: 'order_paid',
          title: 'Payment Received',
          message: `Payment for order #${order.orderId} was successful.`,
          data: { orderId: order._id, status: 'paid' }
      });

      res.status(200).json({
        val: true,
        msg: "Payment verified and order confirmed",
        orderId: order._id,
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
  async downloadRecipt(req, res) {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json("orderId not found");
    }
    try {
      const order = await orderModel
        .findOne({ _id: orderId })
        .sort({ orderedAt: -1 })
        .populate("items.product")
        .lean();
      console.log(order);

      res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
  
      const pdfDoc = new PDFDocument({ margin: 30 });
      pdfDoc.pipe(res);
  
      pdfDoc.fontSize(20).text('Invoice', { align: 'center' }).moveDown();
      pdfDoc.fontSize(14).text('Pay To: Male Fashion').moveDown();
  
      pdfDoc.fontSize(12).text('Items:', { underline: true }).moveDown(0.5);
      pdfDoc.fontSize(10);
      pdfDoc.text(`Item Name`.padEnd(20) + `Qty`.padEnd(10) + `Unit Price`.padEnd(15) + `Offer Price`.padEnd(15) + `Total`, {
        align: 'left',
      });
  
      pdfDoc.moveDown(0.5);
      order.items.forEach((item) => {
        const productName = item.product.name.padEnd(20);
        const quantity = String(item.quantity).padEnd(10);
        const unitPrice = `₹${item.product.price}`.padEnd(15);
        const offerPrice = `₹${item.offerPrice}`.padEnd(15);
        const total = `₹${item.quantity * item.offerPrice}`;
  
        pdfDoc.text(`${productName}${quantity}${unitPrice}${offerPrice}${total}`);
      });
  
      pdfDoc.moveDown();
  
      pdfDoc.fontSize(12);
      if (order.coupon && order.coupon.discountApplied) {
        pdfDoc.text(`Coupon Applied: ${order.coupon.code || 'N/A'} - Discount: ₹${order.coupon.discountApplied}`, {
          align: 'right',
        });
      } else {
        pdfDoc.text('No coupon applied', { align: 'right' });
      }
      pdfDoc.text(`Total Amount: ₹${order.totalAmount}`, { align: 'right', underline: true });
  
      pdfDoc.moveDown();
      pdfDoc.text('Payment Information:', { underline: true }).moveDown(0.5);
      pdfDoc.text(`Method: ${order.paymentMethod}`);
      pdfDoc.text(`Status: ${order.paymentStatus}`);
      pdfDoc.text(`Order Date: ${new Date(order.orderedAt).toLocaleString()}`).moveDown();
      pdfDoc.moveDown();
      pdfDoc.fontSize(14).text('Thank you for your purchase!', { align: 'center' });
  
      pdfDoc.end();
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  },
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
