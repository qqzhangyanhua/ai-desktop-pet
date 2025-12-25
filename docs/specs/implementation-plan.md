# AI Desktop Pet - 剩余功能实现计划

## 总览

| 阶段 | 功能模块 | 预计任务数 | 依赖 |
|------|----------|-----------|------|
| Phase 2 | Live2D模型集成 | 6 | 无 |
| Phase 4 | 语音系统 | 6 | 无 |
| Phase 5 | Agent工具系统 | 9 | 无 |
| Phase 6 | 多Agent协作 | 8 | Phase 5 |
| Phase 7 | MCP集成 | 6 | Phase 5 |
| Phase 8 | 皮肤系统 | 6 | Phase 2 |
| Phase 9 | 数据导入导出 | 4 | 无 |
| Phase 10 | 优化与打包 | 6 | 全部 |

---

## Phase 2: Live2D模型集成

### 2.1 集成pixi-live2d-display
- 安装 `pixi-live2d-display` 和 Cubism SDK
- 配置webpack/vite处理Live2D资源
- **文件**: `src/services/live2d/loader.ts`

### 2.2 实现Live2D模型加载
- 创建 `useLive2D` hook
- 从 `public/models/` 加载 `.moc3` 模型
- 处理加载失败降级显示
- **文件**: `src/hooks/useLive2D.ts`

### 2.3 实现待机动画循环
- 解析模型motion配置
- idle动画自动循环
- 随机切换不同idle动作
- **文件**: `src/services/live2d/animation.ts`

### 2.4 增强表情系统
- 情绪到Live2D表情映射
- 平滑过渡动画
- **文件**: `src/services/live2d/emotion.ts`

### 2.5 实现鼠标追踪
- 监听全局鼠标位置
- 更新模型眼睛/头部朝向
- 平滑过渡
- **文件**: `src/hooks/useMouseTracking.ts`

### 2.6 准备默认模型资源
- 下载2套免费Live2D模型
- 放置到 `public/models/`
- 配置模型元数据

---

## Phase 4: 语音系统

### 4.1 STT - Web Speech API
- 封装Web Speech API
- 创建 `useVoice` hook
- 实时回调转写文本
- **文件**: `src/services/voice/stt-web.ts`, `src/hooks/useVoice.ts`

### 4.2 STT - Whisper (可选)
- 集成whisper-web或whisper.cpp
- 本地录音转写
- 支持中英文
- **文件**: `src/services/voice/stt-whisper.ts`

### 4.3 TTS - Edge TTS
- 封装Edge TTS API
- 获取可用音色列表
- 文本转语音播放
- **文件**: `src/services/voice/tts-edge.ts`

### 4.4 TTS - OpenAI (可选)
- 封装OpenAI TTS API
- 多音色选择
- **文件**: `src/services/voice/tts-openai.ts`

### 4.5 口型同步
- TTS播放时提取音频波形
- 实时更新Live2D口型参数
- **文件**: `src/services/voice/lip-sync.ts`

### 4.6 语音设置界面
- STT开关和引擎选择
- TTS开关和音色选择
- 快捷键配置
- **文件**: `src/components/settings/VoiceSettings.tsx`

---

## Phase 5: Agent工具系统

### 5.1 定义Tool类型系统
```typescript
// src/types/agent.ts - 已有骨架，需完善
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}
```

### 5.2 实现BaseTool抽象类
- **文件**: `src/services/agent/base-tool.ts`

### 5.3 内置工具 - 网页搜索
- 集成DuckDuckGo或Tavily API
- **文件**: `src/services/agent/tools/search.ts`

### 5.4 内置工具 - 天气查询
- 集成免费天气API (wttr.in或OpenWeather)
- **文件**: `src/services/agent/tools/weather.ts`

### 5.5 内置工具 - 剪贴板操作
- 使用Tauri clipboard插件
- **文件**: `src/services/agent/tools/clipboard.ts`

### 5.6 内置工具 - 打开URL/应用
- 使用Tauri shell插件
- **文件**: `src/services/agent/tools/opener.ts`

### 5.7 内置工具 - 文件读写
- 使用Tauri fs插件
- 用户确认授权
- **文件**: `src/services/agent/tools/file.ts`

### 5.8 实现AgentRuntime
- 注册工具集
- tool_choice调用流程
- 处理工具结果
- **文件**: `src/services/agent/runtime.ts`

### 5.9 工具调用UI
- 显示工具调用日志
- 敏感操作确认弹窗
- **文件**: `src/components/agent/AgentPanel.tsx`, `src/components/agent/ToolCallLog.tsx`

---

## Phase 6: 多Agent协作 (LangGraph)

### 6.1 设计LangGraph状态图
- 定义AgentState类型
- 设计节点和边
- **文件**: `src/services/agent/workflows/graph.ts`

### 6.2 实现Supervisor节点
- 任务分析和分配
- 结果汇总
- **文件**: `src/services/agent/workflows/supervisor.ts`

### 6.3 实现Worker Agent节点
- 研究员Agent (搜索和信息整理)
- 写手Agent (内容创作)
- 执行者Agent (工具调用)
- **文件**: `src/services/agent/workflows/workers/`

### 6.4 Agent间消息传递
- 中间结果格式
- 上下文传递
- 协作日志
- **文件**: `src/services/agent/workflows/messaging.ts`

### 6.5 预设工作流 - 深度研究
- **文件**: `src/services/agent/workflows/presets/research.ts`

### 6.6 预设工作流 - 内容创作
- **文件**: `src/services/agent/workflows/presets/content.ts`

### 6.7 协作可视化界面
- 当前活跃Agent显示
- 任务进度和中间结果
- 暂停/恢复/取消
- **文件**: `src/components/agent/WorkflowVisualizer.tsx`

### 6.8 自定义Agent角色
- Agent角色CRUD界面
- 持久化到agent_roles表
- **文件**: `src/components/agent/AgentRoleEditor.tsx`

---

## Phase 7: MCP集成

### 7.1 MCP Client核心
- 基于@modelcontextprotocol/sdk
- 连接生命周期管理
- **文件**: `src/services/mcp/client.ts`

### 7.2 stdio传输
- 通过Tauri shell启动Server进程
- stdin/stdout通信
- **文件**: `src/services/mcp/transport-stdio.ts`

### 7.3 HTTP传输
- HTTP/SSE连接
- 认证处理
- **文件**: `src/services/mcp/transport-http.ts`

### 7.4 工具自动发现
- 调用tools/list
- 解析schema转换为内部Tool格式
- **文件**: `src/services/mcp/discovery.ts`

### 7.5 集成MCP工具到Agent
- 注册到AgentRuntime
- 统一错误处理
- **文件**: `src/services/mcp/integration.ts`

### 7.6 MCP Server管理界面
- 添加/编辑/删除Server
- 连接状态显示
- 已发现工具列表
- **文件**: `src/components/settings/MCPSettings.tsx`

---

## Phase 8: 皮肤系统

### 8.1 皮肤管理Store
- currentSkin, availableSkins状态
- 从skins表加载
- **文件**: `src/stores/skinStore.ts`

### 8.2 皮肤切换功能
- 卸载/加载Live2D模型
- 保存偏好
- **文件**: `src/services/skin/manager.ts`

### 8.3 准备默认皮肤
- 至少2套Live2D模型
- 模型元数据配置

### 8.4 皮肤导入功能
- 支持.zip格式
- 解压验证
- **文件**: `src/services/skin/importer.ts`

### 8.5 皮肤设置界面
- 预览图网格
- 点击切换/导入/删除
- **文件**: `src/components/settings/SkinSettings.tsx`

### 8.6 宠物缩放功能
- 缩放滑块
- 窗口大小同步
- **文件**: 集成到SkinSettings

---

## Phase 9: 数据导入导出

### 9.1 数据导出
- 导出conversations, messages为JSON
- 导出config (排除敏感信息)
- 导出agent_roles, workflows
- **文件**: `src/services/database/export.ts`

### 9.2 数据导入
- 解析验证JSON
- 合并/覆盖选项
- ID冲突处理
- **文件**: `src/services/database/import.ts`

### 9.3 重置功能
- 清除所有表
- 重新初始化
- 二次确认
- **文件**: `src/services/database/reset.ts`

### 9.4 完整设置界面
- Tab布局: 通用、LLM、语音、MCP、皮肤、数据
- **文件**: 重构 `src/components/settings/SettingsPanel.tsx`

---

## Phase 10: 优化与打包

### 10.1 渲染性能优化
- 空闲降帧 (30fps -> 15fps)
- 最小化时暂停渲染
- 内存占用 < 200MB

### 10.2 启动性能优化
- 代码分割 (dynamic import)
- 预加载关键资源
- 冷启动 < 3秒

### 10.3 端到端测试
- 对话流程测试
- Agent流程测试

### 10.4 跨平台测试
- macOS构建测试
- Windows构建测试
- Linux构建测试

### 10.5 打包发布
- 应用图标配置
- 安装包元信息
- 各平台安装包生成

### 10.6 文档编写
- 用户使用说明
- 开发者文档

---

## 实施顺序建议

```
Phase 5 (Agent工具) ─────┬───> Phase 6 (多Agent)
                        │
                        └───> Phase 7 (MCP)

Phase 2 (Live2D) ────────────> Phase 8 (皮肤)

Phase 4 (语音) ──────────────> Phase 2 (口型同步)

Phase 9 (数据) ──────────────> Phase 10 (优化打包)
```

**推荐实施顺序**:
1. Phase 5: Agent工具系统 (核心功能)
2. Phase 2: Live2D模型集成 (视觉体验)
3. Phase 4: 语音系统 (交互体验)
4. Phase 7: MCP集成 (扩展能力)
5. Phase 6: 多Agent协作 (高级功能)
6. Phase 8: 皮肤系统 (个性化)
7. Phase 9: 数据导入导出 (数据管理)
8. Phase 10: 优化与打包 (发布准备)
