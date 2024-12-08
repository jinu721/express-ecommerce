const mongoose = require("mongoose");


// ~~~ User Schema ~~~
// Purpose: Defines the structure and constraints for user data stored in the database.
// Fields:
// - `username`: The name of the user (required).
// - `email`: The email address of the user (required, unique).
// - `password`: The hashed password of the user.
// - `phone`: The user's phone number.
// - `address`: An array of address objects containing detailed address information such as street, country, state, district, city, house number, landmark, and pin code.
// - `role`: Specifies the role of the user (default: "user").
// - `isDeleted`: A flag indicating if the user is deactivated or banned (default: false).
// - `isGoogleLogin`: Indicates if the user registered via Google (default: false).
// - `googleId`: Stores the Google ID for users registered via Google.
// - `createdAt`: The timestamp for when the user was created (default: current date).
// - `updatedAt`: The timestamp for when the user was last updated (default: current date).


const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: Number },
  address: [{
    street: { type: String },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    city: { type: String },
    houseNumber: { type: Number },
    landMark: { type: String },
    pinCode: { type: String },
  }],
  role: { type: String, default: "user" },
  isDeleted: { type: Boolean, default: false },
  isGoogleLogin: { type: Boolean, default: false },
  googleId: { type: String },
},{timestamps:true});

module.exports = mongoose.model("Users", userSchema);
