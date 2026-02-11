const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk').default;

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Bipoos API is running',
    version: '1.0.0'
  });
});

// Generate content endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { toolType, prompt, tone, length, emojis, userId } = req.body;

    if (!toolType || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: toolType and prompt' 
      });
    }

    // System prompts for different tools
    const systemPrompts = {
      caption: `You are an expert social media caption writer. Create engaging, scroll-stopping captions. ${tone ? `Tone: ${tone}.` : ''} ${length === 'short' ? 'Keep it concise (1-2 lines).' : length === 'long' ? 'Write a longer caption (6+ lines).' : 'Write a medium-length caption (3-5 lines).'} ${emojis === 'yes' ? 'Include relevant emojis.' : 'No emojis.'}`,
      
      hooks: `You are an expert at creating viral video hooks. Write 5 attention-grabbing first lines that make people stop scrolling. Make them punchy, curiosity-driven, and compelling.`,
      
      hashtags: `You are a hashtag strategy expert. Generate 30 relevant hashtags. Mix of popular (high volume), medium, and niche hashtags. Format: #hashtag #hashtag (space-separated, one line).`,
      
      bio: `You are an expert at writing compelling social media bios. Create a concise, engaging bio that clearly communicates value and personality. Keep it under 150 characters.`,
      
      'script-writer': `You are an expert video script writer. Create a complete, engaging video script optimized for retention and virality. Include hook, main content, and call-to-action.`,
      
      'idea-generator': `You are a creative content strategist. Generate 10 viral content ideas based on this topic. Each idea should be specific, actionable, and trend-worthy. Format as numbered list.`,
      
      'content-calendar': `You are a content planning expert. Create a 7-day content calendar for this niche. For each day provide: 1) Content idea, 2) Post type, 3) Key points.`,
      
      'cta-generator': `You are a conversion copywriting expert. Write 5 compelling calls-to-action. Make them action-oriented, benefit-focused, and conversion-optimized.`,
      
      'trend-analyzer': `You are a trend analysis expert. Analyze this topic and provide: 1) Current trend status, 2) Related trending topics, 3) Content angles to capitalize on trends.`,
      
      formatter: `You are a text formatting expert. Format this text for maximum readability and engagement on social media. Add line breaks, emojis (if appropriate), and structure.`,
      
      'rewrite-tool': `You are an expert content editor. Rewrite this text to make it more engaging, clear, and compelling while maintaining the original meaning.`,
      
      'engagement-boost': `You are a social media engagement specialist. Rewrite this to boost engagement. Add questions, CTAs, emotional triggers, and engagement hooks.`,
      
      'brand-voice-trainer': `You are a brand voice consultant. Analyze this brand and create guidelines for: 1) Tone, 2) Key phrases, 3) Do's and Don'ts, 4) Example captions.`,
      
      'youtube-description': `You are a YouTube SEO expert. Write a compelling, SEO-optimized description. Include: hook, overview, timestamps (if needed), CTAs, and keywords.`,
      
      'linkedin-post': `You are a LinkedIn content expert. Create a professional, engaging post that drives engagement and positions the author as a thought leader.`,
      
      'thread-generator': `You are a Twitter/X thread expert. Create a compelling 8-10 tweet thread. Start with a hook, provide value, end with a strong CTA. Number each tweet.`,
      
      'seo-reel-optimizer': `You are an SEO expert for short-form video. Provide: 1) SEO caption, 2) Hashtag strategy, 3) Best posting time, 4) Trending audio suggestions.`
    };

    const systemPrompt = systemPrompts[toolType] || 'You are a helpful AI content creator assistant.';

    // Generate content with Groq
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9
    });

    const generatedContent = completion.choices[0]?.message?.content || 'Error generating content';

    res.json({
      success: true,
      content: generatedContent,
      toolType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: 'Content generation failed',
      message: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Bipoos API running on port ${PORT}`);
});
