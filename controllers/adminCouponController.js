const Coupon = require('../models/Coupon');

function generateCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

exports.list = async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.render('admin/coupons/index', { title: 'Mã giảm giá', coupons, error: null });
};

exports.create = async (req, res) => {
  try {
    const { code, discountType, discountValue, maxUsage, isActive } = req.body;
    const payload = {
      code: (code && code.trim().toUpperCase()) || generateCode(5),
      discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Math.max(0, Number(discountValue) || 0),
      maxUsage: Math.max(1, Number(maxUsage) || 1),
      isActive: isActive === 'on' ? true : !!isActive,
    };
    await Coupon.create(payload);
    res.redirect('/admin/coupons?msg=created');
  } catch (err) {
    console.error('Create coupon error:', err);
    res.redirect('/admin/coupons?msg=error');
  }
};

exports.toggle = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) return res.redirect('/admin/coupons?msg=notfound');
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.redirect('/admin/coupons?msg=updated');
  } catch (err) {
    console.error('Toggle coupon error:', err);
    res.redirect('/admin/coupons?msg=error');
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.redirect('/admin/coupons?msg=deleted');
  } catch (err) {
    console.error('Delete coupon error:', err);
    res.redirect('/admin/coupons?msg=error');
  }
};
