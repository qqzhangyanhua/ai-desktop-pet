import { useEffect } from 'react';
import { useConfigStore } from '@/stores';
import { getAutoWorkManager } from '@/services/auto-work-manager';

export function useAutoWork() {
  const behavior = useConfigStore((s) => s.config.behavior);

  useEffect(() => {
    const manager = getAutoWorkManager();

    // 定期检查是否应该开始打工
    const checkInterval = setInterval(() => {
      if (behavior.autoWork.enabled) {
        void manager.startWork();
      }
    }, 60 * 1000); // 每分钟检查一次

    // 启动时立即检查一次
    if (behavior.autoWork.enabled) {
      void manager.startWork();
    }

    return () => {
      clearInterval(checkInterval);
    };
  }, [behavior.autoWork.enabled, behavior.autoWork.idleTriggerMinutes]);
}

