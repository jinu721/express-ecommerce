const notifyModel = require("../models/notificationModel");
const moment = require("moment");

module.exports = {
  // ~~~ Notification Page Load ~~~
  // Purpose: Loads the notification page for the current user with notifications.
  // Response: Retrieves all notifications for the logged-in user, sorts them by creation date in descending order,
  //           and formats the time to show how long ago the notification was created.
  async notificationPageLoad(req, res) {
    const { currentId } = req.session;
    try {
      const notifications = await notifyModel
        .find({ userId: currentId })
        .sort({ createdAt: -1 });
      const notify = notifications.map((data) => ({
        ...data._doc,
        timeAgo: moment(data.createdAt).fromNow(),
      }));
      console.log(notify);
      res.render("notification", { notify });
    } catch (err) {
      console.log(err);
    }
  },
  // ~~~ Add Notification ~~~
  // Purpose: Adds a new notification for the current user.
  // Response: Validates input fields and creates a new notification for the user in the database.
  async addNotification(req, res) {
    const currentId = req.body.userId || req.session.currentId;
    const { title, message, type, status } = req.body;
    try {
      if (!title || !message || !type) {
        returnres.status(400).json({ val: false, msg: "Invalid fields" });
      }
      await notifyModel.create({
        userId: currentId,
        title: title,
        message: message,
        status: status,
        type: type,
      });
      res.status(200).json({ val: true, msg: null });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
  // ~~~ Clear Notifications ~~~
  // Purpose: Clears all notifications for the current user.
  // Response: Deletes all notifications related to the user from the database.
  async clearNotification(req, res) {
    const { currentId } = req.session;
    try {
      await notifyModel.deleteMany({ userId: currentId });
      res.status(200).json({ val: true, msg: null });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: "Something went wrong" });
    }
  },
};
