# FathomAI - AI Reading Assistant

A Chrome extension that helps users understand web content through AI-powered summarization, key points extraction, and Q&A.

## Project Structure

```
Extension/
├── manifest.json         # Extension configuration
├── popup/                # Main popup UI
├── content/              # Content script (extracts page text)
├── background/           # Service worker
├── options/              # Settings page
├── assets/icons/         # Extension icons
└── backend/              # GCP Cloud Run API
```

---

## Quick Start

### 1. Load Extension in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select the `Extension` folder

### 2. Deploy Backend to GCP Cloud Run

```bash
cd backend

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# Deploy
gcloud run deploy fathom-ai-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=sk-your-key
```

### 3. Update Extension API URL

In `popup/popup.js`, update the API_URL with your Cloud Run URL.

---

## Business Model

| Tier | Features | Limit |
|------|----------|-------|
| Free | Summarize, Key Points | 3/day |
| Pro ($7/mo) | All features + Q&A + Unlimited | ∞ |

---

## Setting Up LemonSqueezy

1. Create account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create a product: "FathomAI Pro" - $7/month
3. Update checkout URL in extension code

---

## Chrome Web Store Publishing

1. Create developer account ($5 one-time fee)
2. Prepare: 128x128 PNG icon, 1280x800 screenshot
3. Upload and submit for review

---

## Tech Stack

- **Extension**: JavaScript, HTML, CSS (Manifest V3)
- **Backend**: GCP Cloud Run (Node.js/Express)
- **AI**: OpenAI GPT-4o-mini
- **Payments**: LemonSqueezy

---

## License

MIT License
