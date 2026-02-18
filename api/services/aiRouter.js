/**
 * AI Router
 * Routes requests to appropriate AI provider based on model selection
 */

const groqProvider = require('../providers/groqProvider');
const openaiProvider = require('../providers/openaiProvider');
const geminiProvider = require('../providers/geminiProvider');

const providers = {
  groq: groqProvider,
  openai: openaiProvider,
  gemini: geminiProvider
};

/**
 * Generate content using selected AI model
 * @param {string} model - 'groq', 'openai', or 'gemini'
 * @param {string} prompt - User prompt
 * @param {object} options - Additional options
 * @returns {Promise<string>} Generated content
 */
async function generate(model, prompt, options = {}) {
  // Default to groq if invalid model
  const selectedModel = model || 'groq';
  const provider = providers[selectedModel] || providers.groq;

  if (!provider) {
    throw new Error(`Provider not found: ${selectedModel}`);
  }

  try {
    const result = await provider.generate(prompt, options);
    return result;
  } catch (error) {
    // If selected provider fails, try fallback to groq
    if (selectedModel !== 'groq') {
      console.warn(`[AIRouter] ${selectedModel} failed, falling back to groq:`, error.message);
      return await providers.groq.generate(prompt, options);
    }
    throw error;
  }
}

/**
 * Check if provider is available
 * @param {string} model - Model name
 * @returns {boolean}
 */
function isAvailable(model) {
  const provider = providers[model];
  return provider && provider.isConfigured();
}

/**
 * Get list of available models
 * @returns {Array<{id: string, name: string}>}
 */
function getAvailableModels() {
  return [
    { id: 'groq', name: 'Fast (Groq)', available: isAvailable('groq') },
    { id: 'openai', name: 'Smart (GPT)', available: isAvailable('openai') },
    { id: 'gemini', name: 'Balanced (Gemini)', available: isAvailable('gemini') }
  ].filter(m => m.available);
}

module.exports = {
  generate,
  isAvailable,
  getAvailableModels
};
