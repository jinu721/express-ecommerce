const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const orderModel = require("../models/orderModel");
const visitorModel = require("../models/visitorModel");
const path = require("path");
let pdf = require("html-pdf");
const ejs = require("ejs");
const moment = require("moment");

module.exports = {
  // ~~~ Dashboard Load ~~~
  // Purpose: Renders the dashboard page.
  // Response: Loads the dashboard view.
  whenDashboardLoad(req, res) {
    res.render("dashboard");
  },
  // ~~~ Dashboard Data ~~~
  // Purpose: Retrieves and returns dashboard data based on date range.
  // Response: Returns dashboard data including total users, products, orders, etc.
  async dashboardData(req, res) {
    const { range, startDate, endDate } = req.query;
    try {
      console.log(range, startDate, endDate);

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
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        return res.status(400).json({ val: false, msg: "Invalid range." });
      }

      console.log(start);

      const dateFilter = { createdAt: { $gte: start, $lt: end } };

      const [users, products, orders, sales, pendingMoney, categoryData] =
        await Promise.all([
          userModel.find({}),
          productModel.find({}, "_id"),
          orderModel.find(
            {
              ...dateFilter,
              orderStatus: { $not: { $in: ["cancelled", "delivered"] } },
            },
            "_id"
          ),
          orderModel.aggregate([
            { $match: { ...dateFilter, paymentStatus: "paid" } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                count: { $sum: 1 },
              },
            },
          ]),
          orderModel.aggregate([
            {
              $match: {
                ...dateFilter,
                paymentMethod: "cash_on_delivery",
                paymentStatus: "pending",
              },
            },
            {
              $group: {
                _id: null,
                totalPendingMoney: { $sum: "$totalAmount" },
                count: { $sum: 1 },
              },
            },
          ]),
          categoryModel.aggregate([
            {
              $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "category",
                as: "products",
              },
            },
            {
              $addFields: {
                productCount: { $size: "$products" },
              },
            },
            {
              $project: {
                name: 1,
                image: 1,
                productCount: 1,
                isDeleted: 1,
              },
            },
          ]),
        ]);

      const totalSales = sales[0]?.count || 0;
      const totalRevenue = sales[0]?.totalRevenue || 0;
      const totalPendingMoney = pendingMoney[0]?.totalPendingMoney || 0;
      const topSellingProducts = await orderModel.aggregate([
        { $match: { ...dateFilter, orderStatus: "delivered" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $project: {
            product: { $arrayElemAt: ["$product", 0] },
            totalQuantity: 1,
          },
        },
      ]);

      const topSellingCategories = await orderModel.aggregate([
        { $match: { ...dateFilter, orderStatus: "delivered" } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.category",
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        { $unwind: "$categoryDetails" },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $project: {
            category: "$categoryDetails.name",
            totalQuantity: 1,
          },
        },
      ]);

      const topSellingBrands = await orderModel.aggregate([
        { $match: { ...dateFilter, orderStatus: "delivered" } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.brand",
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $project: {
            brand: "$_id",
            totalQuantity: 1,
          },
        },
      ]);

      const totalDiscounts = await orderModel.aggregate([
        { $match: { ...dateFilter, "coupon.code": { $exists: true } } },
        {
          $group: {
            _id: null,
            totalDiscount: { $sum: "$coupon.discountApplied" },
          },
        },
      ]);

      const vistors = await visitorModel.find({});

      const dashboard = {
        usersCount: users.length,
        productsCount: products.length,
        ordersCount: orders.length,
        totalSalesCount: totalSales,
        totalRevenue,
        totalPendingMoney,
        categories: categoryData,
        totalDiscounts: totalDiscounts[0]?.totalDiscount || 0,
        topSellingProducts,
        topSellingCategories,
        topSellingBrands,
        vistors,
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
  // ~~~ Download Report ~~~
  // Purpose: Generate and download sales report in PDF based on the selected date range.
  // Response: Returns PDF file for download.
  async downloadReport(req, res) {
    console.log("Processing downloadReport...");

    try {
      const { startDate, endDate, range } = req.body;

      let start, end;
      const today = new Date();

      if (range === "daily") {
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
      } else if (range === "weekly") {
        const startOfWeek = new Date(
          today.setDate(today.getDate() - today.getDay())
        );
        start = new Date(startOfWeek.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
      } else if (range === "monthly") {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
      } else if (range === "custom") {
        if (!startDate || !endDate) {
          return res
            .status(400)
            .json({
              msg: "Start and end dates are required for custom range.",
            });
        }
        start = new Date(startDate);
        end = new Date(endDate);
      }

      console.log(range);
      console.log(startDate, endDate);
      console.log(start, end);

      const salesDataResult = await orderModel.aggregate([
        {
          $match: {
            orderStatus: "delivered",
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalSales: { $sum: 1 },
            itemsSold: {
              $sum: {
                $sum: "$items.quantity",
              },
            },
          },
        },
      ]);

      const salesData = salesDataResult[0] || {
        totalRevenue: 0,
        totalSales: 0,
        itemsSold: 0,
      };

      const detailedOrders = await orderModel
        .find({
          orderStatus: "delivered",
          createdAt: { $gte: start, $lte: end },
        })
        .populate("items.product", "name price");

      const totalDiscounts = await orderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            "coupon.code": { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            totalDiscount: { $sum: "$coupon.discountApplied" },
          },
        },
      ]);

      const pdfDoc = new PDFDocument({ margin: 30 });
      res.setHeader('Content-Disposition', `attachment; filename=SalesReport.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      pdfDoc.pipe(res);
  
      pdfDoc.fontSize(20).text('Sales Report', { align: 'center' }).moveDown();
      pdfDoc.fontSize(12).text(`Start Date: ${start.toISOString().split("T")[0]}`, { align: 'left' });
      pdfDoc.text(`End Date: ${end.toISOString().split("T")[0]}`, { align: 'left' });
      pdfDoc.text(`Overall Discount: ₹${totalDiscounts.toFixed(2)}`, { align: 'left' });
      pdfDoc.moveDown();
      pdfDoc.text('Summary:', { underline: true }).moveDown();
      pdfDoc.text(`Total Revenue: ₹${salesData.totalRevenue.toFixed(2)}`, { align: 'left' });
      pdfDoc.text(`Total Sales: ${salesData.totalSales}`, { align: 'left' });
      pdfDoc.text(`Items Sold: ${salesData.itemsSold}`, { align: 'left' });
      pdfDoc.moveDown();
      pdfDoc.text('Detailed Orders:', { underline: true }).moveDown();
      pdfDoc.text(
        `Product Name`.padEnd(30) +
        `Quantity`.padEnd(10) +
        `Price`.padEnd(15),
        { align: 'left' }
      );
      
      detailedOrders.forEach(order => {
        order.items.forEach(item => {
          const productName = item.product.name.padEnd(30);
          const quantity = String(item.quantity).padEnd(10);
          const price = `₹${item.product.price.toFixed(2)}`;
          
          pdfDoc.text(`${productName}${quantity}${price}`);
        });
      });
  
      pdfDoc.end();
    } catch (error) {
      console.error("Error in downloadReport:", error);
      res
        .status(500)
        .json({ msg: "An error occurred while generating the report." });
    }
  },
  // ~~~ Admin Login Page Load ~~~
  // Purpose: Renders the login page when the admin login route is accessed.
  // Response: Renders the "login" view.
  whenAdminLoginLoad(req, res) {
    res.render("login");
  },
  // ~~~ Load Users with Pagination ~~~
// Purpose: Fetch and display users with pagination (7 users per page).
// Response: Renders the "usersManagement" page with user data.
  async whenUsersLoad(req, res) {
    const { page = 1 } = req.query;
    const limit = 7;
    const skip = (page - 1) * limit;
    try {
      const users = await userModel
        .find({ role: "user" })
        .skip(skip)
        .limit(limit);
      const totalUsers = await userModel.countDocuments();
      const totalPages = Math.ceil(totalUsers / limit);
      return res.status(200).render("usersManagement", {
        val: users.length > 0,
        msg: users.length ? null : "No users found",
        user: users,
        currentPage: Number(page),
        totalPages,
        pagesToShow: 3,
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
      });
    }
  },
  // ~~~ View Specific User ~~~
// Purpose: Fetch and display a specific user based on the userId in the URL parameters.
// Response: Returns the user data in JSON format.
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
  // ~~~ Ban/Unban User ~~~
// Purpose: Ban or unban a user based on the id and value from the query parameters.
// Response: Returns a success message if the operation was successful.
  async whenUsersBan(req, res) {
    const { id, val } = req.query;
    try {
      console.log(id, val);
      if (val === "Ban") {
        await userModel.updateOne({ _id: id }, { isDeleted: true });
      } else {
        await userModel.updateOne({ _id: id }, { isDeleted: false });
      }
      res.status(200).json({ val: true });
    } catch (err) {
      res.status(500).json({ val: false });
    }
  },
  // ~~~ Admin Login ~~~
// Purpose: Handle admin login. Validates username and password.
// Response: Returns success or error message based on the login credentials.
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
      return res.status(200).json({ val: true, type: null, msg: null });
    } catch (err) {
      res.status(500).json({ val: false, type: null, msg: err });
    }
  },
  // ~~~ Search Users ~~~
// Purpose: Search for users by username or email based on a query string.
// Response: Returns a list of users matching the search criteria.
  async searchUsers(req, res) {
    const { key } = req.query;
    try {
      const users = await userModel.find({
        $or: [
          { username: { $regex: key, $options: "i" } },
          { email: { $regex: key, $options: "i" } },
        ],
      });
      if (!users) {
        return res.status(400).json({ val: false, msg: "No users found" });
      }
      console.log(users);
      res.status(200).json({ val: true, users });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  // ~~~ Search Products ~~~
// Purpose: Search for products by name or brand based on a query string.
// Response: Returns a list of products matching the search criteria.
  async searchProducts(req, res) {
    const { key } = req.query;
    try {
      const products = await productModel
        .find({
          $or: [
            { name: { $regex: key, $options: "i" } },
            { brand: { $regex: key, $options: "i" } },
          ],
        })
        .populate("category");
      if (!products) {
        return res.status(400).json({ val: false, msg: "No products found" });
      }
      res.status(200).json({ val: true, products });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  // ~~~ Search Orders ~~~
// Purpose: Search for orders by username, order status, or payment method based on a query string.
// Response: Returns a list of orders matching the search criteria.
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
  // ~~~ Search Categories ~~~
// Purpose: Search for categories by name based on a query string.
// Response: Returns a list of categories matching the search criteria.
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
  // ~~~ Search Coupons ~~~
// Purpose: Search for coupons by code based on a query string.
// Response: Returns a list of coupons matching the search criteria.
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
