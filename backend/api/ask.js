/**
 * FathomAI API - Ask Endpoint (Pro only)
 * POST /api/ask
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { question, content, licenseKey } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (!content || content.length < 50) {
      return res.status(400).json({ error: 'Content too short' });
    }
    
    // Pro feature - require valid license
    const isPro = await validateLicense(licenseKey);
    
    if (!isPro) {
      return res.status(403).json({ 
        error: 'This feature requires a Pro subscription.' 
      });
    }
    
    const truncated = content.substring(0, 12000);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about web page content.

Guidelines:
- Answer based ONLY on the provided content
- Be direct and helpful
- If the answer isn't in the content, say so
- Keep answers concise but complete
- Use a friendly tone`
        },
        {
          role: 'user',
          content: `Page content:\n\n${truncated}\n\n---\n\nQuestion: ${question}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    });
    
    const answer = completion.choices[0].message.content;
    
    return res.status(200).json({ answer });
    
  } catch (error) {
    console.error('Ask error:', error);
    return res.status(500).json({ 
      error: 'Failed to answer question. Please try again.' 
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
