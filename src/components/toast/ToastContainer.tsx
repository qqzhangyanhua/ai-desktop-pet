// ToastContainer - Displays global toast notifications

import { useEffect } from 'react';
import { Check, X, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';
import { Button } from '@/components/ui/button';
import type { Toast } from '../../types/toast';

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration, toast.id, onClose]);

  const getIcon = (): LucideIcon => {
    switch (toast.type) {
      case 'success':
        return Check;
      case 'error':
        return X;
      case 'warning':
        return AlertTriangle;
      case 'info':
      default:
        return Info;
    }
  };

  const IconComponent = getIcon();

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-icon">
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="toast-message">{toast.message}</div>
      <Button
        className="toast-close h-4 w-4 p-0"
        onClick={() => onClose(toast.id)}
        aria-label="Close"
        variant="ghost"
        size="sm"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}
