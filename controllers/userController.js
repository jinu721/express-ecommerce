const otpModel = require("../models/otpModel");
const mailService = require("../services/mailServiece");
const { generateOtp, otpExpiry } = require("../utils/otpGenrator");
const { sendOtpEmail } = require("../services/mailServiece");
const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");

module.exports = {
  // ~~~ for register page loading ~~~
  // Purpose: Loads the registration or login page.
  // Data Passed: None.
  // Request Type: GET request to load the page.
  // Response: Renders the login-register page.
  RegisterLoad(req, res) {
    res.render("login-register");
  },

  // ~~~ for handling user login or register request, and sending OTP ~~~
  // Purpose: Handles user login or registration, sends an OTP for verification.
  // - If registration, sends OTP after validating email and username.
  // - If login, sends OTP after validating username/email and password.
  async RequestOtp(req, res) {
    const { isLogin } = req.body;
    try {
      if (!isLogin) {
        // ~~~ for user registration ~~~
        const { username, email } = req.body;
        const isUsernameValid = await userModel.findOne({ username });
        const isEmailValid = await userModel.findOne({ email });

        // ~~~ check if username or email already exists ~~~
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

        // ~~~ delete any existing OTP records for this email ~~~
        await otpModel.deleteMany({ email });

        // ~~~ generate and send OTP ~~~
        const otp = generateOtp();
        await sendOtpEmail(email, otp);

        // ~~~ store OTP in database with expiration time ~~~
        await otpModel.create({
          email,
          otp,
          createdAt: Date.now(),
          expiresAt: otpExpiry,
        });

        console.log("OTP sent successfully");
        return res.status(200).json({ val: true });
      } else {
        // ~~~ for user login ~~~
        const { usernameOrEmail, password } = req.body;
        let user;

        // ~~~ check if it's email or username ~~~
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
          await otpModel.deleteMany({ email: usernameOrEmail });
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
          await otpModel.deleteMany({ email: user.email });
        }

        // ~~~ compare passwords ~~~
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

        // ~~~ check if the user is banned ~~~
        if (user.isDeleted) {
          return res
            .status(400)
            .json({
              type: "ban",
              msg: "This account has been banned.",
              val: false,
            });
        }

        // ~~~ generate and send OTP for login ~~~
        const otp = generateOtp();
        await otpModel.create({
          email: user.email,
          otp,
          createdAt: Date.now(),
          expiresAt: otpExpiry,
        });
        await sendOtpEmail(user.email, otp);

        // ~~~ store user email in session ~~~
        req.session.userEmail = user.email;
        console.log("OTP sent successfully");
        return res.status(200).json({ val: true });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({ val: false });
    }
  },

  // ~~~ for handling user registration and OTP verification ~~~
  // Purpose: Verifies OTP and registers the user.
  // Response:
  // - If OTP is valid, hashes the password, creates a new user, and sets session.
  // - If OTP is invalid, returns an error response.
  async Register(req, res) {
    const { username, email, phone, password, otp } = req.body;
    try {
      const otpRecord = await otpModel.findOne({ email });

      // ~~~ validate OTP ~~~
      if (otpRecord && otpRecord.otp === otp) {
        const hashedPass = await bcrypt.hash(password, 10); // ~~~ hash the password ~~~
        await userModel.create({
          username,
          email,
          phone,
          password: hashedPass,
        }); // ~~~ create new user ~~~

        // ~~~ set session details for the new user ~~~
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

  // ~~~ for handling user login and OTP verification ~~~
  // Purpose: Verifies OTP and logs the user in.
  // Response:
  // - If OTP is valid, logs the user in and sets session.
  // - If OTP is invalid, returns an error response.
  async Login(req, res) {
    const { usernameOrEmail, otp } = req.body;
    try {
      let user;
      // ~~~ check if it's email or username ~~~
      if (/@/.test(usernameOrEmail)) {
        user = await userModel.findOne({ email: usernameOrEmail });
      } else {
        user = await userModel.findOne({ username: usernameOrEmail });
      }
      const otpRecord = await otpModel.findOne({ email: user.email });

      // ~~~ check if OTP is correct ~~~
      if (otpRecord.otp === otp) {
        req.session.loggedIn = true;
        req.session.currentUsername = user.username;
        req.session.currentEmail = user.email;
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

  // ~~~ for handling user ban page loading ~~~
  // Purpose: Loads the ban page if the user is banned.
  // Response: Renders the ban page.
  async banPageLoad(req, res) {
    res.render("ban");
  },

  // ~~~ for handling user logout when user clicks logout on ban page ~~~
  // Purpose: Logs the user out and destroys the session.
  // Response: Destroys session and sends success/failure response.
  logoutClick(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error in logout :-" + err);
        res
          .status(200)
          .json({
            val: false,
            msg: "Something went wrong, please try again later",
          });
      } else {
        console.log("Successfully logged out");
        res.status(200).json({ val: true });
      }
    });
  },

  // ~~~ for about page loading ~~~
  // Purpose: Loads the about page.
  // Response: Renders the about page.
  aboutLoad(req, res) {
    res.render("about");
  },
};
