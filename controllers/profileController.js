const User = require('../models/User');
const { locations, normalizeLocation } = require('../helpers/location');

function sanitize(value = '') {
  return value.trim();
}

function pickDefaultAddress(user = {}) {
  if (!user?.shippingAddresses?.length) return null;
  return user.shippingAddresses.find((addr) => addr.isDefault) || user.shippingAddresses[0];
}

function ensureDefaultAddressDoc(user) {
  if (!Array.isArray(user.shippingAddresses)) {
    user.shippingAddresses = [];
  }

  let address = user.shippingAddresses.find((addr) => addr.isDefault);
  if (!address) {
    address = { isDefault: true };
    user.shippingAddresses.unshift(address);
  }
  return address;
}

function buildAddressPayload(body = {}, prefix = 'shipping') {
  const payload = {};
  const fullNameKey = `${prefix}FullName`;
  const phoneKey = `${prefix}Phone`;
  const streetKey = `${prefix}Street`;
  const districtKey = `${prefix}District`;
  const cityKey = `${prefix}City`;

  if (body[fullNameKey] && sanitize(body[fullNameKey])) payload.fullName = sanitize(body[fullNameKey]);
  if (body[phoneKey] && sanitize(body[phoneKey])) payload.phone = sanitize(body[phoneKey]);
  if (body[streetKey] && sanitize(body[streetKey])) payload.street = sanitize(body[streetKey]);
  const normalizedLocationInput = normalizeLocation(body[cityKey] || '', body[districtKey] || '');
  if (normalizedLocationInput.district) payload.district = normalizedLocationInput.district;
  if (normalizedLocationInput.city) payload.city = normalizedLocationInput.city;
  return Object.keys(payload).length ? payload : null;
}

function coerceIndex(value) {
  const idx = Number(value);
  if (Number.isNaN(idx) || idx < 0) return -1;
  return idx;
}

function renderProfileView(res, user, options = {}) {
  if (!user) {
    return res.redirect('/auth/login');
  }
  const address = pickDefaultAddress(user) || {};
  const addresses = Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [];
  return res.render('account/profile', {
    title: 'Thông tin cá nhân',
    user,
    address,
    addresses,
    locations,
    success: options.success || null,
    error: options.error || null,
    passwordError: options.passwordError || null,
    passwordSuccess: options.passwordSuccess || null,
  });
}

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).lean();
    return renderProfileView(res, user, {
      success: req.query.success || null,
      passwordSuccess: req.query.pwd || null,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.redirect('/auth/login');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }

    const nextFullName = sanitize(req.body.fullName || '');
    if (!nextFullName) {
      return renderProfileView(res, user.toObject(), {
        error: 'Họ tên không được bỏ trống.',
      });
    }
    user.fullName = nextFullName;

    // Optional phone field on user profile (top-level)
    const nextPhone = sanitize(req.body.phone || '');
    if (nextPhone) {
      user.phone = nextPhone;
    } else {
      // allow clearing phone by submitting empty value
      user.phone = '';
    }

    const addressPayload = buildAddressPayload(req.body);
    if (addressPayload) {
      const addressDoc = ensureDefaultAddressDoc(user);
      Object.assign(addressDoc, addressPayload, { isDefault: true });
      user.markModified('shippingAddresses');
    }

    await user.save();
    if (req.session.user) {
      req.session.user.fullName = user.fullName;
    }

    return res.redirect('/account/profile?success=profile_saved');
  } catch (err) {
    console.error('Update profile error:', err);
    const user = await User.findById(req.session.user.id).lean().catch(() => null);
    return renderProfileView(res, user, {
      error: 'Không thể cập nhật thông tin. Vui lòng thử lại.',
    });
  }
};

exports.updatePassword = async (req, res) => {
  const { currentPassword = '', newPassword = '', confirmPassword = '' } = req.body;

  if (!currentPassword.trim()) {
    const user = await User.findById(req.session.user.id).lean().catch(() => null);
    return renderProfileView(res, user, {
      passwordError: 'Vui lòng nhập mật khẩu hiện tại.',
    });
  }

  if (!newPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
    const user = await User.findById(req.session.user.id).lean().catch(() => null);
    return renderProfileView(res, user, {
      passwordError: newPassword !== confirmPassword
        ? 'Mật khẩu mới và xác nhận không khớp.'
        : 'Mật khẩu mới phải có ít nhất 6 ký tự.',
    });
  }

  try {
    const user = await User.findById(req.session.user.id);
    if (!user || !user.password) {
      return res.redirect('/auth/login');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return renderProfileView(res, user.toObject(), {
        passwordError: 'Mật khẩu hiện tại không chính xác.',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.redirect('/account/profile?pwd=password_updated');
  } catch (err) {
    console.error('Update password error:', err);
    const user = await User.findById(req.session.user.id).lean().catch(() => null);
    return renderProfileView(res, user, {
      passwordError: 'Không thể đổi mật khẩu lúc này. Vui lòng thử lại.',
    });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/auth/login');

    const payload = buildAddressPayload(req.body, 'newAddress');
    if (!payload || !payload.fullName || !payload.phone || !payload.street || !payload.city || !payload.district) {
      return res.redirect('/account/profile?success=address_invalid');
    }

    const setDefault = req.body.newAddressIsDefault === 'on';
    payload.isDefault = !!setDefault;

    if (!Array.isArray(user.shippingAddresses)) {
      user.shippingAddresses = [];
    }

    if (setDefault) {
      user.shippingAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.shippingAddresses.push(payload);
    if (!user.shippingAddresses.some((addr) => addr.isDefault)) {
      user.shippingAddresses[0].isDefault = true;
    }
    user.markModified('shippingAddresses');
    await user.save();
    return res.redirect('/account/profile?success=address_added');
  } catch (err) {
    console.error('Add address error:', err);
    return res.redirect('/account/profile?success=address_error');
  }
};

exports.removeAddress = async (req, res) => {
  try {
    const index = coerceIndex(req.params.index);
    const user = await User.findById(req.session.user.id);
    if (!user || !Array.isArray(user.shippingAddresses) || index < 0 || index >= user.shippingAddresses.length) {
      return res.redirect('/account/profile?success=address_error');
    }

    const removed = user.shippingAddresses.splice(index, 1);
    if (!user.shippingAddresses.length) {
      user.markModified('shippingAddresses');
      await user.save();
      return res.redirect('/account/profile?success=address_deleted');
    }

    if (removed[0]?.isDefault) {
      user.shippingAddresses[0].isDefault = true;
    }
    user.markModified('shippingAddresses');
    await user.save();
    return res.redirect('/account/profile?success=address_deleted');
  } catch (err) {
    console.error('Remove address error:', err);
    return res.redirect('/account/profile?success=address_error');
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const index = coerceIndex(req.params.index);
    const user = await User.findById(req.session.user.id);
    if (!user || !Array.isArray(user.shippingAddresses) || index < 0 || index >= user.shippingAddresses.length) {
      return res.redirect('/account/profile?success=address_error');
    }

    user.shippingAddresses.forEach((addr, idx) => {
      addr.isDefault = idx === index;
    });
    user.markModified('shippingAddresses');
    await user.save();
    return res.redirect('/account/profile?success=address_default');
  } catch (err) {
    console.error('Set default address error:', err);
    return res.redirect('/account/profile?success=address_error');
  }
};
