const express = require('express');
const cors = require('cors');
const aiRouter = require('./services/aiRouter');
const contentPack = require('./features/contentPack');
const growthPlan = require('./features/growthPlan');
const improveContent = require('./features/improveContent');
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
    endpoints: {
      generate: 'POST /generate',
      models: 'GET /models'
    }
  });
});

// Get available AI models
app.get('/models', (req, res) => {
  const models = aiRouter.getAvailableModels();
  res.json({
    success: true,
    models
  });
});

// Main generation endpoint
app.post('/generate', async (req, res) => {
  try {
    const { feature, model, input } = req.body;

    // Validation
    if (!feature) {
      return res.status(400).json({ 
        error: 'Missing required field: feature',
        validFeatures: ['contentPack', 'growthPlan', 'improve', 'monetize']
      });
    }

    if (!input) {
      return res.status(400).json({ 
        error: 'Missing required field: input'
      });
    }

    // Select feature and build prompt
    let promptConfig;
    
    switch (feature) {
      case 'contentPack':
        promptConfig = contentPack.buildPrompt(input);
        break;
      
      case 'growthPlan':
        promptConfig = growthPlan.buildPrompt(input);
        break;
      
      case 'improve':
        promptConfig = improveContent.buildPrompt(input);
        break;
      
      case 'monetize':
        promptConfig = monetize.buildPrompt(input);
        break;
      
      default:
        return res.status(400).json({ 
          error: `Invalid feature: ${feature}`,
          validFeatures: ['contentPack', 'growthPlan', 'improve', 'monetize']
        });
    }

    // Generate content using AI router
    const selectedModel = model || 'groq';
    const content = await aiRouter.generate(
      selectedModel,
      promptConfig.userPrompt,
      {
        systemPrompt: promptConfig.systemPrompt,
        temperature: promptConfig.temperature,
        maxTokens: promptConfig.maxTokens
      }
    );

    res.json({
      success: true,
      feature,
      model: selectedModel,
      content,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Generation Error]', error.message);
    res.status(500).json({
      error: 'Generation failed',
      message: error.message
    });
  }
});

// Legacy endpoint for backward compatibility (deprecated)
app.post('/api/generate', async (req, res) => {
  try {
    const { toolType, prompt } = req.body;
    
    if (!toolType || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: toolType and prompt' 
      });
    }

    // Map old tool to new feature
    const promptConfig = improveContent.buildPrompt({
      content: prompt,
      action: 'rewrite'
    });

    const content = await aiRouter.generate(
      'groq',
      promptConfig.userPrompt,
      {
        systemPrompt: promptConfig.systemPrompt,
        temperature: 0.7,
        maxTokens: 1500
      }
    );

    res.json({
      success: true,
      content,
      toolType,
      notice: 'DEPRECATED: This endpoint will be removed. Use POST /generate instead.'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Content generation failed',
      message: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Bipoos Growth System API running on port ${PORT}`);
  console.log(`✅ Endpoints: POST /generate, GET /models`);
  
  const models = aiRouter.getAvailableModels();
  console.log(`🤖 Available AI models: ${models.map(m => m.id).join(', ') || 'None (check API keys)'}`);
});
