/**
 * FathomAI API - Summarize Endpoint
 * POST /api/summarize
 */

import OpenAI from 'openai';

// Initialize OpenAI with YOUR API key (from Vercel environment variables)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple in-memory rate limiting (use Redis in production)
const usageCache = new Map();

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { content, licenseKey } = req.body;
    
    if (!content || content.length < 100) {
      return res.status(400).json({ error: 'Content too short' });
    }
    
    // Check rate limit for free users
    const isPro = await validateLicense(licenseKey);
    
    if (!isPro) {
      const clientIp = req.headers['x-forwarded-for'] || 'unknown';
      const today = new Date().toDateString();
      const key = `${clientIp}-${today}`;
      const usage = usageCache.get(key) || 0;
      
      if (usage >= 3) {
        return res.status(429).json({ 
          error: 'Daily limit reached. Upgrade to Pro for unlimited access.' 
        });
      }
      
      usageCache.set(key, usage + 1);
    }
    
    // Truncate content
    const truncated = content.substring(0, 15000);
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert summarizer. Create a clear, concise summary that captures the main message and key insights.

Guidelines:
- Write 2-4 paragraphs
- Start with the main point
- Include important details
- Use clear, accessible language
- Don't use phrases like "This article discusses..." - present information directly`
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
    
    return res.status(200).json({ summary });
    
  } catch (error) {
    console.error('Summarize error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate summary. Please try again.' 
    });
  }
}

// Validate LemonSqueezy license (simplified - expand for production)
async function validateLicense(licenseKey) {
  if (!licenseKey) return false;
  
  // TODO: Call LemonSqueezy API to validate license
  // For now, accept any key that looks valid
  // In production, verify against your LemonSqueezy store
  
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.valid === true;
    }
  } catch (e) {
    console.error('License validation error:', e);
  }
  
  return false;
}
