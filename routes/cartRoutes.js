const express = require('express');
const router = express.Router();
const cartCtrl = require('../controllers/cartController');

router.get('/', cartCtrl.viewCart);
router.post('/add', cartCtrl.addItem);
router.post('/update', cartCtrl.updateItem);

module.exports = router;
