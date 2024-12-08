const categoryModel = require("../models/categoryModel");
const productModel = require("../models/productModel");
const path = require("path");

module.exports = {
  // ~~~ Category Load Admin ~~~
  // Purpose: Loads the categories for the admin panel with pagination and product count.
  // Response: Renders the category management page showing categories with pagination and product count.
  async categoryLoadAdmin(req, res) {
    const { page = 1 } = req.query;
    const limit = 7;
    const skip = (page - 1) * limit;

    try {
      const totalCategories = await categoryModel.countDocuments();
      const totalPages = Math.ceil(totalCategories / limit);
      const categories = await categoryModel.aggregate([
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
        { $skip: skip },
        { $limit: limit },
      ]);
      console.log(categories);

      return res.status(200).render("categoryManagement", {
        category: categories,
        currentPage: Number(page),
        totalPages,
        pagesToShow: 3,
      });
    } catch (err) {
      console.log(err);
      res.status(500).render("categoryManagement", {
        category: null,
        msg: "Error loading categories",
      });
    }
  },
  // ~~~ Category Add ~~~
  // Purpose: Adds a new category to the database with an image.
  // Response: Responds with success or failure based on whether the category already exists.
  async categoryAdd(req, res) {
    const { categoryName } = req.body;
    try {
      const imagePath = path.relative(
        path.join(__dirname, "..", "public"),
        req.file.path
      );
      console.log(imagePath);
      const category = await categoryModel.findOne({ name: categoryName });
      if (category) {
        return res
          .status(200)
          .json({ val: false, msg: "Category already exists" });
      }
      await categoryModel.create({ name: categoryName, image: imagePath });
      res.status(200).json({ val: true, msg: "Category added successfully" });
    } catch (err) {
      console.log(err);
      res.status(200).json({ val: false, msg: "Category add failed" });
    }
  },
  // ~~~ Category Load ~~~
  // Purpose: Loads the products under a category with pagination.
  // Response: Renders the category page with products or sends an API response if requested.
  async categoryLoad(req, res) {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
      const products = await productModel
        .find({ category: categoryId })
        .skip(skip)
        .limit(limit);
      const category = await categoryModel.findOne({ _id: categoryId });
      if (req.query.api === "true") {
        return res.status(200).json({ products, category });
      } else {
        return res.status(200).render("category", { products, category });
      }
    } catch (err) {
      res.status(500).render("category", { products: null, category: null });
    }
  },
  // ~~~ Category Unlist ~~~
  // Purpose: Marks a category as deleted or restores it.
  // Response: Responds with success if the category is successfully updated.
  async categoryUnlist(req, res) {
    const { id, val } = req.query;
    console.log(id);
    console.log(val);
    try {
      if (val === "Unlist") {
        await categoryModel.updateOne({ _id: id }, { isDeleted: true });
      } else {
        await categoryModel.updateOne({ _id: id }, { isDeleted: false });
      }
      res.status(200).json({ val: true });
    } catch (err) {
      res.status(500).json({ val: false });
    }
  },
  // ~~~ Category Update Load ~~~
  // Purpose: Loads the category details for updating.
  // Response: Renders the update category page with category data.

  async categoryUpdateload(req, res) {
    const { categoryId } = req.params;
    const category = await categoryModel.findOne({ _id: categoryId });
    res.render("updateCategory", { category });
  },
  // ~~~ Category Image Update ~~~
  // Purpose: Updates the image of a category.
  // Response: Responds with success or failure based on whether the update was successful.
  async categoryImageUpdate(req, res) {
    try {
      const { categoryId } = req.params;
      if (!req.file) {
        return res
          .status(400)
          .json({ val: false, msg: "No file was uploaded" });
      }
      const filePath = path.relative(
        path.join(__dirname, "..", "public"),
        req.file.path
      );
      console.log("Category ID:", categoryId);
      console.log("File Path:", filePath);
      const category = await categoryModel.findOne({ _id: categoryId });
      if (!category) {
        return res.status(404).json({ val: false, msg: "Category not found" });
      }
      category.image = filePath;
      await category.save();
      return res
        .status(200)
        .json({ val: true, msg: "Category image updated successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ val: false, msg: "Server error" });
    }
  },
  // ~~~ Category Update ~~~
  // Purpose: Updates the name of a category.
  // Response: Responds with success or failure based on whether the update was successful.
  async categoryUpdate(req, res) {
    const { categoryId } = req.params;
    const { categoryName } = req.body;

    try {
      const category = await categoryModel.findOne({ _id: categoryId });
      if (!category) {
        return res.status(404).json({ val: false, msg: "Category not found" });
      }
      category.name = categoryName;
      await category.save();
      return res
        .status(200)
        .json({ val: true, msg: "Category updated successfully" });
    } catch (err) {
      console.error("Error during category update:", err);
      return res.status(500).json({ val: false, msg: "Server error" });
    }
  },
  // ~~~ Category Offer Add ~~~
  // Purpose: Adds or updates an offer for a category and updates the products in that category.
  // Response: Responds with success or failure based on whether the operation was successful.
  async categoryOfferAdd(req, res) {
    try {
      const { categoryId, offerValue } = req.body;
      console.log(categoryId, offerValue);

      if (!categoryId || !offerValue) {
        return res
          .status(400)
          .json({
            val: false,
            msg: "Category ID and offer value are required.",
          });
      }

      let offerAmount;
      let isPercentage = false;
      if (/%/.test(offerValue)) {
        isPercentage = true;
        offerAmount = parseFloat(offerValue.replace("%", ""));
      } else {
        offerAmount = parseFloat(offerValue);
      }

      if (isNaN(offerAmount) || offerAmount <= 0) {
        return res
          .status(400)
          .json({ val: false, msg: "Invalid offer amount." });
      }

      const category = await categoryModel.findById(categoryId);
      if (!category) {
        return res.status(404).json({ val: false, msg: "Category not found." });
      }
      const products = await productModel.find({ category: categoryId });
      if (products.length === 0) {
        return res
          .status(404)
          .json({ val: false, msg: "No products found under this category." });
      }
      for (const product of products) {
        if (isPercentage) {
          product.offerPrice =
            product.price - (product.price * offerAmount) / 100;
        } else {
          product.offerPrice = product.price - offerAmount;
        }

        product.offerPrice = Math.max(product.offerPrice, 0);

        await product.save();
      }



      await category.save();

      res.status(200).json({ val: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ val: false, msg: "Server error." });
    }
  },
};
