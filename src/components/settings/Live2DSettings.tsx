// Live2D 设置面板
import { useState } from 'react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useConfigStore } from '@/stores';
import { getLive2DManager } from '@/services/live2d';
import { toast } from '@/stores';

export function Live2DSettings() {
  const { config, setConfig, saveConfig } = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');

  const handleToggleLive2D = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      
      setConfig({
        live2d: {
          ...config.live2d,
          useLive2D: enabled,
        },
        useLive2D: enabled, // 同步顶层标志
      });

      await saveConfig();
      
      toast.success(enabled ? 'Live2D 已启用，请重启应用' : 'Live2D 已禁用');
    } catch (error) {
      console.error('Failed to toggle Live2D:', error);
      toast.error('保存设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostics = () => {
    const manager = getLive2DManager();
    const state = manager.getState();
    const isInitialized = manager.isInitialized();

    const info = [
      '=== Live2D 诊断信息 ===',
      '',
      '配置状态：',
      `  - Live2D 已启用: ${config.live2d.useLive2D}`,
      `  - 当前模型: ${config.live2d.currentModel}`,
      `  - 模型缩放: ${config.live2d.modelScale}`,
      '',
      'Manager 状态：',
      `  - 已初始化: ${isInitialized}`,
      `  - 模型已加载: ${state.isLoaded}`,
      `  - 当前模型: ${state.currentModel || '无'}`,
      `  - 模型索引: ${state.currentModelIndex}`,
      `  - 正在播放: ${state.isPlaying}`,
      '',
      '浏览器环境：',
      `  - User Agent: ${navigator.userAgent}`,
      `  - 窗口尺寸: ${window.innerWidth}x${window.innerHeight}`,
      `  - 设备像素比: ${window.devicePixelRatio}`,
      '',
      '建议检查项：',
      '  1. 打开浏览器开发者工具 (F12)',
      '  2. 查看 Console 标签的错误信息',
      '  3. 查看 Network 标签，搜索 "white-cat"',
      '  4. 确认模型文件请求是否成功 (200)',
      '  5. 检查是否有 CORS 或 404 错误',
      '',
      '模型文件路径：',
      '  - /whitecatfree_vts/white-cat.model3.json',
      '  - /whitecatfree_vts/white-cat.moc3',
      '  - /whitecatfree_vts/white-cat.2048/texture_00.png',
    ].join('\n');

    setDiagnosticInfo(info);
    console.log(info);
    toast.info('诊断信息已输出到控制台');
  };

  const testModelLoad = async () => {
    try {
      setIsLoading(true);
      toast.info('正在测试模型加载...');
      
      const manager = getLive2DManager();
      if (!manager.isInitialized()) {
        toast.error('Live2D Manager 未初始化，请启用 Live2D 并重启应用');
        return;
      }

      await manager.loadModel(0);
      toast.success('模型加载测试成功！');
    } catch (error) {
      console.error('Model load test failed:', error);
      toast.error('模型加载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Live2D 设置</h3>
        <p className="text-sm text-gray-500 mb-4">
          使用 Live2D 模型作为宠物形象，提供更生动的动画效果
        </p>
      </div>

      <div className="space-y-4">
        {/* 启用开关 */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
          <div>
            <Label htmlFor="live2d-enabled" className="text-sm font-medium">
              启用 Live2D
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              启用后需要重启应用才能生效
            </p>
          </div>
          <Switch
            id="live2d-enabled"
            checked={config.live2d.useLive2D}
            onCheckedChange={handleToggleLive2D}
            disabled={isLoading}
          />
        </div>

        {/* 当前状态 */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-sm">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                当前状态
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {config.live2d.useLive2D 
                  ? '✓ Live2D 已启用' 
                  : '○ Live2D 未启用（使用传统 Canvas 渲染）'}
              </p>
            </div>
          </div>
        </div>

        {/* 诊断工具 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">诊断工具</Label>
          <div className="flex gap-2">
            <button
              onClick={runDiagnostics}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              运行诊断
            </button>
            <button
              onClick={testModelLoad}
              disabled={isLoading || !config.live2d.useLive2D}
              className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              测试模型加载
            </button>
          </div>
        </div>

        {/* 诊断信息显示 */}
        {diagnosticInfo && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700">
              {diagnosticInfo}
            </pre>
          </div>
        )}

        {/* 帮助信息 */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <span className="text-amber-600 text-sm">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                注意事项
              </p>
              <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>启用 Live2D 后需要重启应用</li>
                <li>Live2D 模型加载可能需要几秒钟</li>
                <li>如果加载失败，请使用诊断工具检查问题</li>
                <li>确保模型文件完整且路径正确</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
