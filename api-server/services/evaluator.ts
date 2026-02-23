// api-server/services/evaluator.ts
interface EvaluationResult {
  passed: boolean;
  score: number;
  details: {
    baselinePassed: number;
    baselineTotal: number;
    finalPassed: number;
    finalTotal: number;
    passRateImprovement: number;
  };
  patchQuality: {
    hasValidFormat: boolean;
    filesModified: number;
    linesAdded: number;
    linesRemoved: number;
  };
}

export function evaluateResult(
  baselinePassed: number,
  baselineTotal: number,
  finalPassed: number,
  finalTotal: number,
  patch: string | undefined
): EvaluationResult {
  const baselinePassRate = (baselinePassed / baselineTotal) * 100;
  const finalPassRate = (finalPassed / finalTotal) * 100;
  const passRateImprovement = finalPassRate - baselinePassRate;

  // Determine if test passed (Pass@1: any test that wasn't passing before now passes)
  const passed = finalPassed > baselinePassed;

  // Calculate score (0-100)
  let score = 0;
  if (passed) {
    // Score based on how many tests now pass
    score = Math.round((finalPassed / finalTotal) * 100);
  }

  // Analyze patch quality
  const patchQuality = analyzePatch(patch);

  return {
    passed,
    score,
    details: {
      baselinePassed,
      baselineTotal,
      finalPassed,
      finalTotal,
      passRateImprovement
    },
    patchQuality
  };
}

function analyzePatch(patch: string | undefined): {
  hasValidFormat: boolean;
  filesModified: number;
  linesAdded: number;
  linesRemoved: number;
} {
  if (!patch) {
    return {
      hasValidFormat: false,
      filesModified: 0,
      linesAdded: 0,
      linesRemoved: 0
    };
  }

  const lines = patch.split('\n');
  let filesModified = 0;
  let linesAdded = 0;
  let linesRemoved = 0;

  // Check for valid diff format
  const hasValidFormat = patch.includes('---') && patch.includes('+++');

  // Count files
  let inFile = false;
  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('diff --git')) {
      filesModified++;
      inFile = true;
    }

    if (inFile) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }
  }

  return {
    hasValidFormat,
    filesModified,
    linesAdded,
    linesRemoved
  };
}

export function formatPatchDiff(patch: string): string {
  if (!patch) return '';

  // Format the diff for display
  const lines = patch.split('\n');
  const formatted: string[] = [];

  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---')) {
      formatted.push(`\x1b[36m${line}\x1b[0m`); // Cyan
    } else if (line.startsWith('+')) {
      formatted.push(`\x1b[32m${line}\x1b[0m`); // Green
    } else if (line.startsWith('-')) {
      formatted.push(`\x1b[31m${line}\x1b[0m`); // Red
    } else if (line.startsWith('@@')) {
      formatted.push(`\x1b[33m${line}\x1b[0m`); // Yellow
    } else {
      formatted.push(line);
    }
  }

  return formatted.join('\n');
}

export function computePassAt1(results: Array<{ passed: boolean }>): number {
  if (results.length === 0) return 0;

  const passed = results.filter(r => r.passed).length;
  return (passed / results.length) * 100;
}

export default {
  evaluateResult,
  formatPatchDiff,
  computePassAt1
};
