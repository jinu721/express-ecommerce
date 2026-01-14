const passport = require("passport");
const { Strategy } = require("passport-google-oauth20");
const userModel = require("../models/userModel");
passport.use(
  new Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await userModel.findOne({ googleId: profile.id });
        if (user) {
          done(null, user);
        } else {
          await userModel.create({
            username: profile.displayName,
            googleId: profile.id,
            isGoogleLogin: true,
            email: profile.emails[0].value,
          });
          done(null, user);
        }
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});
