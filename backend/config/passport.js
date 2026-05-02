const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const config = require("./env");

if (config.googleAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl || "/api/auth/google/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            const email = String(profile?.emails?.[0]?.value || "").trim().toLowerCase();
            if (!email) {
              return done(new Error("Google account did not provide an email address"), null);
            }

            user = await User.findOne({ email });

            if (user) {
              user.googleId = profile.id;
              user.loginType = user.loginType || "google";
              await user.save();
            } else {
              user = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                loginType: "google"
              });
            }
          }

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
