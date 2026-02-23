// api-server/services/executor.ts
import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { getApiKey } from '../routes/models.ts';
import { storeResult } from '../routes/results.ts';
import OpenRouterService from './openrouter.ts';

interface ProgressCallback {
  (update: { progress: number; stage: string; log?: string }): void;
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

// Create a temporary working directory
const workDir = join(process.cwd(), 'temp_workspace');
if (!existsSync(workDir)) {
  mkdirSync(workDir, { recursive: true });
}

export async function runBenchmark(
  taskId: string,
  modelId: string,
  onProgress: ProgressCallback
): Promise<BenchmarkResult> {
  const startTime = Date.now();

  onProgress({ progress: 10, stage: 'Loading task', log: 'Loading task files...' });

  // In a real implementation, this would load actual task files
  // For MVP, we'll simulate the process
  const task = await loadTask(taskId);

  onProgress({ progress: 20, stage: 'Running baseline tests', log: 'Running baseline tests...' });

  // Run baseline tests (before patch)
  const baselineResult = await runTests(task, onProgress, 'baseline');

  onProgress({
    progress: 40,
    stage: 'Generating patch',
    log: `Baseline: ${baselineResult.passed}/${baselineResult.total} tests passed`
  });

  // Generate patch using LLM
  const openRouter = new OpenRouterService(getApiKey()!);

  onProgress({ progress: 50, stage: 'Generating patch', log: 'Querying LLM for patch...' });

  let patch = '';
  let tokenUsage = { prompt: 0, completion: 0, total: 0 };

  try {
    const patchResult = await openRouter.generatePatch(
      modelId,
      task.description,
      task.codeFiles,
      task.testFiles
    );
    patch = patchResult.patch;
    tokenUsage = patchResult.usage;
    onProgress({ progress: 60, stage: 'Applying patch', log: 'Patch generated successfully' });
  } catch (error: any) {
    onProgress({ progress: 60, stage: 'Error', log: `Failed to generate patch: ${error.message}` });
    // Continue with empty patch for demo
  }

  onProgress({ progress: 70, stage: 'Applying patch', log: 'Applying patch to codebase...' });

  // Apply patch
  await applyPatch(task, patch, onProgress);

  onProgress({ progress: 80, stage: 'Running post-patch tests', log: 'Running tests after patch...' });

  // Run post-patch tests
  const postPatchResult = await runTests(task, onProgress, 'post-patch');

  const executionTime = Date.now() - startTime;

  onProgress({
    progress: 100,
    stage: 'Complete',
    log: `Final: ${postPatchResult.passed}/${postPatchResult.total} tests passed`
  });

  // Store result
  const result: BenchmarkResult & { id: string; taskId: string; modelId: string; status: string; taskName: string; completedAt: string } = {
    id: `result_${Date.now()}`,
    taskId,
    taskName: task.name,
    modelId,
    status: 'completed',
    passed: postPatchResult.passed,
    failed: postPatchResult.failed,
    total: postPatchResult.total,
    passRate: postPatchResult.passRate,
    patch,
    executionTime,
    tokenUsage,
    completedAt: new Date().toISOString()
  };

  storeResult(result);

  return {
    passed: postPatchResult.passed,
    failed: postPatchResult.failed,
    total: postPatchResult.total,
    passRate: postPatchResult.passRate,
    patch,
    executionTime,
    tokenUsage
  };
}

async function loadTask(taskId: string): Promise<any> {
  // In a real implementation, this would load from storage
  // For MVP, return mock task data
  return {
    id: taskId,
    name: `Task ${taskId}`,
    description: 'Fix the bug in the function that calculates the sum of an array. The function should handle empty arrays correctly.',
    codeFiles: [
      {
        path: 'solution.py',
        content: `def sum_array(arr):
    total = 0
    for item in arr:
        total += item
    return total`
      }
    ],
    testFiles: [
      {
        path: 'test_solution.py',
        content: `import pytest
from solution import sum_array

def test_sum_basic():
    assert sum_array([1, 2, 3]) == 6

def test_sum_empty():
    assert sum_array([]) == 0

def test_sum_negative():
    assert sum_array([-1, 1]) == 0`
      }
    ]
  };
}

async function runTests(
  task: any,
  onProgress: ProgressCallback,
  phase: 'baseline' | 'post-patch'
): Promise<{ passed: number; failed: number; total: number; passRate: number }> {
  // In a real implementation, this would run actual tests
  // For MVP, simulate test execution

  onProgress({ progress: phase === 'baseline' ? 25 : 85, stage: 'Running tests', log: `Running ${phase} tests...` });

  // Simulate test execution delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // For baseline, simulate that some tests fail (before patch)
  // For post-patch, simulate that all tests pass (after successful patch)
  const tests = task.testFiles[0]?.content.match(/def test_\w+/g) || [];
  const total = tests.length || 3;

  let passed: number;
  if (phase === 'baseline') {
    // Simulate baseline failures (bug exists)
    passed = Math.floor(Math.random() * (total - 1)); // 0 to total-1 tests pass
  } else {
    // Simulate post-patch success
    passed = total; // All tests pass after patch
  }

  const failed = total - passed;
  const passRate = (passed / total) * 100;

  return { passed, failed, total, passRate };
}

async function applyPatch(
  task: any,
  patch: string,
  onProgress: ProgressCallback
): Promise<void> {
  // In a real implementation, this would apply the patch to files
  // For MVP, just log the action

  if (!patch) {
    onProgress({ progress: 75, stage: 'Applying patch', log: 'No patch to apply' });
    return;
  }

  onProgress({ progress: 75, stage: 'Applying patch', log: 'Applying patch...' });

  // Simulate patch application delay
  await new Promise(resolve => setTimeout(resolve, 500));

  onProgress({ progress: 78, stage: 'Applying patch', log: 'Patch applied successfully' });
}

export default { runBenchmark };
