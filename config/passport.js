const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback';

const isGoogleEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (isGoogleEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            (profile.emails && profile.emails[0] && profile.emails[0].value?.toLowerCase()) || '';
          if (!email) {
            return done(null, false, { message: 'Email Google không khả dụng.' });
          }

          let user = await User.findOne({ email });
          if (!user) {
            user = new User({
              email,
              fullName: profile.displayName || profile.name?.givenName || 'Google User',
              googleId: profile.id,
              isVerified: true,
              role: 'customer',
            });
          } else {
            if (!user.fullName && profile.displayName) {
              user.fullName = profile.displayName;
            }
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            if (!user.isVerified) {
              user.isVerified = true;
            }
          }

          await user.save();
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.warn(
    '⚠️ GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được cấu hình. Đăng nhập Google sẽ bị vô hiệu.'
  );
}

module.exports = { passport, isGoogleEnabled };
