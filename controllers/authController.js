const passport = require("passport");

module.exports = {
  // ~~~ Google Login Redirect ~~~
  // Purpose: Initiates Google login authentication process.
  // Response: Redirects to Google authentication page with requested permissions (profile and email).
  whenGoogleLogin: (req, res, next) => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })(req, res, next);
  },
  // ~~~ Google Callback Handler ~~~
  // Purpose: Handles the callback after Google authentication is complete.
  // Response: Logs in the user and redirects to the home page, or redirects to register if authentication fails.
  whenGoogleCallbacks: (req, res, next) => {
    passport.authenticate(
      "google",
      {
        failureRedirect: "/register",
      },
      (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.redirect("/register");
        }
        req.session.currentUsername = user.username;
        req.session.currentEmail = user.email;
        req.session.userEmail = user.email;
        req.session.loggedIn = true;
        req.session.currentId = user._id;
        return res.redirect("/");
      }
    )(req, res, next);
  },
};
