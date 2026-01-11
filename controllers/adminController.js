const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const orderModel = require("../models/orderModel");
const moment = require("moment");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

module.exports = {
  whenDashboardLoad(req, res) {
    res.render("dashboard");
  },
  async dashboardData(req, res) {
    const { range, startDate, endDate } = req.query;
    try {
      let start, end;

      // Use moment for consistent date handling
      if (range === "daily") {
        start = moment().startOf("day").toDate();
        end = moment().endOf("day").toDate();
      } else if (range === "weekly") {
        start = moment().startOf("week").toDate();
        end = moment().endOf("day").toDate();
      } else if (range === "monthly") {
        start = moment().startOf("month").toDate();
        end = moment().endOf("day").toDate();
      } else if (range === "custom") {
        start = moment(startDate).startOf("day").toDate();
        end = moment(endDate).endOf("day").toDate();
      } else {
        // Default to daily if invalid
        start = moment().startOf("day").toDate();
        end = moment().endOf("day").toDate();
      }

      const dateFilter = { createdAt: { $gte: start, $lte: end } };

      const Brand = require("../models/brandModel");
      const Offer = require("../models/offerModel");
      const Variant = require("../models/variantModel");

      // 1. Basic Stats (Counts)
      const [usersCount, productsCount, ordersCount, offersCount, brandsCount, lowStockCount] =
        await Promise.all([
          userModel.countDocuments({ isDeleted: false }),
          productModel.countDocuments({ isDeleted: false }),
          orderModel.countDocuments({
            ...dateFilter,
            orderStatus: { $in: ["processing", "order_placed", "confirmed", "packed", "shipped", "out_for_delivery"] }
          }),
          Offer.countDocuments({ isActive: true }),
          Brand.countDocuments({ isActive: true }),
          Variant.countDocuments({ stock: { $lt: 10 }, isActive: true })
        ]);

      // 2. Financial Stats (Revenue & Sales)
      // Delivered orders that are paid (or COD delivered which implies payment)
      const salesStats = await orderModel.aggregate([
        {
          $match: {
            ...dateFilter,
            orderStatus: "delivered",
            // Include both paid online orders and delivered COD orders
            $or: [
              { paymentStatus: "paid" },
              { paymentMethod: "cash_on_delivery" }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            count: { $sum: 1 },
            couponDiscounts: { $sum: { $ifNull: ["$coupon.discountApplied", 0] } }
            // Note: totalDiscount field might not be reliable if not consistently set, better to rely on coupon or calc
          },
        },
      ]);

      const totalRevenue = salesStats[0]?.totalRevenue || 0;
      const totalSales = salesStats[0]?.count || 0;
      const couponDiscounts = salesStats[0]?.couponDiscounts || 0;

      // 3. Pending Money (COD Pending)
      const pendingMoneyStats = await orderModel.aggregate([
        {
          $match: {
            ...dateFilter,
            paymentMethod: "cash_on_delivery",
            paymentStatus: { $ne: "paid" }, // Any COD not marked as paid
            orderStatus: { $nin: ["cancelled", "returned", "delivered"] } // Exclude finalized states
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: "$totalAmount" },
          },
        },
      ]);
      const totalPendingMoney = pendingMoneyStats[0]?.amount || 0;

      // 4. Categories Overview
      const categoryData = await categoryModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "category",
            as: "products",
            pipeline: [{ $match: { isDeleted: false } }]
          },
        },
        {
          $addFields: { productCount: { $size: "$products" } },
        },
        {
          $project: { name: 1, image: 1, productCount: 1 },
        },
        { $sort: { productCount: -1 } },
        { $limit: 8 }
      ]);

      // 5. Top Selling Products
      const topSellingProducts = await orderModel.aggregate([
        { $match: { ...dateFilter, orderStatus: "delivered" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.totalPrice" }
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        {
          $project: {
            productName: { $ifNull: [{ $arrayElemAt: ["$productDetails.name", 0] }, "Unknown Product"] },
            totalQuantity: 1,
            totalRevenue: { $round: ["$totalRevenue", 2] }
          },
        },
      ]);

      // 6. Top Selling Categories
      const topSellingCategories = await orderModel.aggregate([
        { $match: { ...dateFilter, orderStatus: "delivered" } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.category",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.totalPrice" }
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $project: {
            categoryName: "$category.name",
            totalQuantity: 1,
            totalRevenue: { $round: ["$totalRevenue", 2] }
          },
        },
      ]);

      // 7. Top Selling Brands
      const topSellingBrands = await orderModel.aggregate([
        { $match: { ...dateFilter, orderStatus: "delivered" } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        { $match: { "product.brand": { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$product.brand",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.totalPrice" }
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "_id",
            foreignField: "_id",
            as: "brand",
          },
        },
        { $unwind: "$brand" },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $project: {
            brandName: "$brand.name",
            totalQuantity: 1,
            totalRevenue: { $round: ["$totalRevenue", 2] }
          },
        },
      ]);

      // 8. Revenue Trend
      // Calculate days based on range
      let revenueDays = 7;
      if (range === "monthly") revenueDays = 30;
      else if (range === "daily") revenueDays = 1; // Hourly breakdown for daily?
      else if (range === "custom") {
        const diffTime = Math.abs(end - start);
        revenueDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      // Group format depends on range (Daily for month/week, Hourly for day?? or just stick to daily)
      // Keeping it simple with daily grouping
      const revenueTrend = await orderModel.aggregate([
        {
          $match: {
            orderStatus: "delivered",
            $or: [{ paymentStatus: "paid" }, { paymentMethod: "cash_on_delivery" }],
            createdAt: { $gte: moment().subtract(revenueDays, 'days').toDate(), $lte: end }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } },
        {
          $project: {
            date: "$_id",
            revenue: { $round: ["$revenue", 2] },
            orderCount: 1
          }
        }
      ]);

      // 9. Order Status Distribution
      const orderStatusDistribution = await orderModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);


      const dashboard = {
        usersCount,
        productsCount,
        ordersCount,
        totalSalesCount: totalSales,
        totalRevenue,
        totalPendingMoney,
        categories: categoryData,
        couponDiscounts,
        topSellingProducts,
        topSellingCategories,
        topSellingBrands,
        revenueTrend,
        orderStatusDistribution,
        offersCount,
        brandsCount,
        lowStockCount
      };

      res.status(200).json({ val: true, dashboard });
    } catch (err) {
      console.error("Error loading dashboard:", err);
      res.status(500).json({
        val: false,
        msg: "An error occurred while loading the dashboard.",
      });
    }
  },

  async downloadReport(req, res) {
    try {
      const { startDate, endDate, range, format = 'pdf' } = req.body;

      let start, end;

      if (range === "daily") {
        start = moment().startOf("day").toDate();
        end = moment().endOf("day").toDate();
      } else if (range === "weekly") {
        start = moment().startOf("week").toDate();
        end = moment().endOf("day").toDate();
      } else if (range === "monthly") {
        start = moment().startOf("month").toDate();
        end = moment().endOf("day").toDate();
      } else if (range === "custom") {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: "Start and end dates are required for custom range.",
          });
        }
        start = moment(startDate).startOf("day").toDate();
        end = moment(endDate).endOf("day").toDate();
      } else {
        start = moment().startOf("day").toDate();
        end = moment().endOf("day").toDate();
      }

      const matchQuery = {
        orderStatus: "delivered",
        $or: [{ paymentStatus: "paid" }, { paymentMethod: "cash_on_delivery" }],
        createdAt: { $gte: start, $lte: end },
      };

      const salesDataResult = await orderModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalSales: { $sum: 1 },
            itemsSold: { $sum: { $sum: "$items.quantity" } },
            totalDiscount: { $sum: { $ifNull: ["$coupon.discountApplied", 0] } }
            // Note: Use coupon.discountApplied for consistency
          },
        },
      ]);

      const salesData = salesDataResult[0] || {
        totalRevenue: 0,
        totalSales: 0,
        itemsSold: 0,
        totalDiscount: 0
      };

      const detailedOrders = await orderModel
        .find(matchQuery)
        .populate("items.product", "name basePrice")
        .populate("user", "username email")
        .sort({ createdAt: -1 });

      const reportRange = range || 'daily';
      const filename = `SalesReport_${reportRange}_${moment().format('YYYY-MM-DD')}`;

      if (format === 'excel') {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
          { header: 'Order ID', key: 'orderId', width: 20 },
          { header: 'Customer', key: 'customer', width: 25 },
          { header: 'Product Name', key: 'productName', width: 30 },
          { header: 'Quantity', key: 'quantity', width: 10 },
          { header: 'Price', key: 'price', width: 15 },
          { header: 'Total', key: 'total', width: 15 },
          { header: 'Date', key: 'date', width: 15 }
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };

        // Add Summary Section at Top
        worksheet.addRow({});
        worksheet.addRow(['SUMMARY']);
        worksheet.addRow(['Total Revenue', `₹${salesData.totalRevenue.toFixed(2)}`]);
        worksheet.addRow(['Total Sales', salesData.totalSales]);
        worksheet.addRow(['Items Sold', salesData.itemsSold]);
        worksheet.addRow(['Total Discounts', `₹${salesData.totalDiscount.toFixed(2)}`]);
        worksheet.addRow({});
        worksheet.addRow(['DETAILED ORDERS']);
        worksheet.addRow({});

        detailedOrders.forEach(order => {
          order.items.forEach(item => {
            worksheet.addRow({
              orderId: order._id.toString(),
              customer: order.user?.username || 'Guest',
              productName: item.product?.name || 'Unknown Product',
              quantity: item.quantity,
              price: `₹${(item.price || 0).toFixed(2)}`,
              total: `₹${(item.quantity * (item.price || 0)).toFixed(2)}`,
              date: moment(order.createdAt).format('YYYY-MM-DD')
            });
          });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

      } else {
        // PDF fallback
        const PDFDocument = require('pdfkit');
        const pdfDoc = new PDFDocument({ margin: 30 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}.pdf`);

        pdfDoc.pipe(res);

        pdfDoc.fontSize(20).text("Sales Report", { align: "center" }).moveDown();
        pdfDoc.fontSize(12).text(`Date Range: ${moment(start).format('YYYY-MM-DD')} to ${moment(end).format('YYYY-MM-DD')}`, { align: "left" });
        pdfDoc.moveDown();

        pdfDoc.text("Summary:", { underline: true }).moveDown();
        pdfDoc.text(`Total Revenue: ₹${salesData.totalRevenue.toFixed(2)}`);
        pdfDoc.text(`Total Sales: ${salesData.totalSales}`);
        pdfDoc.text(`Items Sold: ${salesData.itemsSold}`);
        pdfDoc.text(`Total Discounts: ₹${salesData.totalDiscount.toFixed(2)}`);
        pdfDoc.moveDown();

        pdfDoc.text("Order Details:", { underline: true }).moveDown();

        // Simple table header for PDF
        const yStart = pdfDoc.y;
        pdfDoc.text("Order ID", 30, yStart);
        pdfDoc.text("Customer", 150, yStart);
        pdfDoc.text("Total", 350, yStart);
        pdfDoc.text("Date", 450, yStart);
        pdfDoc.moveDown();

        detailedOrders.forEach(order => {
          if (pdfDoc.y > 700) pdfDoc.addPage();
          const y = pdfDoc.y;
          pdfDoc.text(order._id.toString().substring(0, 10) + '...', 30, y);
          pdfDoc.text((order.user?.username || 'Guest').substring(0, 15), 150, y);
          pdfDoc.text(`₹${order.totalAmount.toFixed(2)}`, 350, y);
          pdfDoc.text(moment(order.createdAt).format('YYYY-MM-DD'), 450, y);
          pdfDoc.moveDown(0.5);
        });

        pdfDoc.end();
      }
    } catch (error) {
      console.error("Error in downloadReport:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while generating the report.",
        error: error.message
      });
    }
  },

  whenAdminLoginLoad(req, res) {
    res.render("login");
  },
  async whenUsersLoad(req, res) {
    const { page = 1 } = req.query;
    const limit = 7;
    const skip = (page - 1) * limit;
    try {
      const users = await userModel
        .find({})
        .skip(skip)
        .limit(limit);

      const totalUsers = await userModel.countDocuments({});
      const totalPages = Math.ceil(totalUsers / limit);

      const currentAdminId = req.session.currentId;

      return res.status(200).render("usersManagement", {
        val: users.length > 0,
        msg: users.length ? null : "No users found",
        user: users,
        currentPage: Number(page),
        totalPages,
        pagesToShow: 3,
        currentAdminId: currentAdminId,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).render("usersManagement", {
        val: false,
        msg: "Error loading users",
        users: null,
        currentPage: 1,
        totalPages: 1,
        pagesToShow: 3,
        currentAdminId: null,
      });
    }
  },
  async whenUsersView(req, res) {
    const { userId } = req.params;
    try {
      console.log(userId);
      const user = await userModel.findOne({ _id: userId });
      res.status(200).json({ user });
    } catch (err) {
      console.log(err);
    }
  },
  async whenUsersBan(req, res) {
    const { id, val } = req.query;
    try {
      console.log(id, val);

      const targetUser = await userModel.findById(id);
      if (!targetUser) {
        return res.status(404).json({ val: false, msg: "User not found" });
      }

      if (targetUser.role === 'admin') {
        return res.status(403).json({ val: false, msg: "Cannot ban admin users" });
      }

      if (val === "Ban") {
        await userModel.updateOne({ _id: id }, { isDeleted: true });
        res.status(200).json({ val: true, msg: "User has been banned successfully" });
      } else {
        await userModel.updateOne({ _id: id }, { isDeleted: false });
        res.status(200).json({ val: true, msg: "User has been unbanned successfully" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Error updating user status" });
    }
  },
  whenAdminLogin(req, res) {
    const { username, password } = req.body;
    try {
      if (username !== "admin") {
        return res.status(400).json({
          val: false,
          type: "username",
          msg: "Enter a valid username",
        });
      } else if (password !== "admin@123") {
        return res.status(400).json({
          val: false,
          type: "password",
          msg: "Enter a valid password",
        });
      }
      req.session.AdminloggedIn = true;
      req.session.currentId = "admin";
      return res.status(200).json({ val: true, type: null, msg: null });
    } catch (err) {
      res.status(500).json({ val: false, type: null, msg: err });
    }
  },
  async searchUsers(req, res) {
    const { key } = req.query;
    try {
      const users = await userModel.find({
        $or: [
          { username: { $regex: key, $options: "i" } },
          { email: { $regex: key, $options: "i" } },
        ],
      });
      if (!users || users.length === 0) {
        return res.status(400).json({ val: false, msg: "No users found" });
      }
      const currentAdminId = req.session.currentId;
      res.status(200).json({ val: true, users, currentAdminId });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  async searchProducts(req, res) {
    const { key } = req.query;
    try {
      const Brand = require("../models/brandModel");
      const matchedBrands = await Brand.find({ name: { $regex: key, $options: "i" } });
      const brandIds = matchedBrands.map(b => b._id);

      const products = await productModel
        .find({
          $or: [
            { name: { $regex: key, $options: "i" } },
            { brand: { $in: brandIds } },
          ],
        })
        .populate("category")
        .populate("brand");

      if (!products || products.length === 0) {
        return res.status(400).json({ val: false, msg: "No products found" });
      }
      res.status(200).json({ val: true, products });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  async searchOrders(req, res) {
    const { key } = req.query;
    try {
      const orders = await orderModel.find({
        $or: [
          { "user.username": { $regex: key, $options: "i" } },
          { orderStatus: { $regex: key, $options: "i" } },
          { paymentMethod: { $regex: key, $options: "i" } },
        ],
      });
      if (!orders) {
        return res.status(400).json({ val: false, msg: "No orders found" });
      }
      res.status(200).json({ val: true, orders });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  async searchCategories(req, res) {
    const { key } = req.query;
    try {
      const categories = await categoryModel.find({
        name: { $regex: key, $options: "i" },
      });
      if (!categories) {
        return res.status(400).json({ val: false, msg: "No categories found" });
      }
      res.status(200).json({ val: true, categories });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  async searchCoupons(req, res) {
    const { key } = req.query;
    try {
      const coupons = await couponModel.find({
        code: { $regex: key, $options: "i" },
      });
      if (!coupons) {
        return res.status(400).json({ val: false, msg: "No coupons found" });
      }
      res.status(200).json({ val: true, coupons });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
};

async function generatePDFReport(res, data) {
  const { summary, detailedOrders, topProducts, topCategories, dateRange } = data;

  const pdfDoc = new PDFDocument({
    margin: 40,
    size: 'A4'
  });

  res.setHeader("Content-Disposition", `attachment; filename=SalesReport_${dateRange.range}_${new Date().toISOString().split('T')[0]}.pdf`);
  res.setHeader("Content-Type", "application/pdf");
  pdfDoc.pipe(res);

  pdfDoc.fontSize(24).fillColor('#2563eb').text("SALES REPORT", { align: "center" });
  pdfDoc.moveDown(0.5);

  pdfDoc.fontSize(12).fillColor('#666666')
    .text("Male Fashion E-commerce", { align: "center" })
    .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: "center" });
  pdfDoc.moveDown(1);

  pdfDoc.fontSize(14).fillColor('#000000')
    .text(`Report Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, { align: "center" });
  pdfDoc.moveDown(1);

  pdfDoc.fontSize(16).fillColor('#2563eb').text("EXECUTIVE SUMMARY", { underline: true });
  pdfDoc.moveDown(0.5);

  const summaryData = [
    ['Total Revenue', `₹${summary.totalRevenue.toLocaleString()}`],
    ['Total Orders', summary.totalSales.toString()],
    ['Items Sold', summary.itemsSold.toString()],
    ['Total Discounts', `₹${(summary.totalDiscount || 0).toLocaleString()}`],
    ['Coupon Discounts', `₹${(summary.couponDiscount || 0).toLocaleString()}`],
    ['Average Order Value', `₹${summary.totalSales > 0 ? Math.round(summary.totalRevenue / summary.totalSales).toLocaleString() : '0'}`]
  ];

  summaryData.forEach(([label, value]) => {
    pdfDoc.fontSize(12).fillColor('#000000')
      .text(`${label}:`, 50, pdfDoc.y, { continued: true, width: 200 })
      .fillColor('#2563eb').text(value, { align: 'right', width: 500 });
    pdfDoc.moveDown(0.3);
  });

  pdfDoc.moveDown(1);

  if (topProducts.length > 0) {
    pdfDoc.fontSize(16).fillColor('#2563eb').text("TOP SELLING PRODUCTS", { underline: true });
    pdfDoc.moveDown(0.5);

    pdfDoc.fontSize(10).fillColor('#000000');
    const productHeaders = ['Product Name', 'Quantity', 'Revenue'];
    let yPos = pdfDoc.y;

    productHeaders.forEach((header, i) => {
      pdfDoc.text(header, 50 + (i * 180), yPos, { width: 170, align: i === 0 ? 'left' : 'center' });
    });

    pdfDoc.moveTo(50, yPos + 15).lineTo(550, yPos + 15).stroke();
    pdfDoc.moveDown(0.5);

    topProducts.slice(0, 10).forEach(product => {
      yPos = pdfDoc.y;
      pdfDoc.text(product.productName.substring(0, 30), 50, yPos, { width: 170 });
      pdfDoc.text(product.totalQuantity.toString(), 230, yPos, { width: 170, align: 'center' });
      pdfDoc.text(`₹${product.totalRevenue.toLocaleString()}`, 410, yPos, { width: 170, align: 'center' });
      pdfDoc.moveDown(0.3);
    });

    pdfDoc.moveDown(1);
  }

  if (topCategories.length > 0) {
    pdfDoc.fontSize(16).fillColor('#2563eb').text("TOP PERFORMING CATEGORIES", { underline: true });
    pdfDoc.moveDown(0.5);

    pdfDoc.fontSize(10).fillColor('#000000');
    const categoryHeaders = ['Category', 'Quantity', 'Revenue'];
    let yPos = pdfDoc.y;

    categoryHeaders.forEach((header, i) => {
      pdfDoc.text(header, 50 + (i * 180), yPos, { width: 170, align: i === 0 ? 'left' : 'center' });
    });

    pdfDoc.moveTo(50, yPos + 15).lineTo(550, yPos + 15).stroke();
    pdfDoc.moveDown(0.5);

    topCategories.forEach(category => {
      yPos = pdfDoc.y;
      pdfDoc.text(category.categoryName, 50, yPos, { width: 170 });
      pdfDoc.text(category.totalQuantity.toString(), 230, yPos, { width: 170, align: 'center' });
      pdfDoc.text(`₹${category.totalRevenue.toLocaleString()}`, 410, yPos, { width: 170, align: 'center' });
      pdfDoc.moveDown(0.3);
    });
  }

  pdfDoc.fontSize(8).fillColor('#666666')
    .text(`Report generated by Male Fashion Admin Panel - ${new Date().toLocaleString()}`,
      50, pdfDoc.page.height - 50, { align: 'center' });

  pdfDoc.end();
}

async function generateExcelReport(res, data) {
  const { summary, detailedOrders, topProducts, topCategories, dateRange } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Male Fashion Admin';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary', {
    headerFooter: { firstHeader: "Sales Report Summary" }
  });

  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 20;

  summarySheet.mergeCells('A1:B1');
  summarySheet.getCell('A1').value = 'SALES REPORT SUMMARY';
  summarySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: '2563eb' } };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  summarySheet.mergeCells('A2:B2');
  summarySheet.getCell('A2').value = `Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
  summarySheet.getCell('A2').font = { size: 12, italic: true };
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };

  const summaryRows = [
    ['Metric', 'Value'],
    ['Total Revenue', `₹${summary.totalRevenue.toLocaleString()}`],
    ['Total Orders', summary.totalSales],
    ['Items Sold', summary.itemsSold],
    ['Total Discounts', `₹${(summary.totalDiscount || 0).toLocaleString()}`],
    ['Coupon Discounts', `₹${(summary.couponDiscount || 0).toLocaleString()}`],
    ['Average Order Value', `₹${summary.totalSales > 0 ? Math.round(summary.totalRevenue / summary.totalSales).toLocaleString() : '0'}`]
  ];

  summaryRows.forEach((row, index) => {
    const rowNum = index + 4;
    summarySheet.getCell(`A${rowNum}`).value = row[0];
    summarySheet.getCell(`B${rowNum}`).value = row[1];

    if (index === 0) {
      summarySheet.getRow(rowNum).font = { bold: true };
      summarySheet.getRow(rowNum).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E3F2FD' }
      };
    }
  });

  if (topProducts.length > 0) {
    const productsSheet = workbook.addWorksheet('Top Products');
    productsSheet.columns = [
      { header: 'Product Name', key: 'name', width: 40 },
      { header: 'Quantity Sold', key: 'quantity', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15 }
    ];

    productsSheet.getRow(1).font = { bold: true };
    productsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2563eb' }
    };
    productsSheet.getRow(1).font = { color: { argb: 'FFFFFF' }, bold: true };

    topProducts.forEach(product => {
      productsSheet.addRow({
        name: product.productName,
        quantity: product.totalQuantity,
        revenue: `₹${product.totalRevenue.toLocaleString()}`
      });
    });
  }

  if (topCategories.length > 0) {
    const categoriesSheet = workbook.addWorksheet('Top Categories');
    categoriesSheet.columns = [
      { header: 'Category Name', key: 'name', width: 30 },
      { header: 'Quantity Sold', key: 'quantity', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15 }
    ];

    categoriesSheet.getRow(1).font = { bold: true };
    categoriesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2563eb' }
    };
    categoriesSheet.getRow(1).font = { color: { argb: 'FFFFFF' }, bold: true };

    topCategories.forEach(category => {
      categoriesSheet.addRow({
        name: category.categoryName,
        quantity: category.totalQuantity,
        revenue: `₹${category.totalRevenue.toLocaleString()}`
      });
    });
  }

  const ordersSheet = workbook.addWorksheet('Detailed Orders');
  ordersSheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Customer', key: 'customer', width: 20 },
    { header: 'Product', key: 'product', width: 30 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Unit Price', key: 'unitPrice', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Payment Method', key: 'payment', width: 15 }
  ];

  ordersSheet.getRow(1).font = { bold: true };
  ordersSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2563eb' }
  };
  ordersSheet.getRow(1).font = { color: { argb: 'FFFFFF' }, bold: true };

  detailedOrders.forEach(order => {
    order.items.forEach(item => {
      ordersSheet.addRow({
        orderId: order.orderId || order._id.toString().substring(0, 8),
        date: order.createdAt.toLocaleDateString(),
        customer: order.user?.username || 'Unknown',
        product: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        unitPrice: `₹${(item.totalPrice / item.quantity).toFixed(2)}`,
        total: `₹${item.totalPrice.toFixed(2)}`,
        payment: order.paymentMethod
      });
    });
  });

  res.setHeader('Content-Disposition', `attachment; filename=SalesReport_${dateRange.range}_${new Date().toISOString().split('T')[0]}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  await workbook.xlsx.write(res);
  res.end();
}
