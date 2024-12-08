const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// ~~~ Place Order ~~~
// Purpose: Handle the placement of an order.
// Response: Creates a new order and returns confirmation.
router.post('/place-order', orderController.placeOrder);

// ~~~ Cancel Order ~~~
// Purpose: Cancel an existing order based on the orderId.
// Response: Deletes the order and returns confirmation.
router.delete('/cancel-order/:orderId', orderController.cancelOrder);

// ~~~ View Order Details ~~~
// Purpose: View the details of a specific order using orderId.
// Response: Returns the details of the order.
router.get('/view-order-details/:orderId', orderController.viewOrderDetails);

// ~~~ Admin Orders Page ~~~
// Purpose: Load the page displaying all orders for the admin.
// Response: Returns the list of all orders.
router.get('/admin/orders/', orderController.adminOrdersLoad);

// ~~~ Admin View Order ~~~
// Purpose: Load the detailed view of an order for the admin.
// Response: Returns the details of the specific order based on orderId.
router.get('/admin/orders/view/:orderId', orderController.adminOrdersViewLoad);

// ~~~ Update Admin Order Status ~~~
// Purpose: Update the status of an order for the admin.
// Response: Updates the order status and returns the updated order.
router.post('/admin/order/status/:orderId', orderController.adminOrdersStatusUpdate);

// ~~~ Verify Payment ~~~
// Purpose: Verify the payment status of an order.
// Response: Confirms payment verification and returns the result.
router.post('/verify-payment', orderController.verifyPayment);

// ~~~ Retry Payment ~~~
// Purpose: Retry a failed payment for an order.
// Response: Attempts to process the payment again.
router.post('/retry-payment', orderController.retryPayment);

// ~~~ Success Page ~~~
// Purpose: Load the success page after completing an order.
// Response: Returns the success page with confirmation details.
router.get('/success', orderController.successPageLoad);

// ~~~ Request Return for Order ~~~
// Purpose: Request a return for a specific order.
// Response: Initiates a return request and returns confirmation.
router.post('/orders/request-return/:orderId', orderController.reqestReturn);

// ~~~ Admin Request Return for Order ~~~
// Purpose: Admin can request a return for a specific order.
// Response: Processes the return request for the admin and returns the result.
router.post('/orders/admin/return-request/:orderId', orderController.adminReturnRequest);

// ~~~ Download Invoice ~~~
// Purpose: Allows the user to download the invoice for a specific order.
// Response: Returns the invoice file for download.
router.get('/orders/download/invoice/:orderId', orderController.downloadRecipt);

// ~~~ Cancel Individual Item in Order ~~~
// Purpose: Cancel an individual item within an order based on itemId.
// Response: Deletes the specific item and updates the order.
router.post("/item/cancel-order/:orderId", orderController.cancelIndividualOrder);

// ~~~ Return Individual Item in Order ~~~
// Purpose: Request a return for an individual item in an order.
// Response: Initiates a return request for the specific item.
router.post("/item/return-order/:orderId", orderController.requestIndividualReturn);

// ~~~ Admin Return Individual Item ~~~
// Purpose: Admin can request a return for a specific item in an order.
// Response: Admin processes the return request for the item and returns confirmation.
router.post('/order/:orderId/return/:itemId', orderController.requestIndividualReturnAdmin);

module.exports = router;
