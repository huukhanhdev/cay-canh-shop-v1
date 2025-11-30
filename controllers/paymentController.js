// Momo payment integration controller (using momoService)
const Order = require('../models/Order');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const momoService = require('../services/momoService');
const { computeSummary } = require('../utils/pricing');
const { logInventoryChange } = require('./admin/adminInventoryController');

/**
 * Decrement stock for order items (variants or product inStock)
 * @param {Order} order - The order document with items array
 */
async function decrementStock(order) {
  try {
    for (const item of order.items) {
      const product = await Product.findById(item.productID);
      if (!product) continue;

      let previousStock, newStock;

      // If order item has variantId, decrement that variant's stock
      if (item.variantId && product.variants?.length) {
        const variant = product.variants.id(item.variantId);
        if (variant && variant.stock >= item.quantity) {
          previousStock = variant.stock;
          variant.stock -= item.quantity;
          newStock = variant.stock;
          
          // Log inventory change for variant
          await logInventoryChange({
            productID: product._id,
            variantId: item.variantId,
            type: 'sale',
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: 'Bán hàng',
            note: `Đơn hàng: ${order.orderNumber}`,
            orderID: order._id
          });
        }
      } else {
        // Otherwise decrement product inStock
        if (product.inStock >= item.quantity) {
          previousStock = product.inStock;
          product.inStock -= item.quantity;
          newStock = product.inStock;
          
          // Log inventory change for product
          await logInventoryChange({
            productID: product._id,
            variantId: null,
            type: 'sale',
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: 'Bán hàng',
            note: `Đơn hàng: ${order.orderNumber}`,
            orderID: order._id
          });
        }
      }

      // Increment soldCount
      product.soldCount = (product.soldCount || 0) + item.quantity;
      await product.save();
    }
  } catch (err) {
    console.error('Error decrementing stock:', err);
  }
}

// Create Momo payment: expects cart in session (similar to checkout flow)
exports.createMomoPayment = async (req, res) => {
  try {
    // Validate user session
    const isLoggedIn = !!req.session?.user;
    if (!isLoggedIn) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thanh toán Momo' });
    }

    // Validate cart exists and has items
    const cart = await Cart.findOne({ userID: req.session.user.id, isActive: true }).lean();
    if (!cart || !cart.items.length) {
      return res.status(400).json({ error: 'Giỏ hàng trống' });
    }

    // Validate stock availability before creating Momo payment
    for (const item of cart.items) {
      const product = await Product.findById(item.productID);
      if (!product) {
        return res.status(400).json({ error: `Sản phẩm "${item.productName}" không còn tồn tại` });
      }

      const availableStock = item.variantId && product.variants?.length
        ? (product.variants.id(item.variantId)?.stock || 0)
        : (product.inStock || 0);

      if (item.quantity > availableStock) {
        return res.status(400).json({ 
          error: `Sản phẩm "${item.productName}" chỉ còn ${availableStock} trong kho. Vui lòng cập nhật giỏ hàng.` 
        });
      }
    }

    const subtotal = cart.totalPrice || 0;
    if (subtotal <= 0) {
      return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    }

    // Get user for loyalty points
    const userDoc = await User.findById(req.session.user.id);
    if (!userDoc) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Apply coupon discount from session
    const appliedDiscount = req.session?.checkoutCoupon?.discount || 0;

    // Apply loyalty points from request body (same logic as postCheckout)
    const requestedPoints = Math.max(0, Math.floor(Number(req.body.pointsToUse || 0) || 0));
    const availablePoints = Math.max(0, Math.floor(Number(userDoc.loyaltyPoints || 0)));
    const amountAfterDiscount = Math.max(0, subtotal - appliedDiscount);
    const maxPointsRedeemable = Math.floor(amountAfterDiscount / 1000);
    const pointsToApply = Math.min(requestedPoints, availablePoints, maxPointsRedeemable);
    const pointUsedAmount = pointsToApply * 1000; // 1 điểm = 1.000 VND

    // Compute final total (including tax, shipping, all discounts)
    const { shipping, tax, total } = computeSummary(subtotal, appliedDiscount + pointUsedAmount);

    if (total <= 0) {
      return res.status(400).json({ error: 'Số tiền thanh toán không hợp lệ' });
    }

    const pointEarned = Math.floor(((total || 0) * 0.10) / 1000); // 10% cashback as points

    // Create order draft with full pricing details
    const order = new Order({
      userID: req.session.user.id,
      address: { number: '', street: 'N/A', district: 'N/A', city: 'N/A' },
      items: cart.items.map(it => ({
        productID: it.productID,
        productName: it.productName,
        price: it.price,
        quantity: it.quantity,
        subTotal: it.subTotal,
        variantId: it.variantId || null,
        variant: it.variant || {},
      })),
      shippingFee: shipping,
      couponID: req.session?.checkoutCoupon?.couponId || null,
      discount: appliedDiscount,
      pointUsed: pointUsedAmount,
      totalPrice: total,
      pointEarned,
      paymentMethod: 'momo',
      paymentStatus: 'pending',
      status: 'pending',
      statusHistory: [ { status: 'pending', updatedAt: new Date(), note: 'Tạo đơn chờ thanh toán Momo' } ],
      pointRewarded: false, // Will be set to true after successful payment
    });
    await order.save();

    const orderId = order._id.toString();
    const extraData = Buffer.from(JSON.stringify({ oid: orderId })).toString('base64');

    const momoResp = await momoService.createPayment({
      orderId,
      amount: total, // Use final total including tax, shipping, discounts
      orderInfo: `Thanh toan don hang ${orderId}`,
      extraData,
    });

    if (momoResp?.payUrl) {
      return res.json({ ok: true, payUrl: momoResp.payUrl, orderId });

        // If Momo API fails, update order status
        order.paymentStatus = 'failed';
        order.statusHistory.push({ 
          status: order.status, 
          updatedAt: new Date(), 
          note: 'Momo API không trả về payUrl' 
        });
        await order.save();
    }

    console.error('Momo response error:', momoResp);
    return res.status(502).json({ error: 'Không tạo được phiên thanh toán', detail: momoResp });
  } catch (err) {
    console.error('createMomoPayment error:', err);
    return res.status(500).json({ error: 'Lỗi tạo thanh toán Momo' });
  }
};

// User return URL (front-end redirect) - Momo
exports.returnHandler = async (req, res) => {
  try {
    const { resultCode, orderId, message, transId } = req.query;
    
    // Validate required parameters
    if (!orderId) {
      return res.status(400).send('Thiếu thông tin đơn hàng');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send('Không tìm thấy đơn hàng');
    }

    // Verify payment method
    if (order.paymentMethod !== 'momo') {
      return res.status(400).send('Phương thức thanh toán không hợp lệ');
    }

    // Check if already processed (prevent double processing)
    if (order.paymentStatus === 'paid') {
      return res.redirect(`/orders/${order._id}?msg=paid`);
    }

    // Process payment result
    if (String(resultCode) === '0') {
      order.paymentStatus = 'paid';
      order.status = 'preparing'; // Update order status to preparing after payment
      if (transId) order.momoTransId = String(transId);
      order.statusHistory.push({ 
        status: 'preparing', 
        updatedAt: new Date(), 
        note: 'Thanh toán Momo thành công - Đơn hàng đang được chuẩn bị' 
      });
      order.pointRewarded = true;
      await order.save();
      
      // NOTE: Stock will be decremented when admin marks order as 'done', not at payment
      // This prevents issues with order cancellation/refund
      
      // Update loyalty points (deduct used, add earned)
      try {
        const user = await User.findById(order.userID);
        if (user) {
          const pointsUsed = Math.floor((order.pointUsed || 0) / 1000);
          if (pointsUsed > 0) {
            user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) - pointsUsed);
          }
          if (order.pointEarned > 0) {
            user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0)) + order.pointEarned;
          }
          await user.save();
        }
      } catch (pointErr) {
        console.error('Update loyalty points error:', pointErr);
      }
      
      // Clear cart after successful payment
      try {
        const cart = await Cart.findOne({ userID: order.userID, isActive: true });
        if (cart) {
          cart.items = [];
          cart.totalPrice = 0;
          await cart.save();
        }
      } catch (cartErr) {
        console.error('Clear cart error:', cartErr);
      }
      
      // Increment coupon usage
      if (order.couponID) {
        try {
          const Coupon = require('../models/Coupon');
          await Coupon.findByIdAndUpdate(order.couponID, { $inc: { usedCount: 1 } });
        } catch (couponErr) {
          console.error('Update coupon usage error:', couponErr);
        }
      }
      
      // Clear checkout session
      if (req.session) {
        delete req.session.checkoutCoupon;
        delete req.session.checkoutDraft;
      }
      
      return res.redirect(`/orders/${order._id}?msg=paid`);

      // Payment failed or cancelled by user
    }
    order.paymentStatus = 'failed';
    order.status = 'canceled';
    order.cancelReason = `Người dùng hủy thanh toán Momo (resultCode: ${resultCode})`;
    order.canceledAt = new Date();
    order.statusHistory.push({ 
      status: 'canceled', 
      updatedAt: new Date(), 
      note: `Người dùng hủy thanh toán Momo: ${message || resultCode}` 
    });
    await order.save();
    return res.redirect(`/orders/${order._id}?msg=pay_failed`);
  } catch (e) {
    console.error('returnHandler error:', e);
    return res.status(500).send('Lỗi xử lý kết quả thanh toán');
  }
};

// IPN callback (server-to-server) from Momo
exports.ipnHandler = async (req, res) => {
  try {
    const ipnData = req.body || {};
    
    // Verify signature for security (CRITICAL)
    const isValid = momoService.verifyIpnSignature(ipnData);
    if (!isValid) {
      console.error('IPN signature verification failed:', ipnData);
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const { orderId, resultCode, transId, message } = ipnData;
    
        // Validate orderId
        if (!orderId) {
          return res.status(400).json({ error: 'Missing orderId' });
        }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prevent duplicate processing
    if (order.paymentStatus === 'paid') {
      return res.json({ resultCode: 0, message: 'Already processed' });
    }

    // Process IPN result
    if (String(resultCode) === '0') {
      order.paymentStatus = 'paid';
      order.status = 'preparing'; // Update order status to preparing after payment
      order.momoTransId = transId ? String(transId) : undefined;
      order.statusHistory.push({ 
        status: 'preparing', 
        updatedAt: new Date(), 
        note: 'IPN xác nhận thanh toán thành công - Đơn hàng đang được chuẩn bị' 
      });
      order.pointRewarded = true;
      
      // NOTE: Stock will be decremented when admin marks order as 'done'
      
      // Update loyalty points (deduct used, add earned)
      try {
        const user = await User.findById(order.userID);
        if (user) {
          const pointsUsed = Math.floor((order.pointUsed || 0) / 1000);
          if (pointsUsed > 0) {
            user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) - pointsUsed);
          }
          if (order.pointEarned > 0) {
            user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0)) + order.pointEarned;
          }
          await user.save();
        }
      } catch (pointErr) {
        console.error('IPN update loyalty points error:', pointErr);
      }
      
      // Clear cart after successful payment
      try {
        const cart = await Cart.findOne({ userID: order.userID, isActive: true });
        if (cart) {
          cart.items = [];
          cart.totalPrice = 0;
          await cart.save();
        }
      } catch (cartErr) {
        console.error('IPN clear cart error:', cartErr);
      }
      
      // Increment coupon usage
      if (order.couponID) {
        try {
          const Coupon = require('../models/Coupon');
          await Coupon.findByIdAndUpdate(order.couponID, { $inc: { usedCount: 1 } });
        } catch (couponErr) {
          console.error('IPN update coupon usage error:', couponErr);
        }
      }
    } else {
      // Payment failed or cancelled by user
      order.paymentStatus = 'failed';
      order.status = 'canceled';
      order.cancelReason = `Người dùng hủy thanh toán Momo (resultCode: ${resultCode})`;
      order.canceledAt = new Date();
      order.statusHistory.push({ 
        status: 'canceled', 
        updatedAt: new Date(), 
        note: `IPN: Người dùng hủy thanh toán Momo (${message || resultCode})` 
      });

    }
    await order.save();
    return res.json({ resultCode: 0, message: 'Success' });
  } catch (err) {
    console.error('ipnHandler error:', err);
    return res.status(500).json({ error: 'IPN internal error' });
  }
};
