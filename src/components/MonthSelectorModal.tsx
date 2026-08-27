import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, ChevronDown, ArrowLeft, Check } from 'lucide-react';
import { MONTHS_SHORT, parseYearMonth, getTodayYear, getTodayMonth } from '../utils/calendar';
import { useLockBodyScroll } from '../utils/scrollLock';
import { useLabor } from '../store/laborStore';

const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

interface MonthSelectorModalProps {
  isOpen: boolean;
  selectedMonth: string; // e.g. "Aug 2026"
  onSelectMonth: (month: string) => void;
  onClose: () => void;
}

export const MonthSelectorModal: React.FC<MonthSelectorModalProps> = ({
  isOpen,
  selectedMonth,
  onSelectMonth,
  onClose
}) => {
  const { userProfile } = useLabor();
  const lang = userProfile.language || 'en';

  const currentYear = getTodayYear();
  const currentMonth = getTodayMonth();
  const parsed = parseYearMonth(selectedMonth);

  const [tempMonthIdx, setTempMonthIdx] = useState<number>(() => {
    return parsed.month >= 1 && parsed.month <= 12 ? parsed.month - 1 : currentMonth - 1;
  });
  const [tempYear, setTempYear] = useState<number>(() => parsed.year || currentYear);
  const [view, setView] = useState<'MAIN' | 'MONTH' | 'YEAR'>('MAIN');

  // Strictly sync state when modal opens or selectedMonth prop changes
  useEffect(() => {
    if (isOpen) {
      const p = parseYearMonth(selectedMonth);
      const mIdx = p.month >= 1 && p.month <= 12 ? p.month - 1 : currentMonth - 1;
      setTempMonthIdx(mIdx);
      setTempYear(p.year || currentYear);
      setView('MAIN');
    }
  }, [isOpen, selectedMonth, currentMonth, currentYear]);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const handleOk = () => {
    const mShort = MONTHS_SHORT[tempMonthIdx] || 'Aug';
    onSelectMonth(`${mShort} ${tempYear}`);
    onClose();
  };

  // Generate extended years list (5 years back to 3 years ahead)
  const availableYears: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 3; y++) {
    availableYears.push(y);
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs select-none p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* ── 1. MAIN VIEW: 2 Dropdown Fields + Ok Button ── */}
        {view === 'MAIN' && (
          <div className="p-5 pb-8 sm:pb-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-[17px]">
                {lang === 'hi' ? 'महीना और साल चुनें' : 'Select Month & Year'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 2 Dropdown Trigger Boxes */}
            <div className="flex items-center gap-3 mb-7">
              {/* Month Trigger Box */}
              <button
                type="button"
                onClick={() => setView('MONTH')}
                className="flex-1 flex items-center justify-between px-4 py-3 rounded-[14px] border border-slate-300 bg-white hover:border-[#1862D6] hover:bg-blue-50/20 active:scale-98 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CalendarIcon className="w-4 h-4 text-slate-700 shrink-0" />
                  <span className="text-[15px] font-semibold text-slate-800 truncate">
                    {FULL_MONTHS[tempMonthIdx] || 'August'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-600 shrink-0 ml-1" />
              </button>

              {/* Year Trigger Box */}
              <button
                type="button"
                onClick={() => setView('YEAR')}
                className="w-32 flex items-center justify-between px-4 py-3 rounded-[14px] border border-slate-300 bg-white hover:border-[#1862D6] hover:bg-blue-50/20 active:scale-98 transition cursor-pointer"
              >
                <span className="text-[15px] font-semibold text-slate-800">
                  {tempYear}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-600 shrink-0 ml-1" />
              </button>
            </div>

            {/* Full-width Ok Button */}
            <button
              type="button"
              onClick={handleOk}
              className="w-full py-3.5 bg-[#1862D6] hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-bold text-[15px] shadow-md shadow-blue-500/20 transition active:scale-98 cursor-pointer"
            >
              {lang === 'hi' ? 'ठीक है (Ok)' : 'Ok'}
            </button>
          </div>
        )}

        {/* ── 2. MONTH SELECTION VIEW: Clean list with full-row click & zero glitch ── */}
        {view === 'MONTH' && (
          <div className="p-5 pb-8 sm:pb-6 max-h-[75vh] flex flex-col animate-in slide-in-from-right-4 duration-150">
            {/* Header with Back Button */}
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setView('MAIN')}
                className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <h3 className="font-bold text-slate-900 text-base">
                {lang === 'hi' ? 'महीना चुनें' : 'Select month'}
              </h3>
            </div>

            {/* 12 Months List */}
            <div className="overflow-y-auto divide-y divide-slate-100 -mx-2 px-2">
              {FULL_MONTHS.map((m, idx) => {
                const isSelected = tempMonthIdx === idx;
                return (
                  <div
                    key={m}
                    onClick={() => {
                      setTempMonthIdx(idx);
                      setView('MAIN');
                    }}
                    className={`flex items-center justify-between py-3.5 px-3 rounded-xl cursor-pointer transition ${
                      isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Radio Circle Indicator */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#228751]' : 'border-slate-400'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 bg-[#228751] rounded-full" />
                        )}
                      </div>
                      <span
                        className={`text-[16px] ${
                          isSelected ? 'text-slate-950 font-bold' : 'text-slate-800 font-medium'
                        }`}
                      >
                        {m}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-[11px] font-bold text-[#228751] bg-green-100/80 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. YEAR SELECTION VIEW: Clean list with full-row click & zero glitch ── */}
        {view === 'YEAR' && (
          <div className="p-5 pb-8 sm:pb-6 max-h-[75vh] flex flex-col animate-in slide-in-from-right-4 duration-150">
            {/* Header with Back Button */}
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setView('MAIN')}
                className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <h3 className="font-bold text-slate-900 text-base">
                {lang === 'hi' ? 'साल चुनें' : 'Select year'}
              </h3>
            </div>

            {/* Years List */}
            <div className="overflow-y-auto divide-y divide-slate-100 -mx-2 px-2">
              {availableYears.map((yr) => {
                const isSelected = tempYear === yr;
                return (
                  <div
                    key={yr}
                    onClick={() => {
                      setTempYear(yr);
                      setView('MAIN');
                    }}
                    className={`flex items-center justify-between py-3.5 px-3 rounded-xl cursor-pointer transition ${
                      isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Radio Circle Indicator */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#228751]' : 'border-slate-400'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 bg-[#228751] rounded-full" />
                        )}
                      </div>
                      <span
                        className={`text-[16px] ${
                          isSelected ? 'text-slate-950 font-bold' : 'text-slate-800 font-medium'
                        }`}
                      >
                        {yr}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-[11px] font-bold text-[#228751] bg-green-100/80 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
