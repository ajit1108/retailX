const express = require('express');

const {
  clearNotifications,
  createNotification,
  deleteNotification,
  getNotifications,
  markNotificationRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getNotifications);
router.post('/', protect, createNotification);
router.patch('/:id/read', protect, markNotificationRead);
router.delete('/:id', protect, deleteNotification);
router.delete('/', protect, clearNotifications);

module.exports = router;
