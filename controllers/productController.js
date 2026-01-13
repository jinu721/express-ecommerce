const productModel = require("../models/productModel");
const CategoryModel = require("../models/categoryModel");
const categoryModel = require("../models/categoryModel");
const orderModel = require("../models/orderModel");
const wishlistModel = require("../models/wishlistModel");
const Variant = require("../models/variantModel");
const Offer = require("../models/offerModel");
const Brand = require("../models/brandModel");
const pricingService = require("../services/pricingService");
const stockService = require("../services/stockService");
const path = require("path");

module.exports = {
  async homeLoad(req, res) {
    try {
      const productsRaw = await productModel.find({ isDeleted: false });

      const products = await Promise.all(productsRaw.map(async (product) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);
        return {
          ...product.toObject(),
          originalPrice: offerResult.originalPrice,
          finalPrice: offerResult.finalPrice,
          discount: offerResult.discount,
          discountPercentage: offerResult.discountPercentage,
          hasOffer: offerResult.hasOffer,
          offer: offerResult.offer,
          isFestivalOffer: offerResult.offer && offerResult.offer.offerType === 'FESTIVAL'
        };
      }));

      const category = await categoryModel.find();
      const topSellingProducts = await orderModel.aggregate([
        { $match: { orderStatus: "delivered" } },
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

      const activeFestivalOffer = await pricingService.getActiveFestivalOffer();

      const hotReleases = products.slice(0, 5);
      const dealsAndOutfits = products.slice(5, 10);

      const topSellingWithOffers = await Promise.all(topSellingProducts.map(async (item) => {
        if (item.product) {
          const offerResult = await pricingService.calculateBestOffer(item.product, 1, req.session.currentId);
          return {
            ...item,
            product: {
              ...item.product,
              originalPrice: offerResult.originalPrice,
              finalPrice: offerResult.finalPrice,
              discount: offerResult.discount,
              discountPercentage: offerResult.discountPercentage,
              hasOffer: offerResult.hasOffer,
              offer: offerResult.offer,
              isFestivalOffer: offerResult.offer && offerResult.offer.offerType === 'FESTIVAL'
            }
          };
        }
        return item;
      }));

      res.render("index", {
        products: products,
        category: category,
        hotReleases: hotReleases,
        dealsAndOutfits: dealsAndOutfits,
        topSellingProducts: topSellingWithOffers,
        activeFestivalOffer: activeFestivalOffer
      });
    } catch (err) {
      console.log(err);
    }
  },
  async shopLoad(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };
      let sortBy = {};

      if (req.query.sortBy === "Popularity") {
        sortBy.popularity = -1;
      } else if (req.query.sortBy === "Average rating") {
        sortBy.rating = -1;
      } else if (req.query.sortBy === "Newness") {
        sortBy.createdAt = -1;
      } else if (req.query.sortBy === "Price: Low to High") {
        sortBy.price = 1;
      } else if (req.query.sortBy === "Price: High to Low") {
        sortBy.price = -1;
      } else {
        sortBy.createdAt = -1;
      }

      const activeCategories = await categoryModel.find({ isDeleted: false });
      const activeCategoryIds = activeCategories.map((cat) => cat._id);

      if (req.query.category && req.query.category !== "") {
        const category = activeCategories.find(
          (cat) => cat.name === req.query.category
        );
        if (category) {
          query.category = category._id;
        } else {
          query.category = null;
        }
      } else {
        query.category = { $in: activeCategoryIds };
      }

      if (req.query.brand && req.query.brand.trim() !== "") {
        const brandName = req.query.brand.trim();
        const brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${brandName}$`, 'i') } });
        if (brandDoc) {
          query.brand = brandDoc._id;
        } else {
          query.brand = null;
        }
      }

      let products = await productModel
        .find(query)
        .populate('brand')
        .populate('category')
        .skip(skip)
        .limit(limit)
        .sort(sortBy);

      const productsWithOffers = await Promise.all(products.map(async (product) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);

        return {
          ...product.toObject(),
          originalPrice: offerResult.originalPrice,
          finalPrice: offerResult.finalPrice,
          discount: offerResult.discount,
          discountPercentage: offerResult.discountPercentage,
          hasOffer: offerResult.hasOffer,
          offer: offerResult.offer,
          isPercentageOffer: offerResult.isPercentageOffer,
          isFestivalOffer: offerResult.offer && offerResult.offer.offerType === 'FESTIVAL'
        };
      }));

      let filteredProducts = productsWithOffers;
      if (req.query.price && req.query.price !== "") {
        const priceRange = req.query.price.split(" - ");
        const minPrice = parseInt(priceRange[0].replace("₹", "").trim(), 10);
        const maxPrice = priceRange[1]
          ? parseInt(priceRange[1].replace("₹", "").trim(), 10)
          : Infinity;

        filteredProducts = productsWithOffers.filter(product => {
          const priceToCheck = product.finalPrice;
          return priceToCheck >= minPrice && priceToCheck <= maxPrice;
        });
      }

      if (req.query.name === "A-Z") {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      } else if (req.query.name === "Z-A") {
        filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      }

      const activeFestivalOffer = await pricingService.getActiveFestivalOffer();

      if (req.query.api) {
        return res.status(200).json({ products: filteredProducts, category: activeCategories });
      } else {
        res.status(200).render("shop", {
          products: filteredProducts,
          category: activeCategories,
          activeFestivalOffer: activeFestivalOffer
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Side Error");
    }
  },
  async productDetailesLoad(req, res) {
    const productId = req.params.id;
    try {
      const product = await productModel.findOne({ _id: productId }).populate('brand').populate('category');

      if (!product) {
        return res.status(404).render("404");
      }

      const wishlistData = await wishlistModel.findOne({
        userId: req.session.currentId,
        "items.productId": productId,
      });

      const isAlreadyWishlist = !!wishlistData;
      let wishlistItemId = null;

      if (wishlistData) {
        const wishlistItem = wishlistData.items.find(item => item.productId.toString() === productId);
        wishlistItemId = wishlistItem ? wishlistItem._id : null;
      }

      const relatedQuery = {
        category: product.category._id,
        _id: { $ne: product._id },
        isDeleted: false
      };

      if (product.brand) {
        relatedQuery.brand = product.brand._id || product.brand;
      }

      const relatedProductsRaw = await productModel
        .find(relatedQuery)
        .populate('brand')
        .limit(4);

      const relatedProducts = await Promise.all(relatedProductsRaw.map(async (relatedProduct) => {
        const relatedOfferResult = await pricingService.calculateBestOffer(relatedProduct, 1, req.session.currentId);

        return {
          ...relatedProduct.toObject(),
          originalPrice: relatedOfferResult.originalPrice,
          finalPrice: relatedOfferResult.finalPrice,
          discount: relatedOfferResult.discount,
          discountPercentage: relatedOfferResult.discountPercentage,
          hasOffer: relatedOfferResult.hasOffer,
          offer: relatedOfferResult.offer,
          isPercentageOffer: relatedOfferResult.isPercentageOffer,
          isFestivalOffer: relatedOfferResult.offer && relatedOfferResult.offer.offerType === 'FESTIVAL'
        };
      }));

      const isBuyedUser = await orderModel.findOne({
        "items.product": product._id,
        user: req.session.currentId,
        orderStatus: "delivered",
      });

      const variants = await Variant.find({ product: productId, isActive: true });

      const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);

      const variantsForFrontend = await Promise.all(variants.map(async (v) => {
        const variantOfferResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId, v);

        return {
          ...v.toObject(),
          attributes: Object.fromEntries(v.attributes),
          attributeString: v.getAttributeString(),
          availableStock: v.availableStock,
          isInStock: v.isInStock(),
          isLowStock: v.isLowStock(),
          originalPrice: variantOfferResult.originalPrice,
          finalPrice: variantOfferResult.finalPrice,
          discount: variantOfferResult.discount,
          discountPercentage: variantOfferResult.discountPercentage,
          offer: variantOfferResult.offer,
          hasOffer: variantOfferResult.hasOffer,
          isPercentageOffer: variantOfferResult.isPercentageOffer
        };
      }));

      const activeFestivalOffer = await pricingService.getActiveFestivalOffer();

      res.status(200).render("details", {
        product,
        variants: variantsForFrontend,
        displayPrice: offerResult.originalPrice,
        discountedPrice: offerResult.hasOffer ? offerResult.finalPrice : null,
        discountPercentage: offerResult.discountPercentage,
        bestOffer: offerResult.offer,
        hasOffer: offerResult.hasOffer,
        isPercentageOffer: offerResult.isPercentageOffer,
        isFestivalOffer: offerResult.offer && offerResult.offer.offerType === 'FESTIVAL',
        activeFestivalOffer: activeFestivalOffer,
        hasVariants: variants.length > 0,
        relatedProducts,
        category: product.category,
        isBuyedUser: !!isBuyedUser,
        isAlreadyWishlist,
        wishlistItemId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server side error");
    }
  },
  async productsPageLoad(req, res) {
    const { page = 1 } = req.query;
    const limit = 7;
    const skip = (page - 1) * limit;

    try {
      const products = await productModel
        .find({})
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      const totalProducts = await productModel.countDocuments();
      const totalPages = Math.ceil(totalProducts / limit);
      const category = await categoryModel.find({});
      const brands = await Brand.find({ isActive: true }).sort({ name: 1 });

      return res.status(200).render("productsManagment", {
        val: products.length > 0,
        msg: products.length ? null : "No products found",
        products,
        category,
        brands,
        currentPage: Number(page),
        totalPages,
        pagesToShow: 3,
      });
    } catch (err) {
      console.log(err);
      res.status(500).render("productsManagment", {
        val: false,
        msg: "Error loading products",
        products: null,
        category: null,
        brands: [],
      });
    }
  },

  async getCategoriesAPI(req, res) {
    try {
      const categories = await categoryModel.find({ isDeleted: false })
        .select('_id name description')
        .sort({ name: 1 });

      res.json({ items: categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  },

  async getBrandsAPI(req, res) {
    try {
      const brands = await Brand.find({ isActive: true })
        .select('_id name description productCount')
        .sort({ name: 1 });

      res.json({ items: brands });
    } catch (error) {
      console.error('Error fetching brands:', error);
      res.status(500).json({ error: 'Failed to fetch brands' });
    }
  },
  async productsAdd(req, res) {
    try {
      let {
        name,
        description,
        category,
        tags,
        brand,
        price,
        cashOnDelivery,
        warranty,
        returnPolicy,
      } = req.body;

      const basePrice = Number(price);
      cashOnDelivery = cashOnDelivery === "true";

      let brandId = null;
      if (brand) {
        if (brand.match(/^[0-9a-fA-F]{24}$/)) {
          brandId = brand;
        } else {
          let brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${brand}$`, 'i') } });
          if (!brandDoc) {
            brandDoc = await Brand.create({ name: brand, isActive: true });
          }
          brandId = brandDoc._id;
        }
      }

      const catDoc = await CategoryModel.findOne({ $or: [{ name: category }, { _id: category }] });
      if (!catDoc) {
        return res.status(400).json({ val: false, msg: "Category not found" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ val: false, msg: "At least one image is required" });
      }
      const imagePaths = [];
      for (const key in req.files) {
        req.files[key].forEach((file) => {
          imagePaths.push(path.relative(path.join(__dirname, "..", "public"), file.path));
        });
      }

      const parsedTags = tags ? tags.split("#").map((tag) => tag.trim()).filter(Boolean) : [];

      const newProduct = await productModel.create({
        name,
        description,
        basePrice,
        price: basePrice,
        category: catDoc._id,
        brand: brandId,
        images: imagePaths,
        tags: parsedTags,
        cashOnDelivery,
        warranty,
        returnPolicy,
        colors: [],
        sizes: {}
      });

      if (brandId) {
        const count = await productModel.countDocuments({ brand: brandId, isDeleted: false });
        await Brand.findByIdAndUpdate(brandId, { productCount: count });
      }

      res.status(200).json({
        val: true,
        msg: "Product created successfully! Use the 'Variants' button to add variants and manage stock.",
        productId: newProduct._id
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Internal server error: " + err.message });
    }
  },

  async productDetails(req, res) {
    try {
      const { id } = req.params;
      const product = await productModel.findOne({ _id: id });
      if (!product) return res.status(404).json({ success: false, msg: "Product not found" });

      const variants = await Variant.find({ product: id, isActive: true });
      res.json({ success: true, product, variants });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, msg: "Server error" });
    }
  },

  async productUpdateLoad(req, res) {
    const { productId } = req.params;
    try {
      const product = await productModel.findOne({ _id: productId });
      const category = await categoryModel.find({});
      res.status(200).render("updateProducts", { product, category });
    } catch (err) {
      res.status(200).json({ product: null, category: null, msg: "Cant find product" });
      console.log(err);
    }
  },

  async productUnlist(req, res) {
    const { id, val } = req.query;
    try {
      if (val === "Unlist") {
        await productModel.updateOne({ _id: id }, { isDeleted: true });
      } else {
        await productModel.updateOne({ _id: id }, { isDeleted: false });
      }
      res.status(200).json({ val: true });
    } catch (err) {
      res.status(500).json({ val: false });
    }
  },

  async productDelete(req, res) {
    const { id } = req.params;
    try {
      const Variant = require('../models/variantModel');
      const variantCount = await Variant.countDocuments({ product: id });

      if (variantCount > 0) {
        return res.status(400).json({
          val: false,
          msg: `Cannot delete product with ${variantCount} variants. Please delete variants first.`
        });
      }

      const product = await productModel.findById(id);

      await productModel.findByIdAndDelete(id);

      if (product && product.brand) {
        const count = await productModel.countDocuments({ brand: product.brand, isDeleted: false });
        const Brand = require('../models/brandModel');
        await Brand.findByIdAndUpdate(product.brand, { productCount: count });
      }

      res.status(200).json({ val: true, msg: "Product deleted permanently" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Error deleting product" });
    }
  },

  async productStock(req, res) {
    const { id, size } = req.query;
    try {
      const variants = await Variant.find({ product: id, 'attributes.size': size, isActive: true });
      let totalStock = variants.length > 0 ? variants.reduce((sum, v) => sum + v.stock, 0) : 0;

      if (totalStock === 0) {
        const product = await productModel.findById(id);
        if (product && product.sizes && product.sizes[size]) totalStock = product.sizes[size].stock;
      }
      res.status(200).json({ val: true, stock: totalStock });
    } catch (err) {
      res.status(200).json({ val: false, stock: null });
    }
  },

  async productImageUpdate(req, res) {
    try {
      const { productIndex } = req.body;
      const { productId } = req.params;
      if (!req.file) return res.status(400).json({ val: false, msg: "No file was uploaded" });

      const filePath = path.relative(path.join(__dirname, "..", "public"), req.file.path);
      const product = await productModel.findOne({ _id: productId });
      if (!product) return res.status(404).json({ val: false, msg: "Product not found" });

      product.images[productIndex] = filePath;
      await product.save();
      return res.status(200).json({ val: true, msg: "Product image updated successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ val: false, msg: "Server error" });
    }
  },

  async productColorRemove(req, res) {
    try {
      const { productId, index } = req.params;
      const product = await productModel.findOne({ _id: productId });
      if (!product) return res.status(404).json({ val: false, msg: "Product not found" });
      product.colors.splice(index, 1);
      await product.save();
      return res.status(200).json({ val: true, msg: "Color removed successfully" });
    } catch (err) {
      return res.status(500).json({ val: false, msg: "Server error" });
    }
  },

  async productColorAddUpdate(req, res) {
    try {
      const { productId, color } = req.query;
      const product = await productModel.findOne({ _id: productId });
      if (!product) return res.status(404).json({ val: false, msg: "Product not found" });
      product.colors.push(color);
      await product.save();
      return res.status(200).json({ val: true, msg: "Color added successfully" });
    } catch (err) {
      return res.status(500).json({ val: false, msg: "Server error" });
    }
  },

  async productDataUpdate(req, res) {
    let {
      name,
      description,
      category,
      tags,
      brand,
      price,
      cashOnDelivery,
      warranty,
      returnPolicy,
      hasCustomShipping,
      shippingPrice,
    } = req.body;

    const { productId } = req.params;
    try {
      const basePrice = Number(price);
      cashOnDelivery = cashOnDelivery === true || cashOnDelivery === "true";
      hasCustomShipping = hasCustomShipping === true || hasCustomShipping === "true";
      const customShippingPrice = hasCustomShipping && shippingPrice ? Number(shippingPrice) : null;

      const parsedTags = typeof tags === 'string' ? tags.split("#").filter((tag) => tag.trim() !== "") : tags;

      const catDoc = await CategoryModel.findOne({ $or: [{ name: category }, { _id: category }] });
      const product = await productModel.findOne({ _id: productId });

      if (!product) {
        return res.status(404).json({ val: false, msg: "Product not found" });
      }

      let brandId = product.brand;
      if (brand) {
        if (brand.match(/^[0-9a-fA-F]{24}$/)) {
          brandId = brand;
        } else if (typeof brand === 'string') {
          let brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${brand}$`, 'i') } });
          if (!brandDoc) {
            brandDoc = await Brand.create({ name: brand, isActive: true });
          }
          brandId = brandDoc._id;
        }
      }

      let imagePaths = [...product.images];

      if (req.files && Object.keys(req.files).length > 0) {
        for (const key in req.files) {
          if (key.startsWith('productImage')) {
            const imageIndex = parseInt(key.replace('productImage', '')) - 1;
            if (imageIndex >= 0 && imageIndex < 4) {
              const file = req.files[key][0];
              const newImagePath = path.relative(path.join(__dirname, "..", "public"), file.path);

              imagePaths[imageIndex] = newImagePath;
            }
          }
        }
      }

      imagePaths = imagePaths.filter(img => img != null).slice(0, 4);

      const updateData = {
        name,
        description,
        category: catDoc ? catDoc._id : product.category,
        tags: parsedTags,
        brand: brandId,
        basePrice: basePrice,
        price: basePrice,
        images: imagePaths,
        cashOnDelivery,
        warranty,
        returnPolicy,
        hasCustomShipping,
      };

      if (hasCustomShipping && customShippingPrice !== null) {
        updateData.shippingPrice = customShippingPrice;
      } else if (!hasCustomShipping) {
        updateData.$unset = { shippingPrice: 1 };
      }

      await product.updateOne(updateData);

      return res.status(200).json({
        val: true,
        msg: "Product updated successfully! Variants are managed separately via the 'Variants' button."
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ val: false, msg: "Server error: " + err.message });
    }
  },

  async productStockUpdate(req, res) {
    let { size, stock } = req.body;
    stock = Number(stock);
    const { productId } = req.params;
    try {
      const variant = await Variant.findOne({ product: productId, 'attributes.size': size });
      if (variant) {
        variant.stock += stock;
        await variant.save();
        await productModel.updateOne({ _id: productId }, { $inc: { [`sizes.${size}.stock`]: stock } });
        return res.status(200).json({ val: true, msg: "Variant stock updated successfully" });
      }

      const product = await productModel.findOne({ _id: productId });
      if (!product) return res.status(404).json({ val: false, msg: "Product not found" });
      if (!product.sizes) product.sizes = {};
      if (!product.sizes[size]) product.sizes[size] = { stock: 0 };
      product.sizes[size].stock += stock;
      product.markModified("sizes");
      await product.save();
      return res.status(200).json({ val: true, msg: "Product stock updated successfully" });
    } catch (err) {
      return res.status(500).json({ val: false, msg: "Server error" });
    }
  },

  async categoryUpdateLoad(req, res) {
    try {
      const category = await categoryModel.find({});
      res.status(200).render("updateCategory", { category });
    } catch (err) {
      res.status(200).json({ category: null, msg: "Cant find product" });
    }
  },
  async categoryUpdateLoad(req, res) {
    const { categoryId } = req.params;
    console.log(categoryId);
    try {
      const category = await categoryModel.find({});
      res.status(200).render("updateCategory", { category });
    } catch (err) {
      res.status(200).json({ category: null, msg: "Cant find product" });
      console.log(err);
    }
  },
  async productsearch(req, res) {
    const { key } = req.query;
    console.log(key);
    try {
      const matchingBrands = await Brand.find({
        name: { $regex: key, $options: "i" }
      }).select('_id');

      const brandIds = matchingBrands.map(brand => brand._id);

      const searchQuery = {
        $or: [
          { name: { $regex: key, $options: "i" } },
          { tags: { $regex: key, $options: "i" } }
        ],
        isDeleted: false
      };

      if (brandIds.length > 0) {
        searchQuery.$or.push({ brand: { $in: brandIds } });
      }

      const results = await productModel
        .find(searchQuery)
        .populate('brand', 'name')
        .populate('category', 'name')
        .limit(10);

      if (!results || results.length === 0) {
        return res.status(200).json({ val: false, msg: "No items found" });
      }

      const resultsWithOffers = await Promise.all(results.map(async (product) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);

        return {
          ...product.toObject(),
          originalPrice: offerResult.originalPrice,
          finalPrice: offerResult.finalPrice,
          discount: offerResult.discount,
          discountPercentage: offerResult.discountPercentage,
          hasOffer: offerResult.hasOffer,
          offer: offerResult.offer,
          isPercentageOffer: offerResult.isPercentageOffer,
          isFestivalOffer: offerResult.offer && offerResult.offer.offerType === 'FESTIVAL'
        };
      }));

      res.status(200).json({ val: true, results: resultsWithOffers });
    } catch (err) {
      console.log(err);
      res.status(200).json({ val: false, msg: "Server error: " + err.message });
    }
  },
  async productReviewsLoad(req, res) {
    const { productId } = req.params;
    try {
      const product = await productModel.findOne({ _id: productId });
      if (!product) {
        return res.status(400).json({ val: false, msg: "No reviews found" });
      }
      res.status(200).json({
        val: true,
        reviews: product.reviews,
        currentUserId: req.session.currentId,
      });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ val: false, msg: "An error occurred while fetching reviews" });
    }
  },

  async productReviewsAdd(req, res) {
    const { productId } = req.params;
    const { comment, rating } = req.body;
    try {
      console.log(comment, rating);
      if (!productId) {
        return res
          .status(400)
          .json({ val: false, msg: "Product id not valid" });
      }
      await productModel.findByIdAndUpdate(
        productId,
        {
          $push: {
            reviews: {
              user: req.session.currentId,
              username: req.session.currentUsername,
              comment,
              rating,
            },
          },
        },
        { new: true }
      );
      res.status(200).json({ val: true });
    } catch (err) {
      console.log(err);
      res.status(500), json({ val: false, msg: err });
    }
  },
  async productReviewsDelete(req, res) {
    const { reviewId } = req.params;

    try {
      if (!req.session.currentId) {
        return res.status(400).json({ val: false, msg: "Please login first" });
      }
      if (!reviewId) {
        return res
          .status(400)
          .json({ val: false, msg: "Review ID not provided or invalid" });
      }
      const result = await productModel.updateOne(
        { "reviews._id": reviewId, "reviews.user": req.session.currentId },
        { $pull: { reviews: { _id: reviewId } } }
      );

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ val: false, msg: "Review not found or user not authorized" });
      }

      res.status(200).json({ val: true, msg: "Review deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        val: false,
        msg: "An error occurred while deleting the review",
      });
    }
  },

  async getProductPopupData(req, res) {
    const { id } = req.params;

    const getColorHex = (colorName) => {
      const colorMap = {
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#008000',
        'black': '#000000',
        'white': '#ffffff',
        'yellow': '#ffff00',
        'pink': '#ffc0cb',
        'purple': '#800080',
        'orange': '#ffa500',
        'brown': '#a52a2a',
        'gray': '#808080',
        'grey': '#808080'
      };

      return colorMap[colorName.toLowerCase()] || '#cccccc';
    };

    try {
      const product = await productModel.findById(id)
        .populate('brand', 'name')
        .populate('category', 'name');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);

      const productData = {
        ...product.toObject(),
        originalPrice: offerResult.originalPrice,
        finalPrice: offerResult.finalPrice,
        discount: offerResult.discount,
        discountPercentage: offerResult.discountPercentage,
        hasOffer: offerResult.hasOffer,
        offer: offerResult.offer
      };

      const variants = await Variant.find({ product: id, isActive: true });

      console.log(`Found ${variants.length} variants for product ${id}`);

      let attributes = [];
      if (variants.length > 0) {
        const attributeMap = new Map();

        variants.forEach(variant => {
          if (variant.attributes) {
            const attrs = variant.attributes instanceof Map ?
              Object.fromEntries(variant.attributes) :
              variant.attributes;

            Object.keys(attrs).forEach(key => {
              if (!attributeMap.has(key)) {
                attributeMap.set(key, new Set());
              }
              attributeMap.get(key).add(attrs[key]);
            });
          }
        });

        attributes = Array.from(attributeMap.entries()).map(([key, values]) => ({
          name: key,
          displayName: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
          type: key.toLowerCase() === 'color' ? 'COLOR_PICKER' : 'DROPDOWN',
          isRequired: true,
          values: Array.from(values).map(value => ({
            value: value,
            displayValue: value,
            hexCode: key.toLowerCase() === 'color' ? getColorHex(value) : null
          }))
        }));

        console.log('Extracted attributes:', attributes);
      }

      const formattedVariants = await Promise.all(variants.map(async (v) => {
        const attrs = v.attributes instanceof Map ?
          Object.fromEntries(v.attributes) :
          v.attributes || {};

        const variantOfferResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId, v);

        return {
          ...v.toObject(),
          attributes: attrs,
          availableStock: Math.max(0, v.stock - (v.reserved || 0)),
          originalPrice: variantOfferResult.originalPrice,
          finalPrice: variantOfferResult.finalPrice,
          discount: variantOfferResult.discount,
          discountPercentage: variantOfferResult.discountPercentage,
          hasOffer: variantOfferResult.hasOffer,
          offer: variantOfferResult.offer,
          isPercentageOffer: variantOfferResult.isPercentageOffer
        };
      }));

      console.log('Formatted variants with pricing:', formattedVariants.length);

      res.json({
        success: true,
        product: productData,
        variants: formattedVariants,
        attributes
      });

    } catch (error) {
      console.error('Error fetching product popup data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load product data'
      });
    }
  },
};
