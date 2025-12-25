import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SchedulerTestApp } from "./SchedulerTestApp";

// Check if we're in test mode (via URL query parameter)
const urlParams = new URLSearchParams(window.location.search);
const isTestMode = urlParams.get('test') === 'scheduler';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isTestMode ? <SchedulerTestApp /> : <App />}
  </React.StrictMode>,
);
