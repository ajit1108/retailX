const formatWhatsAppNotification = (notification) => {
  return [
    `RetailX Notification: ${notification.title}`,
    `Type: ${notification.type}`,
    `Message: ${notification.message}`,
    `Time: ${notification.createdAt.toISOString()}`,
  ].join('\n');
};

const sendWhatsAppMessage = async (mobile, notification) => {
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';
  const text = formatWhatsAppNotification(notification);

  if (provider === 'mock') {
    console.log(`Mock WhatsApp message to ${mobile}:\n${text}`);
    return {
      sent: true,
      provider,
      message: text,
    };
  }

  return {
    sent: false,
    provider,
    error: 'Real WhatsApp provider is not configured yet',
  };
};

module.exports = {
  sendWhatsAppMessage,
};
