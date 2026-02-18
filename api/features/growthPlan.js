/**
 * 30-Day Growth Plan Feature
 * Creates structured weekly growth strategy
 */

function buildPrompt(input) {
  const systemPrompt = `You are a growth strategist for beginner content creators.
Create a realistic, actionable 30-day growth plan with weekly milestones.
Focus on sustainable strategies for 0-5k followers.

Format as structured weekly plan:

WEEK 1: Foundation & Setup
[Daily action items]

WEEK 2: Consistency Building
[Daily action items]

WEEK 3: Engagement & Optimization
[Daily action items]

WEEK 4: Scale & Community
[Daily action items]

KEY METRICS TO TRACK:
[5-7 specific metrics]

CONTENT STRATEGY:
[3-5 content pillars to rotate]

DAILY ENGAGEMENT ROUTINE:
[Morning and evening tasks]

PLATFORM-SPECIFIC TIPS:
[Growth hacks for the platform]`;

  const userPrompt = `Create a 30-day growth plan for:

Niche: ${input.niche || input}
Current Followers: ${input.followers || '0-100'}
Goal: ${input.goal || 'Reach 1,000 followers'}
Platform: ${input.platform || 'Instagram'}

Make it specific, actionable, and beginner-friendly with daily tasks.`;

  return {
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 3000
  };
}

module.exports = {
  buildPrompt
};
