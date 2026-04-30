const META_API_VERSION = 'v22.0';
const REQUEST_TIMEOUT_MS = 8000;
const { getWhatsAppConfig } = require('../config/env');

const formatWhatsAppNotification = (notification) => {
  return [
    `RetailX Notification: ${notification.title}`,
    `Type: ${notification.type}`,
    `Message: ${notification.message}`,
    `Time: ${notification.createdAt.toISOString()}`,
  ].join('\n');
};

const normalizePhoneNumber = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
};

const buildTextPayload = (payload) => {
  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (payload?.message) {
    return String(payload.message).trim();
  }

  if (payload?.title && payload?.createdAt) {
    return formatWhatsAppNotification(payload);
  }

  return '';
};

const sendViaMeta = async (to, text) => {
  const { accessToken, enabled, phoneNumberId } = getWhatsAppConfig();

  if (!enabled || !accessToken || !phoneNumberId) {
    console.error('Missing WhatsApp configuration in environment variables');
    return {
      sent: false,
      provider: 'meta',
      error: 'Missing WhatsApp configuration in environment variables',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestUrl = `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`;
    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    console.log('WhatsApp API request:', {
      url: requestUrl,
      to,
      phoneNumberId,
      payload: requestBody,
    });

    const response = await fetch(
      requestUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    const data = await response.json();
    console.log('WhatsApp API response:', {
      status: response.status,
      ok: response.ok,
      data,
    });

    if (!response.ok) {
      return {
        sent: false,
        provider: 'meta',
        error:
          data?.error?.message || data?.message || 'Meta WhatsApp API request failed',
      };
    }

    return {
      sent: true,
      provider: 'meta',
      messageId: data?.messages?.[0]?.id || '',
    };
  } catch (error) {
    console.error('WhatsApp API error:', error.message);
    return {
      sent: false,
      provider: 'meta',
      error: error.name === 'AbortError' ? 'WhatsApp request timed out' : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const sendWhatsAppMessage = async (mobile, payload) => {
  const { enabled, provider } = getWhatsAppConfig();
  const to = normalizePhoneNumber(mobile);
  const text = buildTextPayload(payload);

  if (!to) {
    return {
      sent: false,
      provider,
      error: 'Recipient mobile number is missing or invalid',
    };
  }

  if (!text) {
    return {
      sent: false,
      provider,
      error: 'WhatsApp message text is required',
    };
  }

  if (provider === 'mock') {
    console.warn('WhatsApp provider is mock. Message was not sent.', {
      to,
      text,
    });
    return {
      sent: false,
      provider,
      error: 'WhatsApp provider is set to mock',
    };
  }

  if (!enabled) {
    return {
      sent: false,
      provider,
      error: 'Missing WhatsApp configuration in environment variables',
    };
  }

  return sendViaMeta(to, text);
};

module.exports = {
  sendWhatsAppMessage,
};
