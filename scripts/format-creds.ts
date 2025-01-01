import { readFileSync, writeFileSync } from 'fs';

try {
  // Read the service account key file
  const rawCreds = readFileSync('./service-account.json', 'utf8');
  const creds = JSON.parse(rawCreds);

  // Format the environment variables
  const envContent = `
GOOGLE_CLIENT_EMAIL=${creds.client_email}
GOOGLE_PRIVATE_KEY="${creds.private_key.replace(/\n/g, '\\n')}"
GOOGLE_PROJECT_ID=${creds.project_id}
GOOGLE_STORAGE_BUCKET=scenecut
`;

  // Write to .env.local
  writeFileSync('.env.local', envContent.trim());
  console.log('Credentials formatted and saved to .env.local');

} catch (error) {
  console.error('Error formatting credentials:', error);
  process.exit(1);
}
