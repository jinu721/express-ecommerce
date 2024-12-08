const vistorsModel = require("../models/visitorModel");

// ~~~ Track Visitors Middleware ~~~
// Purpose: This middleware tracks the unique visitors and total views for each day. It uses session data to ensure each user is counted only once per day.
// Response: 
// - Updates the visitor statistics for the current day (unique visitors and total views) in the database.
// - Only counts the first visit of the user per session.

const trackVisitors = async (req, res, next) => {
  if (!req.session.visited) {
    req.session.visited = true;
    const today = new Date().toISOString().split("T")[0];
    console.log(today);
    let visitorData = await vistorsModel.findOne({ date: today });
    if (!visitorData) {
      visitorData = new vistorsModel({
        date: today,
        uniqueVisitors: 1,
        totalViews: 1,
      });
    } else {
      visitorData.uniqueVisitors += 1;
      visitorData.totalViews += 1;
    }
    await visitorData.save();
    return next();
  }
  next();
};

module.exports = trackVisitors;
