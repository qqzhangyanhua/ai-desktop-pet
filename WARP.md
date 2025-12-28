# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

AI Desktop Pet is a cross-platform desktop pet application built with **Tauri 2**, **React 19 + TypeScript + Vite**, **Zustand** for state, **PixiJS + oh-my-live2d** for Live2D rendering, and a multi-agent AI system (Vercel AI SDK + LangChain/LangGraph + MCP). The Rust side currently relies on Tauri plugins only; there is no custom backend in `src-tauri/` yet.

Key design documents and rules:
- `AGENTS.md`: high-level repo guidelines (structure, commands, coding style).
- `CLAUDE.md`: detailed architecture for agents, MCP, scheduler, Live2D, data, and UI systems.

Prefer `pnpm` for all Node workflows.

## Tooling & Commands

### Prerequisites
- Rust toolchain via `rustup` (required for Tauri).
- Node.js 18+ and `pnpm`.
- Platform-specific Tauri prerequisites (Xcode CLT on macOS, etc.).

### Install & Dev
```bash
# install (root)
pnpm install

# frontend dev (Vite dev server on :1420)
pnpm dev

# full desktop dev (Tauri + frontend, recommended for app work)
pnpm dev:tauri
```

### Build & Packaging
```bash
# type-check + build frontend only
pnpm build

# bundle desktop app (uses pnpm build under the hood)
pnpm build:tauri

# preview built frontend (static)
pnpm preview
```

### Testing & Type-Checking
The repo includes `vitest` and is wired in `tsconfig.json` (`vitest/globals` type). There are no test scripts yet:
```bash
# run all tests (Vitest)
pnpm vitest

# run a single test file
pnpm vitest src/path/to/file.test.tsx

# run tests by name
pnpm vitest -t "test name"

# strict type-check (no emit)
pnpm exec tsc --noEmit
```

### Utilities & Tauri
```bash
# Live2D maintenance
pnpm check:live2d   # verify Live2D model integrity
pnpm enable:live2d  # enable / configure Live2D

# reset app config to defaults
pnpm reset:config

# Tauri CLI passthrough
pnpm tauri -- --help

# (optional) Rust-side checks if you add src-tauri Rust code
cd src-tauri && cargo check
```

Tauri build config (`src-tauri/tauri.conf.json`) runs `pnpm dev` before `tauri dev` and `pnpm build` before `tauri build`, and serves the app on `http://localhost:1420`.

## Project Structure & Conventions

High level:
- `src/`: React + TypeScript frontend.
  - `main.tsx` entry + `App.tsx` main UI.
  - `components/`: UI components (pet, chat, agents, settings, etc.).
  - `services/`: business logic layer (AI, agents, MCP, scheduler, DB, Live2D, data, etc.).
  - `stores/`: Zustand stores (`useXxxStore`) for global state.
  - `hooks/`: React hooks wrapping services and stores.
  - `types/`: shared domain types (chat, agent, MCP, scheduler, pet, etc.).
  - `styles/`: global styles, design tokens, and game-style UI classes.
- `public/`: static assets, including Live2D model folders under `public/models/`.
- `src-tauri/`: Tauri config, icons, and (in future) Rust backend if added.
- `docs/`: Chinese design and requirements docs.

Path aliases (configured in `tsconfig.json` and `vite.config.ts`):
- `@/` → `src/` (use this instead of long relative paths).
- `node:async_hooks` is shimmed to `src/shims/async_hooks.ts` for LangGraph.

TypeScript rules (from `tsconfig.json` and `CLAUDE.md`):
- Strict mode with `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, etc.
- Avoid `any` (prefer proper domain types or `unknown` + refinement).
- Complex shared types live in `src/types/*` and are re-exported from `src/types/index.ts`.

Repository conventions (from `AGENTS.md` and `CLAUDE.md`):
- Use `pnpm` (not npm/yarn).
- 2-space indentation; kebab-case filenames; React components in PascalCase; hooks as `useXxx`.
- Centralize cross-cutting state in `stores/`, validate cross-layer data with `zod`.
- Keep single files under ~500 lines; extract subcomponents/hooks when larger.
- No emojis in code; prefer icons/graphics.

## Frontend Architecture: Services, Stores, Components

The frontend is organized around a clear separation of concerns:

### 1. Service Layer (`src/services/`)
Each domain has a service module that hides implementation details behind a clean interface, typically re-exported via `index.ts`:
- **LLM (`services/llm/`)**: wraps Vercel AI SDK providers (OpenAI, Anthropic, Ollama) with streaming support and session management.
- **Agents (`services/agent/`)**: multi-agent runtime using LangGraph; manages tools, workflows, and streaming execution.
- **MCP (`services/mcp/`)**: handles Model Context Protocol servers, transports (stdio/http), discovery, and tool conversion into agent tools.
- **Scheduler (`services/scheduler/`)**: custom task scheduler with cron/interval/event/manual triggers and actions (notifications, agent tasks, workflows, scripts).
- **Database (`services/database/`)**: thin layer over Tauri SQL plugin (`@tauri-apps/plugin-sql`) for SQLite schema and queries.
- **Live2D (`services/live2d/`, `services/pet/`)**: Live2D model manager, pet emotion/behavior systems, expression packs, and voice-to-expression linking.
- **Statistics & Achievements (`services/statistics/`, `services/achievements/`)**: track usage and unlock achievements.
- **Data (`services/data/`)**: export/import/backup logic and validation for conversations, config, skins, tasks, MCP, agents, workflows.

Application code should call into these services (often via hooks) rather than talking directly to Tauri plugins, MCP, or LangGraph.

### 2. State Management (`src/stores/`)
Global state (chat, pet status, config, scheduler, skins, assistant behavior, etc.) is managed via Zustand stores:
- Each store follows the `useXxxStore()` pattern.
- Stores are re-exported from `src/stores/index.ts`.
- UI components subscribe to minimal slices to avoid re-render storms.

The pet status system in particular uses debounced database writes and caching; for user-driven updates there are explicit "immediate" update entry points (see `CLAUDE.md` details when touching pet status logic).

### 3. Components & Hooks

Key component groups:
- **Pet UI (`components/pet/`)**: Live2D canvas, pet container, auto-hide/drag behaviors, and interaction handling.
- **Chat UI (`components/chat/`)**: chat panel, message list, streaming responses, and tool call visualization.
- **Agent UI (`components/agent/`)**: multi-agent workflow visualizer, execution logs, and tool call inspection.
- **Settings Center (`components/settings/`)**: main settings window, tabs for LLM, voice, MCP, skins/Live2D, data, scheduler, stats, and advanced options.

Hooks in `src/hooks/` encapsulate common patterns like auto-hide window behavior, binding stores/services to React, and bridging Tauri/MCP/agent activity into the UI.

## Multi-Agent & MCP System

The agent system is central to this project and is extensively documented in `CLAUDE.md`:
- Uses **LangGraph** to define state graphs for multi-agent workflows.
- Tool system is built on a `BaseTool` abstraction (`services/agent/base-tool.ts`), with both built-in tools (search, weather, clipboard, FS, opener, etc.) and dynamically discovered MCP tools.
- MCP servers are managed via a dedicated manager in `services/mcp/`:
  - Transports: stdio and HTTP.
  - Discovery automatically converts MCP tools into agent-compatible tools.
- `AgentRuntime` coordinates calls to LLM providers, tools, and workflows with streaming updates to the UI.

When adding new tools/workflows or MCP servers, follow the patterns described in `CLAUDE.md` ("Adding a New Agent Tool", "Adding a New MCP Server", "Adding a New LangGraph Workflow").

## Scheduler, Pet System, and Game Mechanics

### Task Scheduler (`services/scheduler/`)
- A singleton `SchedulerManager` coordinates tasks and emits events like `started/completed/failed`.
- Triggers: cron expressions, fixed intervals, event-based, or manual.
- Actions: notifications, invoking agent tasks or workflows, or running scripts.
- Tasks and their execution history are persisted to SQLite (`tasks`, `task_executions` tables).

UI panels in settings provide a visual front-end for creating and testing scheduled tasks.

### Pet Behavior & Status (`services/pet/`)
- Core modules handle pet **status decay**, **interactions**, **emotions**, **growth stages**, **idle behavior**, and **action feedback**.
- Expression packs (`services/pet/expression-pack.ts` and `expression-packs/*`) define different personality/feedback styles, chosen via config.
- Interactions are zone-based (pet/feed/play) with cooldowns and debounced persistence to the `pet_status` table.

Changes here often affect UX, persistence, and rendering; consult `CLAUDE.md` for detailed rules, cooldowns, and caching.

## Data & Persistence

SQLite is accessed via the Tauri SQL plugin and initialized early in app startup:
- Tables (see `CLAUDE.md` for full list): conversations/messages, config, MCP servers, agent roles, workflows, skins, tasks/executions, pet_status, statistics, achievements, agent_audit.
- Schema and helpers live under `src/services/database/`.

Data tooling (`src/services/data/`):
- **Export**: dump selected tables (conversations, config, skins, agent_roles, MCP servers, etc.) into JSON.
- **Import**: validate and upsert from JSON using schema validators.
- **Backup**: create/restore/delete database backup files.

Settings panels wrap these operations for users; agents should call the service layer instead of accessing Tauri SQL directly.

## Application Startup & Windows

### Initialization Order (critical)
App initialization (see `App.tsx` and `CLAUDE.md`) follows a specific sequence:
1. Initialize SQLite database and ensure schema is ready.
2. Load config from DB and apply window settings (size, position, always-on-top, click-through).
3. Load skins and attempt to apply the selected skin.
4. Load pet status and related state.
5. Initialize statistics and achievements services.
6. Initialize the scheduler manager.
7. Only then render the main UI once `dbReady` is true.

If you change startup logic, preserve this ordering to avoid race conditions (e.g., scheduler/tasks before DB init, or UI reading config before it's loaded).

### Multi-Window Model
- Vite is configured as a **multi-page app** via `vite.config.ts`:
  - `main: index.html` – main pet window.
  - `settings: settings.html` – settings center.
  - `chat: chat.html` – dedicated chat window.
- Tauri windows are defined in `src-tauri/tauri.conf.json`; main window is transparent, borderless, always-on-top, with drag disabled at the OS level and reimplemented via drag regions.

Pet window behavior has several important constraints (see `CLAUDE.md` for details):
- Auto-hide logic checks for proximity to screen edges and animates hiding/showing with delays.
- Initialization of auto-hide is delayed to avoid macOS event loop issues.
- Do **not** mark containers with mouse handlers as `data-tauri-drag-region`; this can cause Tauri/macOS crashes.

## Styling & UI Design

Global styling is defined in `src/styles/` and implements a game-style, macaron-themed glassmorphism UI:
- Design tokens (colors, radii, z-index scale) live in a dedicated tokens file.
- Global utility classes (e.g., `settings-section`, `game-card`, `game-log-panel`, `game-alert-*`) are reused across settings and game-like panels.

When adding UI, prefer reusing these tokens and classes rather than introducing ad-hoc styles.

## Testing & Validation Notes

From `AGENTS.md` and current setup:
- There is no established automated test suite yet; important flows should at least be manually verified (key interactions, Tauri command calls, config loading, scheduler, and agent flows).
- If you introduce tests, use `vitest` (already configured) and colocate tests as `*.test.ts(x)` or under `__tests__/`.
- Before shipping builds, run at minimum: `pnpm build` and (for desktop) `pnpm build:tauri`, plus relevant Vitest suites if you add them.
