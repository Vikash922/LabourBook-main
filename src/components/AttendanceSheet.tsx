import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AttendanceStatus } from '../types';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '../utils/scrollLock';

interface AttendanceSheetProps {
  isOpen: boolean;
  workerName: string;
  formattedDate: string; // e.g. "Aug 05, 2026"
  dayNumber: number;
  currentStatus: AttendanceStatus;
  hasOvertime?: boolean;
  overtimeHours?: number;
  onSelectStatus: (status: AttendanceStatus) => void;
  onOpenOvertime?: () => void;
  onClose: () => void;
}

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  isOpen,
  workerName,
  formattedDate,
  dayNumber,
  currentStatus,
  hasOvertime,
  overtimeHours,
  onSelectStatus,
  onOpenOvertime,
  onClose
}) => {
  const [tempStatus, setTempStatus] = useState<AttendanceStatus>(currentStatus);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    setTempStatus(currentStatus);
  }, [currentStatus, isOpen]);

  if (!isOpen) return null;

  const handleOk = () => {
    onSelectStatus(tempStatus);
    onClose();
  };

  const handleRemove = () => {
    onSelectStatus('UNMARKED');
    onClose();
  };

  const isSelected = (status: AttendanceStatus) => tempStatus === status;

  const getButtonClass = (status: AttendanceStatus) => {
    return `h-8 px-3 min-w-[40px] rounded-full font-medium text-[13px] flex items-center justify-center cursor-pointer transition ${
      isSelected(status)
        ? 'bg-[#1862D6] text-white border border-[#1862D6]'
        : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'
    }`;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 select-none transition-opacity"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <div className="w-full max-w-md flex flex-col items-end mb-0">
        <button
          onClick={onClose}
          className="w-10 h-10 mb-3 mr-4 bg-white rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-lg cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div 
          className="w-full bg-white rounded-t-3xl pt-4 pb-4 shadow-2xl relative overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-[18px] font-bold text-slate-900 tracking-tight pr-2">
                {workerName}
              </h2>
              <span className="text-[12px] text-slate-900 font-bold">
                {formattedDate}
              </span>
            </div>
            
            <div className="text-[11px] text-slate-600 font-medium mb-3">
              Mark Attendance
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button type="button" onClick={() => setTempStatus('ABSENT')} className={getButtonClass('ABSENT')}>
                A
              </button>
              <button type="button" onClick={() => setTempStatus('HALF_DAY')} className={getButtonClass('HALF_DAY')}>
                ½
              </button>
              <button type="button" onClick={() => setTempStatus('PRESENT')} className={getButtonClass('PRESENT')}>
                P
              </button>
              <button type="button" onClick={() => setTempStatus('PRESENT_HALF')} className={getButtonClass('PRESENT_HALF')}>
                P + ½
              </button>
              <button type="button" onClick={() => setTempStatus('DOUBLE')} className={getButtonClass('DOUBLE')}>
                P + P
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenOvertime) onOpenOvertime();
                }}
                className={`h-8 px-3 min-w-[40px] rounded-full font-medium text-[13px] flex items-center justify-center cursor-pointer transition ${
                  hasOvertime
                    ? 'bg-purple-600 text-white border border-purple-600'
                    : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-50'
                }`}
              >
                OT
              </button>
              <button type="button" onClick={() => setTempStatus('PAID_LEAVE')} className={getButtonClass('PAID_LEAVE')}>
                PA
              </button>
            </div>
          </div>

          <div className="px-4 border-t border-slate-100 pt-3">
            <p className="text-[11px] text-slate-800 mb-1.5 tracking-wide uppercase font-medium">Meaning:</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-700">
              <div><span className="font-bold text-slate-900">A</span> - Absent</div>
              <div><span className="font-bold text-slate-900">1/2</span> - Half day</div>
              <div><span className="font-bold text-slate-900">P</span> - Present</div>
              <div><span className="font-bold text-slate-900">OT</span> - Overtime</div>
              <div><span className="font-bold text-slate-900">P + 1/2</span> - 1.5 day</div>
              <div><span className="font-bold text-slate-900">P+P</span> - Double</div>
              <div><span className="font-bold text-slate-900">PA</span> - Paid Leave</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 px-4 pt-4 mt-1">
            <button
              type="button"
              onClick={handleRemove}
              className="w-full py-3.5 bg-white hover:bg-red-50 border border-[#E02D3C] text-[#E02D3C] font-bold text-sm rounded-full text-center cursor-pointer transition active:scale-98"
            >
              Remove Marked
            </button>

            {tempStatus !== 'UNMARKED' ? (
              <button
                type="button"
                onClick={handleOk}
                className="w-full py-3.5 bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-full text-center shadow-md cursor-pointer transition"
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
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
