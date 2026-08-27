import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PaymentMethod } from '../types';
import { useLockBodyScroll } from '../utils/scrollLock';

interface AdvanceModalProps {
  isOpen: boolean;
  workerName: string;
  dayNumber: number;
  selectedMonth: string;
  initialAdvance: number;
  initialNote: string;
  initialPaymentMethod: PaymentMethod;
  onSave: (amount: number, note: string, paymentMethod: PaymentMethod) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const AdvanceModal: React.FC<AdvanceModalProps> = ({
  isOpen,
  workerName,
  dayNumber,
  selectedMonth,
  initialAdvance,
  initialNote,
  initialPaymentMethod,
  onSave,
  onDelete,
  onClose
}) => {
  const [amountStr, setAmountStr] = useState(initialAdvance > 0 ? String(initialAdvance) : '');
  const [note, setNote] = useState(initialNote || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod || 'ONLINE');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    setAmountStr(initialAdvance > 0 ? String(initialAdvance) : '');
    setNote(initialNote || '');
    setPaymentMethod(initialPaymentMethod || 'ONLINE');
  }, [initialAdvance, initialNote, initialPaymentMethod, isOpen]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amountStr) || 0;
  const isEditing = initialAdvance > 0;
  const isOkEnabled = amountNum > 0 || note.trim().length > 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOkEnabled) return;
    onSave(amountNum, note.trim(), paymentMethod);
    onClose();
  };

  const parts = selectedMonth.split(' ');
  const mName = parts[0] || 'Aug';
  const yr = parts[1] || '2026';
  const formattedDate = `${mName} ${String(dayNumber).padStart(2, '0')}, ${yr}`;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-2xl relative space-y-5 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Top Header Bar (Flex Between) */}
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-bold text-[#111827] tracking-tight">
            Advance amount
          </h2>

          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-bold text-[#111827]">
              {formattedDate}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] flex items-center justify-center transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* 2. Amount & Payment Toggle Section (Flex Between) */}
        <div className="flex items-center justify-between py-1">
          {/* Left: Large Numeric Input + Currency + Teal Cursor */}
          <div className="flex items-center gap-2">
            <span className="text-[36px] font-extrabold text-[#111827] leading-none">
              ₹
            </span>
            <div className="w-[2.5px] h-[38px] bg-[#0D9488] rounded-full" />
            <input
              type="number"
              step="any"
              min="0"
              autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="w-32 text-[38px] font-bold text-[#111827] bg-transparent focus:outline-none tracking-tight placeholder:text-[#9CA3AF] leading-none"
            />
          </div>

          {/* Right: Online | Cash Toggle Switch */}
          <div className="p-0.5 bg-white border-[1.2px] border-[#1D61D2] rounded-full flex items-center shadow-xs">
            <button
              type="button"
              onClick={() => setPaymentMethod('ONLINE')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                paymentMethod === 'ONLINE'
                  ? 'bg-[#1D61D2] text-white shadow-2xs'
                  : 'text-[#1D61D2] hover:bg-blue-50/50'
              }`}
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                paymentMethod === 'CASH'
                  ? 'bg-[#1D61D2] text-white shadow-2xs'
                  : 'text-[#1D61D2] hover:bg-blue-50/50'
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        {/* 3. Notes Section */}
        <div className="space-y-1.5">
          <label className="block text-[14px] font-semibold text-[#374151]">
            Notes
          </label>
          <div className="h-[50px] bg-[#F9FAFB] border-[1.2px] border-[#E5E7EB] rounded-[25px] flex items-center px-4 shadow-2xs focus-within:border-[#1D61D2] focus-within:bg-white transition">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eg.(Food, petrol, rent)"
              className="w-full bg-transparent text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Bottom Action Buttons */}
        <div className="pt-2">
          {isEditing ? (
            /* Case B: Editing Existing Advance (Flex Row with 40% Delete + 60% Ok) */
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-[40%] h-[52px] rounded-full bg-[#FEF2F2] hover:bg-red-100 border border-[#FECACA] text-[#DC2626] font-bold text-sm text-center active:scale-98 transition cursor-pointer"
              >
                Delete
              </button>

              <button
                type="button"
                disabled={!isOkEnabled}
                onClick={handleSubmit}
                className={`w-[60%] h-[52px] rounded-full font-bold text-sm text-center transition ${
                  isOkEnabled
                    ? 'bg-[#1D61D2] hover:bg-blue-700 text-white shadow-md active:scale-98 cursor-pointer'
                    : 'bg-[#B5B8BE] text-white cursor-not-allowed'
                }`}
              >
                Ok
              </button>
            </div>
          ) : (
            /* Case A: Adding New Advance (Single full-width elevated pill button) */
            <button
              type="button"
              disabled={!isOkEnabled}
              onClick={handleSubmit}
              className={`w-full h-[52px] rounded-full font-bold text-sm text-center transition ${
                isOkEnabled
                  ? 'bg-[#1D61D2] hover:bg-blue-700 text-white shadow-md active:scale-98 cursor-pointer'
                  : 'bg-[#B5B8BE] text-white cursor-not-allowed'
              }`}
            >
              Ok
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

// Export alias as requested by component naming
export { AdvanceModal as AdvanceAmountBottomSheet };


