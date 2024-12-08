const mongoose = require("mongoose");

// ~~~ Category Schema ~~~
// Purpose: Represents a product category in the database.
// Fields:
// - `name`: The unique name of the category (required, unique).
// - `image`: A URL or path to an image representing the category (optional).
// - `isDeleted`: Indicates whether the category is marked as deleted (default: false).
// - `createdAt`: The timestamp for when the category was created (default: current date).
// - `updatedAt`: The timestamp for when the category was last updated (default: current date).


const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  image: { type: String },
  isDeleted: { type: Boolean, default: false },
},{timestamps:true});

module.exports = mongoose.model("Category", categorySchema);
