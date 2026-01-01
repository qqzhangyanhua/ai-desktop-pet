# AI Desktop Pet

一个跨平台桌面宠物应用，结合 Live2D 渲染、AI 对话、多 Agent 协作、MCP 协议扩展、任务调度能力。

## 技术栈

- **Desktop**: Tauri 2.0
- **Frontend**: React 19 + TypeScript + Vite
- **State**: Zustand
- **Live2D**: PixiJS + oh-my-live2d
- **AI**: Vercel AI SDK + LangChain/LangGraph
- **Database**: SQLite (via tauri-plugin-sql)

## 开发环境

### 前置要求

1. **Rust Toolchain** (Tauri 必需)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js 18+** 和 **pnpm**
   ```bash
   npm install -g pnpm
   ```

3. **系统依赖**
   - **macOS**: Xcode Command Line Tools
   - **Linux**: `build-essential`, `libwebkit2gtk-4.0-dev`, `libssl-dev` 等
   - **Windows**: Visual Studio Build Tools with C++ workload

### 安装与运行

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

## 功能说明

### 天气查询

天气查询功能使用 [wttr.in](https://wttr.in) 免费 API，**无需配置任何 API Key**。

**使用方式**：
- 右键菜单点击「查询天气」
- 首次使用会自动根据 IP 定位当前城市
- 查询结果会记住城市，下次直接使用
- 如需查询其他城市，通过聊天窗口输入「查询北京天气」

**网络要求**：
- 需要能访问 `https://wttr.in`
- 如果查询失败，请检查网络连接或代理设置

### AI 对话

AI 对话功能需要配置 LLM 提供商。在设置中心配置：

| 提供商 | 配置项 | 说明 |
|--------|--------|------|
| OpenAI | API Key | 从 [platform.openai.com](https://platform.openai.com) 获取 |
| Anthropic | API Key | 从 [console.anthropic.com](https://console.anthropic.com) 获取 |
| Ollama | Base URL | 本地部署，默认 `http://localhost:11434` |

### MCP 服务

支持通过 MCP (Model Context Protocol) 扩展功能。在设置中心添加 MCP 服务器配置。

## IDE 推荐

- [VS Code](https://code.visualstudio.com/)
- [Tauri 扩展](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 许可证

MIT
