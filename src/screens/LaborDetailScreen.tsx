import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreVertical,
  FileText,
  RotateCw,
  User,
  X
} from 'lucide-react';
import { useLabor } from '../store/laborStore';
import { LaborWorker, AttendanceStatus, SalaryType, DayInfo } from '../types';
import { getMonthDays, parseYearMonth, getDateKey } from '../utils/calendar';
import { calculateMonthStats } from '../utils/stats';
import { AttendanceSheet } from '../components/AttendanceSheet';
import { AdvanceModal } from '../components/AdvanceModal';
import { OvertimeModal } from '../components/OvertimeModal';
import { DayAdvanceDetailModal } from '../components/DayAdvanceDetailModal';
import { AdvanceConfirmation } from '../components/AdvanceConfirmation';
import { MonthSelectorModal } from '../components/MonthSelectorModal';
import { SwipeToDeleteSheet } from '../components/SwipeToDeleteSheet';
import { generateWorkerReportPdf } from '../utils/pdfGenerator';
import { AdvanceConfirmationState } from '../types';
import { universalShare } from '../services/nativeBridge';

interface LaborDetailScreenProps {
  workerId: string;
}

export const LaborDetailScreen: React.FC<LaborDetailScreenProps> = ({ workerId }) => {
  const {
    workers,
    selectedMonth,
    setSelectedMonth,
    navigateTo,
    setAttendance,
    updateDayDetails,
    updateWorker,
    deleteWorker,
    showToast
  } = useLabor();

  const worker = workers.find((w) => w.id === workerId);

  // Modals state (default overview collapsed to false)
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [sheetDay, setSheetDay] = useState<number | null>(null);
  const [advanceDay, setAdvanceDay] = useState<number | null>(null);
  const [otDay, setOtDay] = useState<number | null>(null);
  const [viewDetailDay, setViewDetailDay] = useState<number | null>(null);
  const [advanceConfirmation, setAdvanceConfirmation] = useState<AdvanceConfirmationState>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
  const [showDeleteWorkerModal, setShowDeleteWorkerModal] = useState(false);

  if (!worker) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <p className="text-slate-600 mb-4">Labor not found.</p>
        <button
          onClick={() => navigateTo({ type: 'HOME' })}
          className="px-4 py-2 bg-[#1862D6] text-white rounded-xl text-xs font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const stats = useMemo(() => calculateMonthStats(worker, selectedMonth), [worker, selectedMonth]);
  const days = useMemo(() => getMonthDays(selectedMonth), [selectedMonth]);
  const { year, month } = parseYearMonth(selectedMonth);

  const formatFullDateDisplay = (monthStr: string, dayNum: number) => {
    const parts = monthStr.split(' ');
    const mName = parts[0] || 'Aug';
    const yr = parts[1] || '2026';
    const dayPad = String(dayNum).padStart(2, '0');
    return `${mName} ${dayPad}, ${yr}`;
  };

  const handleShareSlip = async () => {
    generateWorkerReportPdf(worker, selectedMonth);
    showToast('Generating PDF Slip...');
  };

  const handleRefreshBalance = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRefreshingBalance) return;
    setIsRefreshingBalance(true);
    setTimeout(() => {
      setIsRefreshingBalance(false);
      showToast('Balance recalculated & updated!');
    }, 650);
  };

  const firstName = worker.name.trim().split(' ')[0] || 'Labor';

  return (
    <div className="relative flex flex-col h-full bg-white selection:bg-[#1862D6] selection:text-white">
      {/* 1. Exact Header Bar Matching Screenshot */}
      <header className="flex-shrink-0 z-40 bg-white border-b border-slate-100 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-md md:max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Back Arrow and Worker Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo({ type: 'HOME' })}
              className="p-1 -ml-1 text-slate-900 hover:text-slate-600 transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {worker.name}
            </h1>
          </div>

          {/* Right: Edit outline button & Red Trash button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditWorkerModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 stroke-[2]" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => setShowDeleteWorkerModal(true)}
              className="p-1 text-[#E02D3C] hover:bg-red-50 rounded-lg transition cursor-pointer ml-1"
              title="Delete Labor"
            >
              <Trash2 className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto overscroll-contain pb-24">
        <div className="max-w-md md:max-w-xl mx-auto px-4 pt-3 space-y-2.5">
        {/* 2. Overview Row: Title + Month Selector Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Overview
          </span>

          <button
            onClick={() => setShowMonthModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-slate-900 stroke-[2]" />
            <span>{selectedMonth}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-900 stroke-[2.2]" />
          </button>
        </div>

        {/* 3. Summary Metrics (Compact Proportioned Stats) with Interactive Rotating Arrow Toggle */}
        <div className="py-0.5">
          <div
            onClick={() => setIsOverviewExpanded((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="grid grid-cols-4 gap-1 flex-1 text-center">
              {/* Total Present */}
              <div className="py-0.5">
                <span className="text-sm sm:text-base font-bold text-[#10B981] block leading-tight">
                  {stats.presentCount.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Total Present
                </span>
              </div>

              {/* Total Absent */}
              <div className="py-0.5">
                <span className="text-sm sm:text-base font-bold text-[#EF4444] block leading-tight">
                  {stats.absentCount.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Total Absent
                </span>
              </div>

              {/* Over time */}
              <div className="py-0.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                  {stats.overtimeHours}h
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Over time
                </span>
              </div>

              {/* Total Advance */}
              <div className="py-0.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                  ₹{stats.totalAdvance.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Total Advance
                </span>
              </div>
            </div>

            {/* Expand/Collapse Chevron (Rotates downward when collapsed, upward when expanded) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOverviewExpanded((prev) => !prev);
              }}
              className="p-1 ml-0.5 text-[#1862D6] hover:bg-blue-50/80 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
              title={isOverviewExpanded ? "Collapse Overview" : "Expand Overview"}
            >
              <ChevronDown
                className={`w-4 h-4 text-[#1862D6] stroke-[2.5] transition-transform duration-300 ease-in-out ${
                  isOverviewExpanded ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>
          </div>

          {/* Expandable Breakdown Row with Smooth Height Transition */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isOverviewExpanded
                ? 'max-h-40 opacity-100 pt-2.5 mt-2 border-t border-slate-100'
                : 'max-h-0 opacity-0 pt-0 mt-0 border-t-0'
            }`}
          >
            <div className="grid grid-cols-4 gap-1 text-center">
              {/* Half day */}
              <div className="py-0.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                  {stats.halfDayCount.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Half day
                </span>
              </div>

              {/* Total P+P */}
              <div className="py-0.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                  {stats.doubleCount.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Total P+P
                </span>
              </div>

              {/* Total P+1/2 */}
              <div className="py-0.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                  {stats.presentHalfCount.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Total P+1/2
                </span>
              </div>

              {/* Balance with Clickable Refresh Icon */}
              <div className="py-0.5">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-sm sm:text-base font-bold text-[#1862D6]">
                    ₹{stats.balance.toFixed(1)}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshBalance}
                    disabled={isRefreshingBalance}
                    className="p-0.5 hover:bg-blue-50 rounded-full transition active:scale-90 cursor-pointer"
                    title="Recalculate & Refresh Balance"
                  >
                    <RotateCw
                      className={`w-3 h-3 text-slate-700 stroke-[2.2] transition-colors ${
                        isRefreshingBalance ? 'animate-spin text-[#1862D6]' : 'hover:text-[#1862D6]'
                      }`}
                    />
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block leading-tight">
                  Balance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Open Report Button Banner Matching Screenshot */}
        <button
          onClick={() => navigateTo({ type: 'LABOR_REPORT', workerId: worker.id })}
          className="w-full py-2.5 px-4 bg-[#F0F5FF] hover:bg-blue-100/70 text-[#1862D6] rounded-none flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition active:scale-[0.99] cursor-pointer"
        >
          <FileText className="w-4 h-4 text-[#1862D6] stroke-[2.2]" />
          <span>Open Report</span>
        </button>
      </div>

      {/* 5. Table Header Matching Screenshot */}
      <div className="max-w-md md:max-w-xl mx-auto pt-1">
        <div className="grid grid-cols-[3.2rem_8.5rem_1fr] sm:grid-cols-[3.75rem_10.5rem_1fr] border-b border-t border-slate-200 text-xs font-bold text-slate-900 items-center bg-white">
          <div className="py-2.5 border-r border-slate-200 text-center">Date</div>
          <div className="py-2.5 border-r border-slate-200 text-left pl-2.5 sm:pl-3">Attendance</div>
          <div className="py-2.5 text-left pl-2.5 sm:pl-3">₹ / Notes</div>
        </div>

        <div className="divide-y divide-slate-200 border-b border-slate-200 bg-white">
          {days.map((day: DayInfo) => {
            const dateKey = day.dateKey;
            const record = worker.attendance[dateKey] || {
              fullDate: dateKey,
              dayNumber: day.dayNumber,
              dayOfWeek: day.dayOfWeek,
              status: 'UNMARKED',
              overtimeHours: 0,
              advanceAmount: 0,
              note: '',
              overtimeRate: 0,
              paymentMethod: 'CASH'
            };

            const status = record.status || 'UNMARKED';
            const isUnmarked = status === 'UNMARKED';
            const hasOT = (record.overtimeHours || 0) > 0;
            const hasAdvance = (record.advanceAmount || 0) > 0;
            const hasNote = Boolean(record.note);

            const dayTwoDigit = String(day.dayNumber).padStart(2, '0');

            return (
              <div
                key={day.dayNumber}
                className="grid grid-cols-[3.2rem_8.5rem_1fr] sm:grid-cols-[3.75rem_10.5rem_1fr] items-stretch hover:bg-slate-50/60 transition select-none"
              >
                <div className="flex flex-col items-center justify-center border-r border-slate-200 py-2 sm:py-2.5">
                  <span className="text-[13px] sm:text-sm font-bold text-slate-900 leading-tight">
                    {dayTwoDigit}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal mt-0.5">
                    {day.dayOfWeek}
                  </span>
                </div>

                <div className="flex items-center justify-between pr-1 pl-2 border-r border-slate-200 py-2.5">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {isUnmarked ? (
                      <>
                        {/* A Button (Red Outline) */}
                        <button
                          type="button"
                          onClick={() => setAttendance(worker.id, day.dayNumber, 'ABSENT', selectedMonth)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-red-400 text-red-500 bg-white hover:bg-red-50 flex items-center justify-center text-[13px] font-bold shadow-2xs cursor-pointer"
                          title="Mark Absent"
                        >
                          A
                        </button>

                        {/* P Button (Green Outline) */}
                        <button
                          type="button"
                          onClick={() => setAttendance(worker.id, day.dayNumber, 'PRESENT', selectedMonth)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-emerald-400 text-emerald-600 bg-white hover:bg-emerald-50 flex items-center justify-center text-[13px] font-bold shadow-2xs cursor-pointer"
                          title="Mark Present"
                        >
                          P
                        </button>

                        {/* OT Button */}
                        <button
                          type="button"
                          onClick={() => setOtDay(day.dayNumber)}
                          className={`h-7 sm:h-8 px-2 min-w-[32px] rounded-lg border flex items-center justify-center text-xs cursor-pointer ${
                            hasOT
                              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                              : 'border-purple-400 text-purple-600 bg-white hover:bg-purple-50 font-bold shadow-2xs'
                          }`}
                          title="Overtime"
                        >
                          OT
                        </button>
                      </>
                    ) : (
                      <>
                        {status === 'ABSENT' && (
                          <button
                            type="button"
                            onClick={() => setSheetDay(day.dayNumber)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500 text-white font-bold text-[13px] flex items-center justify-center shadow-2xs cursor-pointer"
                            title="Absent - Tap to edit"
                          >
                            A
                          </button>
                        )}

                        {status === 'PRESENT' && (
                          <button
                            type="button"
                            onClick={() => setSheetDay(day.dayNumber)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500 text-white font-bold text-[13px] flex items-center justify-center shadow-2xs cursor-pointer"
                            title="Present - Tap to edit"
                          >
                            P
                          </button>
                        )}

                        {status === 'HALF_DAY' && (
                          <button
                            type="button"
                            onClick={() => setSheetDay(day.dayNumber)}
                            className="h-7 sm:h-8 px-2.5 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                            title="Half Day - Tap to edit"
                          >
                            1/2
                          </button>
                        )}

                        {status === 'PRESENT_HALF' && (
                          <button
                            type="button"
                            onClick={() => setSheetDay(day.dayNumber)}
                            className="h-7 sm:h-8 px-2 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                            title="P + 1/2 - Tap to edit"
                          >
                            P + 1/2
                          </button>
                        )}

                        {status === 'DOUBLE' && (
                          <button
                            type="button"
                            onClick={() => setSheetDay(day.dayNumber)}
                            className="h-7 sm:h-8 px-2 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                            title="Double - Tap to edit"
                          >
                            P + P
                          </button>
                        )}

                        {status === 'PAID_LEAVE' && (
                          <button
                            type="button"
                            onClick={() => setSheetDay(day.dayNumber)}
                            className="h-7 sm:h-8 px-2.5 rounded-lg bg-[#5B5BD6] text-white font-bold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                            title="Paid Leave - Tap to edit"
                          >
                            PA
                          </button>
                        )}

                        {/* OT Button */}
                        <button
                          type="button"
                          onClick={() => setOtDay(day.dayNumber)}
                          className={`h-7 sm:h-8 px-2 min-w-[32px] rounded-lg border flex items-center justify-center text-xs cursor-pointer ${
                            hasOT
                              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                              : 'border-purple-400 text-purple-600 bg-white hover:bg-purple-50 font-bold shadow-2xs'
                          }`}
                          title="Overtime"
                        >
                          OT
                        </button>
                      </>
                    )}
                  </div>

                  {/* 3 Dots Menu Button */}
                  <button
                    type="button"
                    onClick={() => setSheetDay(day.dayNumber)}
                    className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer shrink-0 ml-auto"
                    title="More Attendance Options"
                  >
                    <MoreVertical className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                <div
                  onClick={() => {
                    if (hasAdvance || hasNote) {
                      setViewDetailDay(day.dayNumber);
                    } else {
                      setAdvanceDay(day.dayNumber);
                    }
                  }}
                  className="flex items-center justify-between pl-3 pr-2 py-2.5 cursor-pointer hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-1 min-w-0 truncate">
                    {hasAdvance ? (
                      <span className="text-xs font-bold text-red-500">
                        ₹ {record.advanceAmount}
                      </span>
                    ) : (
                      <span className="text-xs font-normal text-slate-400">
                        ₹
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-auto mr-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </main>

      {/* 6. Docked Action Bar: Share to Worker on WhatsApp */}
      <div className="absolute bottom-4 left-0 right-0 z-30 px-4 pointer-events-none">
        <div className="max-w-md md:max-w-xl mx-auto">
          <button
            onClick={handleShareSlip}
            className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-[#25D366] to-[#1DA851] hover:from-[#1DA851] hover:to-[#25D366] active:scale-95 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-[0_12px_28px_rgba(37,211,102,0.45)] ring-2 ring-white/20 transition-all duration-300 cursor-pointer pointer-events-auto uppercase tracking-wide"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm5.79 13.99c-.24.67-1.4 1.28-1.95 1.33-.51.05-1.18.07-3.87-1.04-3.27-1.34-5.38-4.66-5.54-4.88-.16-.22-1.33-1.78-1.33-3.39 0-1.61.85-2.4 1.15-2.73.3-.33.65-.41.87-.41.22 0 .43 0 .62.01.2.01.47-.08.73.55.27.65.92 2.25 1 2.41.08.16.13.36.03.57-.1.22-.16.36-.31.54-.16.18-.34.4-.48.54-.16.16-.33.33-.14.65.19.33.84 1.39 1.8 2.24 1.23 1.1 2.27 1.44 2.59 1.6.33.16.52.14.71-.08.2-.22.85-.99 1.08-1.33.22-.34.45-.29.75-.18.3.11 1.9.9 2.23 1.06.33.16.55.24.63.38.08.14.08.82-.16 1.49z"/>
            </svg>
            <span>SHARE TO {firstName.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* 7. Month Selector Modal */}
      {showMonthModal && (
        <MonthSelectorModal
          isOpen={true}
          selectedMonth={selectedMonth}
          onSelectMonth={(m) => {
            setSelectedMonth(m);
            setShowMonthModal(false);
          }}
          onClose={() => setShowMonthModal(false)}
        />
      )}

      {/* 8. Attendance Sheet Modal (Screenshot 1: Mark Attendance) */}
      {sheetDay !== null && (
        <AttendanceSheet
          isOpen={true}
          workerName={worker.name}
          formattedDate={formatFullDateDisplay(selectedMonth, sheetDay)}
          dayNumber={sheetDay}
          currentStatus={
            worker.attendance[getDateKey(year, month, sheetDay)]?.status || 'UNMARKED'
          }
          hasOvertime={
            (worker.attendance[getDateKey(year, month, sheetDay)]?.overtimeHours || 0) > 0
          }
          overtimeHours={
            worker.attendance[getDateKey(year, month, sheetDay)]?.overtimeHours || 0
          }
          onSelectStatus={(status) => {
            setAttendance(worker.id, sheetDay, status, selectedMonth);
            setSheetDay(null);
          }}
          onOpenOvertime={() => {
            const currentDay = sheetDay;
            setSheetDay(null);
            setOtDay(currentDay);
          }}
          onClose={() => setSheetDay(null)}
        />
      )}

      {/* 9. Advance Modal */}
      {advanceDay !== null && (
        <AdvanceModal
          isOpen={true}
          workerName={worker.name}
          dayNumber={advanceDay}
          selectedMonth={selectedMonth}
          initialAdvance={
            worker.attendance[getDateKey(year, month, advanceDay)]?.advanceAmount || 0
          }
          initialNote={
            worker.attendance[getDateKey(year, month, advanceDay)]?.note || ''
          }
          initialPaymentMethod={
            worker.attendance[getDateKey(year, month, advanceDay)]?.paymentMethod || 'ONLINE'
          }
          onSave={(amt, note, pMode) => {
            const currentRec = worker.attendance[getDateKey(year, month, advanceDay)];
            updateDayDetails(
              worker.id,
              advanceDay,
              amt,
              note,
              currentRec?.overtimeHours || 0,
              currentRec?.overtimeRate || 0,
              selectedMonth,
              pMode
            );
            if (amt > 0) {
              setAdvanceConfirmation({
                type: "ADDED",
                amount: amt,
                workerName: worker.name
              });
            }
          }}
          onDelete={() => {
            const currentRec = worker.attendance[getDateKey(year, month, advanceDay)];
            updateDayDetails(
              worker.id,
              advanceDay,
              0,
              '',
              currentRec?.overtimeHours || 0,
              currentRec?.overtimeRate || 0,
              selectedMonth,
              'CASH'
            );
            setAdvanceConfirmation({
              type: "REMOVED",
              workerName: worker.name
            });
          }}
          onClose={() => setAdvanceDay(null)}
        />
      )}

      {/* 10. Overtime Modal (Screenshot 3 & 4) */}
      {otDay !== null && (
        <OvertimeModal
          isOpen={true}
          workerName={worker.name}
          formattedDate={formatFullDateDisplay(selectedMonth, otDay)}
          dayNumber={otDay}
          selectedMonth={selectedMonth}
          initialHours={
            worker.attendance[getDateKey(year, month, otDay)]?.overtimeHours || 0
          }
          initialRate={
            worker.attendance[getDateKey(year, month, otDay)]?.overtimeRate || 0
          }
          onSave={(hours, rate, amount) => {
            const currentRec = worker.attendance[getDateKey(year, month, otDay)];
            updateDayDetails(
              worker.id,
              otDay,
              currentRec?.advanceAmount || 0,
              currentRec?.note || '',
              hours,
              rate,
              selectedMonth,
              currentRec?.paymentMethod || 'CASH',
              amount
            );
          }}
          onDelete={() => {
            const currentRec = worker.attendance[getDateKey(year, month, otDay)];
            updateDayDetails(
              worker.id,
              otDay,
              currentRec?.advanceAmount || 0,
              currentRec?.note || '',
              0,
              0,
              selectedMonth,
              currentRec?.paymentMethod || 'CASH',
              0
            );
          }}
          onClose={() => setOtDay(null)}
        />
      )}

      {/* 11. Day Advance & Note Detail Modal */}
      {viewDetailDay !== null && (
        <DayAdvanceDetailModal
          isOpen={true}
          dayNumber={viewDetailDay}
          selectedMonth={selectedMonth}
          workerName={worker.name}
          status={
            worker.attendance[getDateKey(year, month, viewDetailDay)]?.status || 'UNMARKED'
          }
          advanceAmount={
            worker.attendance[getDateKey(year, month, viewDetailDay)]?.advanceAmount || 0
          }
          paymentMethod={
            worker.attendance[getDateKey(year, month, viewDetailDay)]?.paymentMethod || 'CASH'
          }
          note={
            worker.attendance[getDateKey(year, month, viewDetailDay)]?.note || ''
          }
          onEdit={() => {
            const d = viewDetailDay;
            setViewDetailDay(null);
            setAdvanceDay(d);
          }}
          onDelete={() => {
            const currentRec = worker.attendance[getDateKey(year, month, viewDetailDay)];
            updateDayDetails(
              worker.id,
              viewDetailDay,
              0,
              '',
              currentRec?.overtimeHours || 0,
              currentRec?.overtimeRate || 0,
              selectedMonth,
              'CASH'
            );
            setViewDetailDay(null);
            setAdvanceConfirmation({
              type: "REMOVED",
              workerName: worker.name
            });
          }}
          onClose={() => setViewDetailDay(null)}
        />
      )}

      {/* 12. Full-Screen Animated Advance Confirmation Screen */}
      {advanceConfirmation !== null && (
        <AdvanceConfirmation
          confirmation={advanceConfirmation}
          onDismiss={() => setAdvanceConfirmation(null)}
        />
      )}

      {/* 12. Edit Labor Details Modal */}
      {showEditWorkerModal && (
        <EditWorkerModal
          worker={worker}
          onSave={(name, phone, wage, sType) => {
            updateWorker({
              ...worker,
              name,
              phoneNumber: phone,
              dailyWage: wage,
              salaryType: sType
            });
            setShowEditWorkerModal(false);
          }}
          onDelete={() => {
            setShowEditWorkerModal(false);
            setShowDeleteWorkerModal(true);
          }}
          onClose={() => setShowEditWorkerModal(false)}
        />
      )}

      {/* 13. Delete Confirmation Modal (Swipe to delete) */}
      {showDeleteWorkerModal && (
        <SwipeToDeleteSheet
          isOpen={true}
          workerName={worker.name}
          onConfirm={() => {
            deleteWorker(worker.id);
            setShowDeleteWorkerModal(false);
            navigateTo({ type: 'HOME' });
          }}
          onClose={() => setShowDeleteWorkerModal(false)}
        />
      )}
    </div>
  );
};

// Edit Labor Modal Subcomponent (Matching Screenshot 3)
const EditWorkerModal: React.FC<{
  worker: LaborWorker;
  onSave: (name: string, phone: string, wage: number, salaryType: SalaryType) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ worker, onSave, onClose }) => {
  const [name, setName] = useState(worker.name);
  const [wageStr, setWageStr] = useState(String(worker.dailyWage));
  const [salaryType, setSalaryType] = useState<SalaryType>(worker.salaryType || 'Daily');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), worker.phoneNumber || '', parseFloat(wageStr) || 0, salaryType);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl relative space-y-4 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Row: User Avatar Icon + Title + Round Close X */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF3FE] text-[#1862D6] flex items-center justify-center shrink-0">
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">
              Edit Profile
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F0F2F5] hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Field 1: Staff name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Staff name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Staff Name"
              className="w-full px-5 py-3.5 bg-[#F7F8FA] border border-slate-200/70 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#1862D6] shadow-2xs transition"
            />
          </div>

          {/* Field 2: Salary type (Daily / Monthly radio pills) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Salary type
            </label>
            <div className="flex items-center gap-3">
              {/* Daily Radio Option */}
              <button
                type="button"
                onClick={() => setSalaryType('Daily')}
                className={`flex-1 py-3 px-4 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition shadow-2xs cursor-pointer ${
                  salaryType === 'Daily'
                    ? 'bg-[#F2FBF7] border-2 border-[#00966D] text-[#00966D]'
                    : 'bg-[#F7F8FA] border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    salaryType === 'Daily' ? 'border-[#00966D]' : 'border-slate-300'
                  }`}
                >
                  {salaryType === 'Daily' && (
                    <div className="w-2 h-2 rounded-full bg-[#00966D]" />
                  )}
                </div>
                <span>Daily</span>
              </button>

              {/* Monthly Radio Option */}
              <button
                type="button"
                onClick={() => setSalaryType('Monthly')}
                className={`flex-1 py-3 px-4 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition shadow-2xs cursor-pointer ${
                  salaryType === 'Monthly'
                    ? 'bg-[#F2FBF7] border-2 border-[#00966D] text-[#00966D]'
                    : 'bg-[#F7F8FA] border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    salaryType === 'Monthly' ? 'border-[#00966D]' : 'border-slate-300'
                  }`}
                >
                  {salaryType === 'Monthly' && (
                    <div className="w-2 h-2 rounded-full bg-[#00966D]" />
                  )}
                </div>
                <span>Monthly</span>
              </button>
            </div>
          </div>

          {/* Field 3: Enter salary amount */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Enter salary amount
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-900 pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                value={wageStr}
                onChange={(e) => setWageStr(e.target.value)}
                placeholder="800"
                className="w-full pl-9 pr-5 py-3.5 bg-[#F7F8FA] border border-slate-200/70 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#1862D6] shadow-2xs transition"
              />
            </div>
          </div>

          {/* Action Button: Save */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-full shadow-md transition cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
