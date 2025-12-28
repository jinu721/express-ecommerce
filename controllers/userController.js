const otpModel = require("../models/otpModel");
const mailService = require("../services/mailServiece");
const { generateOtp, otpExpiry } = require("../utils/otpGenrator");
const { sendOtpEmail } = require("../services/mailServiece");
const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");

module.exports = {
  RegisterLoad(req, res) {
    res.render("login-register");
  },

  async RequestOtp(req, res) {
    try {
      const { username, email } = req.body;
      const isUsernameValid = await userModel.findOne({ username });
      const isEmailValid = await userModel.findOne({ email });

      if (isUsernameValid) {
        return res
          .status(409)
          .json({
            type: "username",
            msg: "Username already exists",
            val: false,
          });
      } else if (isEmailValid) {
        return res
          .status(409)
          .json({ type: "email", msg: "Email already exists", val: false });
      }

      await otpModel.deleteMany({ email });

      const otp = generateOtp();
      await sendOtpEmail(email, otp);

      await otpModel.create({
        email,
        otp,
        createdAt: Date.now(),
        expiresAt: otpExpiry,
      });

      console.log("OTP sent successfully");
      return res.status(200).json({ val: true });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ val: false });
    }
  },

  async Register(req, res) {
    const { username, email, phone, password, otp } = req.body;
    try {
      const otpRecord = await otpModel.findOne({ email });

      if (otpRecord && otpRecord.otp === otp) {
        const hashedPass = await bcrypt.hash(password, 10); 
        await userModel.create({
          username,
          email,
          phone,
          password: hashedPass,
          role: 'user' // Explicitly set role as user for new registrations
        }); 
        req.session.loggedIn = true;
        req.session.currentUsername = username;
        req.session.currentEmail = email;
        const user = await userModel.findOne({ email });
        req.session.currentId = user._id;

        return res.status(200).json({ val: true, msg: null });
      } else {
        return res.status(400).json({ val: false, msg: "Enter a valid OTP" });
      }
    } catch (err) {
      res.status(500).json({ val: false });
      console.log(err);
    }
  },


  async Login(req, res) {
    const { usernameOrEmail, password } = req.body;
    try {
      let user;
      if (/@/.test(usernameOrEmail)) {
        user = await userModel.findOne({ email: usernameOrEmail });
        if (!user) {
          return res
            .status(409)
            .json({
              type: "username",
              msg: "Enter a valid email address",
              val: false,
            });
        }
      } else {
        user = await userModel.findOne({ username: usernameOrEmail });
        if (!user) {
          return res
            .status(409)
            .json({
              type: "username",
              msg: "Enter a valid username",
              val: false,
            });
        }
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res
          .status(409)
          .json({
            type: "password",
            msg: "Enter a valid password",
            val: false,
          });
      }

      if (user.isDeleted) {
        return res
          .status(400)
          .json({
            type: "ban",
            msg: "This account has been banned.",
            val: false,
          });
      }

      // Set session variables for both user and admin
      req.session.loggedIn = true;
      req.session.currentUsername = user.username;
      req.session.currentEmail = user.email;
      req.session.currentId = user._id;
      req.session.userRole = user.role;

      if (user.role === 'admin') {
        req.session.AdminloggedIn = true;
      }

      const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/';
      return res.status(200).json({ val: true, msg: null, redirectUrl });
    } catch (err) {
      res.status(500).json({ val: false });
      console.log(err);
    }
  },

  async banPageLoad(req, res) {
    res.render("ban");
  },

  logoutClick(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error in logout :-" + err);
        return res.status(500).json({ success: false });
      }
      res.clearCookie('connect.sid'); // Clear session cookie
      return res.redirect('/');
    });
  },

  aboutLoad(req, res) {
    res.render("about");
  },
};
