import * as fs from 'fs';

const content = `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}
GOOGLE_CLIENT_EMAIL=${process.env.GOOGLE_CLIENT_EMAIL || ''}
GOOGLE_PRIVATE_KEY=${process.env.GOOGLE_PRIVATE_KEY || ''}
GOOGLE_PROJECT_ID=${process.env.GOOGLE_PROJECT_ID || ''}
GOOGLE_STORAGE_BUCKET=${process.env.GOOGLE_STORAGE_BUCKET || ''}`;

fs.writeFileSync('.env', content);
