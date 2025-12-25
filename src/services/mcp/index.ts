// MCP Service exports

export * from './types';
export { MCPClient } from './client';
export type { MCPTransport, MCPClientOptions } from './client';
export { StdioTransport, createStdioTransport } from './transport-stdio';
export { HttpTransport, createHttpTransport } from './transport-http';
export { convertMCPTool, discoverTools, getToolByName, groupToolsByServer, filterToolsByCapability } from './discovery';
export { MCPManager, getMCPManager, destroyMCPManager, getMCPToolsForAgent } from './integration';
export type { MCPManagerState, MCPManagerEvents } from './integration';
