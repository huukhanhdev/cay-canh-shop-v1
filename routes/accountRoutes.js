const express = require('express');
const router = express.Router();
const profileCtrl = require('../controllers/profileController');

router.get('/profile', profileCtrl.getProfile);
router.post('/profile', profileCtrl.updateProfile);
router.post('/profile/password', profileCtrl.updatePassword);
router.post('/addresses', profileCtrl.addAddress);
router.post('/addresses/:index/delete', profileCtrl.removeAddress);
router.post('/addresses/:index/default', profileCtrl.setDefaultAddress);

module.exports = router;
