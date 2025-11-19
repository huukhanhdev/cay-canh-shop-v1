const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

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

exports.list = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userID')
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/orders/index', {
      title: 'Quản lý đơn hàng',
      orders,
      statuses: ORDER_STATUSES,
      success: req.query.msg || null,
    });
  } catch (err) {
    console.error('Admin list orders error:', err);
    res.status(500).render('admin/orders/index', {
      title: 'Quản lý đơn hàng',
      orders: [],
      statuses: ORDER_STATUSES,
      error: 'Không thể tải danh sách đơn hàng.',
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

    // Khi chuyển sang 'done' -> trừ tồn (chỉ trừ 1 lần)
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

    // Khi rollback từ 'done' sang trạng thái khác -> trả lại tồn nếu đã trừ
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
