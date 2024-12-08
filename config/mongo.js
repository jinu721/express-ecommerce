const mongoose = require("mongoose");

// ~~~ Database Connection Setup ~~~
// Purpose: Establishes a connection to MongoDB using Mongoose.
// Response: Logs a success message if the connection is successful, or logs an error if the connection fails.

module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected");
  } catch (err) {
    console.log(err);
  }
};
