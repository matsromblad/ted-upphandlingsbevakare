import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

let toasts: ToastMessage[] = [];
let listeners: Array<(msgs: ToastMessage[]) => void> = [];
let idCounter = 0;

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function showToast(type: ToastType, message: string) {
  const id = ++idCounter;
  toasts = [...toasts, { id, type, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 6000);
}

function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const ToastContainer: React.FC = () => {
  const [messages, setMessages] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    listeners.push(setMessages);
    return () => {
      listeners = listeners.filter((l) => l !== setMessages);
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-start gap-2.5 p-3.5 rounded-xl shadow-lg border text-sm animate-fadeIn ${
            msg.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {msg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span className="flex-1 font-medium leading-snug">{msg.message}</span>
          <button
            onClick={() => dismissToast(msg.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
