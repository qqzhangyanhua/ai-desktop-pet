# Repository Guidelines

## 项目结构与模块组织
- `src/` 为 React + TypeScript 前端：`main.tsx` 入口，`App.tsx` 主界面，`components/` 复用组件，`hooks/` 自定义 Hook，`services/` AI/插件调用封装，`stores/` 使用 zustand 管理状态，`styles/` 全局样式，`types/` 公共类型定义，`assets/` 静态素材。
- `public/` 静态资源与模板占位，`dist/` 为 Vite 构建产物，`docs/` 额外文档。
- `src-tauri/` 存放 Rust/Tauri 原生端：`src/` 内实现命令与插件桥接，`tauri.conf.json` 配置窗口、权限与打包，`icons/` 应用图标。
- 根目录包含 `vite.config.ts`、`tsconfig*.json`、`pnpm-lock.yaml` 以锁定构建配置与依赖版本。

## 构建、测试与开发命令
- 推荐使用 pnpm：`pnpm install` 安装依赖。
- 前端开发：`pnpm dev` 启动 Vite 热更新；桌面联调：`pnpm dev:tauri` 打开 Tauri 窗口并监听前端。
- 构建：`pnpm build` 生成前端静态文件；`pnpm build:tauri` 打包桌面应用；`pnpm preview` 以本地服务预览构建结果。
- Rust 端可在 `src-tauri` 运行 `cargo check` 做类型与依赖检查。

## 编码风格与命名约定
- TypeScript 严格模式，函数组件优先，副作用通过 Hook 管理；状态集中放入 `stores/`，跨层数据经 `zod` 校验。
- 统一 2 空格缩进，单引号/模板字符串，文件名使用 kebab-case；组件用 PascalCase，Hook 命名 `useXxx`。
- 样式集中在 `styles/`，避免在组件内散落内联样式；公共类型放 `types/` 统一复用。
- Rust 侧遵循 rustfmt，模块/文件 snake_case，公共接口集中在入口模块便于审查。

## 测试指引
- 当前未内置自动化测试，提交前至少手动验证关键交互、Tauri 命令调用与配置加载。
- 若新增测试，建议引入 `vitest` + `@testing-library/react`，文件命名 `*.test.ts(x)` 放同目录或 `__tests__/`；必要时补充端到端场景。
- 构建或打包前确保本地验证通过，并记录主要验证命令或截图以便复现。

## 提交与 PR 规范
- 建议约定式提交前缀：`feat`/`fix`/`chore`/`docs`/`refactor`，示例：`feat: add live2d toggle`。
- PR 描述需包含：变更摘要、影响范围（前端/原生层）、验证方式（命令输出或截图）、关联 Issue；界面改动附前后对比。
- 依赖升级或配置调整需说明动机与回滚方案；跨前后端改动尽量分 commit，便于评审与回溯。

## 安全与配置提示
- AI 密钥与模型配置使用环境变量或 Tauri 安全存储，不要写入仓库；提交前检查新增文件是否应忽略。
- 与 Tauri 插件交互时注意权限提示、错误兜底与线程切换，前端请求通过 `services/` 统一封装，避免在组件直接调用原生接口。
