const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// ~~~ Load Admin Coupons Page ~~~
// Purpose: Displays a paginated list of all coupons for admin management.
// Response: Renders the coupons management page or returns an error if loading fails.
router.get('/admin/coupons', couponController.couponsLoad);

// ~~~ Create a New Coupon ~~~
// Purpose: Adds a new coupon to the system with provided details.
// Response: Returns success or error messages based on the operation.
router.post('/admin/coupons', couponController.createCoupon);

// ~~~ Get Coupon Details ~~~
// Purpose: Get details of a specific coupon
// Response: Returns coupon details or error message
router.get('/admin/coupons/:id', couponController.getCoupon);

// ~~~ Update a Coupon ~~~
// Purpose: Updates details of an existing coupon in the system.
// Response: Returns success or error messages based on the operation.
router.put('/admin/coupons/:id', couponController.updateCoupon);

// ~~~ Delete a Coupon ~~~
// Purpose: Deletes a specific coupon from the system.
// Response: Returns success or error messages based on whether the deletion was successful.
router.delete('/admin/coupons/:id', couponController.deleteCoupon);

// ~~~ Toggle Coupon Status ~~~
// Purpose: Enable/disable a coupon
// Response: Returns success or error messages
router.post('/admin/coupons/:id/toggle', couponController.toggleCouponStatus);

// ~~~ Get Coupon Analytics ~~~
// Purpose: Get usage analytics for a coupon
// Response: Returns analytics data
router.get('/admin/coupons/:id/analytics', couponController.getCouponAnalytics);

// ~~~ Validate Coupon (Public API) ~~~
// Purpose: Validates a coupon code for frontend use
// Response: Returns validation result and discount details
router.post('/api/coupons/validate', couponController.validateCoupon);

// ~~~ Get Available Coupons (Public API) ~~~
// Purpose: Get available coupons for a user
// Response: Returns list of available coupons
router.get('/api/coupons/available', couponController.getAvailableCoupons);

module.exports = router;
