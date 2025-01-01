require('dotenv').config();

console.log('Environment Check:');
console.log('------------------');
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
if (process.env.ANTHROPIC_API_KEY) {
  console.log('Key prefix:', process.env.ANTHROPIC_API_KEY.substring(0, 8) + '...');
}
console.log('------------------');
console.log('Current .env file content:');

const fs = require('fs');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log('File exists:', !!envContent);
  console.log('File length:', envContent.length);
  console.log('File content (first 50 chars):', envContent.substring(0, 50));
  console.log('Raw content:', Buffer.from(envContent).toString('hex'));
} catch (error) {
  console.log('Error reading .env file:', error);
} 