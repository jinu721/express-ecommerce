const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// ~~~ Load Admin Coupons Page ~~~
// Purpose: Displays a paginated list of all coupons for admin management.
// Response: Renders the coupons management page or returns an error if loading fails.
router.get('/admin/coupons', couponController.couponAdminPageLoad);

// ~~~ Load Create Coupon Page ~~~
// Purpose: Displays the page for creating a new coupon.
// Response: Renders the coupon creation page.
router.get('/admin/coupons/create', couponController.couponAdminCreatePageLoad);

// ~~~ Create a New Coupon ~~~
// Purpose: Adds a new coupon to the system with provided details.
// Response: Returns success or error messages based on the operation.
router.post('/admin/coupons/create', couponController.couponAdminCreate);

// ~~~ Load Update Coupon Page ~~~
// Purpose: Displays the page for updating an existing coupon.
// Response: Renders the coupon update page or returns an error if the coupon is not found.
router.get('/admin/coupons/update/:couponId', couponController.couponAdminUpdatePageLoad);

// ~~~ Update a Coupon ~~~
// Purpose: Updates details of an existing coupon in the system.
// Response: Returns success or error messages based on the operation.
router.post('/admin/coupons/update/:couponId', couponController.couponAdminUpdate);

// ~~~ Delete a Coupon ~~~
// Purpose: Deletes a specific coupon from the system.
// Response: Returns success or error messages based on whether the deletion was successful.
router.delete('/admin/coupons/delete/:couponId', couponController.couponAdminDelete);

// ~~~ Apply a Coupon ~~~
// Purpose: Applies a coupon to the user's cart to provide a discount.
// Response: Returns the updated cart details or an error message.
router.post('/coupon/apply', couponController.couponApply);

// ~~~ Remove an Applied Coupon ~~~
// Purpose: Removes a previously applied coupon from the user's cart.
// Response: Returns success or error messages based on the operation.
router.delete('/coupon/remove', couponController.removeApply);

module.exports = router;
