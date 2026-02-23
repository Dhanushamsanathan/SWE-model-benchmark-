<template>
  <div id="app">
    <header class="header">
      <h1>SWE Benchmark</h1>
      <nav>
        <button @click="currentView = 'setup'" :class="{ active: currentView === 'setup' }">Setup</button>
        <button @click="currentView = 'tasks'" :class="{ active: currentView === 'tasks' }">Tasks</button>
        <button @click="currentView = 'runner'" :class="{ active: currentView === 'runner' }">Run Benchmark</button>
        <button @click="currentView = 'results'" :class="{ active: currentView === 'results' }">Results</button>
      </nav>
    </header>

    <main class="main">
      <SetupPage
        v-if="currentView === 'setup'"
        :apiKey="apiKey"
        :models="models"
        :selectedModel="selectedModel"
        @update:apiKey="apiKey = $event"
        @update:selectedModel="selectedModel = $event"
        @validate="validateApiKey"
        @loadModels="loadModels"
      />

      <TaskUpload
        v-if="currentView === 'tasks'"
        :tasks="tasks"
        @upload="uploadTask"
        @refresh="loadTasks"
      />

      <BenchmarkRunner
        v-if="currentView === 'runner'"
        :tasks="tasks"
        :selectedModel="selectedModel"
        :apiKey="apiKey"
        @start="startBenchmark"
      />

      <ResultsDashboard
        v-if="currentView === 'results'"
        :results="results"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SetupPage from './views/SetupPage.vue';
import TaskUpload from './views/TaskUpload.vue';
import BenchmarkRunner from './views/BenchmarkRunner.vue';
import ResultsDashboard from './views/ResultsDashboard.vue';
import apiClient from './api/client';

const currentView = ref('setup');
const apiKey = ref('');
const selectedModel = ref('');
const models = ref<any[]>([]);
const tasks = ref<any[]>([]);
const results = ref<any[]>([]);

async function validateApiKey(key: string) {
  try {
    const response = await apiClient.validateKey(key);
    if (response.valid) {
      apiKey.value = key;
      await loadModels();
    }
    return response.valid;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

async function loadModels() {
  try {
    const response = await apiClient.getModels(apiKey.value);
    models.value = response.models;
  } catch (error) {
    console.error('Failed to load models:', error);
  }
}

async function loadTasks() {
  try {
    const response = await apiClient.getTasks();
    tasks.value = response.tasks;
  } catch (error) {
    console.error('Failed to load tasks:', error);
  }
}

async function loadResults() {
  try {
    const response = await apiClient.getResults();
    results.value = response;
  } catch (error) {
    console.error('Failed to load results:', error);
  }
}

async function uploadTask(taskData: any) {
  try {
    await apiClient.uploadTask(taskData);
    await loadTasks();
  } catch (error) {
    console.error('Failed to upload task:', error);
  }
}

async function startBenchmark(taskId: string) {
  try {
    await apiClient.runBenchmark(taskId, selectedModel.value, apiKey.value);
    // Poll for results after starting
    setTimeout(loadResults, 2000);
  } catch (error) {
    console.error('Failed to start benchmark:', error);
  }
}

onMounted(async () => {
  await loadTasks();
  await loadResults();
});
</script>

<style>
.header {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  font-size: 1.5rem;
}

.header nav {
  display: flex;
  gap: 0.5rem;
}

.header nav button {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.header nav button:hover {
  background: rgba(255,255,255,0.1);
}

.header nav button.active {
  background: #42b983;
  border-color: #42b983;
}

.main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h2 {
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  min-height: 120px;
  font-family: monospace;
}

.btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.btn:hover {
  background: #3aa876;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
}

.btn-secondary:hover {
  background: #5a6268;
}

.card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.card h3 {
  margin-bottom: 0.5rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.progress-bar {
  height: 20px;
  background: #eee;
  border-radius: 10px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-bar-fill {
  height: 100%;
  background: #42b983;
  transition: width 0.3s;
}

.logs {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.875rem;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.metric {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: #42b983;
}

.metric-label {
  color: #6c757d;
  font-size: 0.875rem;
}

.error {
  color: #dc3545;
  margin-top: 0.5rem;
}

.success {
  color: #42b983;
  margin-top: 0.5rem;
}
</style>
