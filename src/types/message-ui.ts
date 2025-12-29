// Message UI component types

import type { Message, ToolCall } from './chat';

export interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export interface ToolCallItemProps {
  toolCall: ToolCall;
  expanded?: boolean;
}

export interface MessageActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  className?: string;
}
