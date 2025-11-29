// Momo Payment Service (refactored from nodejs/MoMo.js sample)
const crypto = require('crypto');

class MomoService {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    this.accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    this.secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    this.redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:4000/payment/momo/return';
    this.ipnUrl = process.env.MOMO_IPN_URL || 'http://localhost:4000/payment/momo/ipn';
  }

  /**
   * Build HMAC SHA256 signature
   * @param {string} rawSignature - concatenated string to sign
   * @returns {string} hex signature
   */
  buildSignature(rawSignature) {
    return crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex');
  }

  /**
   * Create Momo payment request
   * @param {Object} params
   * @param {string} params.orderId - unique order ID
   * @param {number} params.amount - amount in VND
   * @param {string} params.orderInfo - order description
   * @param {string} params.extraData - base64 encoded extra data (optional)
   * @returns {Promise<Object>} Momo API response
   */
  async createPayment({ orderId, amount, orderInfo, extraData = '' }) {
    const requestId = `${this.partnerCode}-${orderId}-${Date.now()}`;
    const requestType = 'captureWallet';

    // Build raw signature following Momo spec
    const rawSignature = 
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${this.ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${this.partnerCode}` +
      `&redirectUrl=${this.redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = this.buildSignature(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };

    // Use fetch (Node 18+) or fallback
    const fetchFn = global.fetch || require('node:fetch');
    const response = await fetchFn(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    return data;
  }

  /**
   * Verify IPN signature from Momo callback
   * @param {Object} ipnData - IPN request body
   * @returns {boolean} true if signature is valid
   */
  verifyIpnSignature(ipnData) {
    const {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      orderType,
      transId,
      message,
      localMessage,
      responseTime,
      errorCode,
      payType,
      extraData = '',
      signature,
    } = ipnData;

    // Build raw signature for IPN (order matters!)
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${errorCode}` +
      `&transId=${transId}`;

    const expectedSignature = this.buildSignature(rawSignature);
    return expectedSignature === signature;
  }
}

module.exports = new MomoService();
