const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productsRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');


router.get('/admin/dashboard', adminController.whenDashboardLoad);
router.get('/admin/dashboard/data', adminController.dashboardData);
router.get('/admin/users', adminController.whenUsersLoad);
router.get('/admin/users/view/:userId', adminController.whenUsersView);
router.get('/admin/users/ban', adminController.whenUsersBan);
router.get('/admin/users/ban', adminController.whenUsersBan);
router.get('/admin', (req, res) => {
  if (req.session.AdminloggedIn) {
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/register');
});
router.post('/admin/dashboard/download-report', adminController.downloadReport);
router.get('/admin/users/search', adminController.searchUsers);
router.get('/admin/products/search', adminController.searchProducts);
router.get('/admin/orders/search', adminController.searchOrders);
router.get('/admin/categories/search', adminController.searchCategories);
router.get('/admin/coupons/search', adminController.searchCoupons);
router.get('/admin/products/search', adminController.searchProducts);
router.get('/admin/orders/search', adminController.searchOrders);
router.get('/admin/categories/search', adminController.searchCategories);
router.get('/admin/coupons/search', adminController.searchCoupons);

module.exports = router;
