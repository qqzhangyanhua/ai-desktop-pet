import { memo, useState } from 'react';
import { Copy, Check, RotateCcw, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types';
import { ToolCallItem } from './ToolCallItem';
import { formatMessageTime } from '@/utils/format-time';
import { copyToClipboard } from '@/utils/clipboard';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export const MessageItem = memo(({
  message,
  isStreaming,
  onRegenerate,
  onDelete,
}: MessageItemProps) => {
  const isError = message.content.startsWith('Error:');
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    if (confirm('确定删除这条消息吗？')) {
      onDelete?.();
    }
  };

  return (
    <div className={`game-chat-message ${message.role}`}>
      <div
        className={`game-message-bubble ${isError ? 'border-red-300 bg-red-50/50' : ''} group relative`}
        style={isError ? { borderColor: '#f87171', backgroundColor: 'rgba(254, 202, 202, 0.5)' } : undefined}
      >
        {/* Action buttons - show on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-black/10"
            title={copied ? '已复制' : '复制'}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-[#8B4513]/60" />
            )}
          </button>

          {message.role === 'assistant' && onRegenerate && !isStreaming && (
            <button
              onClick={onRegenerate}
              className="p-1 rounded hover:bg-black/10"
              title="重新生成"
            >
              <RotateCcw className="w-4 h-4 text-[#8B4513]/60" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-black/10"
              title="删除"
            >
              <Trash2 className="w-4 h-4 text-[#8B4513]/60" />
            </button>
          )}
        </div>

        {/* Message content */}
        <div className={isError ? 'text-red-700' : ''}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match && !className;
                return isInline ? (
                  <code
                    className="px-1 py-0.5 rounded bg-[#8B4513]/10 text-[#8B4513] text-sm font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <pre className="mt-2 p-3 rounded-lg bg-[#8B4513]/10 overflow-x-auto">
                    <code className="text-sm font-mono text-[#8B4513]" {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              a: ({ node, children, ...props }) => (
                <a
                  className="text-[#FF9800] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Tool calls */}
        {hasToolCalls && (
          <div className="mt-2 space-y-2">
            {message.toolCalls?.map((toolCall) => (
              <ToolCallItem key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-[#8B4513] animate-pulse" />
        )}

        {/* Timestamp */}
        <div className="text-xs opacity-50 mt-1">
          {formatMessageTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
