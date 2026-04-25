// src/config/secret.test.ts
import { config } from 'dotenv';
config({ path: '.env.test' }); // load file .env.test thay vì .env

export const SecretTestConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT as string, 10) || 3307,
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'myapp_test', // .env.test sẽ có giá trị này
  },
};
