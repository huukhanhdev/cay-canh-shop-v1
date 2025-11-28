const express = require('express');
const router = express.Router();
const adminOrder = require('../controllers/admin/adminOrderController');

router.get('/', adminOrder.list);
router.get('/:id', adminOrder.detail);
router.post('/:id/status', adminOrder.updateStatus);

module.exports = router;
