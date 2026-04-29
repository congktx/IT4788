import { S3Client } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import { SecretConfig } from './secret';
config();

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: SecretConfig.r2.endpoint,
  credentials: {
    accessKeyId: SecretConfig.r2.access_key,
    secretAccessKey: SecretConfig.r2.secret_key,
  },
});