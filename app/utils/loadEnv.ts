import path from 'path';
import dotenv from 'dotenv';

export function loadEnvironmentVariables() {
  // Load .env.local first (higher priority)
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  // Then load .env (lower priority)
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  // Verify critical environment variables
  const requiredVars = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
    GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_STORAGE_BUCKET: process.env.GOOGLE_STORAGE_BUCKET
  };

  // Log environment status
  console.log('Environment variables loaded:', {
    anthropicKey: !!requiredVars.ANTHROPIC_API_KEY,
    anthropicKeyLength: requiredVars.ANTHROPIC_API_KEY?.length || 0,
    googleEmail: !!requiredVars.GOOGLE_CLIENT_EMAIL,
    googleProject: !!requiredVars.GOOGLE_PROJECT_ID,
    googleKey: !!requiredVars.GOOGLE_PRIVATE_KEY,
    googleBucket: !!requiredVars.GOOGLE_STORAGE_BUCKET,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV
  });

  return requiredVars;
} 