import { useRef, useEffect } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { useChatStore } from '../../stores';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from '../../hooks';

interface ChatPanelProps {
  // 预留扩展属性
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  { icon: 'sun', text: '今天天气怎么样？' },
  { icon: 'gamepad-2', text: '陪我玩个游戏吧' },
  { icon: 'apple', text: '我想吃苹果了' },
  { icon: 'heart', text: '你现在的心情如何？' },
];

export function ChatPanel({ className = '' }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isStreaming } = useChatStore();
  const { sendMessage } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestedQuestion = async (question: string) => {
    await sendMessage(question);
  };

  return (
    <div className={`chat-panel ${className}`}>
      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-icon">
              <Heart className="w-12 h-12" />
            </div>
            <div className="empty-title">嗨，小主人！</div>
            <div className="empty-subtitle">我是你的桌面宠物，有什么想聊的吗？</div>

            <div className="suggested-questions">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  className="question-chip"
                  onClick={() => handleSuggestedQuestion(q.text)}
                  title={q.text}
                >
                  <span className="question-icon">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="question-text">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            return (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={isStreaming}
                isLastMessage={isLastMessage}
              />
            );
          })
        )}

        {isLoading && !isStreaming && (
          <div className="chat-message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput disabled={isLoading} />
    </div>
  );
}
