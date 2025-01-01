const { readFileSync, writeFileSync } = require('fs');
const { GoogleAuth } = require('google-auth-library');

async function getAccessToken() {
  try {
    const keyFile = JSON.parse(
      readFileSync('./scenecut-key.json', 'utf8')
    );

    const auth = new GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    // Write token directly to .env.local
    writeFileSync('.env.local', `GOOGLE_ACCESS_TOKEN=${token.token}\n`);

    console.log('\nToken has been written to .env.local');
    console.log(`Token length: ${token.token.length} characters`);
    console.log(`Expires: ${new Date(token.res?.data.expiry_date)}`);
    
    // Also show the token for verification
    console.log('\nToken preview:');
    console.log(token.token.substring(0, 20) + '...' + token.token.substring(token.token.length - 20));
  } catch (error) {
    console.error('Error getting token:', error);
  }
}

getAccessToken(); 