/**
 * Content Pack Feature
 * Generates complete content package for social media
 */

function buildPrompt(input) {
  const systemPrompt = `You are an expert content creator for beginner creators (0-5k followers).
Create a complete content pack optimized for viral growth.

Format your response with clear sections:

HOOK:
[3 attention-grabbing hooks]

SCRIPT:
[60-second video script with opening, value, and CTA]

CAPTION:
[Engaging caption with line breaks and call-to-action]

HASHTAGS:
[25-30 hashtags - mix of popular, medium, and niche]

CTA:
[3 different call-to-action options]

THUMBNAIL TEXT:
[3 punchy options for thumbnail text]`;

  const userPrompt = `Create a complete content pack for:

Topic: ${input.topic || input}
Platform: ${input.platform || 'Instagram'}
Duration: ${input.duration || '60 seconds'}
Target: Beginner creators (0-5k followers)

Generate ALL sections with specific, actionable content.`;

  return {
    systemPrompt,
    userPrompt,
    temperature: 0.8,
    maxTokens: 2500
  };
}

module.exports = {
  buildPrompt
};
