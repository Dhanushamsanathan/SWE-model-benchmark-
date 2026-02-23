// api-server/routes/results.ts
import { IncomingMessage } from 'http';

// In-memory results storage (shared with benchmark runs)
const results = new Map<string, any>();

export default {
  // GET /api/results - List all results
  async getResults(req: IncomingMessage) {
    const url = new URL(req.url || '/', 'http://localhost');
    const taskId = url.searchParams.get('taskId');
    const modelId = url.searchParams.get('modelId');

    let resultList = Array.from(results.values());

    // Filter by taskId if provided
    if (taskId) {
      resultList = resultList.filter(r => r.taskId === taskId);
    }

    // Filter by modelId if provided
    if (modelId) {
      resultList = resultList.filter(r => r.modelId === modelId);
    }

    // Transform for display
    const displayList = resultList.map(r => ({
      id: r.id,
      taskId: r.taskId,
      taskName: r.taskName,
      modelId: r.modelId,
      status: r.status,
      passRate: r.passRate,
      executionTime: r.executionTime,
      completedAt: r.completedAt
    }));

    return new Response(JSON.stringify(displayList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // GET /api/results/:id - Get detailed result
  async getResult(req: IncomingMessage, params: { id: string }) {
    const result = results.get(params.id);

    if (!result) {
      return new Response(JSON.stringify({ error: 'Result not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper function to store results (called by benchmark executor)
export function storeResult(result: any) {
  results.set(result.id, result);
}
