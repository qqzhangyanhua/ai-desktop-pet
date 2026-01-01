// Tools exports

// Export legacy class wrappers for backward compatibility
export { WebSearchTool } from './search';
export { WeatherTool } from './weather';
export { ClipboardReadTool, ClipboardWriteTool } from './clipboard';
export { OpenUrlTool, OpenAppTool } from './opener';
export { FileReadTool, FileWriteTool, FileExistsTool } from './file';
export { BookmarkSearchTool } from './bookmark';

// Import defineTool instances (preferred)
import { webSearchTool } from './search';
import { weatherTool } from './weather';
import { clipboardReadTool, clipboardWriteTool } from './clipboard';
import { openUrlTool, openAppTool } from './opener';
import { fileReadTool, fileWriteTool, fileExistsTool } from './file';
import { bookmarkSearchTool } from './bookmark';
import type { Tool } from '../../../types';

// Create all built-in tool instances
export function createBuiltInTools(): Tool[] {
  return [
    webSearchTool.toJSON(),
    weatherTool.toJSON(),
    clipboardReadTool.toJSON(),
    clipboardWriteTool.toJSON(),
    openUrlTool.toJSON(),
    openAppTool.toJSON(),
    fileReadTool.toJSON(),
    fileWriteTool.toJSON(),
    fileExistsTool.toJSON(),
    bookmarkSearchTool.toJSON(),
  ];
}

// Get tool by name
export function getBuiltInTool(name: string): Tool | undefined {
  const tools = createBuiltInTools();
  return tools.find((t) => t.name === name);
}

// 智能体专用工具
export { memoryTool } from './memory-tool';
export { emotionTool } from './emotion-tool';
export { notificationTool, type NotificationType, type NotificationConfig } from './notification-tool';
export { scheduleTool, type ScheduleEntry } from './schedule-tool';
