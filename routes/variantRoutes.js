const express = require('express');
const router = express.Router();
const variantController = require('../controllers/variantController');
const attributeController = require('../controllers/attributeController');
const adminAuth = require('../middlewares/adminAuth');

router.get('/api/products/:productId/variants', variantController.getProductVariants);
router.get('/api/products/:productId/attributes', variantController.getProductAttributes);
router.post('/api/products/:productId/variants/find', variantController.findVariantByAttributes);
router.get('/api/variants/:variantId', variantController.getVariantDetails);
router.get('/api/variants/:variantId/stock', variantController.getVariantStock);
router.get('/api/categories/:categoryId/attributes', attributeController.getCategoryAttributes);

router.use('/admin/*', adminAuth);

router.get('/admin/products/:productId/variants/manage', variantController.renderVariantManagement);
router.get('/admin/products/:productId/variants/bulk', variantController.renderBulkVariants);
router.post('/admin/products/:productId/variants', variantController.createVariant);
router.post('/admin/products/:productId/variants/bulk', variantController.bulkCreateVariants);
router.put('/admin/variants/:variantId', variantController.updateVariant);
router.delete('/admin/variants/:variantId', variantController.deleteVariant);
router.post('/admin/variants/:variantId/stock', variantController.updateVariantStock);
router.get('/admin/variants/:variantId/history', variantController.getStockHistory);

router.get('/admin/attributes/manage', attributeController.renderAttributeManagement);
router.get('/admin/attributes', attributeController.getAllAttributes);
router.post('/admin/attributes', attributeController.createAttribute);
router.put('/admin/attributes/:attributeId', attributeController.updateAttribute);
router.delete('/admin/attributes/:attributeId', attributeController.deleteAttribute);

router.post('/admin/attributes/:attributeId/values', attributeController.addAttributeValue);
router.put('/admin/attributes/:attributeId/values/:valueId', attributeController.updateAttributeValue);
router.delete('/admin/attributes/:attributeId/values/:valueId', attributeController.deleteAttributeValue);

router.post('/admin/attributes/bulk/clothing', attributeController.createClothingAttributes);

module.exports = router;