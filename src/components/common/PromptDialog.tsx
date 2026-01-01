/**
 * PromptDialog - 通用输入对话框组件
 * 用于需要用户输入的场景，如城市查询等
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePromptDialogStore } from '@/stores/promptDialogStore';

export function PromptDialog() {
  const { isOpen, config, confirm, cancel } = usePromptDialogStore();
  const [value, setValue] = useState('');

  // 重置输入值
  useEffect(() => {
    if (isOpen && config) {
      setValue(config.defaultValue ?? '');
    }
  }, [isOpen, config]);

  const handleConfirm = useCallback(() => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      confirm(trimmedValue);
    }
  }, [value, confirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        cancel();
      }
    },
    [handleConfirm, cancel]
  );

  if (!config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="sm:max-w-[320px] bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{config.title}</DialogTitle>
          {config.description && (
            <DialogDescription className="text-sm">
              {config.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder ?? '请输入...'}
            className="h-10"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={cancel}>
            {config.cancelText ?? '取消'}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!value.trim()}
          >
            {config.confirmText ?? '确定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
