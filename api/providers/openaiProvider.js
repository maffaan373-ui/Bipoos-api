/**
 * OpenAI Provider
 * Uses OpenAI GPT API for smart AI generation
 */

async function generate(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured in environment variables');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are a helpful AI assistant for content creators.' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function isConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

module.exports = {
  generate,
  isConfigured
};
