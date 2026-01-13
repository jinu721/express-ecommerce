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

const Variant = require("../models/variantModel");
const Offer = require("../models/offerModel");
const stockService = require("../services/stockService");
const pricingService = require("../services/pricingService");

let orderId = 100;

module.exports = {
  async placeOrder(req, res) {
    const { item, selectedAddressId, selectedPayment, isOfferApplied, code } = req.body;
    const userId = req.session.currentId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!item || !selectedAddressId || !selectedPayment) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ val: false, msg: "Missing required fields" });
      }

      let parsedItem;
      try {
        parsedItem = JSON.parse(item);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ val: false, msg: "Invalid item format" });
      }

      const itemsList = Array.isArray(parsedItem) ? parsedItem : [parsedItem];

      const processedItems = [];
      for (const prod of itemsList) {
        if (!prod._id || !prod.quantity || !prod.size || !prod.color) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ val: false, msg: "Invalid product data" });
        }

        const product = await productModel.findById(prod._id).session(session);
        if (!product) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ val: false, msg: "Product not found" });
        }

        const attributeQuery = {};
        if (prod.size) attributeQuery['attributes.SIZE'] = prod.size.toUpperCase();
        if (prod.color) attributeQuery['attributes.COLOR'] = prod.color.toUpperCase();

        const variant = await Variant.findOne({
          product: prod._id,
          ...attributeQuery,
          isActive: true
        }).session(session);

        if (!variant) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ val: false, msg: `Variant not found: ${prod.size} - ${prod.color}` });
        }

        const availableStock = variant.stock - variant.reserved;
        if (availableStock < prod.quantity) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            val: false,
            msg: `Insufficient stock for ${prod.size}/${prod.color}. Only ${availableStock} available.`
          });
        }

        await Variant.findByIdAndUpdate(
          variant._id,
          { $inc: { reserved: prod.quantity } },
          { session }
        );

        const pricingResult = await pricingService.calculateBestOffer(product, Number(prod.quantity), userId, variant);

        processedItems.push({
          product: new mongoose.Types.ObjectId(prod._id),
          variant: variant._id,
          quantity: Number(prod.quantity),
          originalPrice: Math.round(pricingResult.originalPrice / Number(prod.quantity) * 100) / 100,
          offerPrice: Math.round(pricingResult.finalPrice / Number(prod.quantity) * 100) / 100,
          totalPrice: Math.round(pricingResult.finalPrice * 100) / 100,
          discount: Math.round(pricingResult.discount * 100) / 100,
          appliedOffer: pricingResult.offer ? pricingResult.offer._id : null,
          size: prod.size,
          color: prod.color,
        });
      }

      const roundToTwoDecimals = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

      let shippingCost = 0;

      for (const item of processedItems) {
        const product = await productModel.findById(item.product).session(session);
        if (product.hasCustomShipping) {
          shippingCost += roundToTwoDecimals((product.shippingPrice || 0) * item.quantity);
        }
      }

      if (shippingCost === 0) {
        const subtotal = processedItems.reduce((sum, i) => sum + i.totalPrice, 0);
        if (subtotal < 2000) {
          shippingCost = 100;
        }
      }

      const totalAmount = roundToTwoDecimals(processedItems.reduce(
        (sum, i) => sum + i.totalPrice, 0
      ) + shippingCost);

      const originalTotal = roundToTwoDecimals(processedItems.reduce(
        (sum, i) => sum + (i.originalPrice * i.quantity), 0
      ) + shippingCost);

      const totalOfferDiscount = roundToTwoDecimals(processedItems.reduce(
        (sum, i) => sum + i.discount, 0
      ));

      if (Array.isArray(parsedItem)) {
        await cartModel.deleteMany({ userId }).session(session);
      } else {
        await cartModel.deleteOne({ userId, "items.product": parsedItem._id }).session(session);
      }

      const user = await userModel.findOne({ _id: userId }).session(session);
      const address = user.address.find(a => a._id.toString() === selectedAddressId);
      if (!address) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ val: false, msg: "Invalid address ID" });
      }

      let finalAmount = totalAmount;
      let couponDiscount = 0;
      const couponDetails = isOfferApplied ? { code, discountApplied: 0 } : null;

      if (isOfferApplied && code) {
        try {
          const couponResult = await pricingService.applyCoupon(code, totalAmount, userId, processedItems);
          couponDiscount = roundToTwoDecimals(couponResult.discount);
          finalAmount = roundToTwoDecimals(couponResult.finalAmount);
          if (couponDetails) {
            couponDetails.discountApplied = couponDiscount;
            couponDetails.couponId = couponResult.coupon._id;
          }
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ val: false, msg: error.message });
        }
      }

      const amountToSend = roundToTwoDecimals(finalAmount);

      if (selectedPayment === "cash_on_delivery") {
        if (amountToSend > 1000) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ val: false, msg: "COD only available for orders under ₹1000" });
        }

        const order = await orderModel.create([{
          orderId: orderId++,
          user: userId,
          items: processedItems,
          subtotal: roundToTwoDecimals(processedItems.reduce((sum, i) => sum + i.totalPrice, 0)),
          shippingCost: roundToTwoDecimals(shippingCost),
          totalDiscount: roundToTwoDecimals(totalOfferDiscount),
          totalAmount: amountToSend,
          paymentMethod: selectedPayment,
          shippingAddress: address,
          coupon: couponDetails,
          orderedAt: new Date(),
          paymentStatus: "pending",
          orderStatus: "order_placed",
          statusHistory: [{
            status: "order_placed",
            message: "Order has been placed successfully",
            updatedAt: new Date()
          }]
        }], { session });

        for (const item of processedItems) {
          if (item.appliedOffer) {
            await pricingService.recordOfferUsage(item.appliedOffer._id);
          }
        }

        if (couponDetails && couponDetails.couponId) {
          await pricingService.recordCouponUsage(
            couponDetails.couponId,
            userId,
            order[0]._id,
            couponDetails.discountApplied,
            totalAmount
          );
        }

        for (const item of processedItems) {
          await Variant.findOneAndUpdate(
            { _id: item.variant, stock: { $gte: item.quantity }, reserved: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, reserved: -item.quantity } },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({ val: true, msg: "Order placed successfully" });

      } else if (selectedPayment === "razorpay") {
        const roundedAmount = roundToTwoDecimals(amountToSend);
        const razorpayAmount = Math.round(roundedAmount * 100);

        const razorpayOrder = await razorpay.orders.create({
          amount: razorpayAmount,
          currency: "INR",
          receipt: `order_rcptid_${Date.now()}`,
          notes: { userId, addressId: selectedAddressId }
        });

        const order = await orderModel.create([{
          orderId: orderId++,
          user: userId,
          items: processedItems,
          subtotal: roundToTwoDecimals(processedItems.reduce((sum, i) => sum + i.totalPrice, 0)),
          shippingCost: roundToTwoDecimals(shippingCost),
          totalDiscount: roundToTwoDecimals(totalOfferDiscount),
          totalAmount: roundedAmount,
          paymentMethod: selectedPayment,
          shippingAddress: address,
          coupon: couponDetails,
          razorpayOrderId: razorpayOrder.id,
          orderedAt: new Date(),
          paymentStatus: "pending",
          orderStatus: "order_placed",
          statusHistory: [{
            status: "order_placed",
            message: "Order has been placed successfully",
            updatedAt: new Date()
          }]
        }], { session });

        req.session.pendingOrderId = order[0]._id;

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
          val: true,
          msg: "Razorpay order created",
          order: razorpayOrder,
          key: "rzp_test_P7m0ieN3xeK18I"
        });

      } else if (selectedPayment === "wallet") {
        const wallet = await walletModel.findOne({ userId }).session(session);
        if (!wallet || wallet.balance < amountToSend) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ val: false, msg: "Insufficient wallet balance" });
        }

        wallet.balance = Math.round((wallet.balance - amountToSend) * 100) / 100;
        wallet.transactionHistory.push({
          transactionType: "purchase",
          transactionAmount: amountToSend,
          transactionDate: new Date(),
          description: `Purchase of order`
        });
        await wallet.save({ session });

        const order = await orderModel.create([{
          orderId: orderId++,
          user: userId,
          items: processedItems,
          subtotal: roundToTwoDecimals(processedItems.reduce((sum, i) => sum + i.totalPrice, 0)),
          shippingCost: roundToTwoDecimals(shippingCost),
          totalDiscount: roundToTwoDecimals(totalOfferDiscount),
          totalAmount: amountToSend,
          paymentMethod: selectedPayment,
          shippingAddress: address,
          coupon: couponDetails,
          orderedAt: new Date(),
          paymentStatus: "paid",
          orderStatus: "order_placed",
          statusHistory: [{
            status: "order_placed",
            message: "Order has been placed successfully",
            updatedAt: new Date()
          }]
        }], { session });

        for (const item of processedItems) {
          if (item.appliedOffer) {
            await pricingService.recordOfferUsage(item.appliedOffer._id);
          }
        }

        if (couponDetails && couponDetails.couponId) {
          await pricingService.recordCouponUsage(
            couponDetails.couponId,
            userId,
            order[0]._id,
            couponDetails.discountApplied,
            totalAmount
          );
        }

        for (const item of processedItems) {
          await Variant.findOneAndUpdate(
            { _id: item.variant, stock: { $gte: item.quantity }, reserved: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, reserved: -item.quantity } },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({ val: true, msg: "Order placed successfully with Wallet" });
      } else {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ val: false, msg: "Invalid payment method" });
      }

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Place Order Error:", err);
      return res.status(500).json({ val: false, msg: "Server error: " + err.message });
    }
  },
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
          wallet.balance = Math.round((wallet.balance + order.totalAmount) * 100) / 100;
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
  async adminOrdersStatusUpdate(req, res) {
    const { orderId } = req.params;
    const { newStatus, location, message } = req.body;
    try {
      const validStatuses = ["processing", "order_placed", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const order = await orderModel.findOne({ _id: orderId });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.paymentMethod === "cash_on_delivery" && newStatus === "delivered") {
        order.paymentStatus = "paid";
      }

      if (!order.subtotal) {
        order.subtotal = order.totalAmount || 0;
      }

      order.items.forEach(item => {
        if (!item.originalPrice) item.originalPrice = item.offerPrice || 0;
        if (!item.offerPrice) item.offerPrice = item.originalPrice || 0;
        if (!item.totalPrice) item.totalPrice = (item.offerPrice || 0) * (item.quantity || 1);
      });

      order.updateStatus(newStatus, location || '', message || `Order status updated to ${newStatus}`, 'admin');

      await order.save();

      return res.json({
        val: true,
        status: newStatus,
        updatedAt: order.statusHistory[order.statusHistory.length - 1].updatedAt,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
  async verifyPayment(req, res) {
    const { paymentId, orderId, signature, retryOrderId } = req.body;
    const userId = req.session.currentId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!paymentId || !orderId || !signature) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ val: false, msg: "Missing required fields" });
      }
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", "4Tme4oGDBm9a7Uh8xLiOmfyd")
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ val: false, msg: "Invalid payment signature" });
      }

      const payment = await razorpay.payments.fetch(paymentId);
      if (payment.status !== "captured") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ val: false, msg: "Payment not captured" });
      }

      const orderGetId = retryOrderId || userId;
      let order;

      if (retryOrderId) {
        order = await orderModel.findOne({ _id: orderGetId }).session(session);
      } else {
        order = await orderModel.findOne({ razorpayOrderId: orderId }).session(session);
        if (!order) {
          order = await orderModel.findOne({ user: userId }).sort({ orderedAt: -1 }).session(session);
        }
      }

      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ val: false, msg: "Order not found" });
      }

      if (order.paymentStatus === 'paid') {
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({ val: true, msg: "Order already paid", orderId: order._id });
      }

      order.paymentStatus = "paid";
      await order.save({ session });

      for (const item of order.items) {
        if (item.appliedOffer) {
          await pricingService.recordOfferUsage(item.appliedOffer._id);
        }
      }

      if (order.coupon && order.coupon.couponId) {
        await pricingService.recordCouponUsage(
          order.coupon.couponId,
          userId,
          order._id,
          order.coupon.discountApplied,
          order.totalAmount + (order.coupon.discountApplied || 0)
        );
      }

      for (const item of order.items) {
        if (item.variant) {
          await Variant.findOneAndUpdate(
            { _id: item.variant, stock: { $gte: item.quantity }, reserved: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, reserved: -item.quantity } },
            { session }
          );
        } else {
          const variant = await Variant.findOne({
            product: item.product,
            'attributes.size': item.size,
            'attributes.color': item.color
          }).session(session);
          if (variant) {
            await Variant.findOneAndUpdate(
              { _id: variant._id, stock: { $gte: item.quantity }, reserved: { $gte: item.quantity } },
              { $inc: { stock: -item.quantity, reserved: -item.quantity } },
              { session }
            );
          }
        }
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        val: true,
        msg: "Payment verified and order confirmed",
        orderId: order._id,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error verifying payment:", err);
      res.status(500).json({
        val: false,
        msg: "Payment verification failed",
        error: err.message,
      });
    }
  },
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
  async downloadRecipt(req, res) {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json("orderId not found");
    }
    try {
      const order = await orderModel
        .findOne({ _id: orderId })
        .populate("items.product")
        .populate("items.appliedOffer")
        .lean();

      if (!order) {
        return res.status(404).json("Order not found");
      }

      res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');

      const pdfDoc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: `Invoice #${order.orderId}`,
          Author: 'Male Fashion',
          Subject: 'Order Invoice'
        }
      });
      pdfDoc.pipe(res);

      const safeNumber = (value, defaultValue = 0) => {
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      const formatCurrency = (amount) => {
        const num = safeNumber(amount);
        return `₹${num.toFixed(2)}`;
      };

      const primaryColor = '#2c3e50';
      const accentColor = '#3498db';
      const successColor = '#27ae60';
      const lightGray = '#ecf0f1';

      pdfDoc.rect(0, 0, 612, 120).fill('#34495e');

      pdfDoc.fillColor('white')
        .fontSize(32)
        .font('Helvetica-Bold')
        .text('MALE FASHION', 50, 30);

      pdfDoc.fillColor('#bdc3c7')
        .fontSize(12)
        .font('Helvetica')
        .text('Premium Fashion for Modern Men', 50, 70)
        .text('Email: support@malefashion.com | Phone: +91 9876543210', 50, 85);

      pdfDoc.fillColor(primaryColor)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('INVOICE', 400, 30);

      pdfDoc.fillColor('#7f8c8d')
        .fontSize(11)
        .font('Helvetica')
        .text(`Invoice #: ${order.orderId}`, 400, 65)
        .text(`Date: ${new Date(order.orderedAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })}`, 400, 80)
        .text(`Time: ${new Date(order.orderedAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        })}`, 400, 95);

      let currentY = 150;

      pdfDoc.rect(50, currentY, 250, 120).fill(lightGray);
      pdfDoc.fillColor(primaryColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('BILL TO:', 60, currentY + 15);

      const addr = order.shippingAddress;
      pdfDoc.fillColor('#2c3e50')
        .fontSize(11)
        .font('Helvetica')
        .text(`${addr.houseNumber}, ${addr.street}`, 60, currentY + 35)
        .text(`${addr.city}, ${addr.district}`, 60, currentY + 50)
        .text(`${addr.state}, ${addr.country}`, 60, currentY + 65)
        .text(`PIN: ${addr.pinCode}`, 60, currentY + 80);

      pdfDoc.rect(320, currentY, 240, 120).fill('#e8f4fd');
      pdfDoc.fillColor(primaryColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('ORDER DETAILS:', 330, currentY + 15);

      pdfDoc.fillColor('#2c3e50')
        .fontSize(11)
        .font('Helvetica')
        .text(`Payment Method: ${order.paymentMethod.replace('_', ' ').toUpperCase()}`, 330, currentY + 35)
        .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 330, currentY + 50)
        .text(`Order Status: ${order.orderStatus.replace('_', ' ').toUpperCase()}`, 330, currentY + 65)
        .text(`Items Count: ${order.items.length}`, 330, currentY + 80);

      currentY += 150;

      pdfDoc.rect(50, currentY, 512, 35).fill(primaryColor);
      pdfDoc.fillColor('white')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('ITEM', 60, currentY + 12)
        .text('QTY', 280, currentY + 12)
        .text('UNIT PRICE', 320, currentY + 12)
        .text('DISCOUNT', 400, currentY + 12)
        .text('TOTAL', 480, currentY + 12);

      currentY += 35;

      let calculatedSubtotal = 0;
      let calculatedTotalDiscount = 0;
      let calculatedOfferDiscount = 0;

      order.items.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        pdfDoc.rect(50, currentY, 512, 30).fill(bgColor);

        const originalPrice = safeNumber(item.originalPrice);
        const offerPrice = safeNumber(item.offerPrice);
        const quantity = safeNumber(item.quantity, 1);
        const itemDiscount = safeNumber(item.discount);
        const totalPrice = safeNumber(item.totalPrice, offerPrice * quantity);

        calculatedSubtotal += originalPrice * quantity;
        calculatedOfferDiscount += itemDiscount;

        pdfDoc.fillColor('#2c3e50')
          .fontSize(10)
          .font('Helvetica')
          .text(item.product.name.substring(0, 30), 60, currentY + 8)
          .text(`Size: ${item.size || 'N/A'}`, 60, currentY + 20);

        pdfDoc.text(quantity.toString(), 285, currentY + 12)
          .text(formatCurrency(originalPrice), 325, currentY + 12);

        if (itemDiscount > 0) {
          pdfDoc.fillColor(successColor)
            .text(`-${formatCurrency(itemDiscount)}`, 405, currentY + 12);
        } else {
          pdfDoc.fillColor('#95a5a6')
            .text('No Discount', 405, currentY + 12);
        }

        pdfDoc.fillColor('#2c3e50')
          .font('Helvetica-Bold')
          .text(formatCurrency(totalPrice), 485, currentY + 12);

        currentY += 30;
      });

      currentY += 20;
      const summaryStartY = currentY;

      pdfDoc.rect(320, currentY, 242, 140).fill('#f8f9fa').stroke('#dee2e6');

      pdfDoc.fillColor(primaryColor)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('ORDER SUMMARY', 330, currentY + 10);

      currentY += 35;

      const orderSubtotal = safeNumber(order.subtotal, calculatedSubtotal);
      pdfDoc.fillColor('#2c3e50')
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 330, currentY)
        .font('Helvetica-Bold')
        .text(formatCurrency(orderSubtotal), 480, currentY);

      currentY += 18;

      if (calculatedOfferDiscount > 0) {
        pdfDoc.fillColor(successColor)
          .font('Helvetica')
          .text('Offer Discount:', 330, currentY)
          .font('Helvetica-Bold')
          .text(`-${formatCurrency(calculatedOfferDiscount)}`, 480, currentY);
        currentY += 18;
      }

      const couponDiscount = safeNumber(order.coupon?.discountApplied);
      if (couponDiscount > 0) {
        pdfDoc.fillColor(successColor)
          .font('Helvetica')
          .text(`Coupon (${order.coupon.code}):`, 330, currentY)
          .font('Helvetica-Bold')
          .text(`-${formatCurrency(couponDiscount)}`, 480, currentY);
        currentY += 18;
      }

      const shippingCost = safeNumber(order.shippingCost);
      if (shippingCost > 0) {
        pdfDoc.fillColor('#2c3e50')
          .font('Helvetica')
          .text('Shipping:', 330, currentY)
          .font('Helvetica-Bold')
          .text(formatCurrency(shippingCost), 480, currentY);
        currentY += 18;
      } else {
        pdfDoc.fillColor(successColor)
          .font('Helvetica')
          .text('Shipping:', 330, currentY)
          .font('Helvetica-Bold')
          .text('FREE', 480, currentY);
        currentY += 18;
      }

      pdfDoc.rect(330, currentY + 5, 225, 1).fill('#dee2e6');
      currentY += 15;

      const finalTotal = safeNumber(order.totalAmount);
      pdfDoc.fillColor(primaryColor)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TOTAL AMOUNT:', 330, currentY)
        .fontSize(14)
        .text(formatCurrency(finalTotal), 480, currentY);

      const totalSavings = calculatedOfferDiscount + couponDiscount;
      if (totalSavings > 0) {
        currentY += 40;
        pdfDoc.rect(50, currentY, 512, 40).fill('#d5f4e6').stroke(successColor);
        pdfDoc.fillColor(successColor)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(`🎉 Congratulations! You saved ${formatCurrency(totalSavings)} on this order!`, 60, currentY + 15);
      }

      currentY += 80;

      pdfDoc.rect(50, currentY, 512, 60).fill('#34495e');
      pdfDoc.fillColor('white')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Thank you for choosing Male Fashion!', 0, currentY + 15, { align: 'center', width: 612 });

      pdfDoc.fillColor('#bdc3c7')
        .fontSize(10)
        .font('Helvetica')
        .text('For any queries, contact us at support@malefashion.com or call +91 9876543210', 0, currentY + 35, { align: 'center', width: 612 });

      currentY += 80;
      pdfDoc.fillColor('#7f8c8d')
        .fontSize(8)
        .font('Helvetica')
        .text('Terms & Conditions: All sales are final. Returns accepted within 7 days of delivery. Original packaging required for returns.', 50, currentY, { width: 512, align: 'justify' });

      pdfDoc.end();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      res.status(500).json({ val: false, msg: err.message });
    }
  },
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
          wallet.balance = Math.round((wallet.balance + refundAmount) * 100) / 100;
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

      const razorpayAmount = Math.round(order.totalAmount * 100);

      const razorpayOrder = await razorpay.orders.create({
        amount: razorpayAmount,
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
      const refundAmount = Math.round(item.offerPrice * item.quantity * 100) / 100;
      order.totalAmount = Math.round((order.totalAmount - refundAmount) * 100) / 100;

      if (order.paymentMethod !== "COD") {
        let wallet = await walletModel.findOne({ userId: currentId });
        if (!wallet) {
          wallet = await walletModel.create({
            userId: currentId,
            balance: refundAmount,
            transactionHistory: [
              {
                transactionType: "refund",
                transactionAmount: refundAmount,
                transactionDate: new Date(),
                description: `Refund for canceled item ${itemId} in order ${orderId}`,
              },
            ],
          });
        } else {
          wallet.balance = Math.round((wallet.balance + refundAmount) * 100) / 100;
          wallet.transactionHistory.push({
            transactionType: "refund",
            transactionAmount: refundAmount,
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
          wallet.balance = Math.round((wallet.balance + refundAmount) * 100) / 100;
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

  async trackOrder(req, res) {
    const { orderId } = req.params;
    const userId = req.session.currentId;

    if (!userId) {
      return res.redirect('/login');
    }

    try {
      const order = await orderModel
        .findOne({ _id: orderId, user: userId })
        .populate('items.product')
        .populate('items.appliedOffer')
        .lean();

      if (!order) {
        return res.status(404).render('404');
      }

      if (!order.subtotal) {
        order.subtotal = order.totalAmount || 0;
      }

      order.items.forEach(item => {
        if (!item.originalPrice) item.originalPrice = item.offerPrice || 0;
        if (!item.offerPrice) item.offerPrice = item.originalPrice || 0;
        if (!item.totalPrice) item.totalPrice = (item.offerPrice || 0) * (item.quantity || 1);
      });

      const statusFlow = [
        { key: 'processing', label: 'Processing', icon: 'fas fa-cog' },
        { key: 'order_placed', label: 'Order Placed', icon: 'fas fa-shopping-cart' },
        { key: 'confirmed', label: 'Confirmed', icon: 'fas fa-check-circle' },
        { key: 'packed', label: 'Packed', icon: 'fas fa-box' },
        { key: 'shipped', label: 'Shipped', icon: 'fas fa-truck' },
        { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'fas fa-shipping-fast' },
        { key: 'delivered', label: 'Delivered', icon: 'fas fa-home' }
      ];

      const currentStatusIndex = statusFlow.findIndex(s => s.key === order.orderStatus);

      const trackingSteps = statusFlow.map((step, index) => {
        const statusEntry = order.statusHistory.find(h => h.status === step.key);
        const hasActuallyHappened = statusEntry !== undefined;

        return {
          ...step,
          completed: index <= currentStatusIndex && hasActuallyHappened,
          current: index === currentStatusIndex,
          timestamp: hasActuallyHappened ? statusEntry.updatedAt : null,
          location: hasActuallyHappened ? statusEntry.location : null,
          message: hasActuallyHappened ? statusEntry.message : null
        };
      });

      res.render('orderTracking', {
        order,
        trackingSteps,
        isDelivered: order.orderStatus === 'delivered',
        isCancelled: order.orderStatus === 'cancelled'
      });
    } catch (error) {
      console.error('Error loading order tracking:', error);
      res.status(500).render('404');
    }
  },
};