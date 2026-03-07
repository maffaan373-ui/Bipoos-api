const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Health check — shows key status
app.get('/', (req, res) => {
  res.json({
    status: 'Zeno AI backend running',
    version: '1.0',
    key_set: !!GEMINI_API_KEY,
    key_preview: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 8) + '...' : 'NOT SET'
  });
});

// Debug test endpoint
app.get('/test', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say: Zeno is working!' }] }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ gemini_error: data });
    res.json({ success: true, reply: data?.candidates?.[0]?.content?.parts?.[0]?.text });
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
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment' });
    }

    const contents = [];

    if (system) {
      contents.push({ role: 'user', parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${system}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I am Zeno, SellerTrackr AI advisor.' }] });
    }

    messages.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 800, topP: 0.9 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      const errMsg = data?.error?.message || 'Gemini API error';
      return res.status(502).json({ error: errMsg, code: data?.error?.code, raw: data });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return res.status(502).json({ error: 'No reply from Gemini', raw: data });

    res.json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Zeno AI running on port ${PORT}`);
  console.log(`GEMINI_API_KEY set: ${!!GEMINI_API_KEY}`);
});
