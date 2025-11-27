const nodemailer = require('nodemailer');

function makeTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return {
      sendMail: async (opts = {}) => {
        console.log('=== DEV MAIL (no SMTP configured) ===');
        console.log('To:   ', opts.to);
        console.log('Subj: ', opts.subject);
        console.log('Text: ', opts.text);
        console.log('HTML: ', opts.html);
        console.log('=====================================');
        return { messageId: 'dev-console-mail' };
      },
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const transporter = makeTransport();

async function sendMail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || '"Cay Canh Shop" <no-reply@caycanh.local>',
    to,
    subject,
    text,
    html,
  });
}

async function sendOTPEmail(to, otp) {
  const subject = 'Mã xác thực OTP';
  const text = `Mã OTP của bạn là: ${otp}. Hiệu lực 5 phút.`;
  const html = `<p>Mã OTP của bạn là: <b style="font-size:18px">${otp}</b></p><p>Hiệu lực 5 phút.</p>`;
  return sendMail({ to, subject, text, html });
}

async function sendOrderConfirmationEmail(to, order) {
  if (!to || !order) return;
  const orderCode = order._id.toString().slice(-8);
  const subject = `Xác nhận đơn hàng #${orderCode}`;
  const lines = [];
  lines.push(`Đơn hàng #${orderCode} đã được tạo thành công.`);
  lines.push(`Trạng thái hiện tại: ${order.status}`);
  lines.push(`Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VND`);
  if (order.discount) {
    lines.push(`Giảm giá: -${order.discount.toLocaleString('vi-VN')} VND`);
  }
  if (order.shippingFee) {
    lines.push(`Phí vận chuyển: ${order.shippingFee.toLocaleString('vi-VN')} VND`);
  }
  if (order.pointUsed) {
    lines.push(`Điểm đã sử dụng: ${order.pointUsed.toLocaleString('vi-VN')}`);
  }
  if (order.pointEarned) {
    lines.push(`Điểm nhận được: ${order.pointEarned.toLocaleString('vi-VN')}`);
  }
  lines.push('Sản phẩm:');
  order.items.forEach((it) => {
    lines.push(`- ${it.productName} x${it.quantity} (${(it.subTotal || 0).toLocaleString('vi-VN')} VND)`);
  });
  lines.push('Địa chỉ giao hàng:');
  lines.push(`${order.address.street}, ${order.address.district}, ${order.address.city}`);

  const text = lines.join('\n');
  const htmlItems = order.items.map(it => `<li>${it.productName} x${it.quantity} — <strong>${(it.subTotal||0).toLocaleString('vi-VN')} VND</strong></li>`).join('');
  const html = `
    <h2>Đơn hàng #${orderCode} tạo thành công</h2>
    <p><strong>Trạng thái:</strong> ${order.status}</p>
    <p><strong>Tổng tiền:</strong> ${order.totalPrice.toLocaleString('vi-VN')} VND</p>
    ${order.discount ? `<p><strong>Giảm giá:</strong> -${order.discount.toLocaleString('vi-VN')} VND</p>` : ''}
    ${order.shippingFee ? `<p><strong>Phí vận chuyển:</strong> ${order.shippingFee.toLocaleString('vi-VN')} VND</p>` : ''}
    ${order.pointUsed ? `<p><strong>Điểm sử dụng:</strong> ${order.pointUsed.toLocaleString('vi-VN')}</p>` : ''}
    ${order.pointEarned ? `<p><strong>Điểm nhận được:</strong> ${order.pointEarned.toLocaleString('vi-VN')}</p>` : ''}
    <h3>Sản phẩm</h3>
    <ul>${htmlItems}</ul>
    <h3>Địa chỉ giao hàng</h3>
    <p>${order.address.street}, ${order.address.district}, ${order.address.city}</p>
    <p>Cảm ơn bạn đã mua sắm tại cửa hàng cây cảnh!</p>
  `;
  return sendMail({ to, subject, text, html });
}

module.exports = { sendMail, sendOTPEmail, sendOrderConfirmationEmail };
