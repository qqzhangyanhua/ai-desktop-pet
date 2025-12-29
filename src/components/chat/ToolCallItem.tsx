import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import type { ToolCall } from '@/types';

interface ToolCallItemProps {
  toolCall: ToolCall;
}

export function ToolCallItem({ toolCall }: ToolCallItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 border border-[#FFB74D]/30 rounded-lg overflow-hidden bg-[#FFF8E1]/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#FFE0B2]/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[#FF9800]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#FF9800]" />
        )}
        <Wrench className="w-4 h-4 text-[#FF9800]" />
        <span className="font-medium text-[#8B4513]">调用工具: {toolCall.name}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-[#FFB74D]/30 bg-white/50">
          <pre className="text-xs overflow-x-auto text-[#8B4513]/80 whitespace-pre-wrap">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
