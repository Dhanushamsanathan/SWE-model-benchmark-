// api-server/routes/models.ts

// In-memory storage for API key (session-based)
let apiKey: string | null = null;

// Cache for models list
let cachedModels: any[] = [];
let modelsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default {
  // GET /api/models - Fetch available models from OpenRouter
  async getModels(req: Request) {
    // Return cached models if available and fresh
    if (cachedModels.length > 0 && Date.now() - modelsCacheTime < CACHE_DURATION) {
      return new Response(JSON.stringify(cachedModels), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API key not set. Please provide an API key first.',
        models: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform and filter models
      cachedModels = data.data
        .filter((model: any) => model.id && model.name)
        .map((model: any) => ({
          id: model.id,
          name: model.name,
          provider: model.provider || 'Unknown',
          context_length: model.context_length,
          pricing: model.pricing
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      modelsCacheTime = Date.now();

      return new Response(JSON.stringify(cachedModels), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch models from OpenRouter',
        models: cachedModels
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // POST /api/models/validate - Validate API key
  async validateKey(req: Request) {
    try {
      const body = await req.json();

      if (!body.apiKey) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'API key is required'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Validate the key by making a test request
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${body.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        apiKey = body.apiKey; // Store for session
        // Clear cached models to force refresh
        cachedModels = [];
        modelsCacheTime = 0;

        return new Response(JSON.stringify({
          valid: true,
          message: 'API key validated successfully'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Invalid API key'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      return new Response(JSON.stringify({
        valid: false,
        error: 'Failed to validate API key'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
};

// Export function to get current API key
export function getApiKey() {
  return apiKey;
}

export function setApiKey(key: string) {
  apiKey = key;
  cachedModels = [];
  modelsCacheTime = 0;
}
