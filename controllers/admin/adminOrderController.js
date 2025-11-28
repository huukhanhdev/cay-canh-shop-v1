const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');

const ORDER_STATUSES = ['pending', 'preparing', 'shipping', 'done', 'canceled'];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

async function adjustStock(productId, variantId, qty, direction = 'decrease') {
  if (!productId || !qty) return;
  const delta = direction === 'increase' ? qty : -qty;

  const product = await Product.findById(productId);
  if (!product) return;

  if (variantId && product.variants?.length) {
    const variant = product.variants.id(variantId) ||
      product.variants.find((v) => v._id?.toString() === variantId?.toString());
    if (variant) {
      variant.stock = Math.max(0, toNumber(variant.stock) + delta);
    }
    product.inStock = product.variants.reduce((sum, variantItem) => sum + (toNumber(variantItem.stock)), 0);
  } else {
    product.inStock = Math.max(0, toNumber(product.inStock) + delta);
  }

  if (direction === 'decrease') {
    product.soldCount = Math.max(0, toNumber(product.soldCount) + qty);
  } else {
    product.soldCount = Math.max(0, toNumber(product.soldCount) - qty);
  }

  await product.save();
}

async function deductOrderStock(order) {
  if (order.stockDeducted || !Array.isArray(order.items)) return;
  for (const item of order.items) {
    try {
      const productId = item.productID || item.productId || item.id;
      const variantId = item.variantId || item.variant?.variantId || item.variant?._id;
      const qty = toNumber(item.quantity ?? item.qty ?? 0);
      if (!productId || qty <= 0) continue;
      await adjustStock(productId, variantId, qty, 'decrease');
    } catch (err) {
      console.error('Error deducting stock for item', item, err);
    }
  }
  order.stockDeducted = true;
}

async function restoreOrderStock(order) {
  if (!order.stockDeducted || !Array.isArray(order.items)) return;
  for (const item of order.items) {
    try {
      const productId = item.productID || item.productId || item.id;
      const variantId = item.variantId || item.variant?.variantId || item.variant?._id;
      const qty = toNumber(item.quantity ?? item.qty ?? 0);
      if (!productId || qty <= 0) continue;
      await adjustStock(productId, variantId, qty, 'increase');
    } catch (err) {
      console.error('Error restoring stock for item', item, err);
    }
  }
  order.stockDeducted = false;
}

function buildTimeFilter(range, start, end) {
  const now = new Date();
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const dayEnd = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  let from; let to;
  switch (range) {
    case 'today':
      from = dayStart(now); to = dayEnd(now); break;
    case 'yesterday': {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      from = dayStart(y); to = dayEnd(y); break;
    }
    case 'week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      from = dayStart(monday);
      to = dayEnd(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));
      break;
    }
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = dayEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    }
    case 'custom': {
      if (start) from = dayStart(new Date(start));
      if (end) to = dayEnd(new Date(end));
      break;
    }
    default: return null;
  }
  if (from && to) return { createdAt: { $gte: from, $lte: to } };
  return null;
}

exports.list = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status && ORDER_STATUSES.includes(req.query.status) ? req.query.status : null;
    const range = req.query.range; // today | yesterday | week | month | custom
    const start = req.query.start || null;
    const end = req.query.end || null;

    const mongoFilter = {};
    if (statusFilter) mongoFilter.status = statusFilter;
    const timeCond = buildTimeFilter(range, start, end);
    if (timeCond) Object.assign(mongoFilter, timeCond);

    const [orders, total] = await Promise.all([
      Order.find(mongoFilter)
        .populate('userID')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(mongoFilter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.render('admin/orders/index', {
      title: 'Quản lý đơn hàng',
      orders,
      statuses: ORDER_STATUSES,
      success: req.query.msg || null,
      pagination: { page, totalPages, total },
      filters: { status: statusFilter, range, start, end },
    });
  } catch (err) {
    console.error('Admin list orders error:', err);
    res.status(500).render('admin/orders/index', {
      title: 'Quản lý đơn hàng',
      orders: [],
      statuses: ORDER_STATUSES,
      error: 'Không thể tải danh sách đơn hàng.',
      pagination: { page: 1, totalPages: 1, total: 0 },
      filters: { status: null, range: null, start: null, end: null },
    });
  }
};

exports.detail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userID')
      .lean();
    if (!order) return res.redirect('/admin/orders?msg=not_found');

    res.render('admin/orders/detail', {
      title: `Đơn hàng #${order._id.toString().slice(-6)}`,
      order,
      statuses: ORDER_STATUSES,
      msg: req.query.msg || null,
    });
  } catch (err) {
    console.error('Admin order detail error:', err);
    res.redirect('/admin/orders?msg=error');
  }
};

exports.updateStatus = async (req, res) => {
  const { status = 'pending' } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.redirect(`/admin/orders/${req.params.id}?msg=invalid_status`);
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.redirect('/admin/orders?msg=not_found');

    const user = await User.findById(order.userID);

    const previousStatus = order.status;
    order.status = status;

    if (previousStatus !== status) {
      const note = status === 'canceled' ? (order.cancelReason || 'Hủy đơn') : undefined;
      order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      order.statusHistory.push({ status, updatedAt: new Date(), note });
    }

    if (previousStatus !== 'done' && status === 'done' && !order.pointRewarded) {
      const points = order.pointEarned || Math.floor((order.totalPrice || 0) / 10000);
      if (points > 0) {
        if (user) {
          user.loyaltyPoints = (user.loyaltyPoints || 0) + points;
          await user.save();
        }
      }
      order.pointRewarded = true;

      await deductOrderStock(order);
    }

    if (previousStatus === 'done' && status !== 'done' && order.pointRewarded) {
      const points = order.pointEarned || Math.floor((order.totalPrice || 0) / 10000);
      if (points > 0) {
        if (user) {
          user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) - points);
          await user.save();
        }
      }
      order.pointRewarded = false;

      await restoreOrderStock(order);
    }

    await order.save();
    res.redirect(`/admin/orders/${req.params.id}?msg=updated`);
  } catch (err) {
    console.error('Admin update order error:', err);
    res.redirect(`/admin/orders/${req.params.id}?msg=error`);
  }
};
