const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      default: 'general',
    },
    icon: {
      type: String,
      trim: true,
      default: 'notifications-outline',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    whatsapp: {
      attempted: {
        type: Boolean,
        default: false,
      },
      sent: {
        type: Boolean,
        default: false,
      },
      error: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, product: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
