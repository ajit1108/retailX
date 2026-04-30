const express = require('express');

const { sendWhatsApp } = require('../controllers/whatsappController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, sendWhatsApp);

module.exports = router;
