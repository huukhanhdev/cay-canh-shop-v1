const express = require('express');
const router = express.Router();
const cartCtrl = require('../controllers/cartController');

router.get('/', cartCtrl.getCheckout);
router.post('/', cartCtrl.postCheckout);
router.get('/success', cartCtrl.checkoutSuccess);

// Coupon endpoints
router.post('/apply-coupon', cartCtrl.applyCoupon);
router.post('/remove-coupon', cartCtrl.removeCoupon);

module.exports = router;
