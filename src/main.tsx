import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SchedulerTestApp } from "./SchedulerTestApp";

// Check if we're in test mode (via URL query parameter)
const urlParams = new URLSearchParams(window.location.search);
const isTestMode = urlParams.get('test') === 'scheduler';

// 🔥 使用 IIFE 确保代码一定执行
(async function initializeLive2D() {
  try {
    const { initGlobalLive2D } = await import('./services/live2d/global-init');
    await initGlobalLive2D();
  } catch (error) {
    console.error('[main] ❌ Live2D 初始化失败:', error);
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isTestMode ? <SchedulerTestApp /> : <App />}
  </React.StrictMode>,
);
