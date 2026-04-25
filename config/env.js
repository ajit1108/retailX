const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];

const validateEnv = () => {
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Create backend/.env using backend/.env.example as a guide.');
    process.exit(1);
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
  validateEnv,
};
