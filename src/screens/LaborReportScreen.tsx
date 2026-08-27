import React from 'react';
import { ArrowLeft, Calendar, Phone, FileText, Download } from 'lucide-react';
import { useLabor } from '../store/laborStore';
import { calculateMonthStats } from '../utils/stats';
import { downloadWorkerSlipPdf, generateWorkerReportText } from '../utils/pdfGenerator';
import { getAvatarBgWithOpacity } from '../utils/avatar';
import { universalShare, copyToClipboard } from '../services/nativeBridge';

interface LaborReportScreenProps {
  workerId: string;
}

export const LaborReportScreen: React.FC<LaborReportScreenProps> = ({ workerId }) => {
  const { workers, selectedMonth, navigateTo, showToast } = useLabor();

  const worker = workers.find((w) => w.id === workerId);

  if (!worker) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <p className="text-slate-600 mb-4">Staff member not found.</p>
        <button
          onClick={() => navigateTo({ type: 'HOME' })}
          className="px-4 py-2 bg-[#1862D6] text-white rounded-xl text-xs font-bold shadow-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  const stats = calculateMonthStats(worker, selectedMonth);

  const getFullMonthName = (mStr: string) => {
    const parts = mStr.split(' ');
    const m = parts[0] || 'Aug';
    const y = parts[1] || '2026';
    const monthMap: Record<string, string> = {
      Jan: 'January',
      Feb: 'February',
      Mar: 'March',
      Apr: 'April',
      May: 'May',
      Jun: 'June',
      Jul: 'July',
      Aug: 'August',
      Sep: 'September',
      Oct: 'October',
      Nov: 'November',
      Dec: 'December'
    };
    return `${monthMap[m] || m} ${y}`;
  };

  const handleSharePdf = async () => {
    try {
      showToast('Generating PDF Wage Slip...');
      downloadWorkerSlipPdf(worker, selectedMonth);
      
      const text = generateWorkerReportText(worker, selectedMonth, stats);
      if (navigator.share) {
        navigator.share({
          title: `${worker.name} - ${selectedMonth} Salary Report`,
          text: text
        }).catch(() => {});
      }
    } catch {
      showToast('PDF downloaded successfully');
    }
  };

  const handleWhatsAppShare = async () => {
    const text = generateWorkerReportText(worker, selectedMonth, stats);
    const shared = await universalShare({
      title: `${worker.name} - Attendance & Wage Report`,
      text: text,
      dialogTitle: `Share Report for ${worker.name}`
    });
    if (!shared) {
      await copyToClipboard(text);
      showToast('Report copied to clipboard!');
      const cleanPhone = (worker.phoneNumber || '').replace(/\D/g, '');
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const firstLetter = worker.name.trim().charAt(0).toUpperCase() || '?';
  const wageDisplay = `₹${worker.dailyWage} / ${worker.salaryType || 'Daily'}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 selection:bg-[#1862D6] selection:text-white">
      {/* 1. Header Bar with Translucency */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-md md:max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo({ type: 'LABOR_DETAIL', workerId: worker.id })}
              className="p-1.5 -ml-1 text-slate-800 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Monthly Salary Report
            </h1>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50/80 border border-blue-200/60 rounded-xl text-xs font-bold text-[#1862D6]">
            <Calendar className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{selectedMonth}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-md md:max-w-xl mx-auto px-4 pt-4 space-y-3.5">
        {/* 2. Worker Profile & Period Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-slate-900 border border-slate-200/80 shadow-2xs shrink-0"
                style={{ backgroundColor: getAvatarBgWithOpacity(worker.avatarColorHex, 0.12) }}
              >
                {firstLetter}
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {worker.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{worker.phoneNumber || 'No phone number'}</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 bg-slate-100/90 border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-700">
                  <span>Rate:</span>
                  <span className="text-[#1862D6]">{wageDisplay}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Period
              </span>
              <span className="text-xs font-bold text-slate-900 block mt-0.5">
                {getFullMonthName(selectedMonth)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Attendance KPIs Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Attendance Summary
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              Total Recorded Days
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* Present */}
            <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[11px] text-[#16A34A] font-semibold block mb-0.5">
                Present
              </span>
              <span className="text-xl font-black text-[#15803D] block">
                {stats.presentCount.toFixed(0)}
              </span>
            </div>

            {/* Absent */}
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[11px] text-[#DC2626] font-semibold block mb-0.5">
                Absent
              </span>
              <span className="text-xl font-black text-[#B91C1C] block">
                {stats.absentCount.toFixed(0)}
              </span>
            </div>

            {/* Overtime */}
            <div className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[11px] text-[#7E22CE] font-semibold block mb-0.5">
                Overtime
              </span>
              <span className="text-xl font-black text-[#6B21A8] block">
                {stats.overtimeHours}h
              </span>
            </div>

            {/* Half Day */}
            <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                Half Day
              </span>
              <span className="text-xl font-black text-slate-800 block">
                {stats.halfDayCount.toFixed(0)}
              </span>
            </div>

            {/* P + 1/2 */}
            <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                P + 1/2
              </span>
              <span className="text-xl font-black text-slate-800 block">
                {stats.presentHalfCount.toFixed(1)}
              </span>
            </div>

            {/* P + P */}
            <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                P + P
              </span>
              <span className="text-xl font-black text-slate-800 block">
                {stats.doubleCount.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Payment Breakdown & Net Balance Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Payment Breakdown
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              Salary Details
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Total Earnings */}
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="font-medium text-slate-600">
                Total Gross Earnings
              </span>
              <span className="font-bold text-slate-900">
                ₹ {stats.grossWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Advance Deducted */}
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="font-medium text-slate-600">
                Advance Amount Deducted
              </span>
              <span className="font-bold text-[#E02D3C]">
                - ₹ {stats.totalAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Net Payable Banner */}
          <div className="bg-gradient-to-r from-[#1862D6] to-[#1456bf] text-white rounded-xl p-4 flex items-center justify-between shadow-md shadow-blue-500/20">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100 block">
                Net Payable Balance
              </span>
              <span className="text-xs font-medium text-blue-100">
                (Gross − Advance)
              </span>
            </div>

            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                ₹ {stats.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Floating Bottom Action Buttons */}
      <div className="fixed bottom-6 left-0 right-0 max-w-md md:max-w-xl mx-auto px-4 z-30">
        <div className="flex items-center gap-3">
          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="p-4 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-bold rounded-full shadow-lg shadow-emerald-500/25 flex items-center justify-center transition cursor-pointer shrink-0"
            title="Share on WhatsApp"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm5.79 13.99c-.24.67-1.4 1.28-1.95 1.33-.51.05-1.18.07-3.87-1.04-3.27-1.34-5.38-4.66-5.54-4.88-.16-.22-1.33-1.78-1.33-3.39 0-1.61.85-2.4 1.15-2.73.3-.33.65-.41.87-.41.22 0 .43 0 .62.01.2.01.47-.08.73.55.27.65.92 2.25 1 2.41.08.16.13.36.03.57-.1.22-.16.36-.31.54-.16.18-.34.4-.48.54-.16.16-.33.33-.14.65.19.33.84 1.39 1.8 2.24 1.23 1.1 2.27 1.44 2.59 1.6.33.16.52.14.71-.08.2-.22.85-.99 1.08-1.33.22-.34.45-.29.75-.18.3.11 1.9.9 2.23 1.06.33.16.55.24.63.38.08.14.08.82-.16 1.49z"/>
            </svg>
          </button>

          {/* Share PDF Primary Button */}
          <button
            type="button"
            onClick={handleSharePdf}
            className="flex-1 py-4 bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-full shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-center transition cursor-pointer tracking-wide"
          >
            <Download className="w-4 h-4 stroke-[2.4]" />
            <span>Download & Share PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

