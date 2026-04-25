const Notification = require('../models/Notification');
const { sendWhatsAppMessage } = require('./whatsappService');

const LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_DUPLICATE_WINDOW_HOURS = 24;

const getDuplicateWindowStart = () => {
  const date = new Date();
  date.setHours(date.getHours() - LOW_STOCK_DUPLICATE_WINDOW_HOURS);
  return date;
};

const createLowStockNotification = async (user, product) => {
  if (!product || product.quantity >= LOW_STOCK_THRESHOLD) {
    return null;
  }

  const existingNotification = await Notification.findOne({
    user: user._id,
    product: product._id,
    type: 'low_stock',
    createdAt: { $gte: getDuplicateWindowStart() },
  });

  if (existingNotification) {
    return existingNotification;
  }

  const notification = await Notification.create({
    user: user._id,
    product: product._id,
    title: 'Low Stock Alert',
    message: `${product.name} stock is below ${LOW_STOCK_THRESHOLD} units. Current stock: ${product.quantity}.`,
    type: 'low_stock',
    icon: 'warning-outline',
  });

  const whatsappResult = await sendWhatsAppMessage(user.mobile, notification);

  notification.whatsapp = {
    attempted: true,
    sent: Boolean(whatsappResult.sent),
    error: whatsappResult.error || '',
  };
  await notification.save();

  return notification;
};

module.exports = {
  createLowStockNotification,
};
