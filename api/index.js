const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (simple in-memory)
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  const record = requestCounts.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_WINDOW;
    return next();
  }
  
  if (record.count >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  record.count++;
  next();
}

app.use(rateLimit);

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Bipoos Growth Marketing Platform',
    version: '4.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      gemini: !!process.env.GEMINI_API_KEY,
      facebook: !!process.env.FB_PAGE_ACCESS_TOKEN,
      supabase: true
    }
  });
});

// ==========================================
// 1. AI CONTENT GENERATION (Google Gemini)
// ==========================================
app.post('/api/generate-content', async (req, res) => {
  try {
    const { clientName, targetAudience, contentType, language } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // Build prompt based on content type
    let systemPrompt = '';
    
    switch(contentType) {
      case 'ad_copy':
        systemPrompt = `You are a professional global advertising copywriter. Create high-converting ad copy for:
Client: ${clientName}
Target Audience: ${targetAudience || 'Global audience'}
Language: ${language || 'English'}

Generate:
1. PRIMARY HEADLINE: One powerful attention-grabbing headline (10-15 words)
2. SECONDARY HEADLINE: Supporting headline with benefit (15-20 words)
3. BODY COPY: Compelling ad body text (50-80 words) with emotional trigger and clear CTA
4. CALL-TO-ACTION: 3 different CTA button text options
5. HASHTAGS: 15 relevant trending hashtags for social media`;
        break;
        
      case 'strategy':
        systemPrompt = `You are a global marketing strategist. Create a comprehensive marketing strategy for:
Client: ${clientName}
Target Audience: ${targetAudience || 'Global market'}

Provide:
1. MARKET ANALYSIS: Current market position and opportunities
2. TARGET DEMOGRAPHICS: Detailed audience persona
3. CHANNEL STRATEGY: Best marketing channels and why
4. CONTENT PILLARS: 5 key content themes
5. 90-DAY ROADMAP: Week-by-week action plan
6. KPI METRICS: 5 key metrics to track
7. BUDGET ALLOCATION: Recommended spend distribution`;
        break;
        
      case 'social_post':
        systemPrompt = `You are a social media expert. Create engaging social media content for:
Client: ${clientName}
Platform: ${req.body.platform || 'Instagram'}
Target: ${targetAudience || 'Global audience'}
Language: ${language || 'English'}

Generate:
1. CAPTION: Engaging post caption (150-200 characters)
2. HOOK: First line that stops scrolling
3. HASHTAGS: 20 relevant hashtags
4. CALL-TO-ACTION: Clear action prompt
5. EMOJI STRATEGY: Recommended emoji usage
6. BEST POST TIME: Optimal posting time and day`;
        break;
        
      default:
        systemPrompt = `Create professional marketing content for ${clientName} targeting ${targetAudience || 'global audience'}`;
    }

    // Call Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [{
          parts: [{ text: systemPrompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
          topP: 0.9
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const generatedText = response.data.candidates[0]?.content?.parts[0]?.text || '';

    res.json({
      success: true,
      clientName,
      targetAudience: targetAudience || 'Global',
      contentType,
      content: generatedText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Content Generation Error]', error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'API rate limit reached. Please try again in a moment.' });
    }
    
    res.status(500).json({
      error: 'Content generation failed',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// ==========================================
// 2. FACEBOOK/INSTAGRAM POSTING
// ==========================================
app.post('/api/post-social', async (req, res) => {
  try {
    const { pageAccessToken, pageId, message, imageUrl, platforms } = req.body;

    if (!pageAccessToken || !pageId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results = [];

    // Post to Facebook Page
    if (platforms.includes('facebook')) {
      try {
        const fbResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
          {
            url: imageUrl || 'https://via.placeholder.com/1200x630/8B5CF6/ffffff?text=Bipoos+Marketing',
            caption: message,
            access_token: pageAccessToken
          },
          { timeout: 15000 }
        );

        results.push({
          platform: 'facebook',
          success: true,
          postId: fbResponse.data.id,
          postUrl: `https://facebook.com/${fbResponse.data.id}`
        });
      } catch (error) {
        results.push({
          platform: 'facebook',
          success: false,
          error: error.response?.data?.error?.message || error.message
        });
      }
    }

    // Post to Instagram (requires Instagram Business Account)
    if (platforms.includes('instagram')) {
      try {
        // Get Instagram Business Account ID
        const igAccountResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
        );

        const igAccountId = igAccountResponse.data.instagram_business_account?.id;

        if (!igAccountId) {
          results.push({
            platform: 'instagram',
            success: false,
            error: 'Instagram Business Account not connected'
          });
        } else {
          // Create media container
          const containerResponse = await axios.post(
            `https://graph.facebook.com/v18.0/${igAccountId}/media`,
            {
              image_url: imageUrl || 'https://via.placeholder.com/1080x1080/8B5CF6/ffffff?text=Bipoos',
              caption: message,
              access_token: pageAccessToken
            }
          );

          const creationId = containerResponse.data.id;

          // Publish media
          const publishResponse = await axios.post(
            `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
            {
              creation_id: creationId,
              access_token: pageAccessToken
            }
          );

          results.push({
            platform: 'instagram',
            success: true,
            postId: publishResponse.data.id
          });
        }
      } catch (error) {
        results.push({
          platform: 'instagram',
          success: false,
          error: error.response?.data?.error?.message || error.message
        });
      }
    }

    const allSuccess = results.every(r => r.success);

    res.json({
      success: allSuccess,
      message: allSuccess ? 'Posted successfully to all platforms' : 'Posted with some errors',
      results
    });

  } catch (error) {
    console.error('[Social Posting Error]', error.message);
    res.status(500).json({
      error: 'Social posting failed',
      message: error.message
    });
  }
});

// ==========================================
// 3. FACEBOOK MARKETING API - AD CAMPAIGNS
// ==========================================
app.post('/api/launch-campaign', async (req, res) => {
  try {
    const { accessToken, adAccountId, campaignName, objective, budget, targeting, creative } = req.body;

    if (!accessToken || !adAccountId) {
      return res.status(400).json({ error: 'Access token and ad account required' });
    }

    // Create Campaign
    const campaignResponse = await axios.post(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns`,
      {
        name: campaignName || `Bipoos Campaign - ${new Date().toISOString().split('T')[0]}`,
        objective: objective || 'OUTCOME_ENGAGEMENT',
        status: 'PAUSED', // Start paused for safety
        special_ad_categories: [],
        access_token: accessToken
      }
    );

    const campaignId = campaignResponse.data.id;

    // Create Ad Set
    const adSetResponse = await axios.post(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/adsets`,
      {
        name: `${campaignName} - Ad Set`,
        campaign_id: campaignId,
        daily_budget: (budget || 500) * 100, // Convert to cents
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        bid_amount: 200,
        targeting: targeting || {
          geo_locations: { countries: ['US'] },
          age_min: 18,
          age_max: 65
        },
        status: 'PAUSED',
        access_token: accessToken
      }
    );

    const adSetId = adSetResponse.data.id;

    res.json({
      success: true,
      campaignId,
      adSetId,
      message: 'Campaign created successfully (paused). Review and activate in Facebook Ads Manager.',
      dashboardUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}`
    });

  } catch (error) {
    console.error('[Campaign Launch Error]', error.message);
    res.status(500).json({
      error: 'Campaign launch failed',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// ==========================================
// 4. MESSENGER AI AUTO-RESPONDER (Webhook)
// ==========================================
app.get('/api/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'bipoos_growth_platform_2025';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[Webhook] Verification request:', { mode, token });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] ✅ Verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('[Webhook] ❌ Verification failed');
    res.sendStatus(403);
  }
});

app.post('/api/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const messaging = entry.messaging?.[0];
        
        if (messaging?.message) {
          const senderId = messaging.sender.id;
          const messageText = messaging.message.text;
          const pageId = messaging.recipient.id;

          console.log('[Webhook] Message received:', { senderId, messageText, pageId });

          // Generate AI response
          const aiReply = await generateAIReply(messageText, pageId);

          // Send reply
          await sendMessengerReply(senderId, aiReply, pageId);
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('[Webhook Error]', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper: Generate AI Reply
async function generateAIReply(message, pageId) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_KEY) {
    return 'Thank you for your message! Our team will get back to you soon.';
  }

  try {
    const prompt = `You are a professional customer service assistant for a marketing agency.
Customer message: "${message}"

Provide a helpful, professional, and friendly response in 1-2 sentences. Be concise and action-oriented.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
      },
      { timeout: 10000 }
    );

    return response.data.candidates[0]?.content?.parts[0]?.text || 
           'Thank you for reaching out! We'll respond shortly.';
  } catch (error) {
    console.error('[AI Reply Error]', error.message);
    return 'Thanks for your message! We appreciate your interest.';
  }
}

// Helper: Send Messenger Reply
async function sendMessengerReply(recipientId, messageText, pageId) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  
  if (!pageAccessToken) {
    console.error('[Messenger] No access token configured');
    return;
  }

  try {
    await axios.post(
      'https://graph.facebook.com/v18.0/me/messages',
      {
        recipient: { id: recipientId },
        message: { text: messageText },
        access_token: pageAccessToken
      },
      { timeout: 10000 }
    );

    console.log('[Messenger] Reply sent successfully');
  } catch (error) {
    console.error('[Messenger] Send failed:', error.response?.data || error.message);
  }
}

// ==========================================
// 5. ANALYTICS & INSIGHTS
// ==========================================
app.get('/api/analytics/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}/insights`,
      {
        params: {
          metric: 'page_impressions,page_engaged_users,page_post_engagements,page_fans',
          period: 'day',
          access_token: accessToken
        }
      }
    );

    res.json({
      success: true,
      pageId,
      insights: response.data.data
    });

  } catch (error) {
    console.error('[Analytics Error]', error.message);
    res.status(500).json({ error: 'Analytics fetch failed' });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🚀 Bipoos Growth Marketing Platform  ║
║  Version: 4.0.0                       ║
║  Port: ${PORT}                        ║
║  Environment: ${process.env.NODE_ENV || 'production'}     ║
╚═══════════════════════════════════════╝

✅ Services Status:
  - Gemini AI: ${process.env.GEMINI_API_KEY ? '✓' : '✗'}
  - Facebook API: ${process.env.FB_PAGE_ACCESS_TOKEN ? '✓' : '✗'}
  - Webhook Token: ${process.env.WEBHOOK_VERIFY_TOKEN ? '✓' : '✗'}

🌐 Ready to handle requests...
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
