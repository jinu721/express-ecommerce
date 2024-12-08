const passport = require("passport");
const { Strategy } = require("passport-google-oauth20");
const userModel = require("../models/userModel");

// ~~~ The `passport.use()` method configures Passport to use the Google OAuth 2.0 strategy for authentication.
// ~~~ The strategy defines the authentication flow and how user data is processed after successful authentication with Google.
// ~~~ The configuration object contains the following properties:
// ~~~ - `clientID`: The Google OAuth client ID (stored in the environment variables for security reasons),
// ~~~ - `clientSecret`: The corresponding secret key used to secure the OAuth flow, also stored securely.
// ~~~ - `callbackURL`: The URL to which Google will redirect the user after successful authentication.
// ~~~ This callback URL needs to match the one set up in the Google API console.

passport.use(
  new Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      // ~~~ This is the callback function that Google calls after the user is authenticated.
      // ~~~ The `accessToken` and `refreshToken` can be used to make further requests to Google services on behalf of the user.
      // ~~~ The `profile` object contains important user details such as the Google ID, email, and display name.
      // ~~~ The `done` function is used to finalize the authentication process, either returning the user object if authentication is successful
      // ~~~ or passing an error if something goes wrong.
      try {
        let user = await userModel.findOne({ googleId: profile.id });
        // ~~~ If a user with the Google ID already exists in the database, the authentication is considered successful and the user object is returned.
        // ~~~ The `done` function is called with the user object to complete the process.
        if (user) {
          done(null, user);
        } else {
          // ~~~ If the user does not exist, a new user record is created in the database with the details provided by Google.
          // ~~~ The `isGoogleLogin` flag is set to true to indicate that this user registered via Google.
          // ~~~ The user's `username` is set to their Google display name, and their `googleId` is used to link their account to Google.
          // The newly created user is returned after successful creation.
          await userModel.create({
            username: profile.displayName,
            googleId: profile.id,
            isGoogleLogin: true,
            email: profile.emails[0].value,
          });
          done(null, user);
        }
      } catch (err) {
        // ~~~ If any error occurs while handling the user data (like a database issue), it is passed to `done` to handle the error appropriately.
        done(err, null);
      }
    }
  )
);

// ~~~ The `passport.serializeUser()` function determines what data is stored in the session.
// ~~~ Here, the user's ID is saved, allowing Passport to identify the user in subsequent requests.
passport.serializeUser((user, done) => {
  // ~~~ The user ID is passed into the session and stored as a unique identifier. It helps maintain the session across requests without storing the entire user object.
  done(null, user.id);
});

// ~~~ The `passport.deserializeUser()` function is responsible for retrieving the user's full details from the session.
// ~~~ Each time a request is made, it uses the stored user ID from the session to fetch the user object from the database.
// ~~~ This ensures that the authenticated user is associated with the current session and the user details are accessible in the application.
passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    // After the user is fetched, the user object is attached to the request, making it available for other parts of the application.
    done(null, user);
  });
});
