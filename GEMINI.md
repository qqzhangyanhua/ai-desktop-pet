# GEMINI.md - Project Context & Developer Guide

## 1. Project Overview

**Project Name:** AI Desktop Pet
**Description:** A cross-platform desktop pet application combining Live2D rendering, AI dialogue, multi-agent collaboration, MCP (Model Context Protocol) extension, and task scheduling capabilities.

**Core Features:**
- **Desktop:** Built with Tauri 2.0 (currently using plugins only, no custom Rust backend).
- **Frontend:** React 19 + TypeScript + Vite.
- **AI/Agents:** Powered by Vercel AI SDK and LangChain/LangGraph. Supports multi-agent workflows (Supervisor pattern).
- **Live2D:** Uses PixiJS + oh-my-live2d for rendering interactive pet models.
- **Data:** SQLite database via `tauri-plugin-sql`.
- **Scheduling:** Custom task scheduler with cron, interval, and event triggers.

## 2. Tech Stack

| Category | Technology | Notes |
| :--- | :--- | :--- |
| **Desktop Framework** | Tauri 2.0 | Plugins only (`@tauri-apps/plugin-*`). No custom Rust backend code in `src-tauri/` yet. |
| **Frontend Framework** | React 19 | Hooks-based architecture. |
| **Build Tool** | Vite | Configured in `vite.config.ts`. |
| **Language** | TypeScript | Strict mode enabled (`noImplicitAny: true`, `noUncheckedIndexedAccess: true`). |
| **State Management** | Zustand | Stores located in `src/stores/`. |
| **Routing/Navigation** | None | Single-page application logic. |
| **AI SDKs** | Vercel AI SDK, LangChain | `@ai-sdk/*`, `@langchain/*`. |
| **Live2D** | PixiJS, oh-my-live2d | Rendering engine for `.model3.json` assets. |
| **Database** | SQLite | Managed via `tauri-plugin-sql`. Schema in `src/services/database/`. |
| **Styling** | TailwindCSS | Configured in `tailwind.config.js`. Global styles in `src/styles/`. |
| **Package Manager** | **pnpm** | Strictly enforced. |

## 3. Architecture & Design Patterns

### 3.1. Directory Structure

- **`src/components/`**: React UI components (PascalCase).
    - `pet/`: Live2D display, canvas, interaction feedback.
    - `chat/`: Chat interface.
    - `agent/`: Agent panel & workflow visualizer.
    - `settings/`: Configuration panels.
- **`src/services/`**: **Business Logic Layer**. All logic resides here.
    - `llm/`: LLM provider abstractions.
    - `agent/`: LangGraph runtimes, tools, workflows.
    - `mcp/`: MCP client and discovery.
    - `scheduler/`: Task scheduling system.
    - `database/`: SQLite queries and schema.
    - `live2d/`: Model management.
    - `pet/`: Status, emotions, interactions.
- **`src/stores/`**: Global state (Zustand). Accessed via `useXxxStore` hooks.
- **`src/hooks/`**: Custom React hooks.
- **`src/types/`**: **All Type Definitions**. No inline types in components.
- **`src-tauri/`**: Rust/Tauri configuration.

### 3.2. Key Design Patterns

1.  **Service Layer Pattern:** Components NEVER contain complex business logic. They consume `services` via custom `hooks`.
2.  **Strict Type Separation:** All types must be defined in `src/types/*.ts` files. Re-exported via `src/types/index.ts`.
3.  **Path Aliases:** Use `@/` for `src/` (e.g., `import { ... } from '@/stores'`).
4.  **Agent System (LangGraph):**
    - **Runtime:** `AgentRuntime` manages tool calling.
    - **Tools:** Extend `BaseTool` (`services/agent/base-tool.ts`).
    - **Workflows:** Defined as state graphs in `services/agent/workflows/`.
5.  **Initialization Order (Critical):**
    In `App.tsx`, initialization MUST follow this sequence to avoid race conditions:
    1.  `initDatabase()`
    2.  `useConfigStore.getState().loadConfig()`
    3.  `getSchedulerManager().initialize()`
    4.  Render UI

## 4. Development Workflow

### 4.1. Prerequisites
- **Rust Toolchain:** Required for Tauri (`rustc`, `cargo`).
- **Node.js 18+ & pnpm:** `npm install -g pnpm`.
- **System Deps:** Xcode Command Line Tools (macOS), build-essential (Linux), VS Build Tools (Windows).

### 4.2. Commands

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install dependencies. |
| `pnpm dev` | Start frontend dev server (port 1420). |
| `pnpm tauri dev` | Start Tauri dev (frontend + backend). |
| `pnpm build` | Build frontend only. |
| `pnpm tauri build` | Build production application. |
| `tsc --noEmit` | Run Type check. |

### 4.3. Coding Standards (Strict)
- **NO `any` types:** Use `unknown` with type guards if necessary.
- **File Limits:** Files > 500 lines should be refactored/split.
- **Naming:**
    - Files: `kebab-case` (e.g., `my-component.tsx`, `user-service.ts`).
    - Components: `PascalCase`.
    - Hooks: `camelCase` (prefix `use`).
- **No Emojis in Code:** Use icons (Lucide, etc.) instead.

## 5. Key Subsystems

### 5.1. Agent & MCP
- **Tools:** Built-in tools (search, weather, etc.) and MCP tools are unified.
- **MCP Discovery:** MCP tools are auto-converted to agent tools via `services/mcp/discovery.ts`.
- **Workflows:** Supervisor pattern with specialized agents (researcher, writer, executor).

### 5.2. Task Scheduler
- **Manager:** Singleton `SchedulerManager` (`services/scheduler/manager.ts`).
- **Triggers:** Cron, Interval, Event, Manual.
- **Actions:** Notification, Agent Task, Workflow, Script.
- **Persistence:** Stored in `tasks` and `task_executions` tables.

### 5.3. Pet Status & Live2D
- **Status:** Decay calculations (hunger, mood, energy) handled in `services/pet/status.ts`.
- **Interaction:** `PetContainer.tsx` handles mouse events.
    - Zones: Top (Pet), Middle (Feed), Bottom (Play).
    - Cooldowns: Pet (60s), Feed (120s), Play (90s).
- **Window Behavior:** Custom auto-hide logic in `useWindowAutoHide`.
    - **Warning:** Do NOT add `data-tauri-drag-region` to parent containers with mouse handlers (causes macOS panic).

## 6. Common Implementation Tasks

### Adding a New Agent Tool
1.  Create class in `services/agent/tools/` extending `BaseTool`.
2.  Implement `execute()` and define schema.
3.  Register in `createBuiltInTools()` in `tools/index.ts`.

### Adding a New Scheduled Task
1.  Use `getSchedulerManager().createTask()`.
2.  Define trigger and action.
3.  Task is auto-persisted to SQLite.

### Database Changes
1.  Modify schema in `services/database/index.ts` (or specific table file).
2.  **Note:** Verify migration strategy (currently likely requires DB reset or manual migration handling as no formal migration tool is mentioned).

## 7. Known Issues & Gotchas

1.  **Race Conditions:** Respect `App.tsx` initialization order.
2.  **MacOS Window Drag:** Avoid `data-tauri-drag-region` on interactive elements.
3.  **Debounced Writes:** Pet status updates to DB are debounced (5s). Use `updateStatusImmediate()` for urgent saves.
4.  **Tauri FS:** Always use `@tauri-apps/plugin-fs`, never browser `File` API.
5.  **Agent Timeouts:** Long workflows need progress feedback to avoid user perceiving a hang.
6.  **Oh-my-live2d:** Large dependency, excluded from Vite optimization.
