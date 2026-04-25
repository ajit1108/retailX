const express = require('express');

const {
  getAnalytics,
  getOccasionInsight,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getAnalytics);
router.post('/occasion', protect, getOccasionInsight);

module.exports = router;
