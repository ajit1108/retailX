const express = require('express');

const { syncProducts } = require('../controllers/syncController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, syncProducts);

module.exports = router;
