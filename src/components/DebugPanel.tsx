import { useEffect, useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error';
  message: string;
}

export function DebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 🔥 首先读取早期日志（在 HTML 中捕获的）
    const earlyLogs = (window as any).__EARLY_LOGS__ || [];
    const initialLogs: LogEntry[] = earlyLogs.map((log: { level: string; time: string; args: string }) => ({
      timestamp: log.time,
      level: log.level as 'log' | 'warn' | 'error',
      message: log.args,
    }));
    
    // 添加启动日志
    initialLogs.push({
      timestamp: new Date().toLocaleTimeString(),
      level: 'log',
      message: `[DebugPanel] 调试面板已启动，读取到 ${earlyLogs.length} 条早期日志`,
    });
    
    setLogs(initialLogs);

    // 继续拦截后续的 console 方法
    const originalLog = (window as any).__ORIGINAL_CONSOLE__?.log || console.log.bind(console);
    const originalWarn = (window as any).__ORIGINAL_CONSOLE__?.warn || console.warn.bind(console);
    const originalError = (window as any).__ORIGINAL_CONSOLE__?.error || console.error.bind(console);

    const addLog = (level: 'log' | 'warn' | 'error', args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // 记录所有日志
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      }].slice(-300)); // 保留更多日志
    };

    console.log = (...args: unknown[]) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.warn = (...args: unknown[]) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.error = (...args: unknown[]) => {
      originalError(...args);
      addLog('error', args);
    };

    // 监听快捷键 Cmd+D 或 Ctrl+D 切换显示
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!isVisible) {
    return (
      <div 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-black/90 z-[9999]"
        title="点击打开调试面板 (或按 Cmd+D / Ctrl+D)"
      >
        🐛 调试
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">🐛 Live2D 调试日志</span>
            <span className="text-xs text-gray-500">
              ({logs.length} 条记录)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLogs([])}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              清空
            </button>
            <button
              onClick={() => {
                const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
                navigator.clipboard.writeText(text);
                alert('日志已复制到剪贴板！');
              }}
              className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
            >
              复制全部
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1 text-sm bg-red-500 text-white hover:bg-red-600 rounded"
            >
              关闭
            </button>
          </div>
        </div>

        {/* 日志内容 */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-gray-50">
          {logs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              暂无日志记录<br/>
              <span className="text-xs">等待 Live2D 加载...</span>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`mb-2 p-2 rounded ${
                  log.level === 'error' ? 'bg-red-50 text-red-800' :
                  log.level === 'warn' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-white text-gray-800'
                }`}
              >
                <span className="text-gray-400">[{log.timestamp}]</span>{' '}
                <span className="whitespace-pre-wrap break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>

        {/* 提示信息 */}
        <div className="p-3 bg-blue-50 border-t text-xs text-blue-800">
          💡 提示：按 <kbd className="px-2 py-1 bg-white rounded border">Cmd+D</kbd> 或 <kbd className="px-2 py-1 bg-white rounded border">Ctrl+D</kbd> 快速切换调试面板
        </div>
      </div>
    </div>
  );
}
