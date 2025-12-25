import type { Message } from '../../types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  if (isTool) {
    return (
      <div className="chat-message assistant" style={{ fontSize: '11px', opacity: 0.7 }}>
        Tool result: {message.content.slice(0, 100)}...
      </div>
    );
  }

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      {message.content}
    </div>
  );
}
