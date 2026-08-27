import React from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Trash2, FileText, CreditCard } from 'lucide-react';
import { PaymentMethod, AttendanceStatus } from '../types';

interface DayAdvanceDetailModalProps {
  isOpen: boolean;
  dayNumber: number;
  selectedMonth: string;
  workerName: string;
  status: AttendanceStatus;
  advanceAmount: number;
  paymentMethod: PaymentMethod;
  note: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const DayAdvanceDetailModal: React.FC<DayAdvanceDetailModalProps> = ({
  isOpen,
  dayNumber,
  selectedMonth,
  status,
  advanceAmount,
  paymentMethod,
  note,
  onEdit,
  onDelete,
  onClose
}) => {
  if (!isOpen) return null;

  const parts = selectedMonth.split(' ');
  const mName = parts[0] || 'Aug';
  const yr = parts[1] || '2026';
  const formattedDate = `${mName} ${String(dayNumber).padStart(2, '0')}, ${yr}`;

  const renderAttendanceBadge = () => {
    switch (status) {
      case 'ABSENT':
        return <div className="w-8 h-8 rounded-lg bg-[#E02D3C] text-white font-bold text-sm flex items-center justify-center">A</div>;
      case 'PRESENT':
        return <div className="w-8 h-8 rounded-lg bg-[#10B981] text-white font-bold text-sm flex items-center justify-center">P</div>;
      case 'HALF_DAY':
        return <div className="h-8 px-2.5 rounded-lg bg-[#10B981] text-white font-bold text-xs flex items-center justify-center">1/2</div>;
      case 'PRESENT_HALF':
        return <div className="h-8 px-2.5 rounded-lg bg-[#10B981] text-white font-bold text-xs flex items-center justify-center">P + 1/2</div>;
      case 'DOUBLE':
        return <div className="h-8 px-2.5 rounded-lg bg-[#10B981] text-white font-bold text-xs flex items-center justify-center">P + P</div>;
      case 'PAID_LEAVE':
        return <div className="h-8 px-2.5 rounded-lg bg-[#5B5BD6] text-white font-bold text-xs flex items-center justify-center">PA</div>;
      default:
        return <div className="w-8 h-8 rounded-lg border border-slate-300 text-slate-400 font-bold text-sm flex items-center justify-center">-</div>;
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-2xl relative space-y-5 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header (Date Title + Delete + Edit + Close) */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
            {formattedDate}
          </h2>

          <div className="flex items-center gap-2">
            {/* Delete Icon button (circular soft red #FEF2F2) */}
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-[#FEF2F2] hover:bg-red-100 border border-[#FECACA] text-[#DC2626] flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Delete Advance"
            >
              <Trash2 className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Edit Pill Button (Pencil icon + 'Edit', border #D1D5DB, white background) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-[#D1D5DB] rounded-full text-xs font-bold text-[#0F172A] shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Edit</span>
            </button>

            {/* Close icon button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] flex items-center justify-center transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* 2. Body Card Displaying Advance Details */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Advance Amount
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#EEF2FF] border border-blue-200 text-[#1D61D2]">
              {paymentMethod === 'ONLINE' ? 'ONLINE' : 'CASH'}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
              ₹ {advanceAmount > 0 ? advanceAmount : 0}
            </span>
          </div>

          {note && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 text-xs font-medium text-slate-700">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{note}</span>
            </div>
          )}
        </div>

        {/* 3. Details List (Attendance Status) */}
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-slate-600">
              Day Attendance
            </span>
            {renderAttendanceBadge()}
          </div>
        </div>

        {/* 4. Action Button: Ok */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-[52px] bg-[#1D61D2] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-full shadow-md transition cursor-pointer"
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

// Export alias as requested by component naming
export { DayAdvanceDetailModal as DayAdvanceDetailBottomSheet };


