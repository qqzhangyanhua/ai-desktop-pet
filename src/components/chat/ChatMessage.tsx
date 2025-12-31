import { useEffect, useState, useRef, useCallback } from 'react';
import { User, Sparkles } from 'lucide-react';
import type { Message } from '../../types';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  isLastMessage?: boolean;
}

/** 打字机效果配置 */
const TYPEWRITER_CONFIG = {
  /** 基础字符间隔(ms) */
  baseInterval: 30,
  /** 最小间隔(ms) */
  minInterval: 15,
  /** 最大间隔(ms) */
  maxInterval: 80,
  /** 标点符号额外延迟(ms) */
  punctuationDelay: 100,
  /** 每次追赶的最大字符数（当落后太多时加速） */
  catchUpChars: 3,
  /** 触发追赶的阈值 */
  catchUpThreshold: 20,
};

/** 判断是否为标点符号 */
function isPunctuation(char: string): boolean {
  return /[，。！？；：、,.!?;:]/.test(char);
}

function TypewriterText({ text, enabled }: { text: string; enabled: boolean }) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const targetTextRef = useRef(text);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  // 更新目标文本
  useEffect(() => {
    targetTextRef.current = text;
  }, [text]);

  // 动画循环
  const animate = useCallback((timestamp: number) => {
    if (!enabled) {
      setDisplayedLength(targetTextRef.current.length);
      return;
    }

    const targetLength = targetTextRef.current.length;

    setDisplayedLength(prevLength => {
      if (prevLength >= targetLength) {
        // 已经显示完毕，继续监听新内容
        animationRef.current = requestAnimationFrame(animate);
        return prevLength;
      }

      const elapsed = timestamp - lastTimeRef.current;
      const currentChar = targetTextRef.current[prevLength] || '';
      const behind = targetLength - prevLength;

      // 计算间隔：落后太多时加速追赶
      let interval = TYPEWRITER_CONFIG.baseInterval;
      if (behind > TYPEWRITER_CONFIG.catchUpThreshold) {
        interval = TYPEWRITER_CONFIG.minInterval;
      } else if (isPunctuation(currentChar)) {
        interval = TYPEWRITER_CONFIG.baseInterval + TYPEWRITER_CONFIG.punctuationDelay;
      }

      if (elapsed >= interval) {
        lastTimeRef.current = timestamp;

        // 落后太多时一次显示多个字符
        const charsToAdd = behind > TYPEWRITER_CONFIG.catchUpThreshold
          ? Math.min(TYPEWRITER_CONFIG.catchUpChars, behind)
          : 1;

        animationRef.current = requestAnimationFrame(animate);
        return Math.min(prevLength + charsToAdd, targetLength);
      }

      animationRef.current = requestAnimationFrame(animate);
      return prevLength;
    });
  }, [enabled]);

  // 启动动画
  useEffect(() => {
    if (!enabled) {
      setDisplayedLength(text.length);
      return;
    }

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, animate]);

  // 流式结束时确保显示完整内容
  useEffect(() => {
    if (!enabled) {
      setDisplayedLength(text.length);
    }
  }, [enabled, text.length]);

  const displayText = text.slice(0, displayedLength);
  const isTyping = enabled && displayedLength < text.length;

  return (
    <span>
      {displayText}
      {isTyping && <span className="typing-cursor animate-pulse">|</span>}
    </span>
  );
}

export function ChatMessage({
  message,
  isStreaming = false,
  isLastMessage = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  // 判断是否需要打字机效果：最后一条助手消息且正在流式输出
  const shouldTypewriter = !isUser && !isTool && isLastMessage && isStreaming;

  if (isTool) {
    return (
      <div className="chat-message assistant tool-message">
        <div className="message-icon">
          <Sparkles className="w-3 h-3" />
        </div>
        <div className="message-content">
          <div className="tool-label">工具调用</div>
          <div className="tool-result">{message.content.slice(0, 100)}...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message-avatar">
          <Sparkles className="w-4 h-4" />
        </div>
      )}
      <div className="message-bubble">
        {shouldTypewriter ? (
          <TypewriterText text={message.content} enabled={true} />
        ) : (
          message.content
        )}
      </div>
      {isUser && (
        <div className="message-avatar">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
