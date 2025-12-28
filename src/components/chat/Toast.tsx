import * as Toast from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProviderProps {
  children: React.ReactNode;
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const TOAST_ICONS = {
  success: <CheckCircle className="w-5 h-5 text-green-600" />,
  error: <AlertCircle className="w-5 h-5 text-red-600" />,
  info: <Info className="w-5 h-5 text-blue-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
};

const TOAST_STYLES = {
  success: 'border-l-4 border-l-green-500',
  error: 'border-l-4 border-l-red-500',
  info: 'border-l-4 border-l-blue-500',
  warning: 'border-l-4 border-l-yellow-500',
};

export function ToastProvider({ children, toasts, onRemove }: ToastProviderProps) {
  return (
    <Toast.Provider swipeDirection="right">
      {children}

      <Toast.Viewport className="toast-viewport">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            className={`toast-root ${TOAST_STYLES[toast.type]}`}
            duration={toast.duration || 3000}
            onOpenChange={(open) => {
              if (!open) onRemove(toast.id);
            }}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{TOAST_ICONS[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <Toast.Title className="toast-title">
                  {toast.title}
                </Toast.Title>
                {toast.description && (
                  <Toast.Description className="toast-description">
                    {toast.description}
                  </Toast.Description>
                )}
              </div>
              <Toast.Close className="toast-close">
                <X className="w-4 h-4" />
              </Toast.Close>
            </div>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Provider>
  );
}
