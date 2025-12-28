/**
 * Shortcut Input Component
 * 快捷键输入组件
 *
 * 支持快捷键录制、冲突检测和实时显示
 */

import { useState, useRef, useEffect } from 'react';
import { detectShortcutConflict, normalizeShortcutString } from '@/services/keyboard';
import { Check, X, Keyboard } from 'lucide-react';
import './ShortcutInput.css';

interface ShortcutInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ShortcutInput({
  value,
  onChange,
  placeholder = '例如: Cmd+Shift+C',
  disabled = false,
}: ShortcutInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [conflict, setConflict] = useState<{ hasConflict: boolean; reason?: string }>({
    hasConflict: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when external value changes
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleFocus = () => {
    if (disabled) return;
    setIsRecording(true);
    setDisplayValue('按下快捷键...');
  };

  const handleBlur = () => {
    setIsRecording(false);
    // If no valid shortcut was entered, revert to original value
    if (!displayValue || displayValue === '按下快捷键...') {
      setDisplayValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording || disabled) return;

    e.preventDefault();

    // Handle Escape to cancel
    if (e.key === 'Escape') {
      setIsRecording(false);
      setDisplayValue(value);
      inputRef.current?.blur();
      return;
    }

    // Collect modifiers and key
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.metaKey) modifiers.push('Cmd');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');

    // Get main key (exclude modifiers)
    const mainKey = e.key.toUpperCase();
    if (['CONTROL', 'ALT', 'SHIFT', 'META'].includes(mainKey)) {
      // Only modifiers pressed, don't register
      return;
    }

    // Build shortcut string
    const shortcut = [...modifiers, mainKey].join('+');

    // Check for conflicts
    const conflictResult = detectShortcutConflict(shortcut);
    setConflict(conflictResult);

    if (!conflictResult.hasConflict) {
      // Normalize and save
      const normalized = normalizeShortcutString(shortcut);
      setDisplayValue(normalized);
      onChange(normalized);
    } else {
      // Show conflict but still display what user pressed
      setDisplayValue(shortcut);
    }

    setIsRecording(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setDisplayValue('');
    onChange('');
    setConflict({ hasConflict: false });
  };

  return (
    <div className={`shortcut-input-container ${isRecording ? 'recording' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="shortcut-input-wrapper">
        <Keyboard className="shortcut-icon" size={16} />
        <input
          ref={inputRef}
          type="text"
          className="shortcut-input-field"
          value={displayValue}
          onChange={() => {}}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
        />
        {displayValue && !disabled && (
          <button
            type="button"
            className="shortcut-clear-button"
            onClick={handleClear}
            onMouseDown={(e) => e.preventDefault()}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status indicator */}
      {displayValue && !disabled && (
        <div className={`shortcut-status ${conflict.hasConflict ? 'conflict' : 'valid'}`}>
          {conflict.hasConflict ? (
            <>
              <X size={14} />
              <span className="shortcut-status-text">{conflict.reason}</span>
            </>
          ) : (
            <>
              <Check size={14} />
              <span className="shortcut-status-text">快捷键可用</span>
            </>
          )}
        </div>
      )}

      {/* Recording hint */}
      {isRecording && (
        <div className="shortcut-recording-hint">
          按下组合键设置快捷键，按 ESC 取消
        </div>
      )}
    </div>
  );
}
