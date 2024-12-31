/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
  serverRuntimeConfig: {
    BLOB_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    GOOGLE_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  },
  publicRuntimeConfig: {
    // Add any public runtime configs here if needed
  }
}

module.exports = nextConfig 