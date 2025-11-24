const express = require('express');
const adminComment = require('../controllers/adminCommentController');

const router = express.Router();

router.get('/', adminComment.list);
router.post('/:id/delete', adminComment.remove);

module.exports = router;
