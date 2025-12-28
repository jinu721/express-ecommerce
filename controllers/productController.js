const productModel = require("../models/productModel");
const CategoryModel = require("../models/categoryModel");
const categoryModel = require("../models/categoryModel");
const orderModel = require("../models/orderModel");
const wishlistModel = require("../models/wishlistModel");
// New Refactored Models & Services
const Variant = require("../models/variantModel");
const Offer = require("../models/offerModel");
const Brand = require("../models/brandModel");
const pricingService = require("../services/pricingService");
const stockService = require("../services/stockService");
const path = require("path");

module.exports = {
  // ~~~ Home Page Load ~~~
  // Purpose: Loads the homepage with products, categories, top-selling products, and other key sections.
  // Response: Renders the homepage with various product categories and top-selling products.
  async homeLoad(req, res) {
    try {
      const products = await productModel.find({ isDeleted: false });

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

      // Calculate offer prices for hot releases and deals
      const hotReleasesWithOffers = await Promise.all(products.slice(0, 5).map(async (product) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);
        return {
          ...product.toObject(),
          originalPrice: offerResult.originalPrice,
          finalPrice: offerResult.finalPrice,
          discount: offerResult.discount,
          discountPercentage: offerResult.discount > 0 ? Math.round((offerResult.discount / offerResult.originalPrice) * 100) : 0,
          hasOffer: offerResult.offer !== null
        };
      }));

      const dealsAndOutfitsWithOffers = await Promise.all(products.slice(5, 10).map(async (product) => {
        const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);
        return {
          ...product.toObject(),
          originalPrice: offerResult.originalPrice,
          finalPrice: offerResult.finalPrice,
          discount: offerResult.discount,
          discountPercentage: offerResult.discount > 0 ? Math.round((offerResult.discount / offerResult.originalPrice) * 100) : 0,
          hasOffer: offerResult.offer !== null
        };
      }));

      // Calculate offer prices for top selling products
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
              discountPercentage: offerResult.discount > 0 ? Math.round((offerResult.discount / offerResult.originalPrice) * 100) : 0,
              hasOffer: offerResult.offer !== null
            }
          };
        }
        return item;
      }));

      res.render("index", {
        products: products,
        category: category,
        hotReleases: hotReleasesWithOffers,
        dealsAndOutfits: dealsAndOutfitsWithOffers,
        topSellingProducts: topSellingWithOffers,
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
        sortBy.price = 1; // Uses basePrice/price
      } else if (req.query.sortBy === "Price: High to Low") {
        sortBy.price = -1;
      } else {
        sortBy.createdAt = -1;
      }

      const activeCategories = await categoryModel.find({ isDeleted: false });
      const activeCategoryIds = activeCategories.map((cat) => cat._id);

      // Category Filter
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

      // Brand Filter (New)
      if (req.query.brand && req.query.brand.trim() !== "") {
         const brandName = req.query.brand.trim();
         const brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${brandName}$`, 'i') } });
         if (brandDoc) {
             query.brand = brandDoc._id;
         } else {
             query.brand = null; // No matching brand found
         }
      }

      // Fetch products
      let products = await productModel
        .find(query)
        .populate('brand') // Populate for display
        .populate('category')
        .skip(skip)
        .limit(limit)
        .sort(sortBy);

      // Calculate offer prices for each product (SIMPLIFIED)
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
          isPercentageOffer: offerResult.isPercentageOffer
        };
      }));

      // Apply price filter AFTER calculating offers
      let filteredProducts = productsWithOffers;
      if (req.query.price && req.query.price !== "") {
        const priceRange = req.query.price.split(" - ");
        const minPrice = parseInt(priceRange[0].replace("₹", "").trim(), 10);
        const maxPrice = priceRange[1]
          ? parseInt(priceRange[1].replace("₹", "").trim(), 10)
          : Infinity;
        
        // Filter by final price (after offers)
        filteredProducts = productsWithOffers.filter(product => {
          const priceToCheck = product.finalPrice;
          return priceToCheck >= minPrice && priceToCheck <= maxPrice;
        });
      }

      // Alphabetical sorting if specified
      if (req.query.name === "A-Z") {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      } else if (req.query.name === "Z-A") {
        filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      }

      // Send active categories and filtered products
      if (req.query.api) {
        return res.status(200).json({ products: filteredProducts, category: activeCategories });
      } else {
        res.status(200).render("shop", { products: filteredProducts, category: activeCategories });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Side Error");
    }
  },
  // ~~~ Product Details Load ~~~
  // Purpose: Loads the details page of a specific product based on the product ID.
  // Response: Renders the product details page with information such as product details, related products, and wishlist status.
  // ~~~ Product Details Load (REDESIGNED) ~~~
  async productDetailesLoad(req, res) {
    const productId = req.params.id;
    try {
      // Populate brand to get name if needed, though product.brand is now ObjectId
      const product = await productModel.findOne({ _id: productId }).populate('brand').populate('category');
      
      if (!product) {
        return res.status(404).render("404");
      }

      const isAlreadyWishlist = await wishlistModel.findOne({
        userId: req.session.currentId,
        "items.productId": productId,
      });

      // Find related products (handle brand being ObjectId or String for safety)
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

      // Calculate offers for related products
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
          isPercentageOffer: relatedOfferResult.isPercentageOffer
        };
      }));

      const isBuyedUser = await orderModel.findOne({
        "items.product": product._id,
        user: req.session.currentId,
        orderStatus: "delivered",
      });

      // Fetch Variants
      const variants = await Variant.find({ product: productId, isActive: true });
      
      // Calculate base product pricing (SIMPLIFIED)
      const offerResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId);
      
      // Convert variants for frontend with their own pricing
      const variantsForFrontend = await Promise.all(variants.map(async (v) => {
        const variantOfferResult = await pricingService.calculateBestOffer(product, 1, req.session.currentId, v);
        
        return {
          ...v.toObject(),
          attributes: Object.fromEntries(v.attributes),
          attributeString: v.getAttributeString(),
          availableStock: v.availableStock,
          isInStock: v.isInStock(),
          isLowStock: v.isLowStock(),
          // Add pricing information
          originalPrice: variantOfferResult.originalPrice,
          finalPrice: variantOfferResult.finalPrice,
          discount: variantOfferResult.discount,
          discountPercentage: variantOfferResult.discountPercentage,
          offer: variantOfferResult.offer,
          hasOffer: variantOfferResult.hasOffer,
          isPercentageOffer: variantOfferResult.isPercentageOffer
        };
      }));
      
      res.status(200).render("details", {
        product,
        variants: variantsForFrontend,
        displayPrice: offerResult.originalPrice,
        discountedPrice: offerResult.hasOffer ? offerResult.finalPrice : null,
        discountPercentage: offerResult.discountPercentage,
        bestOffer: offerResult.offer,
        hasOffer: offerResult.hasOffer,
        isPercentageOffer: offerResult.isPercentageOffer,
        hasVariants: variants.length > 0,
        relatedProducts,
        category: product.category,
        isBuyedUser: !!isBuyedUser,
        isAlreadyWishlist,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server side error");
    }
  },
  // ~~~ Product Management Page Load ~~~
  // Purpose: Loads the page for managing products with pagination and filtering.
  // Response: Renders the product management page with products, categories, and pagination details.
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
  // ~~~ Add Product ~~~
  // Purpose: Allows adding a new product to the database with various details like name, price, images, etc.
  // Response: Returns a success message if the product is successfully added, or an error message if failed.
  // ~~~ Add Product (REFACTORED - Clean Product Only) ~~~
  async productsAdd(req, res) {
    try {
      let {
        name,
        description,
        category,
        tags,
        brand, // String name from form
        price,
        cashOnDelivery,
        warranty,
        returnPolicy,
      } = req.body;

      const basePrice = Number(price);
      cashOnDelivery = cashOnDelivery === "true";

      // 1. Process Brand
      let brandId = null;
      if (brand) {
        // If brand is an ObjectId string, use it directly
        if (brand.match(/^[0-9a-fA-F]{24}$/)) {
          brandId = brand;
        } else {
          // If brand is a name, find or create it
          let brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${brand}$`, 'i') } });
          if (!brandDoc) {
            brandDoc = await Brand.create({ name: brand, isActive: true });
          }
          brandId = brandDoc._id;
        }
      }

      // 2. Process Category
      const catDoc = await CategoryModel.findOne({ $or: [{ name: category }, { _id: category }] });
      if (!catDoc) {
        return res.status(400).json({ val: false, msg: "Category not found" });
      }

      // 3. Process Images
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ val: false, msg: "At least one image is required" });
      }
      const imagePaths = [];
      for (const key in req.files) {
        req.files[key].forEach((file) => {
          imagePaths.push(path.relative(path.join(__dirname, "..", "public"), file.path));
        });
      }

      // 4. Create Product (Clean - No Variants)
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
        colors: [], // Legacy: Empty
        sizes: {}   // Legacy: Empty
      });

      // Update Brand count
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

  // ~~~ Product Details API (For Modal) ~~~
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

  // ~~~ Load Product Update Page ~~~
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

  // ~~~ Unlist or Relist Product ~~~
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

  // ~~~ Permanent Delete Product ~~~
  async productDelete(req, res) {
    const { id } = req.params;
    try {
      // Check if product has variants
      const Variant = require('../models/variantModel');
      const variantCount = await Variant.countDocuments({ product: id });
      
      if (variantCount > 0) {
        return res.status(400).json({ 
          val: false, 
          msg: `Cannot delete product with ${variantCount} variants. Please delete variants first.` 
        });
      }

      // Get product info before deletion for brand count update
      const product = await productModel.findById(id);
      
      // Delete the product permanently
      await productModel.findByIdAndDelete(id);
      
      // Update brand product count
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

  // ~~~ Get Product Stock for Specific Size ~~~
  async productStock(req, res) {
    const { id, size } = req.query;
    try {
      const variants = await Variant.find({ product: id, 'attributes.size': size, isActive: true });
      let totalStock = variants.length > 0 ? variants.reduce((sum, v) => sum + v.stock, 0) : 0;
      
      if (totalStock === 0) {
         // Fallback
         const product = await productModel.findById(id);
         if (product && product.sizes && product.sizes[size]) totalStock = product.sizes[size].stock;
      }
      res.status(200).json({ val: true, stock: totalStock });
    } catch (err) {
      res.status(200).json({ val: false, stock: null });
    }
  },

  // ~~~ Update Product Image ~~~
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

  // ~~~ Remove Product Color ~~~
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

  // ~~~ Add or Update Product Color ~~~
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

  // ~~~ Update Product Data (Clean Product Only) ~~~
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
    } = req.body;
    
    const { productId } = req.params;
    try {
      const basePrice = Number(price);
      cashOnDelivery = cashOnDelivery === true || cashOnDelivery === "true";
      
      const parsedTags = typeof tags === 'string' ? tags.split("#").filter((tag) => tag.trim() !== "") : tags;
      
      const catDoc = await CategoryModel.findOne({ $or: [{ name: category }, { _id: category }] });
      const product = await productModel.findOne({ _id: productId });
      
      if (!product) {
        return res.status(404).json({ val: false, msg: "Product not found" });
      }

      // Process Brand
      let brandId = product.brand; // Keep existing if no change
      if (brand) {
        // If brand is an ObjectId string, use it directly
        if (brand.match(/^[0-9a-fA-F]{24}$/)) {
          brandId = brand;
        } else if (typeof brand === 'string') {
          // If brand is a name, find or create it
          let brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${brand}$`, 'i') } });
          if (!brandDoc) {
            brandDoc = await Brand.create({ name: brand, isActive: true });
          }
          brandId = brandDoc._id;
        }
      }

      // Process Images
      let imagePaths = [...product.images]; // Start with existing images
      
      // Handle new uploaded images
      if (req.files && Object.keys(req.files).length > 0) {
        const newImagePaths = [];
        for (const key in req.files) {
          if (key.startsWith('productImage')) {
            req.files[key].forEach((file) => {
              newImagePaths.push(path.relative(path.join(__dirname, "..", "public"), file.path));
            });
          }
        }
        
        // If new images uploaded, replace all images
        if (newImagePaths.length > 0) {
          imagePaths = newImagePaths;
        }
      }
      
      // Handle existing images (from form data)
      const existingImages = [];
      for (let i = 1; i <= 4; i++) {
        const existingKey = `existingproductImage${i}`;
        if (req.body[existingKey]) {
          // Clean the URL path
          let imagePath = req.body[existingKey];
          if (imagePath.startsWith('/')) {
            imagePath = imagePath.substring(1);
          }
          existingImages.push(imagePath);
        }
      }
      
      // If we have existing images from the form, use them (preserves order)
      if (existingImages.length > 0) {
        imagePaths = existingImages;
      }
      
      // Update Product Fields
      await product.updateOne({
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
      });

      return res.status(200).json({ 
        val: true, 
        msg: "Product updated successfully! Variants are managed separately via the 'Variants' button." 
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ val: false, msg: "Server error: " + err.message });
    }
  },

  // ~~~ Update Product Stock for Specific Size ~~~
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

  // ~~~ Load Category Update Page ~~~
  async categoryUpdateLoad(req, res) {
    try {
      const category = await categoryModel.find({});
      res.status(200).render("updateCategory", { category });
    } catch (err) {
      res.status(200).json({ category: null, msg: "Cant find product" });
    }
  },

  // ~~~ Load Category Update Page ~~~
  // Purpose: Loads the page to update the product categories.
  // Response: Renders the "updateCategory" page with the existing categories to allow admin updates.
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
  // ~~~ Search Products ~~~
  // Purpose: Searches products based on the provided keyword from the query. It checks the name, tags, and brand for matching results.
  // Response: Returns the matched products or an error message if no items are found.
  async productsearch(req, res) {
    const { key } = req.query;
    console.log(key);
    try {
      // First, find brands that match the search key
      const matchingBrands = await Brand.find({
        name: { $regex: key, $options: "i" }
      }).select('_id');
      
      const brandIds = matchingBrands.map(brand => brand._id);
      
      // Build search query
      const searchQuery = {
        $or: [
          { name: { $regex: key, $options: "i" } },
          { tags: { $regex: key, $options: "i" } }
        ],
        isDeleted: false
      };
      
      // Add brand search if we found matching brands
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
      
      // Calculate offers for search results
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
          isPercentageOffer: offerResult.isPercentageOffer
        };
      }));
      
      res.status(200).json({ val: true, results: resultsWithOffers });
    } catch (err) {
      console.log(err);
      res.status(200).json({ val: false, msg: "Server error: " + err.message });
    }
  },
  // ~~~ Load Product Reviews ~~~
  // Purpose: Retrieves all reviews for a specific product based on its ID.
  // Response: Returns the product reviews along with the current user's ID to display the reviews.
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
  // ~~~ Add Product Review ~~~
  // Purpose: Adds a new review for a specific product based on the provided product ID, comment, and rating.
  // Response: Returns a success message if the review is successfully added, or an error message if the product ID is invalid or review cannot be added.
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
  // ~~~ Delete Product Review ~~~
  // Purpose: Deletes a specific review from a product based on the review ID and ensures the user is the one who posted it.
  // Response: Returns a success message if the review is successfully deleted, or an error message if the review ID is not valid or the user is unauthorized.
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
};
