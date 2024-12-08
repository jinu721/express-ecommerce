const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productsRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');

// ~~~ Admin Dashboard Page ~~~
// Purpose: Load the admin dashboard page.
// Response: Renders the dashboard with analytics and reports.
router.get('/admin/dashboard', adminController.whenDashboardLoad);

// ~~~ Dashboard Data API ~~~
// Purpose: Provide dashboard data such as stats and reports.
// Response: Returns data for charts and analytics on the dashboard.
router.get('/admin/dashboard/data', adminController.dashboardData);

// ~~~ Admin Users Page ~~~
// Purpose: Load the admin users management page.
// Response: Renders the page with a list of registered users.
router.get('/admin/users', adminController.whenUsersLoad);

// ~~~ View User Details ~~~
// Purpose: Load detailed information about a specific user.
// Response: Renders a page with the user's details.
router.get('/admin/users/view/:userId', adminController.whenUsersView);

// ~~~ Ban/Unban Users ~~~
// Purpose: Handle banning or unbanning users.
// Response: Updates the user's status and returns a response.
router.get('/admin/users/ban', adminController.whenUsersBan);

// ~~~ Admin Login Page ~~~
// Purpose: Load the admin login page.
// Response: Renders the login page for admin access.
router.get('/admin', adminController.whenAdminLoginLoad);

// ~~~ Admin Login ~~~
// Purpose: Authenticate admin credentials.
// Response: Returns success or error messages based on authentication status.
router.post('/admin/login', adminController.whenAdminLogin);

// ~~~ Download Report ~~~
// Purpose: Allow the admin to download a report in various formats.
// Response: Triggers the download of a report file.
router.post('/admin/dashboard/download-report', adminController.downloadReport);

// ~~~ Search Users ~~~
// Purpose: Search for users in the admin users management page.
// Response: Returns search results or an error message.
router.get('/admin/users/search', adminController.searchUsers);

// ~~~ Search Products ~~~
// Purpose: Search for products in the admin products management page.
// Response: Returns search results or an error message.
router.get('/admin/products/search', adminController.searchProducts);

// ~~~ Search Orders ~~~
// Purpose: Search for orders in the admin orders management page.
// Response: Returns search results or an error message.
router.get('/admin/orders/search', adminController.searchOrders);

// ~~~ Search Categories ~~~
// Purpose: Search for categories in the admin categories management page.
// Response: Returns search results or an error message.
router.get('/admin/categories/search', adminController.searchCategories);

// ~~~ Search Coupons ~~~
// Purpose: Search for coupons in the admin coupons management page.
// Response: Returns search results or an error message.
router.get('/admin/coupons/search', adminController.searchCoupons);

module.exports = router;
