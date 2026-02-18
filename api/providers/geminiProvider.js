/**
 * Google Gemini Provider
 * Uses Gemini API for balanced AI generation
 */

async function generate(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in environment variables');
  }

  const model = options.model || 'gemini-1.5-flash';
  const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant for content creators.';
  
  // Gemini uses different format - combine system and user prompt
  const fullPrompt = `${systemPrompt}\n\nUser request: ${prompt}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
          topP: options.topP || 0.9
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
}

function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

module.exports = {
  generate,
  isConfigured
};
