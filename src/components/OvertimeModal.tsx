import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { OvertimeHoursPickerModal } from './OvertimeHoursPickerModal';
import { useLockBodyScroll } from '../utils/scrollLock';

interface OvertimeModalProps {
  isOpen: boolean;
  workerName: string;
  formattedDate: string;
  dayNumber: number;
  selectedMonth: string;
  initialHours: number;
  initialRate: number;
  onSave: (hours: number, rate: number, amount: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const OvertimeModal: React.FC<OvertimeModalProps> = ({
  isOpen,
  dayNumber,
  selectedMonth,
  initialHours,
  initialRate,
  onSave,
  onDelete,
  onClose
}) => {
  // Break initial hours into hours and minutes
  const initH = Math.floor(initialHours || 0);
  const initM = Math.round(((initialHours || 0) - initH) * 60);

  const [hours, setHours] = useState<number>(initH);
  const [minutes, setMinutes] = useState<number>(initM);
  // Strictly manual: NO default amount pre-filled. Only show if rate was already saved (> 0)
  const [rateStr, setRateStr] = useState<string>(initialRate > 0 ? String(initialRate) : '');
  const [showHoursPicker, setShowHoursPicker] = useState<boolean>(false);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    const h = Math.floor(initialHours || 0);
    const m = Math.round(((initialHours || 0) - h) * 60);
    setHours(h);
    setMinutes(m);
    // Strictly manual rate: only show if already saved (>0), else keep blank
    setRateStr(initialRate > 0 ? String(initialRate) : '');
  }, [initialHours, initialRate, isOpen]);

  if (!isOpen) return null;

  const totalHoursDecimal = hours + minutes / 60;
  const rateFloat = parseFloat(rateStr) || 0;
  // Automatically calculate Total Overtime Amount strictly from (Hours * Rate)
  const totalAmount = totalHoursDecimal > 0 && rateFloat > 0
    ? Math.round(totalHoursDecimal * rateFloat * 100) / 100
    : 0;

  const isAlreadyAdded = (initialHours || 0) > 0 || (initialRate || 0) > 0;
  const isOkEnabled = totalHoursDecimal > 0 && rateFloat > 0;

  const handleSave = () => {
    if (!isOkEnabled) return;
    onSave(totalHoursDecimal, rateFloat, totalAmount);
    onClose();
  };

  const handleRemove = () => {
    if (onDelete) onDelete();
    onClose();
  };

  const parts = selectedMonth.split(' ');
  const mName = parts[0] || 'Aug';
  const yr = parts[1] || '2026';
  const formattedDate = `${mName} ${String(dayNumber).padStart(2, '0')}, ${yr}`;

  const formattedHoursDisplay = totalHoursDecimal > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} hrs`
    : '00:00 hrs';

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl relative space-y-4 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button outside top right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-11 right-3 w-8 h-8 bg-white hover:bg-slate-100 rounded-full shadow-md flex items-center justify-center text-slate-800 cursor-pointer transition"
          title="Close"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Header Row: Overtime + Date */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Overtime
          </h2>
          <span className="text-sm font-bold text-slate-900">
            {formattedDate}
          </span>
        </div>

        {/* Hours Field (Tappable input that opens smooth wheel scroll) */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">
            Hours
          </label>
          <div
            onClick={() => setShowHoursPicker(true)}
            className="w-full px-4 py-3.5 bg-[#F1F3F5] hover:bg-slate-200/70 border border-slate-200/60 rounded-2xl text-slate-800 font-semibold text-sm cursor-pointer flex items-center justify-between transition"
          >
            <span className={totalHoursDecimal > 0 ? 'text-slate-900 font-bold' : 'text-slate-400'}>
              {formattedHoursDisplay}
            </span>
          </div>
        </div>

        {/* Overtime Rate (Hourly ₹/hr) Field - Strictly manual, no default prefilled */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">
            Overtime Rate (Hourly ₹/hr)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={rateStr}
            onChange={(e) => setRateStr(e.target.value)}
            placeholder="₹ Enter Overtime rate"
            className="w-full px-4 py-3.5 bg-[#F1F3F5] border border-slate-200/60 rounded-2xl text-slate-900 placeholder:text-slate-400 font-semibold text-sm focus:outline-none focus:bg-white focus:border-[#1862D6] transition"
          />
        </div>

        {/* Summary Row: Total Overtime Amount (Auto-Calculated strictly from Hours * Rate) */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm sm:text-base font-bold text-slate-900">
            Total Overtime Amount
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900">
            ₹{totalAmount > 0 ? Math.round(totalAmount) : '0'}
          </span>
        </div>

        {/* Bottom Actions: If already added show Remove (Red outline) + Ok (Blue). If new show full-width Ok */}
        <div className="pt-2">
          {isAlreadyAdded ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRemove}
                className="w-full py-3.5 rounded-full border border-[#E02D3C] bg-white hover:bg-red-50 text-[#E02D3C] font-bold text-sm text-center active:scale-98 transition cursor-pointer"
              >
                Remove Marked
              </button>

              <button
                type="button"
                disabled={!isOkEnabled}
                onClick={handleSave}
                className={`w-full py-3.5 rounded-full font-bold text-sm text-center transition ${
                  isOkEnabled
                    ? 'bg-[#1862D6] hover:bg-blue-700 text-white shadow-md active:scale-98 cursor-pointer'
                    : 'bg-[#CBD5E1] text-white cursor-not-allowed'
                }`}
              >
                Ok
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isOkEnabled}
              onClick={handleSave}
              className={`w-full py-3.5 rounded-full font-bold text-sm text-center transition ${
                isOkEnabled
                  ? 'bg-[#1862D6] hover:bg-blue-700 text-white shadow-md active:scale-98 cursor-pointer'
                  : 'bg-[#CBD5E1] text-white cursor-not-allowed'
              }`}
            >
              Ok
            </button>
          )}
        </div>

        {/* Smooth Scroll Hours & Minutes Picker Bottom Sheet */}
        {showHoursPicker && (
          <OvertimeHoursPickerModal
            isOpen={true}
            initialHours={hours}
            initialMinutes={minutes}
            onSave={(h, m) => {
              setHours(h);
              setMinutes(m);
              setShowHoursPicker(false);
            }}
            onClose={() => setShowHoursPicker(false)}
          />
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
