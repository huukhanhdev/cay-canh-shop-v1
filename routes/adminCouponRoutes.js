const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminCouponController');

router.get('/', ctrl.list);
router.post('/create', ctrl.create);
router.post('/:id/toggle', ctrl.toggle);
router.post('/:id/delete', ctrl.remove);

module.exports = router;
