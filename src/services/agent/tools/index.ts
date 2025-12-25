// Tools exports

export { WebSearchTool } from './search';
export { WeatherTool } from './weather';
export { ClipboardReadTool, ClipboardWriteTool } from './clipboard';
export { OpenUrlTool, OpenAppTool } from './opener';
export { FileReadTool, FileWriteTool, FileExistsTool } from './file';

import { WebSearchTool } from './search';
import { WeatherTool } from './weather';
import { ClipboardReadTool, ClipboardWriteTool } from './clipboard';
import { OpenUrlTool, OpenAppTool } from './opener';
import { FileReadTool, FileWriteTool, FileExistsTool } from './file';
import type { Tool } from '../../../types';

// Create all built-in tool instances
export function createBuiltInTools(): Tool[] {
  return [
    new WebSearchTool().toJSON(),
    new WeatherTool().toJSON(),
    new ClipboardReadTool().toJSON(),
    new ClipboardWriteTool().toJSON(),
    new OpenUrlTool().toJSON(),
    new OpenAppTool().toJSON(),
    new FileReadTool().toJSON(),
    new FileWriteTool().toJSON(),
    new FileExistsTool().toJSON(),
  ];
}

// Get tool by name
export function getBuiltInTool(name: string): Tool | undefined {
  const tools = createBuiltInTools();
  return tools.find((t) => t.name === name);
}
