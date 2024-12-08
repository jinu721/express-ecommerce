const mongoose = require("mongoose");


// ~~~ Visitor Schema ~~~
// Purpose: Defines the structure and constraints for tracking website visitors and views.
// Fields:
// - `date`: The date when the data was recorded. This is a required field.
// - `uniqueVisitors`: The number of unique visitors to the website on that day. Default value is 0.
// - `totalViews`: The total number of page views on that day. Default value is 0.


const visitorSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  uniqueVisitors: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
});

module.exports = mongoose.model("Visitor", visitorSchema);

