const mongoose = require("mongoose");

// ~~~ Notification Schema ~~~
// Purpose: Defines the structure for storing notifications for users in the database.
// Fields:
// - `userId`: References the user to whom the notification belongs (required).
// - `title`: The title of the notification (required).
// - `message`: The detailed message of the notification (required).
// - `type`: The category of the notification (e.g., 'order', 'promo', 'system', 'other') (default: 'other').
// - `status`: The status of the notification (e.g., 'success', 'failed', 'pending') (default: 'other').
// - `isRead`: Indicates whether the user has read the notification (default: false).
// - `metadata`: Additional data related to the notification (optional).
// - `createdAt`: Timestamp of when the notification was created (default: current date and time).
// Features:
// - Uses Mongoose `Schema.Types.ObjectId` to reference users.
// - Includes default values and enumerated types for `type` and `status` fields for consistency.

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["order", , "promo", "system", "other"],
    default: "other",
  },
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    default: "other",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: Object,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
