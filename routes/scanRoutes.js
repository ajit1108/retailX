const express = require('express');

const { scanProduct } = require('../controllers/scanController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, scanProduct);

module.exports = router;
