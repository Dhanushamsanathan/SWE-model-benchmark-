// api-server/server.ts
import { serve } from 'bun';

interface WebSocketClient {
  send(data: string): void;
  readyState: number;
}

// Store active WebSocket connections for benchmark progress
export const wsClients = new Map<string, Set<WebSocketClient>>();

// Import route handlers
import tasksRouter from './routes/tasks.ts';
import modelsRouter from './routes/models.ts';
import benchmarkRouter from './routes/benchmark.ts';
import resultsRouter from './routes/results.ts';

// Helper to parse request body
async function parseBody(req: Request): Promise<any> {
  try {
    const text = await req.text();
    if (text) {
      return JSON.parse(text);
    }
  } catch {
    // Ignore parse errors
  }
  return undefined;
}

// Route handler
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let body: any = undefined;
    if (method === 'POST' || method === 'PUT') {
      body = await parseBody(req);
    }

    // Route matching
    // Tasks routes
    if (path === '/api/tasks' && method === 'GET') {
      return tasksRouter.getTasks(req);
    }
    if (path === '/api/tasks/upload' && method === 'POST') {
      return tasksRouter.uploadTask(req);
    }
    if (path.startsWith('/api/tasks/') && method === 'GET') {
      const id = path.replace('/api/tasks/', '');
      return tasksRouter.getTask(req, { id });
    }

    // Models routes
    if (path === '/api/models' && method === 'GET') {
      return modelsRouter.getModels(req);
    }
    if (path === '/api/models/validate' && method === 'POST') {
      return modelsRouter.validateKey(req);
    }

    // Benchmark routes
    if (path === '/api/benchmark/run' && method === 'POST') {
      return benchmarkRouter.runBenchmark(req);
    }
    if (path.startsWith('/api/benchmark/status/') && method === 'GET') {
      const id = path.replace('/api/benchmark/status/', '');
      return benchmarkRouter.getStatus(req, { id });
    }

    // Results routes
    if (path === '/api/results' && method === 'GET') {
      return resultsRouter.getResults(req);
    }
    if (path.startsWith('/api/results/') && method === 'GET') {
      const id = path.replace('/api/results/', '');
      return resultsRouter.getResult(req, { id });
    }

    // WebSocket upgrade
    if (path.startsWith('/ws/')) {
      // WebSocket handling - return a placeholder for now
      return new Response('WebSocket endpoint', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unmatched routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Start server
const PORT = process.env.PORT || 3001;

console.log(`Starting SWE Benchmark API Server on port ${PORT}...`);

serve({
  port: PORT,
  fetch(req) {
    return handleRequest(req);
  },
});

console.log(`🚀 SWE Benchmark API Server running on http://localhost:${PORT}`);
