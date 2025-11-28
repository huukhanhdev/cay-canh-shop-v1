const express = require('express');
const router = express.Router();
const adminCustomer = require('../controllers/admin/adminCustomerController');

router.get('/', adminCustomer.list);
router.get('/:id', adminCustomer.detail);
router.post('/:id', adminCustomer.update);

module.exports = router;
