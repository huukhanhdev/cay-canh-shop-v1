// Momo payment integration controller (using momoService)
const Order = require('../models/Order');
const User = require('../models/User');
const Cart = require('../models/Cart');
const momoService = require('../services/momoService');

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

    // Validate cart total
    const subtotal = cart.totalPrice || 0;
    if (subtotal <= 0) {
      return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    }

    const amount = subtotal;

    // Create order draft first
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
      totalPrice: amount,
      paymentMethod: 'momo',
      paymentStatus: 'pending',
      status: 'pending',
      statusHistory: [ { status: 'pending', updatedAt: new Date(), note: 'Tạo đơn chờ thanh toán Momo' } ],
    });
    await order.save();

    const orderId = order._id.toString();
    const extraData = Buffer.from(JSON.stringify({ oid: orderId })).toString('base64');

    const momoResp = await momoService.createPayment({
      orderId,
      amount,
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
      if (transId) order.momoTransId = String(transId);
      order.statusHistory.push({ 
        status: order.status, 
        updatedAt: new Date(), 
        note: 'Thanh toán Momo thành công' 
      });
      await order.save();
      return res.redirect(`/orders/${order._id}?msg=paid`);

      // Payment failed
    }
    order.paymentStatus = 'failed';
    order.statusHistory.push({ 
      status: order.status, 
      updatedAt: new Date(), 
      note: `Thanh toán thất bại: ${message || resultCode}` 
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
      order.momoTransId = transId ? String(transId) : undefined;
      order.statusHistory.push({ 
        status: order.status, 
        updatedAt: new Date(), 
        note: 'IPN xác nhận thanh toán thành công' 
      });
    } else {
      order.paymentStatus = 'failed';
      order.statusHistory.push({ 
        status: order.status, 
        updatedAt: new Date(), 
        note: `IPN thất bại: ${message || resultCode}` 
      });

    }
    await order.save();
    return res.json({ resultCode: 0, message: 'Success' });
  } catch (err) {
    console.error('ipnHandler error:', err);
    return res.status(500).json({ error: 'IPN internal error' });
  }
};
