import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Save, ArrowLeft } from 'lucide-react';
import { initDatabase } from '../../services/database';
import { getSkinManager } from '../../services/skin';
import { useSettingsConfig } from '../../hooks/useSettingsConfig';
import { usePetInteraction } from '../../hooks/usePetInteraction';
import {
  AppearanceTab,
  BehaviorTab,
  AssistantTab,
  StatisticsTab,
  PerformanceTab,
  AdvancedTab,
} from './tabs';
import { SettingsDashboard } from './SettingsDashboard';
import { FeedbackAnimation, useFeedback } from './FeedbackAnimation';
import './game-ui.css';

type SettingsTab = 'appearance' | 'behavior' | 'chat' | 'assistant' | 'statistics' | 'performance' | 'advanced';

export function GameSettingsWindow() {
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const initialSkinIdRef = useRef('');

  const { currentMessage, showFeedback } = useFeedback();

  // Custom hooks
  const {
    localConfig,
    setLocalConfig,
    isSaving,
    didSaveRef,
    handlers: configHandlers,
    loadConfig,
  } = useSettingsConfig();

  const {
    feedCooldown,
    isFeeding,
    isEditingNickname,
    editedNickname,
    setEditedNickname,
    handlers: petHandlers,
  } = usePetInteraction(showFeedback);

  // Initialize database and config
  useEffect(() => {
    initDatabase()
      .then(async () => {
        await loadConfig();
        setDbReady(true);
      })
      .catch((err) => {
        console.error('[GameSettingsWindow] Failed to initialize:', err);
        setDbReady(true);
      });
  }, [loadConfig]);

  // Store initial skin ID for rollback
  useEffect(() => {
    initialSkinIdRef.current = localConfig.appearance.skinId;
  }, []);

  // Cleanup: rollback skin if not saved
  useEffect(() => {
    return () => {
      if (didSaveRef.current) return;
      getSkinManager().switchSkin(initialSkinIdRef.current).catch(() => {});
    };
  }, []);

  const handleSave = useCallback(async () => {
    await configHandlers.handleSave(async () => {
      if (activeTab === null) {
        const appWindow = getCurrentWindow();
        await appWindow.close();
      } else {
        showFeedback('设置已保存！', 'success');
      }
    });
  }, [activeTab, configHandlers, showFeedback]);

  const handleClose = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setActiveTab(null);
  }, []);

  if (!dbReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="text-xl font-bold text-rose-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  const renderActiveTab = () => (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-900/20 bg-white/30 backdrop-blur-sm rounded-t-xl">
        <button
          onClick={handleBackToDashboard}
          className="p-2 hover:bg-white/50 rounded-full transition-colors text-amber-900"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-amber-900">
          {activeTab === 'appearance' && '外观设置'}
          {activeTab === 'behavior' && '行为设置'}
          {activeTab === 'assistant' && '助手设置'}
          {activeTab === 'statistics' && '数据统计'}
          {activeTab === 'performance' && '性能设置'}
          {activeTab === 'advanced' && '高级设置'}
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`game-btn game-btn-green py-2 px-4 text-sm h-10 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
        >
          <Save size={16} className="mr-2" />
          {isSaving ? '保存中...' : '保存更改'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 game-scrollbar bg-white/40">
        <div className="max-w-3xl mx-auto space-y-6">
          {activeTab === 'appearance' && (
            <AppearanceTab localConfig={localConfig} setLocalConfig={setLocalConfig} onFeedback={showFeedback} />
          )}

          {activeTab === 'behavior' && (
            <BehaviorTab localConfig={localConfig} setLocalConfig={setLocalConfig} onFeedback={showFeedback} />
          )}

          {activeTab === 'assistant' && (
            <AssistantTab
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
              handleVoiceConfigChange={configHandlers.handleVoiceConfigChange}
            />
          )}

          {activeTab === 'statistics' && <StatisticsTab />}

          {activeTab === 'performance' && (
            <PerformanceTab localConfig={localConfig} setLocalConfig={setLocalConfig} onFeedback={showFeedback} />
          )}

          {activeTab === 'advanced' && <AdvancedTab />}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center game-container"
      style={{
        background: 'linear-gradient(to bottom, #87CEEB, #E0F7FA)',
      }}
    >
      <FeedbackAnimation message={currentMessage} />

      <div className="game-wood-board w-full h-full overflow-hidden flex flex-col shadow-none border-0 rounded-none">
        <div className="w-full h-full relative" style={{ background: '#FDF5E6' }}>
          {activeTab ? (
            renderActiveTab()
          ) : (
            <SettingsDashboard
              feedCooldown={feedCooldown}
              isFeeding={isFeeding}
              isEditingNickname={isEditingNickname}
              editedNickname={editedNickname}
              onEditedNicknameChange={setEditedNickname}
              onNicknameKeyDown={petHandlers.handleNicknameKeyDown}
              onNicknameSave={petHandlers.handleNicknameSave}
              onNicknameEdit={petHandlers.handleNicknameEdit}
              onFeed={petHandlers.handleFeed}
              onTabChange={setActiveTab}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
