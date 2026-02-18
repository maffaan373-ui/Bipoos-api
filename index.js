const express = require('express');
const cors = require('cors');
const aiRouter = require('./services/aiRouter');
const contentPack = require('./features/contentPack');
const growthPlan = require('./features/growthPlan');
const improve = require('./features/improve');
const monetize = require('./features/monetize');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Bipoos Growth System API',
    version: '2.0.0',
    features: ['content_pack', 'growth_plan', 'improve', 'monetize']
  });
});

// Model availability check
app.get('/api/models', (req, res) => {
  const { userPlan } = req.query;
  const models = aiRouter.getAvailableModels(userPlan || 'free');
  res.json({
    success: true,
    userPlan: userPlan || 'free',
    models
  });
});

// Unified generation endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { feature, userPlan, model, inputData } = req.body;

    // Validation
    if (!feature) {
      return res.status(400).json({ 
        error: 'Missing required field: feature',
        validFeatures: ['content_pack', 'growth_plan', 'improve', 'monetize']
      });
    }

    if (!inputData || typeof inputData !== 'object') {
      return res.status(400).json({ 
        error: 'Missing or invalid inputData object'
      });
    }

    // Default values
    const plan = userPlan || 'free';
    const selectedModel = model || 'groq';

    // Route to correct feature generator
    let result;
    switch (feature) {
      case 'content_pack':
        result = await contentPack.generate(plan, selectedModel, inputData);
        break;
      
      case 'growth_plan':
        result = await growthPlan.generate(plan, selectedModel, inputData);
        break;
      
      case 'improve':
        result = await improve.generate(plan, selectedModel, inputData);
        break;
      
      case 'monetize':
        result = await monetize.generate(plan, selectedModel, inputData);
        break;
      
      default:
        return res.status(400).json({ 
          error: `Invalid feature: ${feature}`,
          validFeatures: ['content_pack', 'growth_plan', 'improve', 'monetize']
        });
    }

    res.json({
      ...result,
      userPlan: plan,
      model: selectedModel,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API Error]', error.message);
    res.status(500).json({
      error: 'Generation failed',
      message: error.message
    });
  }
});

// Backward compatibility - old tool endpoint (deprecated)
app.post('/api/generate-legacy', async (req, res) => {
  try {
    const { toolType, prompt } = req.body;
    
    // Map old tools to new features
    const feature = 'improve';
    const inputData = {
      content: prompt,
      action: 'rewrite'
    };

    const result = await improve.generate('free', 'groq', inputData);
    
    res.json({
      success: true,
      content: result.improved,
      toolType,
      notice: 'This endpoint is deprecated. Please use /api/generate with new feature system.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Bipoos Growth System API running on port ${PORT}`);
  console.log(`✅ Available features: content_pack, growth_plan, improve, monetize`);
  console.log(`🤖 AI Providers: Groq ${aiRouter.isModelAvailable('groq') ? '✓' : '✗'}, GPT ${aiRouter.isModelAvailable('gpt') ? '✓' : '✗'}, Gemini ${aiRouter.isModelAvailable('gemini') ? '✓' : '✗'}`);
});
