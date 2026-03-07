const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Zeno AI backend running',
    version: '2.0',
    provider: 'Groq',
    key_set: !!GROQ_API_KEY,
    key_preview: GROQ_API_KEY ? GROQ_API_KEY.substring(0, 8) + '...' : 'NOT SET'
  });
});

// Test endpoint
app.get('/test', async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say: Zeno is working!' }],
        max_tokens: 50
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ groq_error: data });
    res.json({ success: true, reply: data?.choices?.[0]?.message?.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// /chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { system, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set in environment' });
    }

    // Build messages array for Groq (OpenAI format)
    const groqMessages = [];

    // System message
    if (system) {
      groqMessages.push({ role: 'system', content: system });
    }

    // Conversation history (last 10 messages)
    messages.slice(-10).forEach(msg => {
      groqMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq error:', JSON.stringify(data));
      const errMsg = data?.error?.message || 'Groq API error';
      return res.status(502).json({ error: errMsg, code: data?.error?.code });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'No reply from Groq', raw: data });

    res.json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// app.listen moved to end of file

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAYFAST PAYMENT ROUTES
// Render Environment Variables required:
//   PAYFAST_MERCHANT_ID  — from gopayfast.com dashboard
//   PAYFAST_SECURED_KEY  — from gopayfast.com dashboard
//   PAYFAST_BASE_URL     — https://ipg1.apps.net.pk/Ecommerce (live)
//                          https://sandbox.apps.net.pk/Ecommerce (test)
//   SUPABASE_SERVICE_KEY — Supabase service role key
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PAYFAST_MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_SECURED_KEY  = process.env.PAYFAST_SECURED_KEY;
const PAYFAST_BASE_URL     = process.env.PAYFAST_BASE_URL || 'https://sandbox.apps.net.pk/Ecommerce';
const SUPABASE_URL_PF      = process.env.SUPABASE_URL || 'https://dpxuopdoumomasmahnyo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Generate SHA256 signature for PayFast
function generateSignature(token, merchantId, amount, basketId) {
  const crypto = require('crypto');
  const str = token + merchantId + amount + basketId;
  return crypto.createHash('sha256').update(str).digest('hex').toUpperCase();
}

// Get PayFast access token
async function getPayFastToken() {
  if (!PAYFAST_MERCHANT_ID || !PAYFAST_SECURED_KEY)
    throw new Error('PAYFAST credentials not configured');
  const res = await fetch(`${PAYFAST_BASE_URL}/api/generatetoken`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `merchant_id=${PAYFAST_MERCHANT_ID}&secured_key=${PAYFAST_SECURED_KEY}&grant_type=client_credentials`
  });
  const data = await res.json();
  if (!data.token) throw new Error('Token failed: ' + JSON.stringify(data));
  return data.token;
}

// Update Supabase record via REST API
async function sbUpdate(table, matchKey, matchVal, updates) {
  if (!SUPABASE_SERVICE_KEY) return null;
  await fetch(`${SUPABASE_URL_PF}/rest/v1/${table}?${matchKey}=eq.${matchVal}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify(updates)
  });
}

// GET /supabase-record helper
async function sbSelect(table, matchKey, matchVal) {
  if (!SUPABASE_SERVICE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL_PF}/rest/v1/${table}?${matchKey}=eq.${matchVal}&select=*`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  const data = await r.json();
  return data[0] || null;
}

// ── POST /payment/initiate ──────────────────────
app.post('/payment/initiate', async (req, res) => {
  try {
    const { payment_id, user_id, user_email, amount, plan, method, phone, name } = req.body;

    // Fallback if PayFast not configured
    if (!PAYFAST_MERCHANT_ID || !PAYFAST_SECURED_KEY) {
      console.log('PayFast not configured — fallback mode');
      return res.json({ fallback: true });
    }

    const token = await getPayFastToken();
    const basketId = `ST-${payment_id}-${Date.now()}`;

    // Instrument type mapping
    const instrMap = { easypaisa: '3', jazzcash: '5', sadapay: '1' };
    const instrType = instrMap[method] || '3';

    const signature = generateSignature(token, PAYFAST_MERCHANT_ID, amount.toString(), basketId);

    const payload = {
      MERCHANT_ID: PAYFAST_MERCHANT_ID,
      MERCHANT_NAME: 'SellerTrackr',
      TOKEN: token,
      PROCCODE: '00',
      TXNAMT: amount.toString(),
      CUSTOMER_MOBILE_NO: phone || '',
      CUSTOMER_EMAIL_ADDRESS: user_email || '',
      SIGNATURE: signature,
      VERSION: 'WOOCOM-APPS-PAYMENT-0.9',
      TXNDESC: `SellerTrackr Premium ${plan}`,
      SUCCESS_URL: encodeURIComponent(`https://sellertrackr.com/payment-success.html?plan=${plan}&pid=${payment_id}`),
      FAILURE_URL: encodeURIComponent(`https://sellertrackr.com/payment.html?error=1`),
      BASKET_ID: basketId,
      ORDER_DATE: new Date().toISOString().slice(0,10).replace(/-/g,''),
      CHECKOUT_URL: encodeURIComponent('https://sellertrackr.com/payment.html'),
      CUSTOMER_NAME: name || '',
      INSTRUMENT_TYPE: instrType
    };

    const pfRes = await fetch(`${PAYFAST_BASE_URL}/api/Transaction/PostTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    const pfData = await pfRes.json();
    console.log('PayFast response:', JSON.stringify(pfData));

    // Save basket_id to DB
    await sbUpdate('payments', 'id', payment_id, { basket_id: basketId, status: 'processing' });

    if (pfData.redirect_url || pfData.hostedURL) {
      return res.json({ redirect_url: pfData.redirect_url || pfData.hostedURL });
    } else if (pfData.code === '00') {
      return res.json({ success: true });
    } else {
      return res.json({ pending: true });
    }

  } catch (err) {
    console.error('Payment error:', err.message);
    res.status(500).json({ error: err.message, fallback: true });
  }
});

// ── POST /payment/webhook ── (PayFast callback) ─
app.post('/payment/webhook', async (req, res) => {
  try {
    console.log('PayFast webhook:', JSON.stringify(req.body));
    const { BASKET_ID, STATUS, PAID_AMOUNT } = req.body;
    if (!BASKET_ID) return res.status(400).send('No BASKET_ID');

    // basket format: ST-{payment_id}-{timestamp}
    const paymentId = BASKET_ID.split('-')[1];
    if (!paymentId) return res.status(400).send('Invalid BASKET_ID');

    if (STATUS === '0000' || STATUS === '00' || STATUS === 'success') {
      const payment = await sbSelect('payments', 'id', paymentId);
      if (payment) {
        const days = payment.plan === 'annual' ? 365 : 30;
        const until = new Date(Date.now() + days * 86400000).toISOString();
        await sbUpdate('payments', 'id', paymentId, { status: 'completed', paid_amount: PAID_AMOUNT || payment.amount });
        await sbUpdate('profiles', 'id', payment.user_id, { is_premium: true, premium_until: until, premium_plan: payment.plan });
        console.log(`✅ Premium activated: user ${payment.user_id}, plan ${payment.plan}`);
      }
    } else {
      await sbUpdate('payments', 'id', paymentId, { status: 'failed' });
      console.log(`❌ Payment failed: ${paymentId}`);
    }
    res.send('OK');
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).send('Error');
  }
});

// ── GET /payment/status/:id ─────────────────────
app.get('/payment/status/:id', async (req, res) => {
  try {
    const p = await sbSelect('payments', 'id', req.params.id);
    res.json(p ? { status: p.status, plan: p.plan } : { status: 'not_found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start Server ────────────────────────────────
app.listen(PORT, () => {
  console.log(`SellerTrackr Backend running on port ${PORT}`);
  console.log(`Groq: ${!!GROQ_API_KEY} | PayFast: ${!!PAYFAST_MERCHANT_ID}`);
});
