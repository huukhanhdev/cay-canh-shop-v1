const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const paymentCtrl = require('../controllers/paymentController');

// Momo routes
router.post('/momo/create', requireLogin, paymentCtrl.createMomoPayment);
router.get('/momo/return', paymentCtrl.returnHandler);
router.post('/momo/ipn', paymentCtrl.ipnHandler);

module.exports = router;
