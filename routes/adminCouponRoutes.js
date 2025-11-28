const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin/adminCouponController');

router.get('/', ctrl.list);
router.post('/create', ctrl.create);
router.post('/:id/toggle', ctrl.toggle);
router.post('/:id/delete', ctrl.remove);
router.get('/:id/orders', ctrl.ordersUsed);

module.exports = router;
