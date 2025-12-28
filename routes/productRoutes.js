const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../utils/multerConfig');

// ~~~ Home Page ~~~
// Purpose: Load the home page.
// Response: Renders the home page or redirects based on URL.
router.get(/^\/(home)?$/, productController.homeLoad);

// ~~~ Shop Page ~~~
// Purpose: Load the shop page with available products.
// Response: Renders the shop page with product listings.
router.get('/shop', productController.shopLoad);

// ~~~ Product Details ~~~
// Purpose: Load the details of a specific product based on product ID.
// Response: Displays product details like description, price, etc.
router.get('/details/:id', productController.productDetailesLoad);

// ~~~ API Endpoints for Modal Selectors ~~~
router.get('/api/categories', productController.getCategoriesAPI);
router.get('/api/brands', productController.getBrandsAPI);

// ~~~ Admin Products Page ~~~
// Purpose: Load the admin page that lists all products.
// Response: Renders the page showing all the products for the admin.
router.get('/admin/products', productController.productsPageLoad);

// ~~~ Product Details (Admin Modal) ~~~
// Purpose: Fetch product details and variants for the edit modal
router.get('/admin/products/:id/details', productController.productDetails);

// ~~~ Product Details (Admin Modal) ~~~
// Purpose: Fetch product details and variants for the edit modal
router.get('/admin/products/:id/details', productController.productDetails);

// ~~~ Add New Product ~~~
// Purpose: Handle the addition of a new product.
// Response: Adds the new product and its images, then returns the updated list of products.
router.post('/admin/products/add', upload.fields([
  { name: 'productImage1', maxCount: 1 },
  { name: 'productImage2', maxCount: 1 },
  { name: 'productImage3', maxCount: 1 },
  { name: 'productImage4', maxCount: 1 },
  { name: 'productImage5', maxCount: 1 }
]), productController.productsAdd);

// ~~~ Unlist Product ~~~
// Purpose: Unlist a product, removing it from the available listings.
// Response: Removes the product from the admin's product list.
router.get('/admin/products/unlist', productController.productUnlist);

// ~~~ Permanent Delete Product ~~~
// Purpose: Permanently delete a product from the database.
// Response: Removes the product completely.
router.delete('/admin/products/delete/:id', productController.productDelete);

// ~~~ Product Stock Page ~~~
// Purpose: Load the page showing the stock availability of products.
// Response: Returns the current product stock levels.
router.get('/product-stock', productController.productStock);

// ~~~ Update Product Page ~~~
// Purpose: Load the page to update product details for a specific product ID.
// Response: Shows the product's current details, allowing updates.
router.get('/admin/products/update/:productId', productController.productUpdateLoad);

// ~~~ Update Product Data ~~~
// Purpose: Update the product details for a given product ID.
// Response: Updates the product and returns the updated product information.
router.post('/admin/products/update/:productId', upload.fields([
  { name: 'productImage1', maxCount: 1 },
  { name: 'productImage2', maxCount: 1 },
  { name: 'productImage3', maxCount: 1 },
  { name: 'productImage4', maxCount: 1 }
]), productController.productDataUpdate);

// ~~~ Update Product Image ~~~
// Purpose: Update the product image for a specific product ID.
// Response: Uploads the new image and updates the product details.
router.post('/update-product-image/:productId', upload.single('productImage'), productController.productImageUpdate);

// ~~~ Remove Product Color ~~~
// Purpose: Remove a specific color variant from a product.
// Response: Deletes the color variant from the product.
router.post('/remove-product-color/:productId/:index', productController.productColorRemove);

// ~~~ Add or Update Product Color ~~~
// Purpose: Add a new color variant or update an existing one for a product.
// Response: Updates the product's color options.
router.post('/add-product-color', productController.productColorAddUpdate);

// ~~~ Update Product Stock ~~~
// Purpose: Update the stock level for a specific product.
// Response: Updates the stock and returns the updated product information.
router.post('/admin/products/update-stock/:productId', productController.productStockUpdate);

// ~~~ Product Search ~~~
// Purpose: Search for products based on search criteria.
// Response: Returns the search results or an error message.
router.get('/product/search', productController.productsearch);

// ~~~ Product Reviews Page ~~~
// Purpose: Load the reviews page for a specific product.
// Response: Displays the list of reviews for the product.
router.get('/product/reviews/:productId', productController.productReviewsLoad);

// ~~~ Add Product Review ~~~
// Purpose: Allow users to add a review for a specific product.
// Response: Adds the review and returns the updated review list for the product.
router.post('/product/review/add/:productId', productController.productReviewsAdd);

// ~~~ Delete Product Review ~~~
// Purpose: Delete a specific review for a product.
// Response: Removes the review and returns the updated review list for the product.
router.delete('/product/review/delete/:reviewId', productController.productReviewsDelete);

module.exports = router;
