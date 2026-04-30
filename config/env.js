const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];

const ownerWhatsAppEnvKeys = [
  'OWNER_WHATSAPP_NUMBER',
  'OWNER_MOBILE',
  'ADMIN_WHATSAPP_NUMBER',
  'ADMIN_MOBILE',
];

const getOwnerWhatsAppNumber = () => {
  for (const key of ownerWhatsAppEnvKeys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }

  return '';
};

const getWhatsAppConfig = () => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';
  const ownerNumber = getOwnerWhatsAppNumber();
  const enabled = Boolean(accessToken && phoneNumberId);

  return {
    enabled,
    accessToken,
    phoneNumberId,
    ownerNumber,
    provider,
  };
};

const validateEnv = () => {
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Create backend/.env using backend/.env.example as a guide.');
    process.exit(1);
  }

  const whatsappConfig = getWhatsAppConfig();

  if (!whatsappConfig.enabled) {
    console.error('Missing WhatsApp configuration in environment variables');
  }

  if (!whatsappConfig.ownerNumber) {
    console.warn('Owner WhatsApp number not configured');
  }
};

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing from environment variables');
  }

  return process.env.JWT_SECRET;
};

module.exports = {
  getJwtSecret,
  getOwnerWhatsAppNumber,
  getWhatsAppConfig,
  validateEnv,
};
