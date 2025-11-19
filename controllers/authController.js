const User = require('../models/User');
const { sendOTPEmail } = require('../utils/mailer');
const { locations, normalizeLocation } = require('../helpers/location');

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildOtpPayload(purpose) {
  return {
    code: generateOtp(),
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
  };
}

function buildShippingAddress({ fullName, street, district, city }) {
  const payload = {};
  if (fullName && fullName.trim()) payload.fullName = fullName.trim();
  if (street && street.trim()) payload.street = street.trim();
  if (district && district.trim()) payload.district = district.trim();
  if (city && city.trim()) payload.city = city.trim();

  if (Object.keys(payload).length === 0) return null;
  payload.isDefault = true;
  return payload;
}

function renderRegister(res, { error = null, info = null, status = 200, formData = {} }) {
  return res.status(status).render('auth-register', {
    title: 'Đăng ký',
    error,
    info,
    formData,
    locations,
  });
}

function renderForgot(res, { error = null, info = null, status = 200 }) {
  return res.status(status).render('auth-forgot', {
    title: 'Quên mật khẩu',
    error,
    info,
  });
}

function renderVerify(res, { email, purpose, error = null, info = null, status = 200 }) {
  return res.status(status).render('auth-verify', {
    title: 'Xác thực OTP',
    email,
    purpose,
    error,
    info,
  });
}

function renderSetPassword(res, { email, error = null, status = 200 }) {
  return res.status(status).render('auth-set-password', {
    title: 'Đặt mật khẩu',
    email,
    error,
  });
}

function renderReset(res, { email, error = null, status = 200 }) {
  return res.status(status).render('auth-reset', {
    title: 'Đặt lại mật khẩu',
    email,
    error,
  });
}

function clearPasswordSession(req) {
  delete req.session.pendingPasswordEmail;
  delete req.session.pendingPasswordPurpose;
}

function dispatchOtpEmail(email, code, purpose) {
  if (!email || !code) return;
  sendOTPEmail(email, code).catch((err) => {
    console.error(`Send OTP email failed [${purpose}] for ${email}:`, err);
  });
}

function purposeFromRequest(purpose = 'register') {
  if (purpose === 'forgot') return 'reset';
  return purpose === 'reset' ? 'reset' : 'register';
}

function setSessionUser(req, user) {
  if (!user) return;
  req.session.user = {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

exports.setSessionUser = setSessionUser;

// GET /auth/login
exports.getLogin = (req, res) => {
  res.render('auth-login', {
    title: 'Đăng nhập',
    error: null,
    msg: req.query.msg || null,
    next: req.query.next || '',
  });
};

// POST /auth/login
exports.postLogin = async (req, res) => {
  const { email = '', password = '', next: nextPath = '' } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).render('auth-login', {
      title: 'Đăng nhập',
      error: 'Vui lòng nhập đầy đủ email và mật khẩu.',
      msg: null,
      next: nextPath,
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).render('auth-login', {
        title: 'Đăng nhập',
        error: 'Email hoặc mật khẩu không đúng.',
        msg: null,
        next: nextPath,
      });
    }

    if (!user.password) {
      return res.status(400).render('auth-login', {
        title: 'Đăng nhập',
        error: 'Tài khoản chưa đặt mật khẩu. Vui lòng hoàn tất đăng ký qua OTP.',
        msg: null,
        next: nextPath,
      });
    }

    if (!user.isVerified) {
      return res.status(400).render('auth-login', {
        title: 'Đăng nhập',
        error: 'Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư OTP.',
        msg: null,
        next: nextPath,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).render('auth-login', {
        title: 'Đăng nhập',
        error: 'Email hoặc mật khẩu không đúng.',
        msg: null,
        next: nextPath,
      });
    }

    setSessionUser(req, user);

    const redirectTarget = nextPath || (user.role === 'admin' ? '/admin/products' : '/');
    return res.redirect(redirectTarget);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).render('auth-login', {
      title: 'Đăng nhập',
      error: 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
      msg: null,
      next: nextPath,
    });
  }
};

// POST /auth/logout
exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login?msg=logout');
  });
};

// GET /auth/register
exports.getRegister = (req, res) => {
  return renderRegister(res, { error: null, info: null, formData: {} });
};

// POST /auth/register
exports.postRegister = async (req, res) => {
  const { email = '', fullName = '', street = '', district = '', city = '' } = req.body;
  const normalizedLocationInput = normalizeLocation(city, district);
  const formData = {
    email,
    fullName,
    street,
    city: normalizedLocationInput.city || '',
    district: normalizedLocationInput.district || '',
  };

  if (!email.trim() || !fullName.trim()) {
    return renderRegister(res, {
      status: 400,
      error: 'Vui lòng nhập đầy đủ email và họ tên.',
      formData,
    });
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.isVerified) {
      return renderRegister(res, {
        status: 400,
        error: 'Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
        formData,
      });
    }

    const otpPayload = buildOtpPayload('register');
    const shippingAddress = buildShippingAddress({
      fullName,
      street,
      district: normalizedLocationInput.district,
      city: normalizedLocationInput.city,
    });

    if (!user) {
      user = new User({
        email: normalizedEmail,
        fullName: fullName.trim(),
        isVerified: false,
        shippingAddresses: shippingAddress ? [shippingAddress] : [],
      });
    } else {
      user.fullName = fullName.trim();
      user.isVerified = false;
      if (shippingAddress) {
        if (!Array.isArray(user.shippingAddresses) || user.shippingAddresses.length === 0) {
          user.shippingAddresses = [shippingAddress];
        } else {
          user.shippingAddresses[0] = { ...user.shippingAddresses[0], ...shippingAddress };
          user.shippingAddresses[0].isDefault = true;
        }
      }
    }

    user.otp = otpPayload;
    await user.save();
    dispatchOtpEmail(user.email, otpPayload.code, 'register');

    return res.redirect(`/auth/verify?email=${encodeURIComponent(user.email)}&purpose=register`);
  } catch (err) {
    console.error('Register error:', err);
    return renderRegister(res, {
      status: 500,
      error: 'Có lỗi xảy ra khi xử lý đăng ký. Vui lòng thử lại.',
      formData,
    });
  }
};

// GET /auth/forgot
exports.getForgot = (req, res) => {
  return renderForgot(res, { error: null, info: null });
};

// POST /auth/forgot  => gửi OTP
exports.postForgotSendOtp = async (req, res) => {
  const { email = '' } = req.body;

  if (!email.trim()) {
    return renderForgot(res, {
      status: 400,
      error: 'Vui lòng nhập email để tiếp tục.',
    });
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.isVerified) {
      return renderForgot(res, {
        status: 400,
        error: 'Không tìm thấy tài khoản phù hợp với email này.',
      });
    }

    const otpPayload = buildOtpPayload('reset');
    user.otp = otpPayload;
    await user.save();
    dispatchOtpEmail(user.email, otpPayload.code, 'reset');

    return res.redirect(`/auth/verify?email=${encodeURIComponent(user.email)}&purpose=reset`);
  } catch (err) {
    console.error('Forgot password error:', err);
    return renderForgot(res, {
      status: 500,
      error: 'Không thể gửi OTP. Vui lòng thử lại sau.',
    });
  }
};

// GET /auth/verify
exports.getVerify = (req, res) => {
  const { email = '', purpose = 'register' } = req.query;
  const normalizedPurpose = purposeFromRequest(purpose);
  return renderVerify(res, {
    email,
    purpose: normalizedPurpose,
    error: null,
    info: null,
  });
};

// POST /auth/verify-otp
exports.postVerifyOtp = async (req, res) => {
  const { email = '', purpose = 'register', code = '' } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPurpose = purposeFromRequest(purpose);
  const trimmedCode = code.trim();

  if (!normalizedEmail || !trimmedCode) {
    return renderVerify(res, {
      email,
      purpose: normalizedPurpose,
      status: 400,
      error: 'Vui lòng nhập đầy đủ email và mã OTP.',
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.otp || user.otp.purpose !== normalizedPurpose) {
      return renderVerify(res, {
        email,
        purpose: normalizedPurpose,
        status: 400,
        error: 'Không tìm thấy yêu cầu OTP hợp lệ. Vui lòng gửi lại mã.',
      });
    }

    if (user.otp.expiresAt && user.otp.expiresAt < new Date()) {
      user.otp = undefined;
      await user.save();
      return renderVerify(res, {
        email,
        purpose: normalizedPurpose,
        status: 400,
        error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
      });
    }

    if ((user.otp.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      user.otp = undefined;
      await user.save();
      return renderVerify(res, {
        email,
        purpose: normalizedPurpose,
        status: 400,
        error: 'Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng yêu cầu mã mới.',
      });
    }

    if (trimmedCode !== user.otp.code) {
      user.otp.attempts = (user.otp.attempts || 0) + 1;
      await user.save();
      return renderVerify(res, {
        email,
        purpose: normalizedPurpose,
        status: 400,
        error: 'Mã OTP không chính xác. Vui lòng thử lại.',
      });
    }

    user.otp = undefined;

    if (normalizedPurpose === 'register') {
      user.isVerified = true;
      await user.save();
      req.session.pendingPasswordEmail = user.email;
      req.session.pendingPasswordPurpose = 'register';
      return res.redirect(`/auth/set-password?email=${encodeURIComponent(user.email)}`);
    }

    await user.save();
    req.session.pendingPasswordEmail = user.email;
    req.session.pendingPasswordPurpose = 'reset';
    return res.redirect(`/auth/reset?email=${encodeURIComponent(user.email)}`);
  } catch (err) {
    console.error('Verify OTP error:', err);
    return renderVerify(res, {
      email,
      purpose: normalizedPurpose,
      status: 500,
      error: 'Không thể xác thực OTP. Vui lòng thử lại sau.',
    });
  }
};

// GET /auth/set-password
exports.getSetPassword = (req, res) => {
  const { email = '' } = req.query;
  const normalizedEmail = normalizeEmail(email);
  const canProceed =
    req.session.pendingPasswordEmail &&
    req.session.pendingPasswordEmail === normalizedEmail &&
    req.session.pendingPasswordPurpose === 'register';

  if (!normalizedEmail || !canProceed) {
    return res.redirect('/auth/login?msg=otp_required');
  }

  return renderSetPassword(res, { email: normalizedEmail, error: null });
};

// POST /auth/set-password
exports.postSetPassword = async (req, res) => {
  const { email = '', password = '' } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password || password.length < 6) {
    return renderSetPassword(res, {
      email,
      status: 400,
      error: 'Mật khẩu phải có tối thiểu 6 ký tự.',
    });
  }

  const canProceed =
    req.session.pendingPasswordEmail === normalizedEmail &&
    req.session.pendingPasswordPurpose === 'register';

  if (!canProceed) {
    return res.redirect('/auth/login?msg=otp_required');
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.isVerified) {
      clearPasswordSession(req);
      return res.redirect('/auth/register?msg=register_required');
    }

    user.password = password;
    await user.save();
    clearPasswordSession(req);
    return res.redirect('/auth/login?msg=register_ok');
  } catch (err) {
    console.error('Set password error:', err);
    return renderSetPassword(res, {
      email,
      status: 500,
      error: 'Không thể lưu mật khẩu. Vui lòng thử lại.',
    });
  }
};

// GET /auth/reset
exports.getReset = (req, res) => {
  const { email = '' } = req.query;
  const normalizedEmail = normalizeEmail(email);

  const canProceed =
    req.session.pendingPasswordEmail &&
    req.session.pendingPasswordEmail === normalizedEmail &&
    req.session.pendingPasswordPurpose === 'reset';

  if (!normalizedEmail || !canProceed) {
    return res.redirect('/auth/forgot?msg=otp_required');
  }

  return renderReset(res, { email: normalizedEmail, error: null });
};

// POST /auth/reset
exports.postReset = async (req, res) => {
  const { email = '', password = '' } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password || password.length < 6) {
    return renderReset(res, {
      email,
      status: 400,
      error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
    });
  }

  const canProceed =
    req.session.pendingPasswordEmail === normalizedEmail &&
    req.session.pendingPasswordPurpose === 'reset';

  if (!canProceed) {
    return res.redirect('/auth/forgot?msg=otp_required');
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.isVerified) {
      clearPasswordSession(req);
      return res.redirect('/auth/forgot?msg=otp_required');
    }

    user.password = password;
    await user.save();
    clearPasswordSession(req);
    return res.redirect('/auth/login?msg=reset_ok');
  } catch (err) {
    console.error('Reset password error:', err);
    return renderReset(res, {
      email,
      status: 500,
      error: 'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
    });
  }
};
