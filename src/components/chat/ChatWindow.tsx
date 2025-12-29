import { useRef, useEffect, useState, useCallback } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Heart, Sparkles, Settings, Send, RotateCcw, Sun, Gamepad2, Apple, MessageCircle, Trash2 } from 'lucide-react';
import { useChatStore } from '../../stores';
import { ChatSettings } from './ChatSettings';
import { ToastProvider } from './Toast';
import { useToast } from './useToast';
import { useChat } from '../../hooks';
import { MessageItem } from './MessageItem';
import '../../components/settings/game-ui.css';

interface ChatWindowProps {
  // Window is managed by Tauri, no close callback needed
}

const SUGGESTED_QUESTIONS = [
  { Icon: Sun, text: '今天天气怎么样？' },
  { Icon: Gamepad2, text: '陪我玩个游戏吧' },
  { Icon: Apple, text: '我想吃苹果了' },
  { Icon: MessageCircle, text: '你现在的心情如何？' },
];

export function ChatWindow(_props: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isStreaming } = useChatStore();
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const dragCandidateRef = useRef<{ x: number; y: number } | null>(null);
  const isWindowDragTriggeredRef = useRef(false);

  // Local toast for chat window
  const toast = useToast();
  
  const { sendMessage, abort, clearChat } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('发送消息失败', error.message || '请稍后重试');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    setInput(''); // Clear input immediately
    await sendMessage(content);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ... (Header drag handlers remain same)
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!isTauri()) return;

    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    dragCandidateRef.current = { x: e.screenX, y: e.screenY };
    isWindowDragTriggeredRef.current = false;
  }, []);

  const handleHeaderMouseMove = useCallback(async (e: React.MouseEvent) => {
    if (!dragCandidateRef.current) return;
    if (isWindowDragTriggeredRef.current) return;
    if (e.buttons !== 1) return;

    const dx = e.screenX - dragCandidateRef.current.x;
    const dy = e.screenY - dragCandidateRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= 6) return;

    isWindowDragTriggeredRef.current = true;
    dragCandidateRef.current = null;

    try {
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch (err) {
      console.warn('[ChatWindow] startDragging failed:', err);
    }
  }, []);

  const handleHeaderMouseUp = useCallback(() => {
    dragCandidateRef.current = null;
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages.length, autoScroll]);

  const handleSuggestedQuestion = async (question: string) => {
    await handleSendMessage(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSendMessage(input);
      }
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (confirm('确定要清空对话吗？此操作不可恢复。')) {
      clearChat();
      toast.success('已清空对话');
    }
  };

  const handleRegenerateMessage = useCallback((messageId: string) => {
    const { removeMessagesAfter } = useChatStore.getState();
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    // Find the previous user message
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    // Remove current assistant message and regenerate
    removeMessagesAfter(messageId);
    sendMessage(userMessage.content);
  }, [messages, sendMessage]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    const { deleteMessage } = useChatStore.getState();
    deleteMessage(messageId);
  }, []);

  return (
    <ToastProvider toasts={toast.toasts} onRemove={toast.removeToast}>
      <div className="game-chat-window no-drag">
        {/* Header - draggable */}
        <div
          className="game-chat-header chat-header-draggable"
          onMouseDown={handleHeaderMouseDown}
          onMouseMove={handleHeaderMouseMove}
          onMouseUp={handleHeaderMouseUp}
        >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center border border-[#8B4513]">
            <Sparkles className="w-4 h-4 text-[#8B4513]" />
          </div>
          <div className="flex flex-col">
            <div className="game-chat-header-title">我的小可爱</div>
            <div className="game-chat-header-status">
              <span className="game-status-dot"></span>
              <span className="status-text">在线等你</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleClearChat}
            className="game-btn game-btn-orange p-1 w-8 h-8 justify-center rounded-lg"
            title="清空对话"
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="game-btn game-btn-orange p-1 w-8 h-8 justify-center rounded-lg"
            title="聊天设置"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="game-chat-messages"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="game-empty-state">
            <div className="mb-4 text-[#FFB74D]">
              <Heart className="w-12 h-12 fill-current" />
            </div>
            <div className="font-bold text-lg mb-2">嗨，小主人！</div>
            <div className="text-sm opacity-80 mb-6">我是你的桌面宠物，有什么想聊的吗？</div>

            <div className="flex flex-wrap justify-center max-w-[80%]">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  className="game-question-chip"
                  onClick={() => handleSuggestedQuestion(q.text)}
                >
                  <q.Icon className="w-4 h-4" />
                  <span>{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, idx) => (
            <MessageItem
              key={message.id}
              message={message}
              isStreaming={isStreaming && idx === messages.length - 1}
              onRegenerate={() => handleRegenerateMessage(message.id)}
              onDelete={() => handleDeleteMessage(message.id)}
            />
          ))
        )}

        {isLoading && !isStreaming && (
          <div className="game-chat-message assistant">
            <div className="game-message-bubble">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#8B4513] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#8B4513] rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-[#8B4513] rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="game-chat-input-container">
        <textarea
            className="game-chat-input resize-none"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            disabled={isLoading && !isStreaming}
            rows={1}
            style={{
              minHeight: '40px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
        />
        {isLoading && isStreaming ? (
            <button
                className="game-chat-send-btn bg-red-100 border-red-300"
                onClick={abort}
            >
                <RotateCcw className="w-4 h-4 text-red-500" />
            </button>
        ) : (
            <button
                className="game-chat-send-btn"
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || isLoading}
            >
                <Send className="w-4 h-4" />
            </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && <ChatSettings toast={toast} onClose={() => setShowSettings(false)} />}
      </div>
    </ToastProvider>
  );
}
