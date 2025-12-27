import { useEffect, useState } from 'react';
import { User, Sparkles } from 'lucide-react';
import type { Message } from '../../types';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  isLastMessage?: boolean;
}

function TypewriterText({ text, enabled }: { text: string; enabled: boolean }) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text);
      return;
    }

    // 文本更新时立即显示全部（流式返回时字符会逐个添加）
    setDisplayText(text);
  }, [text, enabled]);

  return <span>{displayText}</span>;
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
        {shouldTypewriter && message.content.length === 0 && (
          <span className="typing-cursor">|</span>
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
