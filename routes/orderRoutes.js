const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');

router.get('/', orderCtrl.list);
router.post('/:id/cancel', orderCtrl.cancel);
router.get('/:id', orderCtrl.detail);

module.exports = router;
