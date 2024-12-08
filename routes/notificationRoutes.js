const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationConteroller');

// ~~~ Load Notifications Page ~~~
// Purpose: Displays a list of notifications for the logged-in user.
// Response: Renders the notifications page with the user's notifications.
router.get('/notifications', notificationController.notificationPageLoad);

// ~~~ Add a Notification ~~~
// Purpose: Adds a new notification for a specific user.
// Response: Returns success or error messages based on whether the notification was added.
router.post('/notifications', notificationController.addNotification);

// ~~~ Clear All Notifications ~~~
// Purpose: Deletes all notifications for the logged-in user.
// Response: Returns success or error messages based on the operation.
router.delete('/notifications', notificationController.clearNotification);

module.exports = router;
