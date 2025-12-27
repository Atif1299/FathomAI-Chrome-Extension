# FathomAI Backend API

Express.js API for FathomAI Chrome Extension.

## Deploy to GCP Cloud Run

### Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- Docker installed (optional, Cloud Build handles it)

### Quick Deploy

```bash
# Navigate to backend folder
cd backend

# Set your project ID
export PROJECT_ID=your-gcp-project-id

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Deploy to Cloud Run
gcloud run deploy fathom-ai-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=sk-your-api-key-here
```

### After Deployment

You'll get a URL like:
```
https://fathom-ai-api-xxxxx-uc.a.run.app
```

Update this URL in the extension:
1. Open `popup/popup.js`
2. Change `API_URL` to your Cloud Run URL

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `PORT` | Server port (default: 8080) |

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Health check |
| POST | `/api/summarize` | Summarize content |
| POST | `/api/keypoints` | Extract key points |
| POST | `/api/ask` | Q&A (Pro only) |
| POST | `/api/validate-license` | Validate license |

### Local Development

```bash
# Install dependencies
npm install

# Create .env file
echo "OPENAI_API_KEY=sk-your-key" > .env

# Run locally
npm run dev
```

Server runs at `http://localhost:8080`
