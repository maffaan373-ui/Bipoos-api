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

app.listen(PORT, () => {
  console.log(`Zeno AI (Groq) running on port ${PORT}`);
  console.log(`GROQ_API_KEY set: ${!!GROQ_API_KEY}`);
});
