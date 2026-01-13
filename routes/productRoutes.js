const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../utils/multerConfig');

router.get(/^\/(home)?$/, productController.homeLoad);
router.get('/shop', productController.shopLoad);
router.get('/details/:id', productController.productDetailesLoad);
router.get('/api/categories', productController.getCategoriesAPI);
router.get('/api/brands', productController.getBrandsAPI);
router.get('/api/products/:id/popup-data', productController.getProductPopupData);
router.get('/admin/products', productController.productsPageLoad);
router.get('/admin/products/:id/details', productController.productDetails);
router.get('/admin/products/:id/details', productController.productDetails);
router.post('/admin/products/add', upload.fields([
  { name: 'productImage1', maxCount: 1 },
  { name: 'productImage2', maxCount: 1 },
  { name: 'productImage3', maxCount: 1 },
  { name: 'productImage4', maxCount: 1 },
  { name: 'productImage5', maxCount: 1 }
]), productController.productsAdd);
router.get('/admin/products/unlist', productController.productUnlist);
router.delete('/admin/products/delete/:id', productController.productDelete);
router.get('/product-stock', productController.productStock);
router.get('/admin/products/update/:productId', productController.productUpdateLoad);
router.post('/admin/products/update/:productId', upload.fields([
  { name: 'productImage1', maxCount: 1 },
  { name: 'productImage2', maxCount: 1 },
  { name: 'productImage3', maxCount: 1 },
  { name: 'productImage4', maxCount: 1 }
]), productController.productDataUpdate);
router.post('/update-product-image/:productId', upload.single('productImage'), productController.productImageUpdate);
router.post('/remove-product-color/:productId/:index', productController.productColorRemove);
router.post('/add-product-color', productController.productColorAddUpdate);
router.post('/admin/products/update-stock/:productId', productController.productStockUpdate);
router.get('/product/search', productController.productsearch);
router.get('/product/reviews/:productId', productController.productReviewsLoad);
router.post('/product/review/add/:productId', productController.productReviewsAdd);
router.delete('/product/review/delete/:reviewId', productController.productReviewsDelete);

module.exports = router;
