const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const upload = require('../utils/multerConfig');



router.get('/admin/categories', categoryController.categoryLoadAdmin);
router.post('/admin/category/add', upload.single('categoryImage'), categoryController.categoryAdd);
router.post('/admin/category/offer/add', categoryController.categoryOfferAdd);
router.get('/category/:categoryId/', categoryController.categoryLoad);
router.get('/admin/category/unlist', categoryController.categoryUnlist);
router.get('/admin/category/update/:categoryId', categoryController.categoryUpdateload);
router.post('/update-category-image/:categoryId', upload.single('categoryImage'), categoryController.categoryImageUpdate);
router.post('/admin/category/update/:categoryId', categoryController.categoryUpdate);

module.exports = router;
