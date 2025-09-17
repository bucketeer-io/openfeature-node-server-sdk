import { defineBKTConfig } from '@bucketeer/openfeature-node-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

export const bucketeerConfig = defineBKTConfig({
  apiKey: process.env.BUCKETEER_API_KEY!,
  apiEndpoint: process.env.BUCKETEER_API_ENDPOINT!,
  featureTag: process.env.BUCKETEER_FEATURE_TAG!,
  appVersion: process.env.BUCKETEER_APP_VERSION || '1.0.0',
});

export const defaultContext = {
  targetingKey: process.env.USER_ID || 'example_user_123',
  email: process.env.USER_EMAIL || 'user@example.com',
  plan: process.env.USER_PLAN || 'free',
  timestamp: new Date().toISOString(),
};
