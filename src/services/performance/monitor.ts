/**
 * Resource Monitor Service
 * 资源监控服务
 *
 * 监控内存和 CPU 使用率，当资源占用超过阈值时自动降级
 */

import type { ResourceLimit } from '@/types';
import { useConfigStore, toast } from '@/stores';
import { getPerformanceManager } from './manager';

/**
 * 资源阈值配置
 */
interface ResourceThreshold {
  memory: number; // MB
  cpu: number; // %
}

/**
 * 各级别的阈值
 */
const THRESHOLDS: Record<ResourceLimit, ResourceThreshold> = {
  low: { memory: 500, cpu: 20 },
  medium: { memory: 1024, cpu: 40 },
  high: { memory: 2048, cpu: 60 },
};

/**
 * 资源使用情况
 */
export interface ResourceUsage {
  memoryMB: number;
  cpuPercent: number;
  timestamp: number;
}

/**
 * 资源监控回调
 */
interface ResourceMonitorCallbacks {
  onUsageUpdate?: (usage: ResourceUsage) => void;
  onThresholdExceeded?: (usage: ResourceUsage, threshold: ResourceThreshold) => void;
  onDegradation?: () => void;
}

/**
 * ResourceMonitor 单例类
 */
class ResourceMonitor {
  private static instance: ResourceMonitor;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: ResourceMonitorCallbacks = {};
  private lastUsage: ResourceUsage | null = null;
  private isDegraded = false;

  private constructor() {}

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: ResourceMonitorCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // 已经在监控中
    }

    // 每分钟检查一次
    this.monitoringInterval = setInterval(() => {
      void this.checkResources();
    }, 60000);

    // 立即检查一次
    void this.checkResources();
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 检查资源使用情况
   */
  async checkResources(): Promise<void> {
    const usage = await this.getResourceUsage();
    this.lastUsage = usage;

    // 通知使用情况更新
    if (this.callbacks.onUsageUpdate) {
      this.callbacks.onUsageUpdate(usage);
    }

    // 检查阈值
    await this.checkThresholds(usage);
  }

  /**
   * 获取资源使用情况
   */
  async getResourceUsage(): Promise<ResourceUsage> {
    const memoryMB = this.getMemoryUsage();
    const cpuPercent = await this.getCPUUsage();

    return {
      memoryMB,
      cpuPercent,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取内存使用量（MB）
   * 使用 performance.memory API（Chrome/Chromium 特性）
   */
  private getMemoryUsage(): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perf = performance as any;
    if (perf.memory) {
      return Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  /**
   * 获取 CPU 使用率（%）
   * 注意：浏览器环境下无法直接获取 CPU 使用率
   * 这里使用一个估算方法：测量事件循环延迟
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 1000000;

      // 模拟 CPU 负载测量
      let sum = 0;
      for (let i = 0; i < iterations; i++) {
        sum += Math.random();
      }

      const elapsed = performance.now() - start;

      // 基于执行时间估算 CPU 负载
      // 正常情况下 1M 次迭代应该在 10-50ms 完成
      // 如果超过 100ms 说明 CPU 繁忙
      const estimatedCpu = Math.min(100, Math.max(0, (elapsed / 100) * 50));

      // 使用 sum 避免编译器优化掉循环
      if (sum > 0) {
        resolve(Math.round(estimatedCpu));
      } else {
        resolve(0);
      }
    });
  }

  /**
   * 检查是否超过阈值
   */
  private async checkThresholds(usage: ResourceUsage): Promise<void> {
    const { config } = useConfigStore.getState();
    const limit = config.performance.resourceLimit;
    const threshold = THRESHOLDS[limit];

    const exceeds =
      usage.memoryMB > threshold.memory || usage.cpuPercent > threshold.cpu;

    if (exceeds) {
      // 通知阈值超过
      if (this.callbacks.onThresholdExceeded) {
        this.callbacks.onThresholdExceeded(usage, threshold);
      }

      // 触发降级
      if (!this.isDegraded) {
        await this.triggerDegradation();
      }
    } else if (this.isDegraded) {
      // 资源恢复正常，可以考虑恢复性能
      // 但为了避免频繁切换，这里不自动恢复
    }
  }

  /**
   * 触发降级策略
   */
  private async triggerDegradation(): Promise<void> {
    this.isDegraded = true;

    // 切换到省电模式
    const perfManager = getPerformanceManager();
    await perfManager.setMode('battery');

    // 通知降级
    if (this.callbacks.onDegradation) {
      this.callbacks.onDegradation();
    }

    // 显示警告（如果配置了）
    toast.warning('资源占用过高，已自动降级性能', 5000);
  }

  /**
   * 获取最后一次资源使用情况
   */
  getLastUsage(): ResourceUsage | null {
    return this.lastUsage;
  }

  /**
   * 是否已降级
   */
  getIsDegraded(): boolean {
    return this.isDegraded;
  }

  /**
   * 重置降级状态
   */
  resetDegradation(): void {
    this.isDegraded = false;
  }

  /**
   * 获取当前阈值
   */
  getCurrentThreshold(): ResourceThreshold {
    const { config } = useConfigStore.getState();
    return THRESHOLDS[config.performance.resourceLimit];
  }

  /**
   * 获取所有阈值配置
   */
  getAllThresholds(): Record<ResourceLimit, ResourceThreshold> {
    return { ...THRESHOLDS };
  }
}

/**
 * 获取 ResourceMonitor 单例
 */
export function getResourceMonitor(): ResourceMonitor {
  return ResourceMonitor.getInstance();
}

/**
 * 便捷函数：开始监控
 */
export function startResourceMonitoring(): void {
  getResourceMonitor().startMonitoring();
}

/**
 * 便捷函数：停止监控
 */
export function stopResourceMonitoring(): void {
  getResourceMonitor().stopMonitoring();
}

/**
 * 便捷函数：获取当前资源使用情况
 */
export async function getResourceUsage(): Promise<ResourceUsage> {
  return getResourceMonitor().getResourceUsage();
}
