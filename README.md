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
└── backend/              # Vercel API (deploy separately)
```

---

## Quick Start (Local Development)

### 1. Load Extension in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select the `Extension` folder

### 2. Deploy Backend to Vercel

```bash
cd backend

# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Set Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables:

```
OPENAI_API_KEY=sk-your-openai-api-key
```

### 4. Update Extension API URL

In `popup/popup.js`, update the API_URL:

```javascript
const CONFIG = {
  API_URL: 'https://your-project.vercel.app/api',
  // ...
};
```

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
3. Set up webhook to validate licenses
4. Update checkout URL in extension code

---

## Chrome Web Store Publishing

1. Create developer account: [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay $5 one-time fee
3. Prepare assets:
   - 128x128 icon (PNG)
   - At least one 1280x800 screenshot
   - Description and privacy policy
4. Upload and submit for review

---

## Tech Stack

- **Extension**: JavaScript, HTML, CSS (Manifest V3)
- **Backend**: Vercel Functions (Node.js)
- **AI**: OpenAI GPT-4o-mini
- **Payments**: LemonSqueezy

---

## License

MIT License
