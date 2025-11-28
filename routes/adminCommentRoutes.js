const express = require('express');
const adminComment = require('../controllers/admin/adminCommentController');

const router = express.Router();

router.get('/', adminComment.list);
router.post('/:id/delete', adminComment.remove);

module.exports = router;
