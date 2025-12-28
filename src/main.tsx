import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SchedulerTestApp } from "./SchedulerTestApp";
import { initGlobalLive2D } from "./services/live2d/global-init";

// Check if we're in test mode (via URL query parameter)
const urlParams = new URLSearchParams(window.location.search);
const isTestMode = urlParams.get('test') === 'scheduler';

// 🔥 关键：在 React 渲染之前初始化 Live2D
// 这样可以避免 React 生命周期（StrictMode 双重渲染）导致的重复初始化问题
console.log('[main] Initializing Live2D before React render...');
initGlobalLive2D().then((instance) => {
  console.log('[main] Live2D initialization started, instance:', !!instance);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isTestMode ? <SchedulerTestApp /> : <App />}
  </React.StrictMode>,
);
