@'
# Video Analysis Chat Interface

A minimal chat-like interface for video analysis using FastAPI, Google Cloud Video Intelligence API, and Claude 3.5.

## Features

- 🎥 Upload videos up to 1 minute long
- 📊 Multi-stage video analysis
- 🔍 Shot change detection
- 🎯 Object and action recognition
- 🏷️ Label detection
- 📝 Detailed scene interpretation
- 💻 Minimal dark-themed chat interface
- 📱 Responsive design
- 🖱️ Drag & drop support

## Prerequisites

- Python 3.8+
- Google Cloud project with Video Intelligence API enabled
- Google Cloud credentials
- Anthropic API key for Claude 3.5

## Deployment

1. Install dependencies:
'@ | Out-File -FilePath README.md -Encoding utf8

After deploying, visit the `/api/debug-creds` endpoint to verify the environment variables are properly set. Let me know what you see!
