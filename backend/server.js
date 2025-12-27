/**
 * FathomAI API Server
 * Express.js backend for GCP Cloud Run
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins (Chrome extension)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting for free users (by IP)
const freeTierLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 requests per day per IP for free tier
  message: { error: 'Daily limit reached. Upgrade to Pro for unlimited access.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip || 'unknown';
  },
  skip: async (req) => {
    // Skip rate limiting for Pro users
    const licenseKey = req.body?.licenseKey;
    if (licenseKey) {
      const isValid = await validateLicense(licenseKey);
      return isValid;
    }
    return false;
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'FathomAI API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ===== API Endpoints =====

/**
 * POST /api/summarize
 * Generate summary of page content
 */
app.post('/api/summarize', freeTierLimiter, async (req, res) => {
  try {
    const { content, licenseKey } = req.body;
    
    if (!content || content.length < 100) {
      return res.status(400).json({ error: 'Content too short to summarize' });
    }
    
    const truncated = content.substring(0, 15000);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert summarizer. Create a clear, concise summary.

Guidelines:
- Write 2-4 paragraphs
- Start with the main point
- Include key details
- Use clear language
- Don't say "This article discusses..." - present information directly`
        },
        {
          role: 'user',
          content: `Summarize this:\n\n${truncated}`
        }
      ],
      max_tokens: 600,
      temperature: 0.7
    });
    
    const summary = completion.choices[0].message.content;
    res.json({ summary });
    
  } catch (error) {
    console.error('Summarize error:', error.message);
    res.status(500).json({ error: 'Failed to generate summary. Please try again.' });
  }
});

/**
 * POST /api/keypoints
 * Extract key points from content
 */
app.post('/api/keypoints', freeTierLimiter, async (req, res) => {
  try {
    const { content, licenseKey } = req.body;
    
    if (!content || content.length < 100) {
      return res.status(400).json({ error: 'Content too short' });
    }
    
    const truncated = content.substring(0, 15000);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract key points from the content.

Guidelines:
- Extract 5-7 points
- Each point should be standalone
- Be specific
- Order by importance
- One point per line, no numbering`
        },
        {
          role: 'user',
          content: `Extract key points:\n\n${truncated}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    
    const response = completion.choices[0].message.content;
    const keypoints = response
      .split('\n')
      .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(line => line.length > 0);
    
    res.json({ keypoints });
    
  } catch (error) {
    console.error('Keypoints error:', error.message);
    res.status(500).json({ error: 'Failed to extract key points.' });
  }
});

/**
 * POST /api/ask
 * Q&A about page content (Pro only)
 */
app.post('/api/ask', async (req, res) => {
  try {
    const { question, content, licenseKey } = req.body;
    
    if (!question?.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (!content || content.length < 50) {
      return res.status(400).json({ error: 'Content too short' });
    }
    
    // Verify Pro license
    const isPro = await validateLicense(licenseKey);
    if (!isPro) {
      return res.status(403).json({ error: 'This feature requires a Pro subscription.' });
    }
    
    const truncated = content.substring(0, 12000);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Answer questions about the page content.

Guidelines:
- Answer based ONLY on the provided content
- Be direct and helpful
- If unclear, say so
- Keep answers concise`
        },
        {
          role: 'user',
          content: `Content:\n\n${truncated}\n\n---\n\nQuestion: ${question}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    });
    
    const answer = completion.choices[0].message.content;
    res.json({ answer });
    
  } catch (error) {
    console.error('Ask error:', error.message);
    res.status(500).json({ error: 'Failed to answer question.' });
  }
});

/**
 * POST /api/validate-license
 * Validate a license key
 */
app.post('/api/validate-license', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.json({ valid: false });
    }
    
    const isValid = await validateLicense(licenseKey);
    res.json({ valid: isValid });
    
  } catch (error) {
    console.error('Validation error:', error.message);
    res.json({ valid: false });
  }
});

// ===== License Validation =====
async function validateLicense(licenseKey) {
  if (!licenseKey) return false;
  
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ license_key: licenseKey })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.valid === true;
    }
  } catch (e) {
    console.error('License validation failed:', e.message);
  }
  
  return false;
}

// Start server
app.listen(PORT, () => {
  console.log(`FathomAI API running on port ${PORT}`);
});
