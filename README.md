# Web Interface Implementation Plan for Bun Benchmark Analysis

## Overview

Build a Vue.js + Bun.js web interface for the existing benchmark system with real-time monitoring, task management, and results visualization.

---

## Phase 1: Backend API Server (Bun.js)

**Location:** `/api-server/`

### Core Components

#### 1. API Server (`server.ts`)
- Use `Bun.serve()` for HTTP server
- WebSocket support for real-time updates
- CORS configuration for Vue frontend

#### 2. API Endpoints (`routes/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all 80+ tasks with metadata |
| GET | `/api/tasks/:id` | Get task details (README, code, tests) |
| POST | `/api/tasks/upload` | Upload new tasks |
| GET | `/api/models` | Fetch models from OpenRouter API dynamically |
| POST | `/api/benchmark/run` | Run benchmarks (wrapper around existing scripts) |
| GET | `/api/benchmark/status` | Real-time progress via WebSocket |
| GET | `/api/results` | Serve existing benchmark-results.json |

#### 3. Services (`services/`)
- Extract logic from `run-benchmark.ts` into reusable modules
- Task scanner to index all tasks in `tasks/`
- Model fetcher for OpenRouter API integration
- Progress tracker for WebSocket updates

---

## Phase 2: Frontend Vue.js App

**Location:** `/web-frontend/`

### Pages

1. **Setup Page** - API key input, model selection from OpenRouter
2. **Tasks Dashboard** - Browse all tasks with categories and status
3. **Benchmark Runner** - Start/stop benchmarks with live progress
4. **Results Dashboard** - Charts, statistics, category breakdowns
5. **Task Detail** - View code, tests, solutions, results per task

### Key Features

- Real-time benchmark progress via WebSocket
- Interactive charts (Chart.js or ECharts)
- Task upload with drag & drop
- Model selector from OpenRouter API
- Results comparison across models

---

## Phase 3: Integration & Polish

- Integrate existing benchmark scripts as API services
- Add authentication for API keys
- Implement error handling and validation
- Add responsive design
- Persist user preferences

---

## Project Structure

```
/api-server/
  ├── server.ts
  ├── routes/
  │   ├── tasks.ts
  │   ├── models.ts
  │   ├── benchmark.ts
  │   └── results.ts
  ├── services/
  │   ├── taskScanner.ts
  │   ├── benchmarkRunner.ts
  │   └── modelFetcher.ts
  └── websocket/
      └── progressHandler.ts

/web-frontend/
  ├── src/
  │   ├── views/
  │   │   ├── SetupPage.vue
  │   │   ├── TasksDashboard.vue
  │   │   ├── BenchmarkRunner.vue
  │   │   ├── ResultsDashboard.vue
  │   │   └── TaskDetail.vue
  │   ├── components/
  │   │   ├── ModelSelector.vue
  │   │   ├── TaskCard.vue
  │   │   └── ProgressChart.vue
  │   ├── api/
  │   │   └── client.ts
  │   └── stores/
  │       └── benchmarkStore.ts
  └── package.json
```

---

## Development Notes

This implementation leverages your existing scripts while adding a modern web interface for:
- Better usability
- Real-time monitoring
- Interactive task management
- Visual results analysis