/**
 * Monetization Feature
 * Creates brand pitches, collab DMs, and service offers
 */

function buildPrompt(input) {
  const type = input.type || 'brandPitch';
  
  const prompts = {
    brandPitch: {
      system: `You are an expert at writing brand collaboration pitch emails for small creators.
Create professional, compelling pitches that show value and ROI.
Keep it concise, genuine, and results-focused.`,
      user: `Write a brand pitch email for:

Creator: ${input.creatorName || '[Your Name]'}
Niche: ${input.niche || '[Your Niche]'}
Followers: ${input.followers || '[Follower Count]'}
Brand: ${input.brandName || '[Brand Name]'}
Why good fit: ${input.reason || '[Why this partnership works]'}

Include: Strong intro, value proposition, engagement stats, collaboration ideas, clear CTA.
Keep under 200 words.`
    },
    
    collabDM: {
      system: `You are an expert at writing collaboration DMs that get responses.
Keep it casual, genuine, specific, and value-focused.
No generic templates - make it personal.`,
      user: `Write a collaboration DM for:

To: ${input.targetCreator || '[Creator Name]'}
Your niche: ${input.yourNiche || '[Your Niche]'}
Their niche: ${input.theirNiche || '[Their Niche]'}
Collaboration idea: ${input.idea || '[Specific Collab Idea]'}

Keep it under 150 words, friendly, and show you've researched them.`
    },
    
    serviceOffer: {
      system: `You are a monetization strategist for beginner creators.
Create clear, valuable service packages with 3 pricing tiers.
Make offers compelling and achievable for small creators.`,
      user: `Create a service offer package for:

Service: ${input.service || '[Service Type]'}
Niche: ${input.niche || '[Niche]'}
Target Client: ${input.target || '[Ideal Client]'}
Experience Level: ${input.experience || 'Beginner (0-5k followers)'}

Include 3 tiers: Starter ($X), Growth ($X), Premium ($X)
Each tier with clear deliverables and value.`
    }
  };

  const selected = prompts[type] || prompts.brandPitch;

  return {
    systemPrompt: selected.system,
    userPrompt: selected.user,
    temperature: 0.7,
    maxTokens: 2000
  };
}

module.exports = {
  buildPrompt
};
