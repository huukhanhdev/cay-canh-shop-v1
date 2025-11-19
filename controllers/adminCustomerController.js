const User = require('../models/User');
const { locations, normalizeLocation } = require('../helpers/location');

function buildFilters(query = {}) {
  const filter = {};
  if (query.role && ['admin', 'customer'].includes(query.role)) {
    filter.role = query.role;
  }

  if (query.status === 'verified') {
    filter.isVerified = true;
  } else if (query.status === 'unverified') {
    filter.isVerified = false;
  }

  if (query.q && query.q.trim()) {
    const search = query.q.trim();
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { fullName: { $regex: search, $options: 'i' } },
    ];
  }

  return filter;
}

function pickDefaultAddress(user) {
  if (!user?.shippingAddresses?.length) return null;
  return user.shippingAddresses.find((addr) => addr.isDefault) || user.shippingAddresses[0];
}

async function buildStats() {
  const [total, verified, admin] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ role: 'admin' }),
  ]);
  return {
    total,
    verified,
    admin,
  };
}

exports.list = async (req, res) => {
  try {
    const filter = buildFilters(req.query);
    const users = await User.find(filter).sort({ createdAt: -1 }).lean();
    const stats = await buildStats();

    res.render('admin/customers/index', {
      title: 'Quản lý khách hàng',
      users,
      query: req.query,
      stats,
    });
  } catch (err) {
    console.error('Admin list customers error:', err);
    res.status(500).render('admin/customers/index', {
      title: 'Quản lý khách hàng',
      users: [],
      query: req.query,
      stats: { total: 0, verified: 0, admin: 0 },
      error: 'Không thể tải danh sách khách hàng.',
    });
  }
};

exports.detail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.redirect('/admin/customers?msg=not_found');

    res.render('admin/customers/detail', {
      title: 'Chi tiết khách hàng',
      user,
      address: pickDefaultAddress(user),
      msg: req.query.msg || null,
      locations,
    });
  } catch (err) {
    console.error('Admin customer detail error:', err);
    res.redirect('/admin/customers?msg=error');
  }
};

exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect('/admin/customers?msg=not_found');

    const nextName = (req.body.fullName || '').trim();
    if (nextName) user.fullName = nextName;

    user.role = req.body.role === 'admin' ? 'admin' : 'customer';
    user.isVerified = req.body.isVerified === 'true' || req.body.isVerified === 'on';
    user.loyaltyPoints = Math.max(0, Number(req.body.loyaltyPoints) || 0);

    if (req.body.resetOtp === 'true' || req.body.resetOtp === 'on') {
      user.otp = undefined;
    }

    const addrFields = ['shippingFullName', 'shippingPhone', 'shippingStreet', 'shippingDistrict', 'shippingCity'];
    const hasAddrInput = addrFields.some((field) => req.body[field] && req.body[field].trim());
    if (hasAddrInput) {
      if (!user.shippingAddresses || user.shippingAddresses.length === 0) {
        user.shippingAddresses = [{ isDefault: true }];
      }
      const target = user.shippingAddresses.find((a) => a.isDefault) || user.shippingAddresses[0];
      if (req.body.shippingFullName && req.body.shippingFullName.trim()) target.fullName = req.body.shippingFullName.trim();
      if (req.body.shippingPhone && req.body.shippingPhone.trim()) target.phone = req.body.shippingPhone.trim();
      if (req.body.shippingStreet && req.body.shippingStreet.trim()) target.street = req.body.shippingStreet.trim();
      const normalizedLocationInput = normalizeLocation(req.body.shippingCity || '', req.body.shippingDistrict || '');
      target.district = normalizedLocationInput.district || '';
      target.city = normalizedLocationInput.city || '';
      target.isDefault = true;
      user.markModified('shippingAddresses');
    }

    await user.save();
    return res.redirect(`/admin/customers/${user._id}?msg=updated`);
  } catch (err) {
    console.error('Admin update customer error:', err);
    return res.redirect(`/admin/customers/${req.params.id}?msg=error`);
  }
};
