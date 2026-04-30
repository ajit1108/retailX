const { sendWhatsAppMessage } = require('../services/whatsappService');

const sendWhatsApp = async (req, res) => {
  try {
    const to = String(req.body.to || req.user.mobile || '').trim();
    const message = String(req.body.message || '').trim();

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient mobile number is required',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required',
      });
    }

    const result = await sendWhatsAppMessage(to, message);

    if (!result.sent) {
      return res.status(502).json({
        success: false,
        message: result.error || 'Failed to send WhatsApp message',
        provider: result.provider,
      });
    }

    return res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      provider: result.provider,
      messageId: result.messageId || '',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send WhatsApp message',
      error: error.message,
    });
  }
};

module.exports = {
  sendWhatsApp,
};
