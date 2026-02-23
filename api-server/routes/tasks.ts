// api-server/routes/tasks.ts
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// In-memory task storage for MVP
interface Task {
  id: string;
  name: string;
  description: string;
  repoUrl?: string;
  createdAt: string;
  files: TaskFile[];
}

interface TaskFile {
  name: string;
  path: string;
  content: string;
}

// Store tasks in memory (in production, use a database)
const tasks = new Map<string, Task>();

// Ensure tasks directory exists
const tasksDir = join(process.cwd(), 'tasks');
if (!existsSync(tasksDir)) {
  mkdirSync(tasksDir, { recursive: true });
}

export default {
  // GET /api/tasks - List all tasks
  async getTasks(req: Request) {
    const taskList = Array.from(tasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      createdAt: task.createdAt,
      fileCount: task.files.length
    }));

    return new Response(JSON.stringify(taskList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // POST /api/tasks/upload - Upload a new task
  async uploadTask(req: Request) {
    try {
      const body = await req.json();

      if (!body.name || !body.files) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: name and files are required'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const task: Task = {
        id: taskId,
        name: body.name,
        description: body.description || '',
        repoUrl: body.repoUrl,
        createdAt: new Date().toISOString(),
        files: body.files || []
      };

      tasks.set(taskId, task);

      // Also save to file system
      const taskDir = join(tasksDir, taskId);
      mkdirSync(taskDir, { recursive: true });

      // Save task metadata
      writeFileSync(
        join(taskDir, 'task.json'),
        JSON.stringify({
          id: task.id,
          name: task.name,
          description: task.description,
          createdAt: task.createdAt
        }, null, 2)
      );

      // Save individual files
      for (const file of task.files) {
        const filePath = join(taskDir, file.path);
        const fileDir = join(taskDir, file.path, '..');
        if (fileDir !== taskDir) {
          mkdirSync(fileDir, { recursive: true });
        }
        writeFileSync(filePath, file.content);
      }

      return new Response(JSON.stringify({
        success: true,
        task: {
          id: task.id,
          name: task.name,
          description: task.description,
          createdAt: task.createdAt
        }
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
      console.error('Upload error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to upload task'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  },

  // GET /api/tasks/:id - Get task details
  async getTask(req: Request, params: { id: string }) {
    const task = tasks.get(params.id);

    if (!task) {
      // Try to load from file system
      const taskDir = join(tasksDir, params.id);
      const taskFile = join(taskDir, 'task.json');

      if (existsSync(taskFile)) {
        const taskData = JSON.parse(readFileSync(taskFile, 'utf-8'));
        tasks.set(params.id, taskData);
        return new Response(JSON.stringify(taskData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(task), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
