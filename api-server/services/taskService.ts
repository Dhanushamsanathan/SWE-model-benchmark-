// api-server/services/taskService.ts
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, extname, basename } from 'path';

// Task structure interface
interface TaskFile {
  name: string;
  path: string;
  content: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  repoUrl?: string;
  createdAt: string;
  files: TaskFile[];
}

const TASKS_DIR = join(process.cwd(), 'tasks');

// Ensure tasks directory exists
if (!existsSync(TASKS_DIR)) {
  mkdirSync(TASKS_DIR, { recursive: true });
}

export class TaskService {
  // Validate task structure
  static validateTask(task: Partial<Task>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.name || task.name.trim() === '') {
      errors.push('Task name is required');
    }

    if (!task.files || task.files.length === 0) {
      errors.push('At least one file is required');
    }

    // Validate each file
    if (task.files) {
      for (const file of task.files) {
        if (!file.path) {
          errors.push('File path is required');
        }
        if (file.content === undefined || file.content === null) {
          errors.push(`File ${file.path} has no content`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Save task to filesystem
  static saveTask(task: Task): void {
    const taskDir = join(TASKS_DIR, task.id);

    // Remove existing if present
    if (existsSync(taskDir)) {
      rmSync(taskDir, { recursive: true });
    }

    mkdirSync(taskDir, { recursive: true });

    // Save task metadata
    const metadata = {
      id: task.id,
      name: task.name,
      description: task.description,
      repoUrl: task.repoUrl,
      createdAt: task.createdAt
    };

    writeFileSync(
      join(taskDir, 'task.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Save files
    for (const file of task.files) {
      const filePath = join(taskDir, file.path);
      const fileDir = join(taskDir, file.path, '..');

      if (fileDir !== taskDir) {
        mkdirSync(fileDir, { recursive: true });
      }

      writeFileSync(filePath, file.content);
    }
  }

  // Load task from filesystem
  static loadTask(taskId: string): Task | null {
    const taskDir = join(TASKS_DIR, taskId);
    const taskFile = join(taskDir, 'task.json');

    if (!existsSync(taskFile)) {
      return null;
    }

    const metadata = JSON.parse(readFileSync(taskFile, 'utf-8'));
    const files: TaskFile[] = [];

    // Load all files in task directory
    const allFiles = this.getAllFiles(taskDir);
    for (const filePath of allFiles) {
      const relativePath = filePath.replace(taskDir + '/', '');
      if (relativePath !== 'task.json') {
        files.push({
          name: basename(filePath),
          path: relativePath,
          content: readFileSync(filePath, 'utf-8')
        });
      }
    }

    return {
      ...metadata,
      files
    };
  }

  // Get all files in directory recursively
  private static getAllFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const items = readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dir, item.name);

      if (item.isDirectory()) {
        files.push(...this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  // List all tasks
  static listTasks(): Task[] {
    if (!existsSync(TASKS_DIR)) {
      return [];
    }

    const taskDirs = readdirSync(TASKS_DIR, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);

    const tasks: Task[] = [];

    for (const taskId of taskDirs) {
      const task = this.loadTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  // Delete task
  static deleteTask(taskId: string): boolean {
    const taskDir = join(TASKS_DIR, taskId);

    if (existsSync(taskDir)) {
      rmSync(taskDir, { recursive: true });
      return true;
    }

    return false;
  }
}

export default TaskService;
