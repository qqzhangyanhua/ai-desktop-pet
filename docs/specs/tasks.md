# 开发任务清单 (tasks.md)

## 阶段0：项目初始化与环境搭建

- [ ] 0.1 初始化Tauri 2.0 + React + TypeScript项目
  - 使用 `pnpm create tauri-app` 创建项目，选择React + TypeScript模板
  - 配置Vite构建工具
  - 验证：能成功运行 `pnpm tauri dev` 启动空白窗口
  - _需求: 基础设施_

- [ ] 0.2 配置项目基础依赖
  - 安装前端依赖：zustand, @tauri-apps/api, pixi.js, pixi-live2d-display
  - 安装AI相关依赖：ai (Vercel AI SDK), @langchain/langgraph, @langchain/core
  - 安装MCP依赖：@modelcontextprotocol/sdk
  - 安装工具依赖：uuid, date-fns
  - 配置TypeScript严格模式，禁止any类型
  - _需求: 基础设施_

- [ ] 0.3 配置Tauri Rust后端依赖
  - 在Cargo.toml添加：tauri-plugin-sql (SQLite), tauri-plugin-fs, tauri-plugin-shell, tauri-plugin-clipboard-manager
  - 配置tauri.conf.json权限
  - _需求: 基础设施_

- [ ] 0.4 建立项目目录结构
  - 按照design.md创建完整的目录结构
  - 创建各模块的index.ts入口文件
  - 创建types/目录下所有类型定义文件的骨架
  - _需求: 基础设施_

- [ ] 0.5 初始化SQLite数据库
  - 实现数据库初始化Tauri命令
  - 创建所有表结构（conversations, messages, config, mcp_servers, agent_roles, workflows, skins）
  - 实现db_execute和db_select通用查询命令
  - 验证：应用启动时自动创建数据库文件
  - _需求: 9.1_

---

## 阶段1：桌面宠物核心

- [ ] 1.1 实现透明无边框窗口
  - 配置tauri.conf.json：transparent: true, decorations: false
  - 设置窗口默认大小300x400
  - 实现窗口始终置顶功能
  - 验证：启动后显示透明背景窗口，置顶于其他应用之上
  - _需求: 1.1_

- [ ] 1.2 实现窗口拖拽移动
  - 监听鼠标按下拖拽事件
  - 调用Tauri窗口API更新位置
  - 将窗口位置持久化到config表
  - 启动时恢复上次位置
  - 验证：可拖拽窗口，重启后位置保持
  - _需求: 1.2_

- [ ] 1.3 实现系统托盘
  - 使用tauri-plugin-shell创建系统托盘图标
  - 托盘菜单项：显示/隐藏宠物、设置、退出
  - 点击托盘图标切换窗口显示状态
  - _需求: 1.5_

- [ ] 1.4 实现右键上下文菜单
  - 在宠物区域右键弹出菜单
  - 菜单项：开始对话、设置、隐藏、退出
  - 使用React Portal实现菜单组件
  - _需求: 1.4_

---

## 阶段2：Live2D渲染系统

- [ ] 2.1 集成PixiJS和Live2D
  - 创建PetCanvas组件，初始化PixiJS Application
  - 配置pixi-live2d-display加载器
  - 加载Cubism 4 SDK核心库
  - 验证：PixiJS画布正常渲染
  - _需求: 2.1_

- [ ] 2.2 实现Live2D模型加载
  - 创建useLive2D hook管理模型状态
  - 实现从public/models/目录加载.moc3模型
  - 处理模型加载失败的降级显示
  - 验证：成功显示默认Live2D角色
  - _需求: 2.1_

- [ ] 2.3 实现待机动画循环
  - 解析模型的motion配置
  - 实现idle动画自动循环播放
  - 随机切换不同idle动作
  - _需求: 1.3_

- [ ] 2.4 实现表情系统
  - 创建EmotionManager组件
  - 定义情绪枚举：happy, thinking, confused, surprised, neutral
  - 实现情绪到表情动画的映射
  - 提供setEmotion接口供对话系统调用
  - _需求: 2.2_

- [ ] 2.5 实现鼠标追踪
  - 监听全局鼠标位置
  - 计算鼠标相对于模型的角度
  - 更新模型的眼睛/头部朝向参数
  - 添加平滑过渡动画
  - _需求: 2.4_

- [ ] 2.6 实现口型同步基础
  - 创建LipSync服务
  - 定义口型参数映射（音量->张嘴程度）
  - 预留与TTS的集成接口
  - _需求: 2.3_

---

## 阶段3：AI对话系统

- [ ] 3.1 实现对话UI组件
  - 创建ChatWindow组件（可折叠的对话面板）
  - 创建ChatInput组件（文本输入框+发送按钮）
  - 创建ChatMessage组件（支持用户/助手/工具消息样式）
  - 使用CSS实现消息气泡样式
  - _需求: 3.1_

- [ ] 3.2 实现对话状态管理
  - 创建chatStore (Zustand)
  - 状态：messages, currentConversationId, isLoading
  - Actions：sendMessage, clearMessages, loadConversation
  - _需求: 3.4_

- [ ] 3.3 实现LLM适配器 - OpenAI
  - 使用Vercel AI SDK封装OpenAI调用
  - 支持流式输出
  - 实现API密钥配置读取
  - _需求: 3.2, 3.3_

- [ ] 3.4 实现LLM适配器 - Anthropic
  - 封装Anthropic Claude API调用
  - 支持流式输出
  - 处理不同的消息格式转换
  - _需求: 3.2, 3.3_

- [ ] 3.5 实现LLM适配器 - Ollama
  - 封装本地Ollama API调用
  - 自动检测Ollama服务是否运行
  - 获取可用模型列表
  - _需求: 3.2_

- [ ] 3.6 实现对话历史持久化
  - 对话结束时保存到conversations和messages表
  - 实现加载历史对话列表
  - 实现加载单个对话详情
  - 实现删除对话
  - _需求: 3.6_

- [ ] 3.7 实现系统提示词配置
  - 在设置中添加System Prompt编辑器
  - 支持保存多个预设人格
  - 新对话时应用当前选中的人格
  - _需求: 3.5_

- [ ] 3.8 对话与情绪联动
  - 分析AI回复内容推断情绪
  - 调用EmotionManager更新表情
  - 简单规则：包含"!"->excited，包含"?"->thinking等
  - _需求: 2.2_

---

## 阶段4：语音系统

- [ ] 4.1 实现语音识别(STT) - Web Speech API
  - 封装Web Speech API
  - 创建useVoice hook
  - 实现开始/停止监听
  - 实时回调转写文本
  - _需求: 4.1_

- [ ] 4.2 实现语音识别(STT) - Whisper本地
  - 集成whisper.cpp或whisper-web
  - 实现录音和本地转写
  - 支持中英文识别
  - _需求: 4.1, 4.6_

- [ ] 4.3 实现语音合成(TTS) - Edge TTS
  - 封装Edge TTS API调用
  - 获取可用音色列表
  - 实现文本转语音播放
  - _需求: 4.2_

- [ ] 4.4 实现语音合成(TTS) - OpenAI
  - 封装OpenAI TTS API
  - 支持多种音色选择
  - 作为高质量备选方案
  - _需求: 4.2_

- [ ] 4.5 实现口型同步集成
  - TTS播放时提取音频波形
  - 实时更新Live2D口型参数
  - 确保动画与音频同步
  - _需求: 4.4_

- [ ] 4.6 实现语音设置界面
  - STT开关和引擎选择
  - TTS开关和音色选择
  - 快捷键配置（按住说话）
  - _需求: 4.5_

---

## 阶段5：智能体(Agent)系统

- [ ] 5.1 定义Agent类型系统
  - 在types/agent.ts定义Tool接口
  - 定义ToolCall、ToolResult类型
  - 定义AgentEvent类型（用于流式输出）
  - _需求: 5.1_

- [ ] 5.2 实现基础Tool接口
  - 创建BaseTool抽象类
  - 定义execute方法签名
  - 定义工具描述schema（供LLM理解）
  - _需求: 5.1_

- [ ] 5.3 实现内置工具 - 网页搜索
  - 集成搜索API（DuckDuckGo或Tavily）
  - 返回搜索结果摘要
  - _需求: 5.2_

- [ ] 5.4 实现内置工具 - 天气查询
  - 集成免费天气API
  - 支持城市名查询
  - 返回温度、天气状况
  - _需求: 5.2_

- [ ] 5.5 实现内置工具 - 剪贴板操作
  - 调用Tauri clipboard插件
  - 实现读取和写入剪贴板
  - _需求: 5.2_

- [ ] 5.6 实现内置工具 - 打开URL/应用
  - 调用Tauri shell插件
  - 实现打开浏览器URL
  - 实现打开本地应用
  - _需求: 5.2_

- [ ] 5.7 实现内置工具 - 文件读写
  - 调用Tauri fs插件
  - 实现读取文本文件
  - 实现写入文本文件
  - 需要用户确认授权
  - _需求: 5.2, 5.4_

- [ ] 5.8 实现Agent运行时
  - 创建AgentRuntime类
  - 注册可用工具集
  - 实现tool_choice调用流程
  - 处理工具调用结果并继续对话
  - _需求: 5.1_

- [ ] 5.9 实现工具调用UI
  - 在AgentPanel显示工具调用日志
  - 显示"正在执行..."状态
  - 敏感操作弹窗确认
  - _需求: 5.3, 5.4_

---

## 阶段6：多Agent协作系统 (LangGraph)

- [ ] 6.1 设计LangGraph状态图
  - 定义AgentState类型
  - 设计节点：supervisor, worker_agents, tools
  - 设计边：路由逻辑
  - _需求: 6.1, 6.2_

- [ ] 6.2 实现Supervisor节点
  - 分析用户任务
  - 决定分配给哪个Agent
  - 汇总各Agent结果
  - _需求: 6.2_

- [ ] 6.3 实现Worker Agent节点
  - 创建研究员Agent（擅长搜索和信息整理）
  - 创建写手Agent（擅长内容创作）
  - 创建执行者Agent（擅长工具调用）
  - _需求: 6.1_

- [ ] 6.4 实现Agent间消息传递
  - 定义中间结果格式
  - 实现上下文在Agent间传递
  - 记录完整的协作日志
  - _需求: 6.3_

- [ ] 6.5 实现预设工作流 - 深度研究
  - 定义研究工作流图
  - 研究员搜索 -> 整理 -> 输出报告
  - 保存为工作流模板
  - _需求: 6.5_

- [ ] 6.6 实现预设工作流 - 内容创作
  - 定义内容创作工作流图
  - 研究 -> 大纲 -> 写作 -> 润色
  - 保存为工作流模板
  - _需求: 6.5_

- [ ] 6.7 实现协作可视化界面
  - 创建WorkflowVisualizer组件
  - 显示当前活跃的Agent
  - 显示任务进度和中间结果
  - 实现暂停/恢复/取消操作
  - _需求: 6.4, 6.6_

- [ ] 6.8 实现自定义Agent角色
  - Agent角色CRUD界面
  - 配置角色名称、描述、系统提示词、可用工具
  - 持久化到agent_roles表
  - _需求: 6.1_

---

## 阶段7：MCP集成

- [ ] 7.1 实现MCP Client核心
  - 基于@modelcontextprotocol/sdk
  - 实现Client类封装
  - 支持连接生命周期管理
  - _需求: 7.1_

- [ ] 7.2 实现stdio传输
  - 通过Tauri shell启动MCP Server进程
  - 实现stdin/stdout通信
  - 处理进程生命周期
  - _需求: 7.6_

- [ ] 7.3 实现HTTP传输
  - 实现HTTP/SSE连接
  - 处理认证头
  - _需求: 7.6_

- [ ] 7.4 实现工具自动发现
  - 连接后调用tools/list
  - 解析工具schema
  - 转换为内部Tool格式
  - _需求: 7.3_

- [ ] 7.5 集成MCP工具到Agent
  - MCP工具注册到AgentRuntime
  - 实现工具调用代理
  - 统一错误处理
  - _需求: 7.4_

- [ ] 7.6 实现MCP Server管理界面
  - 创建MCPSettings组件
  - 添加/编辑/删除Server配置
  - 显示连接状态
  - 启用/禁用开关
  - 显示已发现的工具列表
  - _需求: 7.2, 7.5_

---

## 阶段8：皮肤与外观系统

- [ ] 8.1 实现皮肤管理Store
  - 创建skinStore
  - 状态：currentSkin, availableSkins
  - 从skins表加载皮肤列表
  - _需求: 8.1_

- [ ] 8.2 实现皮肤切换功能
  - 卸载当前Live2D模型
  - 加载新皮肤模型
  - 保存用户皮肤偏好
  - 确保切换无需重启
  - _需求: 8.1, 8.4_

- [ ] 8.3 准备默认皮肤资源
  - 准备至少2套免费Live2D模型
  - 放置到public/models/目录
  - 配置模型元数据
  - _需求: 8.2_

- [ ] 8.4 实现皮肤导入功能
  - 支持导入.zip格式皮肤包
  - 解压到用户数据目录
  - 验证包含必要的模型文件
  - 添加到skins表
  - _需求: 8.3_

- [ ] 8.5 实现皮肤设置界面
  - 创建SkinSettings组件
  - 显示皮肤预览图网格
  - 点击切换皮肤
  - 导入皮肤按钮
  - 删除自定义皮肤
  - _需求: 8.1, 8.3_

- [ ] 8.6 实现宠物缩放功能
  - 添加缩放滑块控件
  - 调整Live2D模型scale
  - 同步调整窗口大小
  - 保存缩放偏好
  - _需求: 8.6_

---

## 阶段9：数据管理

- [ ] 9.1 实现配置管理服务
  - 创建ConfigService类
  - 实现get/set/getAll方法
  - API密钥加密存储（使用tauri-plugin-stronghold或AES）
  - _需求: 9.1, 9.2_

- [ ] 9.2 实现数据导出功能
  - 导出conversations和messages为JSON
  - 导出config（排除敏感信息）
  - 导出agent_roles和workflows
  - 打包为单个.json文件
  - _需求: 9.3_

- [ ] 9.3 实现数据导入功能
  - 解析导入的JSON文件
  - 验证数据格式
  - 合并或覆盖现有数据（用户选择）
  - 处理ID冲突
  - _需求: 9.4_

- [ ] 9.4 实现重置功能
  - 清除所有数据库表
  - 删除用户数据目录
  - 重新初始化默认配置
  - 二次确认弹窗
  - _需求: 9.5_

- [ ] 9.5 实现设置主界面
  - 创建SettingsWindow组件
  - Tab布局：通用、LLM、语音、MCP、皮肤、数据
  - 整合各模块设置组件
  - _需求: 全局_

---

## 阶段10：集成测试与优化

- [ ] 10.1 性能优化 - 渲染
  - 实现空闲降帧（30fps -> 15fps）
  - 窗口最小化时暂停渲染
  - 验证内存占用 < 200MB
  - _需求: 非功能性_

- [ ] 10.2 性能优化 - 启动
  - 实现代码分割
  - 预加载关键资源
  - 验证冷启动 < 3秒
  - _需求: 非功能性_

- [ ] 10.3 端到端测试 - 对话流程
  - 测试完整对话流程
  - 测试流式输出
  - 测试对话历史持久化
  - _需求: 模块三_

- [ ] 10.4 端到端测试 - Agent流程
  - 测试单工具调用
  - 测试多Agent协作工作流
  - 测试MCP工具集成
  - _需求: 模块五、六、七_

- [ ] 10.5 跨平台测试
  - macOS构建和测试
  - Windows构建和测试
  - Linux构建和测试
  - _需求: 兼容性_

- [ ] 10.6 打包发布准备
  - 配置应用图标
  - 配置安装包元信息
  - 生成各平台安装包
  - 编写用户使用说明
  - _需求: 发布_
