const Order = require('../models/Order');

const CANCELLABLE_STATUSES = ['pending', 'preparing'];

exports.list = async (req, res) => {
  try {
    const orders = await Order.find({ userID: req.session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.render('orders/index', {
      title: 'Đơn hàng của tôi',
      orders,
      msg: req.query.msg || null,
    });
  } catch (err) {
    console.error('List user orders error:', err);
    res.status(500).render('orders/index', {
      title: 'Đơn hàng của tôi',
      orders: [],
      error: 'Không thể tải danh sách đơn hàng.',
      msg: null,
    });
  }
};

exports.detail = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userID: req.session.user.id })
      .populate('items.productID')
      .lean();

    if (!order) return res.redirect('/orders?msg=not_found');

    res.render('orders/detail', {
      title: `Đơn hàng #${order._id.toString().slice(-6)}`,
      order,
      canCancel: CANCELLABLE_STATUSES.includes(order.status),
      msg: req.query.msg || null,
    });
  } catch (err) {
    console.error('User order detail error:', err);
    res.redirect('/orders');
  }
};

exports.cancel = async (req, res) => {
  const reason = (req.body.reason || '').trim();
  if (!reason) {
    return res.redirect(`/orders/${req.params.id}?msg=reason_required`);
  }

  try {
    const order = await Order.findOne({ _id: req.params.id, userID: req.session.user.id });
    if (!order) return res.redirect('/orders?msg=not_found');

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.redirect(`/orders/${req.params.id}?msg=cannot_cancel`);
    }

    order.status = 'canceled';
    order.cancelReason = reason;
    order.canceledAt = new Date();
    order.pointRewarded = false;
    await order.save();

    return res.redirect(`/orders/${req.params.id}?msg=canceled`);
  } catch (err) {
    console.error('Cancel order error:', err);
    return res.redirect(`/orders/${req.params.id}?msg=error`);
  }
};
