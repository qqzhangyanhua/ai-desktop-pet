import { memo, useState } from 'react';
import { Copy, Check, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
  onSendMessage?: (content: string) => void; // 点击建议时发送消息
}

export const MessageItem = memo(({
  message,
  isStreaming,
  onRegenerate,
  onDelete,
  onSendMessage,
}: MessageItemProps) => {
  const isError = message.content.startsWith('Error:');
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开

  // 检测是否为书签搜索结果
  const isBookmarkResult = message.content.includes('找到') && message.content.includes('个相关书签');

  // 分割书签搜索结果
  const renderBookmarkResults = () => {
    if (!isBookmarkResult) return null;

    const lines = message.content.split('\n');
    const headerLine = lines[0]; // "找到 X 个相关书签："
    const bookmarkLines = lines.slice(2); // 跳过header和空行

    // 解析书签项（每个书签占2行：标题+URL，然后空行）
    const bookmarks = [];
    for (let i = 0; i < bookmarkLines.length; i += 3) {
      if (bookmarkLines[i] && bookmarkLines[i + 1]) {
        bookmarks.push({
          title: bookmarkLines[i],
          url: bookmarkLines[i + 1],
        });
      }
    }

    const displayCount = isExpanded ? bookmarks.length : 5;
    const displayedBookmarks = bookmarks.slice(0, displayCount);
    const hasMore = bookmarks.length > 5;

    return (
      <div>
        <div className="font-medium mb-2">{headerLine}</div>
        <div className="space-y-2">
          {displayedBookmarks.map((bookmark, idx) => (
            <div key={idx} className="pl-2 border-l-2 border-[#FFB74D]/30">
              <div className="text-sm">{bookmark.title}</div>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#FF9800] hover:underline break-all"
              >
                {bookmark.url}
              </a>
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 flex items-center gap-1 text-sm text-[#FF9800] hover:underline"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                收起 ({bookmarks.length - 5} 个)
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                展开全部 ({bookmarks.length - 5} 个)
              </>
            )}
          </button>
        )}
      </div>
    );
  };

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
          {isBookmarkResult ? (
            renderBookmarkResults()
          ) : (
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
          )}
        </div>

        {/* Clickable suggestions */}
        {message.suggestions && message.suggestions.length > 0 && onSendMessage && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(suggestion)}
                className="px-3 py-1.5 text-sm rounded-lg bg-[#FFB74D]/10 hover:bg-[#FFB74D]/20 border border-[#FFB74D]/30 text-[#8B4513] transition-colors duration-200 flex items-center gap-1"
              >
                <span>"{suggestion}"</span>
              </button>
            ))}
          </div>
        )}

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
