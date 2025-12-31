/**
 * Performance Service
 * 性能服务模块入口
 */

export {
  getPerformanceManager,
  initializePerformanceManager,
  getCurrentFps,
  getTaskInterval,
} from './manager';

export {
  getResourceMonitor,
  startResourceMonitoring,
  stopResourceMonitoring,
  getResourceUsage,
  type ResourceUsage,
} from './monitor';
