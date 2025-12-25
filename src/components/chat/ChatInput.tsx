import { useState, useCallback, KeyboardEvent, useEffect } from 'react';
import { useChat } from '../../hooks';
import { useAssistantCommandRouter } from '../../hooks';
import { useChatStore, useConfigStore, toast } from '../../stores';
import { usePushToTalk } from '../../hooks/usePushToTalk';
import type { STTResult } from '../../types';

interface ChatInputProps {
  disabled?: boolean;
}

export function ChatInput({ disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isPTTActive, setIsPTTActive] = useState(false);
  const { isLoading, isStreaming } = useChatStore();
  const { config } = useConfigStore();
  const { sendMessage, abort } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error(`Chat error: ${error.message}`);
    },
  });
  const { routeCommand } = useAssistantCommandRouter();

  // Push-to-Talk integration
  const { isListening } = usePushToTalk({
    enabled: config.voice.sttEnabled,
    shortcut: config.voice.pushToTalkKey,
    onResult: (result: STTResult) => {
      if (result.isFinal) {
        // Final result - set as input
        setInput(result.text);
      } else {
        // Interim result - show in placeholder or status
        setInput(result.text);
      }
    },
    onStart: () => {
      setIsPTTActive(true);
      console.log('[PTT] Started listening');
    },
    onEnd: () => {
      setIsPTTActive(false);
      console.log('[PTT] Stopped listening');
    },
    onError: (error: Error) => {
      console.error('[PTT] Error:', error);
      toast.error(`Voice input error: ${error.message}`);
      setIsPTTActive(false);
    },
  });

  useEffect(() => {
    // Update visual state based on listening status
    if (isListening !== isPTTActive) {
      setIsPTTActive(isListening);
    }
  }, [isListening, isPTTActive]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || disabled || isLoading) return;

    const content = input.trim();

    // 优先处理本地命令词（天气、灯光、动作等）
    const routed = await routeCommand(content);
    if (routed.handled) {
      setInput('');
      return;
    }

    setInput('');
    await sendMessage(content);
  }, [input, disabled, isLoading, routeCommand, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = useCallback(() => {
    abort();
  }, [abort]);

  const isDisabled = disabled || isLoading;

  // Generate placeholder text based on state
  const getPlaceholder = () => {
    if (isLoading) return 'Generating...';
    if (isPTTActive) return `🎤 Listening... (Release ${config.voice.pushToTalkKey})`;
    if (config.voice.sttEnabled) {
      return `Type or hold ${config.voice.pushToTalkKey} to speak...`;
    }
    return 'Type a message...';
  };

  return (
    <div className="chat-input-container">
      <input
        type="text"
        className="chat-input"
        placeholder={getPlaceholder()}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        style={{
          borderColor: isPTTActive ? '#4caf50' : undefined,
          backgroundColor: isPTTActive ? 'rgba(76, 175, 80, 0.05)' : undefined,
        }}
      />
      {isStreaming ? (
        <button
          className="chat-send-btn chat-abort-btn"
          onClick={handleAbort}
          title="Stop generating"
        >
          &times;
        </button>
      ) : (
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={isDisabled || !input.trim()}
        >
          &gt;
        </button>
      )}
    </div>
  );
}
