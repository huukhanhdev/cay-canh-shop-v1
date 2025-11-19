const express = require('express');
const router = express.Router();
const cartCtrl = require('../controllers/cartController');

router.get('/', cartCtrl.getCheckout);
router.post('/', cartCtrl.postCheckout);
router.get('/success', cartCtrl.checkoutSuccess);

module.exports = router;
