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
    bucket: process.env.R2_BUCKET || "it4788",
    endpoint: process.env.R2_ENDPOINT || "",
    access_key: process.env.R2_ACCESS_KEY || "",
    secret_key: process.env.R2_SECRET_KEY || ""
  }
};
