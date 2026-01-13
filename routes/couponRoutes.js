const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

router.get('/admin/coupons', couponController.couponsLoad);
router.post('/admin/coupons', couponController.createCoupon);
router.get('/admin/coupons/:id', couponController.getCoupon);
router.put('/admin/coupons/:id', couponController.updateCoupon);
router.delete('/admin/coupons/:id', couponController.deleteCoupon);
router.post('/admin/coupons/:id/toggle', couponController.toggleCouponStatus);
router.get('/admin/coupons/:id/analytics', couponController.getCouponAnalytics);
router.post('/coupon/apply', couponController.applyCoupon);
router.delete('/coupon/remove', couponController.removeCoupon);
router.post('/api/coupons/validate', couponController.validateCoupon);
router.get('/api/coupons/available', couponController.getAvailableCoupons);

module.exports = router;
