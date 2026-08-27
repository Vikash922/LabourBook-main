import React from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2 } from 'lucide-react';
import { CashTransaction } from '../types';
import { useLockBodyScroll } from '../utils/scrollLock';

interface TransactionDetailModalProps {
  isOpen: boolean;
  transaction: CashTransaction | null;
  onEdit: () => void;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  transaction,
  onEdit,
  onClose
}) => {
  useLockBodyScroll(isOpen);

  if (!isOpen || !transaction) return null;

  const isCashIn = transaction.type === 'CASH_IN';

  const formatHeaderDate = (dateString?: string) => {
    if (!dateString) return 'Aug 21, 2026';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[dateObj.getMonth()]} ${String(d).padStart(2, '0')}, ${y}`;
      }
    } catch {}
    return dateString;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl relative space-y-4 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top-Right Round Close Button Outside Modal */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-3 w-8 h-8 bg-white hover:bg-slate-100 rounded-full shadow-md flex items-center justify-center text-slate-800 cursor-pointer transition"
          title="Close"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* 1. Header Row: Date + Edit Outline Pill Button */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {formatHeaderDate(transaction.fullDate || transaction.dateDisplay)}
          </h2>

          <button
            type="button"
            onClick={() => {
              onEdit();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Edit</span>
          </button>
        </div>

        {/* 2. Detail Rows Matching Screenshot */}
        <div className="space-y-3 pt-1 text-sm font-medium">
          {/* Transaction Type */}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-900">Transaction Type</span>
            <span className="font-bold text-slate-900">
              {isCashIn ? 'Cash In' : 'Cash Out'}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-900">Amount</span>
            <span
              className={`font-bold text-base ${
                isCashIn ? 'text-[#10B981]' : 'text-[#EF4444]'
              }`}
            >
              ₹ {transaction.amount}
            </span>
          </div>

          {/* Payment Method */}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-900">Payment Method</span>
            <span className="font-bold text-slate-900">
              {transaction.paymentMethod === 'ONLINE' ? 'Online' : 'Cash'}
            </span>
          </div>

          {/* Notes */}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-900">Notes</span>
            <span className="font-bold text-slate-900">
              {transaction.notes || '-'}
            </span>
          </div>
        </div>

        {/* 3. Full-width Blue Ok Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-full shadow-md text-center cursor-pointer transition"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
