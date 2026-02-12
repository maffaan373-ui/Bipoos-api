const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Groq client
function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set in environment variables');
  const Groq = require('groq-sdk');
  return new Groq({ apiKey: key });
}

// System prompts for all 17 tools
const PROMPTS = {
  caption:             'You are an expert social media caption writer. Create engaging, scroll-stopping captions. Use tone/length/emoji instructions if provided.',
  hooks:               'You are a viral video hook expert. Write exactly 5 attention-grabbing opening lines numbered 1-5. Make each one punchy and curiosity-driven.',
  hashtags:            'You are a hashtag strategy expert. Generate 30 relevant hashtags in ONE line, space-separated. Mix popular, medium, and niche tags. Start each with #.',
  bio:                 'You are a social media bio expert. Write a compelling bio under 150 characters. Clear, engaging, personality-driven.',
  'script-writer':     'You are a video script writer. Write a full script with HOOK, MAIN CONTENT, and CTA sections. Optimized for retention on short-form video.',
  'idea-generator':    'You are a creative content strategist. Generate exactly 10 viral content ideas as a numbered list.',
  'content-calendar':  'You are a content planning expert. Create a 7-day content calendar. Each day: Day number, post idea, post type (Reel/Story/Post), 3 key points.',
  'cta-generator':     'You are a conversion copywriting expert. Write 5 compelling CTAs numbered 1-5. Each action-oriented and benefit-focused.',
  'trend-analyzer':    'You are a trend analysis expert. Analyze this topic: 1) Trend status  2) Related trends  3) Content angles to capitalize.',
  formatter:           'You are a text formatting expert for social media. Reformat the given text with line breaks and structure for max readability. Add emojis where natural.',
  'rewrite-tool':      'You are an expert content editor. Rewrite the given content to be more engaging and compelling. Keep the original meaning.',
  'engagement-boost':  'You are a social media engagement specialist. Rewrite this content to maximise engagement. Add questions, emotional triggers, and a strong CTA.',
  'brand-voice-trainer':'You are a brand voice consultant. Write: 1) Tone guide  2) Key phrases  3) Do\'s & Don\'ts  4) Three example captions.',
  'youtube-description':'You are a YouTube SEO expert. Write an SEO-optimized description with hook, overview, timestamps placeholder, CTAs, relevant keywords.',
  'linkedin-post':     'You are a LinkedIn content expert. Write a professional yet engaging post with hook, value content, and CTA.',
  'thread-generator':  'You are a Twitter/X thread expert. Write an 8-10 tweet thread. Format: "1/" "2/" etc. Start with a hook, end with a CTA.',
  'seo-reel-optimizer':'You are an SEO expert for short-form video. Provide: 1) SEO caption  2) 20 hashtags  3) Best posting time  4) Trending audio tip.',
};

// Health check
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Bipoos API is running 🚀',
    tools: Object.keys(PROMPTS).length,
    timestamp: new Date().toISOString(),
  });
});

// Generate content
app.post('/api/generate', async (req, res) => {
  const { toolType, prompt, tone, length, emojis } = req.body || {};

  if (!toolType || !prompt) {
    return res.status(400).json({ error: 'toolType and prompt are required' });
  }
  if (!PROMPTS[toolType]) {
    return res.status(400).json({
      error: `Unknown tool: ${toolType}`,
      validTools: Object.keys(PROMPTS),
    });
  }

  try {
    const groq = getGroq();

    let system = PROMPTS[toolType];
    if (tone)            system += ` Tone: ${tone}.`;
    if (length)          system += ` Length: ${length}.`;
    if (emojis === 'yes') system += ' Use relevant emojis.';
    if (emojis === 'no')  system += ' Do NOT use emojis.';

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.75,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content?.trim() || '';

    return res.json({ success: true, content, tool: toolType });

  } catch (err) {
    console.error('[generate error]', err.message);
    if (err.message.includes('GROQ_API_KEY')) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set on server.' });
    }
    return res.status(500).json({ error: 'Generation failed', detail: err.message });
  }
});

app.listen(PORT, () => console.log(`Bipoos API running on port ${PORT}`));
