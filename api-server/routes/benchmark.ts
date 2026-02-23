// api-server/routes/benchmark.ts
import { IncomingMessage } from 'http';
import { execSync, spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { getApiKey, setApiKey } from './models.ts';
import { wsClients } from '../server.ts';
import { runBenchmark } from '../services/executor.ts';

// Store benchmark runs in memory
interface BenchmarkRun {
  id: string;
  taskId: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  stage: string;
  logs: string[];
  result?: BenchmarkResult;
  startedAt?: string;
  completedAt?: string;
}

interface BenchmarkResult {
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  patch?: string;
  executionTime: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

const benchmarkRuns = new Map<string, BenchmarkRun>();
const runningProcesses = new Map<string, ChildProcess>();

export default {
  // POST /api/benchmark/run - Start a benchmark execution
  async runBenchmark(req: IncomingMessage) {
    return new Promise<Response>((resolve) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body);

          if (!data.taskId || !data.modelId) {
            resolve(new Response(JSON.stringify({
              error: 'taskId and modelId are required'
            }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
            return;
          }

          // Check API key
          if (!getApiKey()) {
            resolve(new Response(JSON.stringify({
              error: 'API key not set. Please validate your API key first.'
            }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
            return;
          }

          const benchmarkId = `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Create benchmark run entry
          const run: BenchmarkRun = {
            id: benchmarkId,
            taskId: data.taskId,
            modelId: data.modelId,
            status: 'pending',
            progress: 0,
            stage: 'Initializing',
            logs: [],
            startedAt: new Date().toISOString()
          };

          benchmarkRuns.set(benchmarkId, run);

          // Start benchmark execution in background
          executeBenchmark(benchmarkId, data.taskId, data.modelId);

          resolve(new Response(JSON.stringify({
            benchmarkId,
            status: 'started',
            message: 'Benchmark started'
          }), { status: 202, headers: { 'Content-Type': 'application/json' } }));
        } catch (error) {
          console.error('Benchmark start error:', error);
          resolve(new Response(JSON.stringify({
            error: 'Failed to start benchmark'
          }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
        }
      });
    });
  },

  // GET /api/benchmark/status/:id - Get benchmark status
  async getStatus(req: IncomingMessage, params: { id: string }) {
    const run = benchmarkRuns.get(params.id);

    if (!run) {
      return new Response(JSON.stringify({ error: 'Benchmark not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      id: run.id,
      taskId: run.taskId,
      modelId: run.modelId,
      status: run.status,
      progress: run.progress,
      stage: run.stage,
      logs: run.logs,
      result: run.result,
      startedAt: run.startedAt,
      completedAt: run.completedAt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper function to send WebSocket updates
function sendProgress(benchmarkId: string, update: Partial<BenchmarkRun>) {
  const clients = wsClients.get(benchmarkId);
  if (clients) {
    const message = JSON.stringify(update);
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

// Execute benchmark in background
async function executeBenchmark(benchmarkId: string, taskId: string, modelId: string) {
  const run = benchmarkRuns.get(benchmarkId)!;

  try {
    run.status = 'running';
    run.stage = 'Preparing task';
    run.progress = 10;
    sendProgress(benchmarkId, run);

    // Run the actual benchmark
    const result = await runBenchmark(taskId, modelId, (progressUpdate) => {
      run.progress = progressUpdate.progress;
      run.stage = progressUpdate.stage;
      if (progressUpdate.log) {
        run.logs.push(progressUpdate.log);
      }
      sendProgress(benchmarkId, run);
    });

    // Update with results
    run.status = 'completed';
    run.progress = 100;
    run.stage = 'Complete';
    run.result = result;
    run.completedAt = new Date().toISOString();
    run.logs.push('Benchmark completed successfully');

    sendProgress(benchmarkId, run);
  } catch (error: any) {
    run.status = 'failed';
    run.stage = 'Failed';
    run.logs.push(`Error: ${error.message}`);
    run.completedAt = new Date().toISOString();

    sendProgress(benchmarkId, run);
  }
}
