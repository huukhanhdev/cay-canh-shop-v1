const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const adminInventoryController = require('../controllers/admin/adminInventoryController');

// All routes require admin auth
router.use(requireAdmin);

// Inventory list
router.get('/', adminInventoryController.getInventoryList);

// Inventory logs
router.get('/logs', adminInventoryController.getInventoryLogs);

// Inventory detail
router.get('/:id', adminInventoryController.getInventoryDetail);

// Import stock
router.post('/:id/import', adminInventoryController.importStock);

// Export stock
router.post('/:id/export', adminInventoryController.exportStock);

// Adjust stock
router.post('/:id/adjust', adminInventoryController.adjustStock);

module.exports = router;
