import { useState, useCallback, KeyboardEvent, useEffect } from 'react';
import { useChat } from '../../hooks';
import { useAssistantCommandRouter } from '../../hooks';
import { useChatStore, useConfigStore, toast } from '../../stores';
import { usePushToTalk } from '../../hooks/usePushToTalk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Heart } from 'lucide-react';
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
    if (isLoading) return '正在思考...';
    if (isPTTActive) return `正在听你说... (松开 ${config.voice.pushToTalkKey})`;
    if (config.voice.sttEnabled) {
      return `打字或按住 ${config.voice.pushToTalkKey} 说话...`;
    }
    return '想聊点什么？';
  };

  return (
    <div className="chat-input-container">
      <Input
        type="text"
        className="chat-input"
        placeholder={getPlaceholder()}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
      />
      {isStreaming ? (
        <Button
          className="chat-send-btn chat-abort-btn"
          onClick={handleAbort}
          title="停止生成"
          variant="outline"
          size="sm"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={isDisabled || !input.trim()}
          title="发送"
          variant="default"
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
