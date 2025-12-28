const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const adminAuth = require('../middlewares/adminAuth');
const multer = require('multer');
const path = require('path');

// Multer configuration for brand logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/brands/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Brand Routes
 * Handles brand management
 */

// Public routes
router.get('/api/brands', brandController.listBrands);
router.get('/api/brands/:brandId', brandController.getBrandDetails);
router.get('/api/brands/:brandId/products', brandController.getBrandProducts);

// Admin routes (protected)
router.get('/admin/brands', brandController.adminListBrands);
router.post('/admin/brands', upload.single('logo'), brandController.createBrand);
router.put('/admin/brands/:brandId', upload.single('logo'), brandController.updateBrand);
router.delete('/admin/brands/:brandId', brandController.deleteBrand);
router.post('/admin/brands/:brandId/toggle', brandController.toggleBrandStatus);

module.exports = router;
