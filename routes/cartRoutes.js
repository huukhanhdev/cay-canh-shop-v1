const express = require('express');
const router = express.Router();
const cartCtrl = require('../controllers/cartController');

router.get('/', cartCtrl.viewCart);
router.post('/add', cartCtrl.addItem);
router.post('/update', cartCtrl.updateItem);

// JSON APIs for realtime updates
router.post('/api/add', cartCtrl.apiAddItem);
router.post('/api/update', cartCtrl.apiUpdateItem);
router.post('/api/remove', cartCtrl.apiRemoveItem);

module.exports = router;
