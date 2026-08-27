import React from 'react';
import {
  CheckCircle2,
  Trash2,
  Cloud,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';

interface CustomToastProps {
  message: string | null;
  onDismiss: () => void;
}

export const CustomToast: React.FC<CustomToastProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  const msgLower = message.toLowerCase();

  // Determine type & icon based on message content
  let type: 'success' | 'danger' | 'cloud' | 'warning' | 'info' = 'info';

  if (
    msgLower.includes('delete') ||
    msgLower.includes('remove') ||
    msgLower.includes('हटा') ||
    msgLower.includes('रद्द')
  ) {
    type = 'danger';
  } else if (
    msgLower.includes('cloud') ||
    msgLower.includes('sync') ||
    msgLower.includes('backup') ||
    msgLower.includes('सिंक') ||
    msgLower.includes('बैकअप')
  ) {
    type = 'cloud';
  } else if (
    msgLower.includes('error') ||
    msgLower.includes('fail') ||
    msgLower.includes('invalid') ||
    msgLower.includes('अमान्य') ||
    msgLower.includes('गलत')
  ) {
    type = 'warning';
  } else if (
    msgLower.includes('success') ||
    msgLower.includes('add') ||
    msgLower.includes('save') ||
    msgLower.includes('update') ||
    msgLower.includes('download') ||
    msgLower.includes('restore') ||
    msgLower.includes('सफल') ||
    msgLower.includes('सहेज') ||
    msgLower.includes('जोड़ा')
  ) {
    type = 'success';
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-3 h-3 stroke-[2.5]" />
          </div>
        );
      case 'cloud':
        return (
          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Cloud className="w-3 h-3 stroke-[2.5]" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3 h-3 stroke-[2.5]" />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 stroke-[2.5]" />
          </div>
        );
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-[9990] px-4 py-2 bg-slate-900/90 backdrop-blur-xl text-white text-xs font-semibold rounded-full shadow-xl shadow-slate-950/30 border border-white/15 flex items-center gap-2.5 max-w-[90vw] sm:max-w-md animate-in slide-in-from-top-4 fade-in duration-200 select-none pointer-events-auto"
    >
      {getIcon()}

      <span className="flex-1 text-slate-100 font-medium text-[12.5px] leading-tight truncate">
        {message}
      </span>

      <button
        type="button"
        onClick={onDismiss}
        className="w-4 h-4 rounded-full hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 ml-0.5"
        aria-label="Dismiss notification"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
