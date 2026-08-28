import React, { useState, useMemo } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useLabor } from '../store/laborStore';
import { getDateKey, getTodayYear, getTodayMonth, getTodayDay, parseYearMonth } from '../utils/calendar';
import { downloadCashBookReportPdf } from '../utils/pdfGenerator';
import { universalShare, copyToClipboard } from '../services/nativeBridge';

export const CashBookReportScreen: React.FC = () => {
  const { transactions, selectedMonth, navigateTo, showToast, userProfile } = useLabor();

  const { year, month } = parseYearMonth(selectedMonth);
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  const [startDate, setStartDate] = useState(getDateKey(year, month, 1));
  const [endDate, setEndDate] = useState(getDateKey(year, month, lastDayOfMonth));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Filter transactions between startDate and endDate
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = t.fullDate || t.dateDisplay;
      if (!d) return true;
      return d >= startDate && d <= endDate;
    }).sort((a, b) => {
      if (b.fullDate && a.fullDate && b.fullDate !== a.fullDate) {
        return b.fullDate.localeCompare(a.fullDate);
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [transactions, startDate, endDate]);

  const { totalIn, totalOut, netBalance } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    for (const t of filtered) {
      if (t.type === 'CASH_IN') inSum += t.amount || 0;
      else outSum += t.amount || 0;
    }
    return {
      totalIn: inSum,
      totalOut: outSum,
      netBalance: inSum - outSum
    };
  }, [filtered]);

  const formatPillDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayOfWeek = daysShort[dateObj.getDay()];
        const mShort = monthNames[dateObj.getMonth()];
        const yy = String(y).slice(-2);
        return `${dayOfWeek}, ${String(d).padStart(2, '0')} ${mShort} ${yy}`;
      }
    } catch {}
    return dateStr;
  };

  const parseTxDate = (dateStr?: string) => {
    if (!dateStr) return { day: '01', dayOfWeek: 'Day' };
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        day: String(d).padStart(2, '0'),
        dayOfWeek: daysShort[dateObj.getDay()] || 'Day'
      };
    }
    return { day: '01', dayOfWeek: 'Day' };
  };

  const generateReportSummaryText = () => {
    return `*CASH BOOK LEDGER REPORT*
📅 *Period:* ${startDate} to ${endDate}
🏢 *Business:* ${userProfile.businessName || 'LabourBook'}

*Summary:*
🟢 Total Cash In: Rs.${totalIn.toLocaleString('en-IN')}
🔴 Total Cash Out: Rs.${totalOut.toLocaleString('en-IN')}
───────────────────
🔵 *NET BALANCE:* Rs.${netBalance.toLocaleString('en-IN')}
📝 *Total Transactions:* ${filtered.length} entries

_Generated via Laborbook App_`;
  };

  const handleDownloadPdf = () => {
    try {
      showToast('Generating Cash Book PDF Report...');
      downloadCashBookReportPdf(filtered, startDate, endDate, totalIn, totalOut, netBalance);
    } catch {
      showToast('PDF downloaded successfully');
    }
  };

  const handleShareWhatsApp = async () => {
    // Sharing PDF directly as requested by user
    handleDownloadPdf();
  };

  return (
    <div className="min-h-screen bg-white pb-32 selection:bg-[#1862D6] selection:text-white">
      {/* 1. Top Header Bar Matching Screenshot */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-md md:max-w-xl mx-auto px-4 h-14 flex items-center">
          <button
            onClick={() => navigateTo({ type: 'CASH_BOOK' })}
            className="p-1 -ml-1 text-slate-900 hover:text-slate-600 transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 ml-3 tracking-tight">
            Cash Book Report
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-md md:max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* 2. Date Range Filter Pills Row Matching Screenshot */}
        <div className="grid grid-cols-2 gap-3">
          {/* Start Date Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStartPicker(!showStartPicker)}
              className="w-full py-3 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-900 stroke-[2] shrink-0" />
              <span className="truncate">{formatPillDate(startDate)}</span>
            </button>
            {showStartPicker && (
              <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xl">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setShowStartPicker(false);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-900 border rounded-lg focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* End Date Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEndPicker(!showEndPicker)}
              className="w-full py-3 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-900 stroke-[2] shrink-0" />
              <span className="truncate">{formatPillDate(endDate)}</span>
            </button>
            {showEndPicker && (
              <div className="absolute top-full right-0 mt-1.5 z-50 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xl">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setShowEndPicker(false);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-900 border rounded-lg focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. 3-Column Transactions Table (Exact Match to CashBook Grid) */}
        <div className="pt-1">
          {/* Table Header */}
          <div className="w-full">
            <div className="grid grid-cols-[19%_45%_36%] py-2 items-stretch border-y border-slate-300 bg-white text-[15px] font-black text-black select-none">
              <div className="border-r border-slate-300 flex items-center justify-center">Date</div>
              <div className="border-r border-slate-300 px-3 flex items-center">Notes</div>
              <div className="pl-3 flex items-center">₹ Amount</div>
            </div>
          </div>

          {/* Table Rows */}
          {filtered.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-100 mx-4 mt-2 rounded-xl">
              <p className="text-xs text-slate-400 font-medium">No transactions found for this date range.</p>
            </div>
          ) : (
            <div className="bg-white border-b border-slate-300 w-full">
              {filtered.map((tx, idx) => {
                const isCashIn = tx.type === 'CASH_IN';
                const { day, dayOfWeek } = parseTxDate(tx.fullDate || tx.dateDisplay);
                const isLast = idx === filtered.length - 1;

                return (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-[19%_45%_36%] items-stretch hover:bg-slate-50 transition ${
                      !isLast ? 'border-b border-slate-300' : ''
                    }`}
                  >
                    {/* Column 1: Date */}
                    <div className="border-r border-slate-300 py-1.5 flex flex-col justify-center items-center">
                      <span className="text-[17px] font-black text-black block leading-none">
                        {day}
                      </span>
                      <span className="text-[12px] text-slate-500 block leading-none mt-1">
                        {dayOfWeek}
                      </span>
                    </div>

                    {/* Column 2: Notes & Payment Mode */}
                    <div className="border-r border-slate-300 px-3 py-1.5 flex flex-col justify-center">
                      <span className="text-[15px] text-black font-semibold block leading-none line-clamp-1">
                        {tx.notes || (isCashIn ? 'Cash In' : 'Expense')}
                      </span>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wide block leading-none mt-1">
                        {tx.paymentMethod === 'ONLINE' ? 'UPI' : 'CASH'}
                      </span>
                    </div>

                    {/* Column 3: ₹ Amount */}
                    <div className="pl-3 pr-3 py-1.5 flex items-center justify-start">
                      <span
                        className={`text-[15px] font-bold ${
                          isCashIn ? 'text-[#28A745]' : 'text-[#DC3545]'
                        }`}
                      >
                        ₹{tx.amount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Fixed Action Buttons (Share PDF + WhatsApp Share) */}
      <div className="fixed bottom-6 left-0 right-0 max-w-md md:max-w-xl mx-auto px-4 z-30 flex items-center gap-3">
        {/* Left: Share PDF */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="flex-1 py-4 bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-full shadow-md text-center cursor-pointer transition tracking-wide"
        >
          Share PDF
        </button>

        {/* Right: WhatsApp Share */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex-1 py-4 bg-[#008069] hover:bg-emerald-800 active:scale-98 text-white font-bold text-sm rounded-full shadow-md flex items-center justify-center gap-2 text-center cursor-pointer transition tracking-wide"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm5.79 13.99c-.24.67-1.4 1.28-1.95 1.33-.51.05-1.18.07-3.87-1.04-3.27-1.34-5.38-4.66-5.54-4.88-.16-.22-1.33-1.78-1.33-3.39 0-1.61.85-2.4 1.15-2.73.3-.33.65-.41.87-.41.22 0 .43 0 .62.01.2.01.47-.08.73.55.27.65.92 2.25 1 2.41.08.16.13.36.03.57-.1.22-.16.36-.31.54-.16.18-.34.4-.48.54-.16.16-.33.33-.14.65.19.33.84 1.39 1.8 2.24 1.23 1.1 2.27 1.44 2.59 1.6.33.16.52.14.71-.08.2-.22.85-.99 1.08-1.33.22-.34.45-.29.75-.18.3.11 1.9.9 2.23 1.06.33.16.55.24.63.38.08.14.08.82-.16 1.49z"/>
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};

