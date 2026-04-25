const Notification = require('../models/Notification');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

const createNotification = async (req, res) => {
  try {
    const { title, message, type, icon } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide notification title and message',
      });
    }

    const notification = await Notification.create({
      user: req.user._id,
      title,
      message,
      type: type || 'general',
      icon: icon || 'notifications-outline',
    });

    const whatsappResult = await sendWhatsAppMessage(req.user.mobile, notification);

    notification.whatsapp = {
      attempted: true,
      sent: Boolean(whatsappResult.sent),
      error: whatsappResult.error || '',
    };
    await notification.save();

    return res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification,
      whatsapp: whatsappResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message,
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

const clearNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ user: req.user._id });

    return res.json({
      success: true,
      message: 'Notifications cleared successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message,
    });
  }
};

module.exports = {
  clearNotifications,
  createNotification,
  deleteNotification,
  getNotifications,
  markNotificationRead,
};
