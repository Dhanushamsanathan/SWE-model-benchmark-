// api-server/services/openrouter.ts
import { getApiKey } from '../routes/models.ts';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getApiKey() || '';
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not provided');
    }
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'SWE Benchmark'
      },
      body: JSON.stringify({
        ...request,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async generatePatch(
    modelId: string,
    taskDescription: string,
    codeFiles: Array<{ path: string; content: string }>,
    testFiles: Array<{ path: string; content: string }>
  ): Promise<{ patch: string; usage: { prompt: number; completion: number; total: number } }> {
    // Build the prompt
    const systemPrompt = `You are a software engineering assistant. Your task is to analyze a bug report and generate a patch to fix the issue.

Based on the task description, existing code, and test files, generate a patch that:
1. Fixes the reported issue
2. Makes all tests pass
3. Maintains the existing code style

Respond with ONLY the unified diff format (starting with --- and +++) for the files you need to modify.`;

    const userPrompt = `## Task Description
${taskDescription}

## Code Files to Modify
${codeFiles.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\`).join('\n\n')}

## Test Files
${testFiles.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\`).join('\n\n')}

Please generate a patch to fix the issue.`;

    const response = await this.chatCompletion({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 8000
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // Extract patch from response
    const patch = this.extractPatch(content);

    return {
      patch,
      usage: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      }
    };
  }

  private extractPatch(content: string): string {
    // Try to extract diff from markdown code blocks
    const codeBlockMatch = content.match(/```(?:diff)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find raw diff format
    const diffMatch = content.match(/^---[\s\S]*?^(\+\+\+|@@)/m);
    if (diffMatch) {
      const start = content.indexOf('---');
      const end = content.indexOf('@@', start);
      if (end > start) {
        const end2 = content.indexOf('@@', end + 1);
        return end2 > end ? content.substring(start, end2 + 50) : content.substring(start);
      }
    }

    // Return the whole content if it looks like a diff
    if (content.startsWith('---') || content.includes('+++')) {
      return content;
    }

    // Return as-is if we can't parse it
    return content;
  }
}

export default OpenRouterService;
