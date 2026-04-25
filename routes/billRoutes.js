const express = require('express');

const {
  createBill,
  getBillById,
  getBills,
  getTodaySalesSummary,
} = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createBill);
router.get('/', protect, getBills);
router.get('/summary/today', protect, getTodaySalesSummary);
router.get('/:id', protect, getBillById);

module.exports = router;
