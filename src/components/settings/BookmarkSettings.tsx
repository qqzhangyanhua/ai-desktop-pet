import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Bookmark, RefreshCw, Trash2, FolderOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { bookmarkManager } from '@/services/bookmark';
import { getDatabase } from '@/services/database';
import type { BookmarkStats } from '@/types/bookmark';

interface BookmarkSettingsProps {
  onClose?: () => void;
}

export function BookmarkSettings(_props: BookmarkSettingsProps) {
  const [stats, setStats] = useState<BookmarkStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string>('');
  const [bookmarkPath, setBookmarkPath] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  // 确保 BookmarkManager 已初始化
  useEffect(() => {
    async function ensureInitialized() {
      try {
        const db = await getDatabase();
        console.log('[BookmarkSettings] Got database instance:', !!db);
        await bookmarkManager.initialize(db);
        console.log('[BookmarkSettings] BookmarkManager initialized successfully');
      } catch (error) {
        console.error('[BookmarkSettings] Failed to initialize BookmarkManager:', error);
        setLastError(`初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setIsInitializing(false);
      }
    }
    ensureInitialized();
  }, []);

  // 加载统计信息
  useEffect(() => {
    if (!isInitializing) {
      loadStats();
    }
  }, [isInitializing]);

  async function loadStats() {
    try {
      const data = await bookmarkManager.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function handleSelectFile() {
    try {
      const selected = await open({
        multiple: false,
        title: '选择 Chrome 书签文件',
        filters: [{
          name: 'Chrome Bookmarks',
          extensions: ['*'],
        }],
      });

      if (selected && typeof selected === 'string') {
        setBookmarkPath(selected);
        setLastError('');
      }
    } catch (error) {
      setLastError(`文件选择失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async function handleSync() {
    if (!bookmarkPath) {
      setLastError('请先选择Chrome书签文件');
      return;
    }

    setIsSyncing(true);
    setLastError('');
    setSuccessMessage('');

    try {
      const count = await bookmarkManager.syncFromChromeFile(bookmarkPath);
      await loadStats(); // 刷新统计
      setSuccessMessage(`成功同步 ${count} 个书签`);

      // 3秒后清除成功提示
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setLastError(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleClear() {
    if (!confirm('确认清空所有书签？此操作不可恢复。')) {
      return;
    }

    try {
      await bookmarkManager.clear();
      await loadStats();
      setSuccessMessage('已清空所有书签');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setLastError(`清空失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  return (
    <div className="settings-section">
      {isInitializing && (
        <div className="game-alert mb-4 flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700">
          <RefreshCw className="w-4 h-4 animate-spin" />
          正在初始化书签管理...
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#8B4513]" />
          <h3 className="text-lg font-bold">Chrome 书签集成</h3>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="game-card mb-4">
          <div className="settings-row">
            <span className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              书签总数
            </span>
            <span className="font-bold text-[#8B4513]">{stats.totalBookmarks}</span>
          </div>
          <div className="settings-row">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              最后同步
            </span>
            <span className="text-sm text-gray-600">
              {stats.lastUpdated > 0
                ? new Date(stats.lastUpdated).toLocaleString('zh-CN')
                : '未同步'}
            </span>
          </div>
        </div>
      )}

      {/* 文件选择 */}
      <div className="game-card mb-4">
        <label className="block text-sm font-medium mb-2">书签文件路径</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={bookmarkPath}
            placeholder="选择 Chrome 书签文件"
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            style={{ fontSize: '14px' }}
          />
          <button
            onClick={handleSelectFile}
            className="game-btn game-btn-orange px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            浏览
          </button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSync}
          disabled={isSyncing || !bookmarkPath}
          className="game-btn game-btn-orange flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? '同步中...' : '立即同步'}
        </button>
        <button
          onClick={handleClear}
          disabled={!stats || stats.totalBookmarks === 0}
          className="game-btn px-4 py-2 rounded-lg flex items-center justify-center gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          清空书签
        </button>
      </div>

      {/* 成功提示 */}
      {successMessage && (
        <div className="game-alert game-alert-success flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* 错误提示 */}
      {lastError && (
        <div className="game-alert game-alert-error flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" />
          {lastError}
        </div>
      )}

      {/* 使用说明 */}
      <div className="game-card bg-blue-50 border-blue-200">
        <h4 className="font-bold mb-2 text-blue-800">Chrome 书签文件位置</h4>
        <ul className="text-sm space-y-2 text-blue-700">
          <li className="flex items-start gap-2">
            <span className="font-semibold min-w-[80px]">macOS:</span>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded flex-1">
              ~/Library/Application Support/Google/Chrome/Default/Bookmarks
            </code>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold min-w-[80px]">Windows:</span>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded flex-1">
              %LOCALAPPDATA%\Google\Chrome\User Data\Default\Bookmarks
            </code>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold min-w-[80px]">Linux:</span>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded flex-1">
              ~/.config/google-chrome/Default/Bookmarks
            </code>
          </li>
        </ul>
        <div className="mt-3 pt-3 border-t border-blue-200 text-sm text-blue-700">
          <p className="font-semibold mb-1">使用提示：</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>同步后可在聊天中说"找找我的书签 XXX"</li>
            <li>支持搜索书签标题和 URL</li>
            <li>书签数据仅存储在本地，隐私安全</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
