import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Users,
  Wallet,
  FileText,
  ArrowLeft,
  Search,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useLabor } from '../store/laborStore';
import {
  downloadBatchRosterPdf,
  downloadWorkerSlipPdf,
  downloadCashBookReportPdf
} from '../utils/pdfGenerator';
import { getDateKey, getTodayYear, getTodayMonth, getTodayDay } from '../utils/calendar';
import { getAvatarBgWithOpacity } from '../utils/avatar';

export const BatchPdfHubScreen: React.FC = () => {
  const {
    workers,
    transactions,
    selectedMonth,
    exportBackup,
    showToast,
    navigateTo,
    userProfile
  } = useLabor();

  const lang = userProfile.language || 'en';
  const currentYear = getTodayYear();
  const currentMonth = getTodayMonth();
  const todayDay = getTodayDay();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.phoneNumber && w.phoneNumber.includes(searchQuery))
  );

  const handleDownloadRoster = () => {
    if (workers.length === 0) {
      showToast(lang === 'hi' ? 'कोई वर्कर उपलब्ध नहीं है' : 'No staff members to generate roster');
      return;
    }
    downloadBatchRosterPdf(workers, selectedMonth);
    showToast(lang === 'hi' ? 'स्टाफ रोस्टर PDF डाउनलोड हो गया!' : 'Monthly Staff Roster PDF downloaded!');
  };

  const handleDownloadCashBook = () => {
    const startDate = getDateKey(currentYear, currentMonth, 1);
    const endDate = getDateKey(currentYear, currentMonth, todayDay);
    let inSum = 0;
    let outSum = 0;
    for (const t of transactions) {
      if (t.type === 'CASH_IN') inSum += t.amount || 0;
      else outSum += t.amount || 0;
    }
    downloadCashBookReportPdf(transactions, startDate, endDate, inSum, outSum, inSum - outSum);
    showToast(lang === 'hi' ? 'कैश बुक PDF डाउनलोड हो गया!' : 'Cash Book PDF Report downloaded!');
  };

  const handleExportCsv = () => {
    exportBackup();
    showToast(lang === 'hi' ? 'Excel / CSV फ़ाइल डाउनलोड हो गई!' : 'Clean Excel CSV downloaded!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 pt-1 px-3 sm:px-4 max-w-3xl mx-auto space-y-4">
      {/* 1. Header with Back Button */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo({ type: 'SETTINGS' })}
            className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base leading-tight">
              {lang === 'hi' ? 'PDF और सैलरी स्लिप हब' : 'Reports & PDF Hub'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {lang === 'hi' ? 'सैलरी स्लिप, मासिक रजिस्टर और एक्सेल रिपोर्ट' : 'Salary slips, monthly rosters & financial statements'}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-[#1656D6] bg-blue-50 border border-blue-200/70 px-2.5 py-1 rounded-xl shrink-0">
          {selectedMonth}
        </span>
      </div>

      {/* 2. Core Download Action Cards */}
      <div className="grid sm:grid-cols-3 gap-3">
        {/* Card 1: All Workers Monthly Roster */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between hover:shadow-xs transition">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1656D6] flex items-center justify-center">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">
                {lang === 'hi' ? 'मासिक स्टाफ रजिस्टर' : 'Monthly Staff Roster'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                {lang === 'hi'
                  ? `सभी ${workers.length} वर्कर की हाजिरी, OT और कुल सैलरी`
                  : `Complete table of all ${workers.length} staff attendance & wages`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadRoster}
            className="mt-4 w-full py-2.5 px-3 bg-[#1656D6] hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'hi' ? 'रोस्टर PDF डाउनलोड' : 'Download Roster'}</span>
          </button>
        </div>

        {/* Card 2: Cash Book Statement */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between hover:shadow-xs transition">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">
                {lang === 'hi' ? 'कैश बुक स्टेटमेंट' : 'Cash Book Statement'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                {lang === 'hi'
                  ? `${transactions.length} कैश इन/आउट एंट्रीज और कुल बैलेंस`
                  : `${transactions.length} cash in/out entries with net balance`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadCashBook}
            className="mt-4 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'hi' ? 'कैश बुक PDF' : 'Download Cash Book'}</span>
          </button>
        </div>

        {/* Card 3: Master Excel CSV */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between hover:shadow-xs transition">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">
                {lang === 'hi' ? 'एक्सेल / CSV बैकअप' : 'Excel / CSV Report'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                {lang === 'hi'
                  ? 'साफ-सुथरी एक्सेल शीट (वर्कर, हाजिरी और पेमेंट)'
                  : 'Structured clean spreadsheet for Excel / Google Sheets'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="mt-4 w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'hi' ? 'Excel CSV डाउनलोड' : 'Download Excel'}</span>
          </button>
        </div>
      </div>

      {/* 3. Individual Worker Salary Slips List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Section Header with Search */}
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              {lang === 'hi' ? 'व्यक्तिगत सैलरी स्लिप (PDF)' : 'Individual Worker Salary Slips'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {workers.length} {lang === 'hi' ? 'वर्कर उपलब्ध हैं' : 'workers available for'} ({selectedMonth})
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={lang === 'hi' ? 'वर्कर खोजें...' : 'Search worker...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1656D6] transition"
            />
          </div>
        </div>

        {/* Workers List */}
        {filteredWorkers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-400 font-medium">
              {workers.length === 0
                ? (lang === 'hi' ? 'कोई वर्कर नहीं है' : 'No staff members added yet')
                : (lang === 'hi' ? 'कोई मेल नहीं मिला' : 'No staff found matching search')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredWorkers.map((w) => (
              <div
                key={w.id}
                className="p-3 sm:px-4 flex items-center justify-between hover:bg-slate-50/80 transition gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-slate-800 text-xs shrink-0 shadow-2xs border border-slate-200/60"
                    style={{ backgroundColor: getAvatarBgWithOpacity(w.avatarColorHex, 0.12) }}
                  >
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm block truncate leading-tight">
                      {w.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium truncate block mt-0.5">
                      {w.phoneNumber || 'No phone'} • ₹{w.dailyWage}/{w.salaryType === 'Monthly' ? 'mo' : 'day'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => navigateTo({ type: 'LABOR_REPORT', workerId: w.id })}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <span>{lang === 'hi' ? 'देखें' : 'View'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Direct PDF Download */}
                  <button
                    type="button"
                    onClick={() => {
                      downloadWorkerSlipPdf(w, selectedMonth);
                      showToast(lang === 'hi' ? `${w.name} की PDF डाउनलोड हो गई` : `Downloaded slip for ${w.name}`);
                    }}
                    className="p-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-[#1656D6] rounded-xl transition cursor-pointer shadow-2xs"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
