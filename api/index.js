const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Local Business AI Backend',
    version: '3.0.0',
    features: ['content-generation', 'social-posting', 'ai-responder', 'ads-launcher']
  });
});

// ==========================================
// 2. AI CONTENT GENERATION (Google Gemini - FREE)
// ==========================================
app.post('/api/generate-content', async (req, res) => {
  try {
    const { businessName, businessType } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: 'Business name required' });
    }

    // Google Gemini API call (FREE)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const prompt = `You are a social media marketing expert for local businesses.

Generate social media content for a local business:
Business: ${businessName}
Type: ${businessType || 'General Business'}

Provide:
1. CAPTION: A catchy, engaging caption (2-3 sentences)
2. HASHTAGS: 15 relevant hashtags
3. IMAGE_PROMPT: A detailed prompt for AI image generation (describe visual style, colors, composition)

Format exactly as:
CAPTION: [your caption]
HASHTAGS: [hashtags separated by spaces]
IMAGE_PROMPT: [image description]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API failed');
    }

    const data = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text || '';

    // Parse response
    const parsed = parseContent(content);

    res.json({
      success: true,
      businessName,
      caption: parsed.caption,
      hashtags: parsed.hashtags,
      imagePrompt: parsed.imagePrompt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Content Generation Error]', error.message);
    res.status(500).json({ error: 'Content generation failed', message: error.message });
  }
});

// ==========================================
// 3. SOCIAL MEDIA POSTING (Facebook/Instagram)
// ==========================================
app.post('/api/post-to-social', async (req, res) => {
  try {
    const { pageAccessToken, pageId, message, imageUrl } = req.body;

    if (!pageAccessToken || !pageId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Facebook Graph API - Post to Page
    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption: message,
        access_token: pageAccessToken
      })
    });

    if (!fbResponse.ok) {
      const error = await fbResponse.json();
      throw new Error(error.error?.message || 'Facebook API failed');
    }

    const result = await fbResponse.json();

    res.json({
      success: true,
      postId: result.id,
      message: 'Posted successfully to Facebook/Instagram'
    });

  } catch (error) {
    console.error('[Social Posting Error]', error.message);
    res.status(500).json({ error: 'Social posting failed', message: error.message });
  }
});

// ==========================================
// 4. AI AUTO-RESPONDER WEBHOOK
// ==========================================
app.get('/api/webhook', (req, res) => {
  // Facebook Webhook Verification
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'bipoos_local_business_2025';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/api/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'page') {
      body.entry.forEach(async (entry) => {
        const messaging = entry.messaging[0];
        
        if (messaging.message) {
          const senderId = messaging.sender.id;
          const messageText = messaging.message.text;

          // Generate AI response
          const reply = await generateAIReply(messageText);

          // Send reply back
          await sendFacebookMessage(senderId, reply);
        }
      });
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('[Webhook Error]', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ==========================================
// 5. ADS LAUNCHER
// ==========================================
app.post('/api/launch-ad', async (req, res) => {
  try {
    const { accessToken, adAccountId, pageId, message, imageUrl, budget } = req.body;

    if (!accessToken || !adAccountId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Ad Campaign via Facebook Marketing API
    const campaignResponse = await fetch(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Boost - ${new Date().toISOString().split('T')[0]}`,
          objective: 'OUTCOME_ENGAGEMENT',
          status: 'ACTIVE',
          access_token: accessToken
        })
      }
    );

    if (!campaignResponse.ok) {
      throw new Error('Campaign creation failed');
    }

    const campaign = await campaignResponse.json();

    res.json({
      success: true,
      campaignId: campaign.id,
      message: 'Ad campaign launched successfully',
      budget: budget || 5
    });

  } catch (error) {
    console.error('[Ads Launch Error]', error.message);
    res.status(500).json({ error: 'Ad launch failed', message: error.message });
  }
});

// ==========================================
// 6. PADDLE WEBHOOK (Subscription)
// ==========================================
app.post('/api/paddle-webhook', async (req, res) => {
  try {
    const event = req.body;

    if (event.alert_name === 'subscription_payment_succeeded') {
      const userEmail = event.email;
      const subscriptionId = event.subscription_id;

      // Update Supabase user to Pro
      console.log(`User ${userEmail} subscribed - ID: ${subscriptionId}`);
      
      // Here you would update Supabase
      // const supabase = createClient(...)
      // await supabase.from('profiles').update({ plan: 'pro' }).eq('email', userEmail)
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Paddle Webhook Error]', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function parseContent(text) {
  const caption = extract(text, 'CAPTION:');
  const hashtags = extract(text, 'HASHTAGS:');
  const imagePrompt = extract(text, 'IMAGE_PROMPT:');

  return { caption, hashtags, imagePrompt };
}

function extract(text, marker) {
  const start = text.indexOf(marker);
  if (start === -1) return '';
  
  const markers = ['CAPTION:', 'HASHTAGS:', 'IMAGE_PROMPT:'];
  let end = text.length;
  
  markers.forEach(m => {
    if (m === marker) return;
    const pos = text.indexOf(m, start + marker.length);
    if (pos !== -1 && pos < end) end = pos;
  });
  
  return text.substring(start + marker.length, end).trim();
}

async function generateAIReply(message) {
  const geminiKey = process.env.GEMINI_API_KEY;
  
  try {
    const systemPrompt = 'You are a friendly customer service assistant for a local business. Keep responses short (1-2 sentences), helpful, and professional.';
    const fullPrompt = `${systemPrompt}\n\nCustomer message: ${message}\n\nYour response:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150
          }
        })
      }
    );

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'Thanks for your message! We will get back to you soon.';
  } catch (error) {
    return 'Thanks for your message! We will get back to you soon.';
  }
}

async function sendFacebookMessage(recipientId, messageText) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  
  await fetch('https://graph.facebook.com/v18.0/me/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
      access_token: pageAccessToken
    })
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Local Business AI Backend running on port ${PORT}`);
  console.log(`✅ Features: Content Gen, Social Posting, AI Responder, Ads`);
});
