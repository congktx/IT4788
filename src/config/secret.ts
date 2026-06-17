import { config } from 'dotenv';
config();

export const SecretConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT as string, 10) || 3306,
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'it4788_db',
  },
  r2: {
    bucket: process.env.R2_BUCKET || 'it4788',
    endpoint: process.env.R2_ENDPOINT || '',
    pub_endpoint: process.env.R2_PUB_ENDPOINT || '',
    access_key: process.env.R2_ACCESS_KEY || '',
    secret_key: process.env.R2_SECRET_KEY || '',
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  },

  openai: {
    api_key: process.env.OPENAI_API_KEY || '',
  },
  gemini: {
    api_key: process.env.GEMINI_API_KEY || '',
  },
};
