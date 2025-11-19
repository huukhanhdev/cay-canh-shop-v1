const express = require('express');
const router = express.Router();
const shop = require('../controllers/shopController');
const { requireLogin } = require('../middleware/auth');

router.get('/', shop.list);
router.post('/:slug/comments', shop.addComment);
router.post('/:slug/rating', requireLogin, shop.addRating);
router.get('/:slug', shop.detail);

module.exports = router;
