const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const otpModel = require("../models/otpModel");
const bcrypt = require("bcrypt");
const { sendOtpEmail } = require("../services/mailServiece");
const { generateOtp, otpExpiry } = require("../utils/otpGenrator");

module.exports = {
  // ~~~ Load user's profile ~~~
  // Purpose: Loads the user's profile page.
  // Response: Renders profile page with user data.
  async ProfileLoad(req, res) {
    try {
      const currentUser = req.session.currentEmail;
      const user = await userModel.findOne({ email: currentUser });
      res.render("accounts", { user });
    } catch (err) {
      console.log(err);
    }
  },
  // ~~~ Update user's profile ~~~
  // Purpose: Updates user's username and phone.
  // Response: Checks if the username is taken, updates the user info.
  async UserUpdate(req, res) {
    try {
      const { username, phone } = req.body;
      const currentUser = await userModel.findOne({
        email: req.session.currentEmail,
      });
      // Check if the username is already taken
      const isUsernameExist = await userModel.findOne({
        username,
        _id: { $ne: currentUser._id },
      });
      if (isUsernameExist) {
        return res.status(409).json({
          type: "username",
          msg: "Username already exist",
          val: false,
        });
      }
      // Update user information
      const updateData = { username };
      if (phone) updateData.phone = phone;
      await userModel.updateOne({ _id: currentUser._id }, updateData);
      req.session.currentUsername = username;
      const updatedUser = await userModel.findOne({ _id: currentUser._id });
      return res.status(200).json({ val: true, user: updatedUser });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ val: false });
    }
  },
  // ~~~ Load the Forgot Password page ~~~
  ForgotPassLoad(req, res) {
    res.render("forgot");
  },
  // ~~~ Request for password reset ~~~
  // Purpose: Sends OTP to the user's email for password reset.
  // Response: Sends OTP and returns success message.
  async ForgetPassRequest(req, res) {
    console.log("Rex");
    try {
      const { email } = req.body;
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(409).json({
          msg: "Email not found; please enter a valid email.",
          val: false,
        });
      }
      await otpModel.deleteMany({ email });
      const otp = generateOtp();
      await otpModel.create({
        email: user.email,
        otp,
        createdAt: Date.now(),
        expiresAt: otpExpiry,
      });
      await sendOtpEmail(user.email, otp);
      return res
        .status(409)
        .json({ msg: "OTP successfull sended.", val: true });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ val: false });
    }
  },

  // ~~~ Verify the OTP for password reset ~~~
  // Purpose: Verifies the OTP provided by the user.
  // Response: Confirms OTP validity and allows password reset.
  async ForgetPassverify(req, res) {
    const { email, otp } = req.body;
    try {
      const otpRecord = await otpModel.findOne({ email });
      if (otpRecord && otpRecord.otp === otp) {
        return res.status(200).json({ val: true, msg: null });
      } else {
        return res.status(400).json({ val: false, msg: "Enter a valid OTP" });
      }
    } catch (err) {
      res.status(500).json({ val: false });
      console.log(err);
    }
  },
  // ~~~ Change the user's password ~~~
  // Purpose: Resets the user's password after OTP verification.
  // Response: Updates the password in the database.
  async ForgetPassChange(req, res) {
    const { password, email } = req.body;
    try {
      console.log(password, email);
      const hashedPassword = await bcrypt.hash(password, 10);
      await userModel.updateOne({ email }, { password: hashedPassword });
      return res.status(200).json({ val: true, msg: null });
    } catch (err) {
      res.status(500).json({ val: false, msg: "Something went wrong" });
      console.log(err);
    }
  },
  // ~~~ Load the user's address data ~~~
  // Purpose: Loads the current user's address.
  // Response: Returns the address information if the user exists.
  async AddressLoad(req, res) {
    try {
      const currentUser = await userModel.findOne({
        email: req.session.currentEmail,
      });
      if (!currentUser) {
        return res.status(409).json({
          msg: "user not found",
          val: false,
        });
      }
      return res.status(200).json({ val: true, user: currentUser.address });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ val: false });
    }
  },
  // ~~~ Create a new address for the user ~~~
  // Purpose: Adds a new address to the user's profile.
  // Response: Successfully adds address or returns error if user not found.
  async AddressCreate(req, res) {
    const {
      pincode,
      houseno,
      landmark,
      city,
      street,
      district,
      state,
      country,
    } = req.body;
    console.log(req.body);
    try {
      let currentUser = await userModel.findOne({
        email: req.session.currentEmail,
      });
      if (!currentUser) {
        return res.status(500).json({ val: false, msg: "User not found" });
      }
      await userModel.updateOne(
        { email: currentUser.email },
        {
          $push: {
            address: {
              country,
              state,
              district,
              street,
              landMark: landmark,
              houseNumber: houseno,
              pinCode: pincode,
              city,
            },
          },
        }
      );
      return res.status(200).json({ val: true });
    } catch (err) {
      return res.status(500).json({ val: false });
    }
  },
  // ~~~ Edit a user's address load ~~~
  async EditAddressLoad(req, res) {
    const { addressId } = req.params;
    try {
      const address = await userModel.findOne({ "address._id": addressId });
      if (!address) {
        return res
          .status(404)
          .json({ val: false, message: "Address not found" });
      }
      res.status(200).json({ val: true, address });
    } catch (err) {
      res.status(500).json({ val: false });
    }
  },
  // ~~~ Edit a user's address ~~~
  // Purpose: Updates an existing address of the user.
  // Response: Returns updated address or error if not found.
  async EditAddress(req, res) {
    const {
      id,
      pincode,
      houseno,
      landmark,
      city,
      street,
      district,
      state,
      country,
    } = req.body;

    try {
      const addressUpdate = await userModel.updateOne(
        { "address._id": id },
        {
          $set: {
            "address.$.pinCode": pincode,
            "address.$.houseNumber": houseno,
            "address.$.landMark": landmark,
            "address.$.city": city,
            "address.$.street": street,
            "address.$.district": district,
            "address.$.state": state,
            "address.$.country": country,
          },
        }
      );

      if (!addressUpdate.matchedCount) {
        // Check if any document was updated
        return res
          .status(404)
          .json({ val: false, message: "Address not found" });
      }

      res.status(200).json({ val: true, address: addressUpdate });
    } catch (err) {
      console.log("Error in updating address:", err);
      res.status(500).json({ val: false, message: "Internal server error" });
    }
  },
  // ~~~ Delete a user's address ~~~
  // Purpose: Deletes the specified address from the user's profile.
  // Response: Returns success or error if the address is not found.
  async DeleteAddress(req, res) {
    const { addressId } = req.params;
    try {
      const address = await userModel.findOne({ "address._id": addressId });
      if (!address) {
        return res
          .status(404)
          .json({ val: false, message: "Address not found" });
      }
      await userModel.updateOne(
        { "address._id": addressId },
        { $pull: { address: { _id: addressId } } }
      );
      res.status(200).json({ val: true });
    } catch (err) {
      console.log("Error in updating address:", err);
      res.status(500).json({ val: false, message: "Internal server error" });
    }
  },
  // ~~~ Change user's password ~~~
  // Purpose: Allows the user to change their current password.
  // Response: Returns success or error if password change fails.
  async ChangePassword(req, res) {
    const { currentPass, newPass } = req.body;
    const { currentEmail } = req.session;
    try {
      const user = await userModel.findOne({ email: currentEmail });
      const isPassValid = await bcrypt.compare(currentPass, user.password);
      if (!isPassValid) {
        return res.status(404).json({
          val: false,
          msg: "The current password entered is incorrect.",
        });
      }
      const hashedPass = await bcrypt.hash(newPass, 10);
      await userModel.updateOne(
        { email: currentEmail },
        { $set: { password: hashedPass } }
      );
      res.status(200).json({ val: true });
    } catch (err) {
      console.log("Error in updating address:", err);
      res.status(500).json({ val: false, message: "Internal server error" });
    }
  },
  // ~~~ Load user's orders with pagination ~~~
  // Purpose: Retrieves orders for the logged-in user with pagination.
  // Response: Returns a list of orders and pagination details.

  async ordersPageLoad(req, res) {
    const { currentId } = req.session;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const totalOrders = await orderModel.countDocuments({ user: currentId });
      const orders = await orderModel
        .find({ user: currentId })
        .skip(skip)
        .limit(limit)
        .sort({ orderedAt: -1 });

      const totalPages = Math.ceil(totalOrders / limit);

      res.status(200).json({
        success: true,
        orders,
        totalOrders,
        totalPages,
        currentPage: page,
      });
    } catch (err) {
      console.log("Error in load orders:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
};
