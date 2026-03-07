const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Zeno AI backend running', version: '1.0' });
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
      contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${system}` }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I am Zeno, your AI sales advisor.' }]
      });
    }

    messages.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini error:', errText);
      return res.status(502).json({ error: 'Gemini API error', details: errText });
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';

    res.json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Zeno AI running on port ${PORT}`);
});
