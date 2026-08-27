import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, User, Trash2 } from 'lucide-react';
import { AdvanceConfirmationState } from '../types';
import { useLockBodyScroll } from '../utils/scrollLock';

interface AdvanceConfirmationProps {
  confirmation: AdvanceConfirmationState;
  onDismiss: () => void;
}

export const AdvanceConfirmation: React.FC<AdvanceConfirmationProps> = ({
  confirmation,
  onDismiss
}) => {
  useLockBodyScroll(Boolean(confirmation));

  // Auto dismiss after 2.2 seconds
  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 2200);
    return () => clearTimeout(timer);
  }, [confirmation, onDismiss]);

  if (!confirmation) return null;

  const isAdded = confirmation.type === 'ADDED';
  const workerName = confirmation.workerName || 'Worker';
  const amount = isAdded && 'amount' in confirmation ? confirmation.amount : 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4 animate-in fade-in duration-150"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Glowing Success/Delete Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
            isAdded
              ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/25'
              : 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/25'
          }`}
        >
          {isAdded ? (
            <Check className="w-8 h-8 stroke-[3]" />
          ) : (
            <Trash2 className="w-7 h-7 stroke-[2.5]" />
          )}
        </div>

        {/* Amount & Status Headline */}
        <div className="space-y-1">
          {isAdded ? (
            <>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                ₹{Number(amount).toLocaleString('en-IN')}
              </div>
              <p className="text-xs font-semibold text-emerald-600 tracking-wide uppercase">
                Advance Added Successfully
              </p>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-slate-900">
                Advance Deleted
              </div>
              <p className="text-xs font-medium text-slate-500">
                Entry removed from records
              </p>
            </>
          )}
        </div>

        {/* Worker Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 text-slate-700 text-xs font-medium max-w-full">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{workerName}</span>
        </div>

        {/* Quick Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition active:scale-98 cursor-pointer ${
            isAdded
              ? 'bg-[#1656D6] hover:bg-blue-700'
              : 'bg-slate-800 hover:bg-slate-900'
          }`}
        >
          {isAdded ? 'Done' : 'OK'}
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
