/**
 * Improve Content Feature
 * Rewrites, formats, and boosts engagement
 */

function buildPrompt(input) {
  const action = input.action || 'rewrite';
  
  const prompts = {
    rewrite: {
      system: 'You are an expert content editor. Rewrite content to be more engaging, clear, and compelling while keeping the core message. Make it mobile-friendly and scannable.',
      user: `Rewrite this content to be more engaging:\n\n${input.content || input}\n\nKeep the message but make it punchy and scroll-stopping.`
    },
    
    engagement: {
      system: 'You are a social media engagement specialist. Add hooks, questions, CTAs, and emotional triggers to boost engagement. Keep it natural and authentic.',
      user: `Boost engagement for this content:\n\n${input.content || input}\n\nAdd engagement elements: questions, CTAs, emotional hooks. Keep it natural.`
    },
    
    format: {
      system: 'You are a mobile-first content formatter. Structure content for maximum readability with line breaks, emojis (when appropriate), and clear sections.',
      user: `Format this content for mobile:\n\n${input.content || input}\n\nMake it scannable, visually appealing, with proper spacing and structure.`
    }
  };

  const selected = prompts[action] || prompts.rewrite;

  return {
    systemPrompt: selected.system,
    userPrompt: selected.user,
    temperature: 0.7,
    maxTokens: 1500
  };
}

module.exports = {
  buildPrompt
};
