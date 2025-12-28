/**
 * 浏览器环境下的 AsyncLocalStorage 最小实现（用于消除 node:async_hooks 依赖）
 *
 * 目的：
 * - @langchain/langgraph 在浏览器 bundle 中会 import "node:async_hooks"
 * - Vite 会 externalize 并产生警告，且运行时可能不可用
 * - 这里提供一个“足够用”的降级版本：单线程环境下用全局变量模拟 store
 */

export class AsyncLocalStorage<TStore = unknown> {
  private store: TStore | undefined;

  getStore(): TStore | undefined {
    return this.store;
  }

  run<TResult>(store: TStore, callback: (...args: any[]) => TResult, ...args: any[]): TResult {
    const prev = this.store;
    this.store = store;
    try {
      return callback(...args);
    } finally {
      this.store = prev;
    }
  }

  enterWith(store: TStore): void {
    this.store = store;
  }

  disable(): void {
    this.store = undefined;
  }
}

