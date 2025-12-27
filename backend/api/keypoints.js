/**
 * FathomAI API - Key Points Endpoint
 * POST /api/keypoints
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const usageCache = new Map();

export default async function handler(req, res) {
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
    
    // Rate limit check
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
    
    const truncated = content.substring(0, 15000);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract the most important key points from the content.

Guidelines:
- Extract exactly 5-7 key points
- Each point should be a complete, standalone insight
- Be specific and actionable
- Order by importance
- Format as a simple list, one point per line, no numbering or bullets`
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
    
    // Parse into array
    const keypoints = response
      .split('\n')
      .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(line => line.length > 0);
    
    return res.status(200).json({ keypoints });
    
  } catch (error) {
    console.error('Keypoints error:', error);
    return res.status(500).json({ 
      error: 'Failed to extract key points. Please try again.' 
    });
  }
}

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
    console.error('License validation error:', e);
  }
  
  return false;
}
