const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminProduct = require('../controllers/adminProductController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.get('/', adminProduct.list);
router.get('/new', adminProduct.renderCreate);
router.post('/', upload.array('images', 6), adminProduct.create);
router.get('/:id/edit', adminProduct.renderEdit);
router.post('/:id', upload.array('images', 6), adminProduct.update);
router.post('/:id/delete', adminProduct.remove);

module.exports = router;
