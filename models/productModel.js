const mongoose = require("mongoose");


// ~~~ Product Schema ~~~
// Purpose: Defines the structure for storing product details in the database.
// Features:
// - Supports product details, pricing, categories, and reviews.
// - Allows flexible options like sizes, colors, and additional attributes (warranty, return policy, etc.).


const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  offerPrice: { type: Number },
  images: [{ type: String }],
  tags: [{ type: String }],
  sizes: {type:Object},
  colors: [{ type: String }],
  category:{type:mongoose.Schema.ObjectId,ref:'Category'},
  brand: { type: String },
  cashOnDelivery: { type:Boolean },
  warranty: { type:String },
  returnPolicy: { type:String },
  rating: { type: Number, default: 0 },
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
      username: { type: String,required: true},
      rating: { type: Number, required: true },
      comment: { type: String },
      reviewDate:{ type: Date, default: Date.now }
    },
  ],
  isDeleted: { type: Boolean, default: false },
},{timestamps:true});

module.exports = mongoose.model('Products',productSchema);