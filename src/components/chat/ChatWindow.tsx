import { useRef, useEffect, useState } from 'react';
import { X, Heart, Sparkles, Settings } from 'lucide-react';
import { useChatStore } from '../../stores';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSettings } from './ChatSettings';
import { Button } from '@/components/ui/button';
import { useChat } from '../../hooks';

interface ChatWindowProps {
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  { icon: '☀️', text: '今天天气怎么样？' },
  { icon: '🎮', text: '陪我玩个游戏吧' },
  { icon: '🍎', text: '我想吃苹果了' },
  { icon: '💭', text: '你现在的心情如何？' },
];

export function ChatWindow({ onClose }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isStreaming } = useChatStore();
  const [showSettings, setShowSettings] = useState(false);
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
    <div className="chat-window no-drag">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="pet-avatar">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="chat-header-info">
            <div className="chat-header-title">我的小可爱</div>
            <div className="chat-header-status">
              <span className="status-dot"></span>
              <span className="status-text">在线等你</span>
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          <Button
            onClick={() => setShowSettings(true)}
            variant="ghost"
            size="sm"
            className="chat-action-btn"
            title="聊天设置"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="chat-action-btn"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
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
                >
                  <span className="question-icon">{q.icon}</span>
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

      {/* Input */}
      <ChatInput disabled={isLoading} />

      {/* Settings Panel */}
      {showSettings && <ChatSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
