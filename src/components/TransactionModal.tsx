import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { CashTransaction, PaymentMethod, TransactionType } from '../types';
import { getDateKey, getTodayYear, getTodayMonth, getTodayDay, formatDisplayDate } from '../utils/calendar';
import { useLockBodyScroll } from '../utils/scrollLock';

interface TransactionModalProps {
  isOpen: boolean;
  initialTransaction?: CashTransaction | null;
  defaultType?: TransactionType;
  selectedMonth?: string;
  onSave: (amount: number, type: TransactionType, paymentMethod: PaymentMethod, fullDate: string, notes: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialTransaction,
  defaultType = 'CASH_IN',
  selectedMonth = 'Aug 2026',
  onSave,
  onDelete,
  onClose
}) => {
  const todayStr = getDateKey(getTodayYear(), getTodayMonth(), getTodayDay());

  const [type, setType] = useState<TransactionType>(initialTransaction?.type || defaultType);
  const [amountStr, setAmountStr] = useState<string>(initialTransaction ? String(initialTransaction.amount) : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialTransaction?.paymentMethod || 'CASH');
  const [date, setDate] = useState<string>(initialTransaction?.fullDate || todayStr);
  const [notes, setNotes] = useState<string>(initialTransaction?.notes || '');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    setType(initialTransaction?.type || defaultType);
    setAmountStr(initialTransaction ? String(initialTransaction.amount) : '');
    setPaymentMethod(initialTransaction?.paymentMethod || 'CASH');
    setDate(initialTransaction?.fullDate || todayStr);
    setNotes(initialTransaction?.notes || '');
    setShowDatePicker(false);
  }, [initialTransaction, defaultType, todayStr, isOpen]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amountStr) || 0;
  const isOkEnabled = amountNum > 0;
  const isEditing = Boolean(initialTransaction);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOkEnabled) return;
    onSave(amountNum, type, paymentMethod, date, notes.trim());
    onClose();
  };

  const formatHeaderDate = (dateString: string) => {
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

        {/* 1. Header Row: Title (Cash In / Cash Out) + Date & Edit */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {type === 'CASH_IN' ? 'Cash In' : 'Cash Out'}
          </h2>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              {formatHeaderDate(date)}
            </span>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs sm:text-sm font-bold text-[#1862D6] hover:underline cursor-pointer"
            >
              {showDatePicker ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Optional Date Picker input when Edit is clicked */}
        {showDatePicker && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Select Transaction Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1862D6]"
            />
          </div>
        )}

        {/* 2. Amount Input & Online/Cash Switch Row */}
        <div className="flex items-center justify-between py-1">
          {/* Large ₹ Currency Symbol + Vertical Cursor + Amount Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              ₹
            </span>
            <div className="w-[2.5px] h-8 sm:h-9 bg-[#00A884] rounded-full" />
            <input
              type="number"
              step="any"
              min="0"
              autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="w-36 text-3xl sm:text-4xl font-black text-slate-900 bg-transparent focus:outline-none tracking-tight placeholder:text-slate-300"
            />
          </div>

          {/* Online / Cash Toggle Switch Pill */}
          <div className="p-0.5 bg-white border border-[#1862D6] rounded-full flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setPaymentMethod('ONLINE')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                paymentMethod === 'ONLINE'
                  ? 'bg-[#1862D6] text-white shadow-2xs'
                  : 'text-[#1862D6] hover:bg-blue-50'
              }`}
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                paymentMethod === 'CASH'
                  ? 'bg-[#1862D6] text-white shadow-2xs'
                  : 'text-[#1862D6] hover:bg-blue-50'
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        {/* 3. Description / Notes Input */}
        <div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Eg. (Party name, Building name, Area name)"
            className="w-full px-4 sm:px-5 py-3.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1862D6] shadow-2xs transition"
          />
        </div>

        {/* 4. Action Buttons: Delete (Red Outline) + Save (Blue) */}
        <div className="pt-2">
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (initialTransaction && onDelete) {
                    onDelete(initialTransaction.id);
                  }
                  onClose();
                }}
                className="w-full py-3.5 rounded-full border border-[#E02D3C] bg-white hover:bg-red-50 text-[#E02D3C] font-bold text-sm text-center active:scale-98 transition cursor-pointer"
              >
                Delete
              </button>

              <button
                type="button"
                disabled={!isOkEnabled}
                onClick={handleSubmit}
                className={`w-full py-3.5 rounded-full font-bold text-sm text-center transition ${
                  isOkEnabled
                    ? 'bg-[#1862D6] hover:bg-blue-700 text-white shadow-md active:scale-98 cursor-pointer'
                    : 'bg-[#CBD5E1] text-white cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isOkEnabled}
              onClick={handleSubmit}
              className={`w-full py-4 rounded-full font-bold text-sm text-center transition ${
                isOkEnabled
                  ? 'bg-[#1862D6] hover:bg-blue-700 text-white shadow-md active:scale-98 cursor-pointer'
                  : 'bg-[#CBD5E1] text-white cursor-not-allowed'
              }`}
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

