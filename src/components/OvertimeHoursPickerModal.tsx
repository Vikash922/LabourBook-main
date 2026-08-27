import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '../utils/scrollLock';

interface OvertimeHoursPickerModalProps {
  isOpen: boolean;
  initialHours: number; // 0 to 23
  initialMinutes: number; // 0 to 59
  onSave: (hours: number, minutes: number) => void;
  onClose: () => void;
}

export const OvertimeHoursPickerModal: React.FC<OvertimeHoursPickerModalProps> = ({
  isOpen,
  initialHours,
  initialMinutes,
  onSave,
  onClose
}) => {
  const [hours, setHours] = useState<number>(initialHours || 0);
  const [minutes, setMinutes] = useState<number>(initialMinutes || 0);

  const touchHoursY = useRef<number | null>(null);
  const touchMinsY = useRef<number | null>(null);
  const accumHours = useRef<number>(0);
  const accumMins = useRef<number>(0);

  // Lock body scroll when modal is open safely
  useLockBodyScroll(isOpen);

  useEffect(() => {
    setHours(initialHours || 0);
    setMinutes(initialMinutes || 0);
  }, [initialHours, initialMinutes, isOpen]);

  if (!isOpen) return null;

  const prevHour = (hours - 1 + 24) % 24;
  const nextHour = (hours + 1) % 24;

  const prevMin = (minutes - 1 + 60) % 60;
  const nextMin = (minutes + 1) % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  const stepHour = (delta: number) => {
    setHours((prev) => (prev + delta + 24) % 24);
  };

  const stepMin = (delta: number) => {
    setMinutes((prev) => (prev + delta + 60) % 60);
  };

  // Touch handlers for Hours column
  const handleTouchHoursStart = (e: React.TouchEvent) => {
    touchHoursY.current = e.touches[0].clientY;
    accumHours.current = 0;
  };

  const handleTouchHoursMove = (e: React.TouchEvent) => {
    if (touchHoursY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchHoursY.current - currentY;
    accumHours.current += diff;
    touchHoursY.current = currentY;

    const THRESHOLD = 14;
    if (accumHours.current > THRESHOLD) {
      stepHour(1);
      accumHours.current -= THRESHOLD;
    } else if (accumHours.current < -THRESHOLD) {
      stepHour(-1);
      accumHours.current += THRESHOLD;
    }
  };

  const handleTouchHoursEnd = () => {
    touchHoursY.current = null;
    accumHours.current = 0;
  };

  // Touch handlers for Minutes column
  const handleTouchMinsStart = (e: React.TouchEvent) => {
    touchMinsY.current = e.touches[0].clientY;
    accumMins.current = 0;
  };

  const handleTouchMinsMove = (e: React.TouchEvent) => {
    if (touchMinsY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchMinsY.current - currentY;
    accumMins.current += diff;
    touchMinsY.current = currentY;

    const THRESHOLD = 14;
    if (accumMins.current > THRESHOLD) {
      stepMin(1);
      accumMins.current -= THRESHOLD;
    } else if (accumMins.current < -THRESHOLD) {
      stepMin(-1);
      accumMins.current += THRESHOLD;
    }
  };

  const handleTouchMinsEnd = () => {
    touchMinsY.current = null;
    accumMins.current = 0;
  };

  const handleConfirm = () => {
    onSave(hours, minutes);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-xs select-none touch-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 sm:p-6 shadow-2xl relative select-none touch-none flex flex-col space-y-4 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Circular Close (X) button outside top right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-11 right-3 w-8 h-8 bg-white hover:bg-slate-100 rounded-full shadow-md flex items-center justify-center text-slate-800 cursor-pointer transition"
          title="Close"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Header Title: Overtime Hours */}
        <div className="pb-1">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Overtime Hours
          </h3>
        </div>

        {/* Picker Layout matching screenshot 1 */}
        <div className="py-4 my-1 flex items-center justify-between px-2 sm:px-6">
          {/* Left Label: Hrs */}
          <div className="w-14 text-left font-bold text-lg text-slate-900 select-none">
            Hrs
          </div>

          {/* Center Picker: Hours, Colon, Minutes */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Hours Column */}
            <div
              className="flex flex-col items-center select-none w-16 cursor-ns-resize"
              onTouchStart={handleTouchHoursStart}
              onTouchMove={handleTouchHoursMove}
              onTouchEnd={handleTouchHoursEnd}
              onWheel={(e) => {
                e.preventDefault();
                stepHour(e.deltaY > 0 ? 1 : -1);
              }}
            >
              {/* Previous Hour (Top) */}
              <button
                type="button"
                onClick={() => stepHour(-1)}
                className="h-9 flex items-center justify-center text-base sm:text-lg font-bold text-slate-400 hover:text-slate-700 cursor-pointer select-none transition"
              >
                {pad(prevHour)}
              </button>

              {/* Selected Hour (Middle) with Top and Bottom Horizontal Lines */}
              <div className="w-full border-t-[1.5px] border-b-[1.5px] border-slate-600 py-2 flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider">
                  {pad(hours)}
                </span>
              </div>

              {/* Next Hour (Bottom) */}
              <button
                type="button"
                onClick={() => stepHour(1)}
                className="h-9 flex items-center justify-center text-base sm:text-lg font-bold text-slate-400 hover:text-slate-700 cursor-pointer select-none transition"
              >
                {pad(nextHour)}
              </button>
            </div>

            {/* Separator Colon */}
            <span className="text-xl font-black text-slate-900 select-none pb-0.5">
              :
            </span>

            {/* Minutes Column */}
            <div
              className="flex flex-col items-center select-none w-16 cursor-ns-resize"
              onTouchStart={handleTouchMinsStart}
              onTouchMove={handleTouchMinsMove}
              onTouchEnd={handleTouchMinsEnd}
              onWheel={(e) => {
                e.preventDefault();
                stepMin(e.deltaY > 0 ? 1 : -1);
              }}
            >
              {/* Previous Minute (Top) */}
              <button
                type="button"
                onClick={() => stepMin(-1)}
                className="h-9 flex items-center justify-center text-base sm:text-lg font-bold text-slate-400 hover:text-slate-700 cursor-pointer select-none transition"
              >
                {pad(prevMin)}
              </button>

              {/* Selected Minute (Middle) with Top and Bottom Horizontal Lines */}
              <div className="w-full border-t-[1.5px] border-b-[1.5px] border-slate-600 py-2 flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider">
                  {pad(minutes)}
                </span>
              </div>

              {/* Next Minute (Bottom) */}
              <button
                type="button"
                onClick={() => stepMin(1)}
                className="h-9 flex items-center justify-center text-base sm:text-lg font-bold text-slate-400 hover:text-slate-700 cursor-pointer select-none transition"
              >
                {pad(nextMin)}
              </button>
            </div>
          </div>

          {/* Right Label: Mins */}
          <div className="w-14 text-right font-bold text-lg text-slate-900 select-none">
            Mins
          </div>
        </div>

        {/* Bottom Ok Button - Pill Button (Blue when >0, Gray when 0) */}
        <div className="pt-2">
          {hours > 0 || minutes > 0 ? (
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3.5 bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-full text-center shadow-md transition cursor-pointer"
            >
              Ok
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3.5 bg-[#CBD5E1] text-white font-bold text-sm rounded-full text-center cursor-not-allowed"
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

