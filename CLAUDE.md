# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Desktop Pet - 一个跨平台桌面宠物应用，结合Live2D渲染、AI对话、多Agent协作、MCP协议扩展、任务调度能力。

**Tech Stack:**
- Desktop: Tauri 2.0 (using plugins only, no src-tauri/ custom backend yet)
- Frontend: React 19 + TypeScript + Vite
- State: Zustand
- Live2D: PixiJS + oh-my-live2d
- AI: Vercel AI SDK + LangChain/LangGraph
- Database: SQLite (via tauri-plugin-sql)
- Scheduler: Custom task scheduler with cron/interval/event triggers

## Prerequisites

**REQUIRED before development:**

1. **Rust Toolchain** (CRITICAL for Tauri)
   ```bash
   # Install Rust via rustup
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # Verify installation
   rustc --version
   cargo --version
   ```

2. **Node.js 18+** and **pnpm**
   ```bash
   # Install pnpm (if not installed)
   npm install -g pnpm

   # Verify
   node --version
   pnpm --version
   ```

3. **System Dependencies** (platform-specific)
   - **macOS**: Xcode Command Line Tools
   - **Linux**: `build-essential`, `libwebkit2gtk-4.0-dev`, `libssl-dev`, etc.
   - **Windows**: Visual Studio Build Tools with C++ workload

   See: https://tauri.app/v2/guides/getting-started/prerequisites/

## Development Commands

### Frontend Development
```bash
# Install dependencies (use pnpm, NOT npm)
pnpm install

# Start dev server (frontend only, port 1420)
pnpm dev

# Build frontend
pnpm build

# Type check
tsc --noEmit
```

### Tauri Development
```bash
# Start Tauri dev (both frontend and backend)
pnpm tauri dev

# Build for production
pnpm tauri build
```

**Note:** Project currently uses Tauri plugins only. No custom Rust backend in src-tauri/ directory yet.

## Code Architecture

### High-Level Structure

```
src/
├── components/     # React UI components
│   ├── pet/       # Live2D pet display & interaction
│   ├── chat/      # Chat interface
│   ├── agent/     # Multi-agent panel & workflow visualizer
│   └── settings/  # Settings panels (LLM, voice, MCP, skins, data)
├── services/      # Business logic layer
│   ├── llm/       # LLM provider abstraction (OpenAI/Anthropic/Ollama)
│   ├── agent/     # Agent runtime + LangGraph workflows + tools
│   ├── mcp/       # MCP client + transport (stdio/HTTP)
│   ├── voice/     # STT/TTS + lip-sync
│   ├── live2d/    # Live2D model manager
│   ├── skin/      # Skin import/management
│   ├── scheduler/ # Task scheduler with triggers/actions
│   ├── database/  # SQLite queries
│   └── data/      # Data import/export/backup
├── stores/        # Zustand state stores
├── hooks/         # React custom hooks
└── types/         # TypeScript type definitions
```

### Path Aliases

The project uses `@/` as an alias for `src/`:
```typescript
import { useChatStore } from '@/stores';
import type { AgentTool } from '@/types';
```

Configured in `tsconfig.json` and `vite.config.ts`.

### Key Design Patterns

**1. Service Layer Pattern**
- All business logic lives in `src/services/`
- Each service exports a clean interface through `index.ts`
- Components consume services via custom hooks in `src/hooks/`

**2. State Management**
- Zustand stores for global state (pet, chat, agent, config, scheduler, skin)
- Location: `src/stores/`
- Pattern: `useXxxStore()` hooks
- All stores exported from `src/stores/index.ts`

**3. Type Safety**
- All types defined in `src/types/`
- Separate type files per domain (chat.ts, agent.ts, mcp.ts, scheduler.ts, etc.)
- Strict TypeScript config with `noImplicitAny: true` and `noUncheckedIndexedAccess: true`
- All type files re-exported from `src/types/index.ts`

**4. Agent System Architecture**
- **LangGraph-based**: Multi-agent workflows use state graphs
- **Tool System**: Base class `BaseTool` in `services/agent/base-tool.ts`
- **Built-in Tools**: search, weather, clipboard, file operations, opener
- **MCP Integration**: MCP tools converted to agent tools via `services/mcp/discovery.ts`
- **Workflows**: Supervisor pattern with researcher/writer/executor agents
- **Runtime**: `AgentRuntime` class manages tool calling with streaming LLM

**5. MCP Integration**
- **Client**: `services/mcp/client.ts` wraps `@modelcontextprotocol/sdk`
- **Transports**: stdio (`transport-stdio.ts`) and HTTP (`transport-http.ts`)
- **Discovery**: Auto-convert MCP tools to agent-compatible format
- **Manager**: `integration.ts` handles server lifecycle and connection pooling

**6. Task Scheduler System**
- **Manager**: `services/scheduler/manager.ts` - singleton SchedulerManager
- **Triggers**: cron, interval, event, manual
- **Actions**: notification, agent_task, workflow, script
- **Event System**: EventEmitter for task lifecycle events
- **Persistence**: Tasks stored in SQLite with execution history

### Application Initialization Flow

**CRITICAL**: The initialization order in `App.tsx` is:

1. **Database Init**: `initDatabase()` creates tables and connection
2. **Config Load**: `useConfigStore.getState().loadConfig()` loads settings
3. **Scheduler Init**: `getSchedulerManager().initialize()` starts task scheduler
4. **Render**: Main UI components rendered after `dbReady` state is true

If you modify initialization, maintain this order to avoid race conditions.

### Critical Implementation Details

**Database Schema (SQLite)**

Tables:
- `conversations` - Chat conversation metadata
- `messages` - Chat messages with tool calls
- `config` - Key-value configuration store
- `mcp_servers` - MCP server configurations
- `agent_roles` - Custom agent role definitions
- `workflows` - LangGraph workflow definitions
- `skins` - Live2D model metadata
- `tasks` - Scheduler task definitions
- `task_executions` - Task execution history

Access via `services/database/*.ts` modules. Schema defined in `services/database/index.ts`.

**Live2D Rendering**
- Manager: `services/live2d/manager.ts`
- Canvas component: `components/pet/PetCanvas.tsx`
- Emotion-based animation switching
- Mouse tracking for head/eye movement

**Voice System**
- STT: Web Speech API (`stt-web.ts`)
- TTS: Edge TTS (`tts-edge.ts`) or Web Speech API (`tts-web.ts`)
- Lip-sync coordinates with Live2D mouth animation

**LLM Abstraction**
- Providers: `services/llm/providers.ts` using Vercel AI SDK
- Supports: OpenAI, Anthropic, Ollama
- Streaming support built-in
- Session management in `chat.ts`

**Scheduler System**
- Singleton instance via `getSchedulerManager()`
- Event-driven: emits 'started', 'completed', 'failed' events
- Supports cron expressions via node-cron-like syntax
- Actions can trigger agent tasks or workflows

## TypeScript Guidelines

**STRICT RULES - NO EXCEPTIONS:**
1. **NO `any` types allowed** - Use proper types or `unknown` + type guards
2. **All types must be in `src/types/*.ts`** - No inline complex types in components/services
3. **Components must have prop types** - Use interface/type declaration
4. **Strict null checks** - Handle undefined/null explicitly

**File Organization:**
- Files over 500 lines → Split into sub-components or hooks
- Type definitions → `types/` directory (e.g., `types/agent.ts`)
- Complex components → Extract hooks to `hooks/`

## Common Tasks

### Adding a New Agent Tool
1. Create tool class in `services/agent/tools/`
2. Extend `BaseTool` base class
3. Implement `execute()` method with proper error handling
4. Define parameter schema (JSON Schema format)
5. Export from `tools/index.ts`
6. Add to `createBuiltInTools()` in `tools/index.ts`

### Adding a New MCP Server
1. Add config to SQLite `mcp_servers` table (or via settings UI)
2. `MCPManager` will auto-connect on app start
3. Tools auto-discovered via `discovery.ts` and available to agents

### Adding a New LangGraph Workflow
1. Create workflow file in `services/agent/workflows/presets/`
2. Define state type extending base workflow state
3. Build state graph with `.addNode()` and `.addEdge()`
4. Export from `workflows/index.ts`

### Adding a New Live2D Model
1. Place model files in `public/models/[model-name]/`
2. Add metadata to `skins` table via settings UI or `database/skins.ts`
3. Use `services/skin/manager.ts` to load

### Adding a Scheduled Task
1. Use `getSchedulerManager().createTask()`
2. Define trigger (cron/interval/event/manual)
3. Define action (notification/agent_task/workflow/script)
4. Task persisted to database automatically

## Tauri-Specific Patterns

### Using Tauri Plugins
```typescript
import { invoke } from '@tauri-apps/api/core';

// Database (via plugin)
import Database from '@tauri-apps/plugin-sql';
const db = await Database.load('sqlite:app.db');
await db.execute('INSERT INTO ...');
```

### File System Access
```typescript
import { readFile, writeFile } from '@tauri-apps/plugin-fs';

// Always use Tauri FS plugin, not browser File API
const content = await readFile('path/to/file');
```

### System Integration
```typescript
import { open } from '@tauri-apps/plugin-opener';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

await open('https://example.com'); // Open URL
await writeText('clipboard content'); // Write to clipboard
```

## Performance Considerations

**Rendering Optimization:**
- Live2D idle framerate: reduce to 15fps when not interacting
- Minimize re-renders: use `memo()` for expensive components
- Lazy load models: don't load all skins at startup

**Memory Management:**
- Chat history: paginate old messages
- Live2D models: unload inactive skins
- Agent execution: clean up completed workflows

**Build Size:**
- Manual chunks in `vite.config.ts` already configured
- Vendor chunks: react-vendor, live2d-vendor, ai-sdk, langchain, tauri-plugins, utils
- Keep chunks under 1000kb (warning threshold)

## Known Issues & Gotchas

1. **oh-my-live2d**: Large dependency (~2MB), excluded from `optimizeDeps` in Vite
2. **MCP stdio transport**: Uses shell commands, ensure cross-platform compatibility
3. **Type strictness**: Project has `noImplicitAny: true` and `noUncheckedIndexedAccess: true` - maintain rigor
4. **Single file size**: Keep under 500 lines - refactor if exceeded
5. **Agent timeouts**: Long-running workflows need progress feedback
6. **Scheduler initialization**: Must happen after database init in App.tsx

## Debugging Tips

**Frontend:**
- React DevTools for component hierarchy
- Zustand DevTools for state inspection
- Console logs in services (already present with `[ServiceName]` prefixes)

**Agent Execution:**
- Enable LangGraph debug mode for state transitions
- Check `AgentPanel.tsx` for execution logs
- Tool call results logged in `ToolCallItem.tsx`

**Scheduler:**
- Check browser console for `[SchedulerManager]` logs
- Query `task_executions` table for execution history
- Listen to scheduler events: `scheduler.on('started', ...)`

## External Documentation

- Tauri: https://tauri.app/
- Vercel AI SDK: https://sdk.vercel.ai/
- LangGraph.js: https://langchain-ai.github.io/langgraphjs/
- MCP Protocol: https://modelcontextprotocol.io/
- Live2D Cubism: https://www.live2d.com/
- oh-my-live2d: https://oml2d.com/

## Project-Specific Constraints

1. **Use pnpm** - NOT npm or yarn
2. **No emojis in code** - Use proper icons instead
3. **Chinese documentation** - Requirements and design docs in Chinese (see `docs/`)
4. **Type definitions separate** - All in `types/` directory
5. **500-line file limit** - Split if exceeded
6. **Path aliases** - Use `@/` instead of relative imports for src/
