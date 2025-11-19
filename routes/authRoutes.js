const express = require('express');
const router = express.Router();
const { passport, isGoogleEnabled } = require('../config/passport');
const auth = require('../controllers/authController');

router.get('/login', auth.getLogin);
router.post('/login', auth.postLogin);
router.post('/logout', auth.postLogout);

router.get('/register', auth.getRegister);
router.post('/register', auth.postRegister);

router.get('/forgot', auth.getForgot);
router.post('/forgot', auth.postForgotSendOtp);

router.get('/verify', auth.getVerify);
router.post('/verify-otp', auth.postVerifyOtp);

router.get('/set-password', auth.getSetPassword);
router.post('/set-password', auth.postSetPassword);

router.get('/reset', auth.getReset);
router.post('/reset', auth.postReset);

if (isGoogleEnabled) {
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
      session: false,
    })
  );

  router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err || !user) {
        console.error('Google login error:', err);
        return res.redirect('/auth/login?msg=login_failed');
      }
      auth.setSessionUser(req, user);
      return res.redirect('/shop');
    })(req, res, next);
  });
}

module.exports = router;
