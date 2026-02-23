// web-frontend/src/api/client.ts

const API_BASE = 'http://localhost:3001';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  return response.json();
}

const apiClient = {
  // Models
  async validateKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    return fetchJson(`${API_BASE}/api/models/validate`, {
      method: 'POST',
      body: JSON.stringify({ apiKey })
    });
  },

  async getModels(apiKey: string): Promise<{ models: any[] }> {
    return fetchJson(`${API_BASE}/api/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
  },

  // Tasks
  async getTasks(): Promise<{ tasks: any[] }> {
    return fetchJson(`${API_BASE}/api/tasks`);
  },

  async uploadTask(taskData: { name: string; description: string; files: any[] }): Promise<any> {
    return fetchJson(`${API_BASE}/api/tasks/upload`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  async getTask(taskId: string): Promise<any> {
    return fetchJson(`${API_BASE}/api/tasks/${taskId}`);
  },

  // Benchmark
  async runBenchmark(taskId: string, modelId: string, apiKey: string): Promise<{ benchmarkId: string }> {
    return fetchJson(`${API_BASE}/api/benchmark/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ taskId, modelId })
    });
  },

  async getBenchmarkStatus(benchmarkId: string): Promise<any> {
    return fetchJson(`${API_BASE}/api/benchmark/status/${benchmarkId}`);
  },

  // Results
  async getResults(): Promise<any[]> {
    const response = await fetchJson<any[]>(`${API_BASE}/api/results`);
    return response || [];
  },

  async getResult(resultId: string): Promise<any> {
    return fetchJson(`${API_BASE}/api/results/${resultId}`);
  },

  // WebSocket
  connectWebSocket(benchmarkId: string): WebSocket {
    const ws = new WebSocket(`ws://localhost:3001/ws/benchmark/${benchmarkId}`);
    return ws;
  }
};

export default apiClient;
