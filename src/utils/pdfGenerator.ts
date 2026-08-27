import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LaborWorker, CashTransaction, WorkerMonthStats } from '../types';
import { calculateMonthStats } from './stats';
import { parseYearMonth, getMonthDays, MONTHS_FULL } from './calendar';
import { saveAndSharePdf } from '../services/nativeBridge';

// ============================================================================
// SHARED DESIGN TOKENS & UTILITIES
// ============================================================================

const PAGE_WIDTH = 595.28; // Standard A4 Width (pt)
const PAGE_HEIGHT = 841.89; // Standard A4 Height (pt)
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 515.28 pt

function formatPdfTimestamp(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = monthNames[date.getMonth()];
  const yr = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  const hh = String(hours).padStart(2, '0');

  return `${day} ${m} ${yr}, ${hh}:${minutes} ${ampm}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Universal Branding Footer (drawn on every page)
 */
function applyUniversalFooters(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  const timestampStr = formatPdfTimestamp();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // 1px top border line at PAGE_HEIGHT - 60pt (781.89pt)
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(1);
    doc.line(MARGIN_LEFT, PAGE_HEIGHT - 60, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 60);

    const footerY = PAGE_HEIGHT - 40;

    // Left Side: Blue App Logo [ L ] (14pt x 14pt rounded square)
    doc.setFillColor(22, 86, 214); // #1656D6
    doc.roundedRect(MARGIN_LEFT, footerY - 10, 14, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('L', MARGIN_LEFT + 4.5, footerY);

    // Left Side Text: "Laborbook App"
    doc.setTextColor(15, 23, 42); // #0F172A
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Laborbook App', MARGIN_LEFT + 20, footerY);

    // Right Side: Timestamp & Pagination
    doc.setTextColor(148, 163, 184); // #94A3B8
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${timestampStr}  |  Page ${i} of ${totalPages}`,
      PAGE_WIDTH - MARGIN_RIGHT,
      footerY,
      { align: 'right' }
    );
  }
}

// ============================================================================
// ============================================================================
// 1. INDIVIDUAL WORKER WAGE SLIP (Worker_Report_[Name].pdf)
// ============================================================================

export function generateWorkerReportText(
  worker: LaborWorker,
  monthStr: string,
  stats: WorkerMonthStats
): string {
  const { year, month } = parseYearMonth(monthStr);
  const fullMonth = `${MONTHS_FULL[month - 1] || 'August'} ${year}`;

  return `${fullMonth} Report
Name: ${worker.name}
Phone number: ${worker.phoneNumber || 'N/A'}

Attendance Summary
Present (P): ${stats.presentCount}  Absent (A): ${stats.absentCount}
Overtime (OT): ${stats.overtimeHours}h  Half Day (½): ${stats.halfDayCount}
P + 1/2: ${stats.presentHalfCount}  P+P: ${stats.doubleCount}

Payment Summary
Advance Amount: ${stats.totalAdvance.toFixed(2)}  Total Earnings: ${stats.grossWage.toFixed(2)}`;
}

export function generateWorkerReportPdf(worker: LaborWorker, monthStr: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const stats = calculateMonthStats(worker, monthStr);
  const { year, month } = parseYearMonth(monthStr);
  const fullMonth = `${MONTHS_FULL[month - 1] || 'August'} ${year}`;

  // 1. Top Header
  doc.setFillColor(22, 86, 214); // #1656D6 Brand Blue
  doc.rect(MARGIN_LEFT, 50, 6, 28, 'F');

  doc.setTextColor(15, 23, 42); // #0F172A
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fullMonth} Report`, MARGIN_LEFT + 14, 72);

  // 2. Worker Details Card
  let curY = 96;
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setLineWidth(1);
  doc.roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, 60, 8, 8, 'FD');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${worker.name}`, MARGIN_LEFT + 16, curY + 24);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // #64748B
  doc.text(`Phone number: ${worker.phoneNumber || 'N/A'}`, MARGIN_LEFT + 16, curY + 45);

  // 3. Attendance Summary Section
  curY = 175;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Attendance Summary', MARGIN_LEFT, curY);

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN_LEFT, curY + 6, PAGE_WIDTH - MARGIN_RIGHT, curY + 6);

  curY += 18;
  const col1X = MARGIN_LEFT + 14;
  const col2X = MARGIN_LEFT + 260;
  const boxH = 92;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, boxH, 8, 8, 'FD');

  // Row 1: Present / Absent
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Present (P):', col1X, curY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.presentCount}`, col1X + 90, curY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Absent (A):', col2X, curY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.absentCount}`, col2X + 90, curY + 24);

  // Row 2: Overtime / Half Day
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Overtime (OT):', col1X, curY + 50);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.overtimeHours}h`, col1X + 90, curY + 50);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Half Day (½):', col2X, curY + 50);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.halfDayCount}`, col2X + 90, curY + 50);

  // Row 3: P + 1/2 / P+P
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('P + 1/2:', col1X, curY + 76);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.presentHalfCount || 0}`, col1X + 90, curY + 76);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('P+P:', col2X, curY + 76);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.doubleCount || 0}`, col2X + 90, curY + 76);

  // 4. Payment Summary Section
  curY += boxH + 24;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Payment Summary', MARGIN_LEFT, curY);

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN_LEFT, curY + 6, PAGE_WIDTH - MARGIN_RIGHT, curY + 6);

  curY += 18;
  const payBoxH = 68;
  doc.setFillColor(240, 249, 255); // Light cyan/blue background #F0F9FF
  doc.setDrawColor(186, 230, 253); // #BAE6FD
  doc.roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, payBoxH, 8, 8, 'FD');

  // Advance Amount
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Advance Amount:', col1X, curY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38); // Red
  doc.text(`Rs. ${stats.totalAdvance.toFixed(2)}`, col1X, curY + 48);

  // Total Earnings
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Earnings:', col2X, curY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52); // Green
  doc.text(`Rs. ${stats.grossWage.toFixed(2)}`, col2X, curY + 48);

  // Apply Universal Branding Footer
  applyUniversalFooters(doc);

  const cleanName = worker.name.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanMonth = monthStr.replace(/[^a-zA-Z0-9]/g, '_');
  saveAndSharePdf(doc, `Worker_Report_${cleanName}_${cleanMonth}.pdf`, `${worker.name} Wage Slip`);
}

// Alias for existing callers
export const downloadWorkerSlipPdf = generateWorkerReportPdf;

// ============================================================================
// 2. CASH BOOK STATEMENT / LEDGER (Cash_Book_Ledger.pdf)
// ============================================================================

export function generateCashBookReportPdf(
  transactions: CashTransaction[],
  startDate: string,
  endDate: string,
  customTotalIn?: number,
  customTotalOut?: number,
  customBalance?: number
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  // Calculate totals if not provided
  let totalIn = customTotalIn ?? 0;
  let totalOut = customTotalOut ?? 0;

  if (customTotalIn === undefined || customTotalOut === undefined) {
    totalIn = 0;
    totalOut = 0;
    transactions.forEach((t) => {
      if (t.type === 'CASH_IN') totalIn += t.amount;
      else totalOut += t.amount;
    });
  }

  const balance = customBalance ?? (totalIn - totalOut);

  // 1. Top Header with 5pt Accent Blue Stripe on Left
  doc.setFillColor(22, 86, 214); // #1656D6
  doc.rect(MARGIN_LEFT, 48, 5, 34, 'F');

  doc.setTextColor(15, 23, 42); // #0F172A
  doc.setFontSize(21);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH BOOK STATEMENT', MARGIN_LEFT + 14, 66);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // #475569
  doc.text(`Period: ${startDate} - ${endDate}`, MARGIN_LEFT + 14, 81);

  // 2. 3 Summary KPI Cards (Equal Width in a Row)
  const kpiY = 96;
  const kpiGap = 10;
  const cardW = (CONTENT_WIDTH - kpiGap * 2) / 3; // ~165 pt
  const cardH = 50;

  // Card 1: TOTAL CASH IN (Green #E8F8F0)
  doc.setFillColor(232, 248, 240); // #E8F8F0
  doc.setDrawColor(167, 243, 208); // #A7F3D0
  doc.setLineWidth(1);
  doc.roundedRect(MARGIN_LEFT, kpiY, cardW, cardH, 6, 6, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 158, 90); // #1E9E5A
  doc.text('TOTAL CASH IN', MARGIN_LEFT + 12, kpiY + 18);

  doc.setFontSize(14);
  doc.text(`Rs. ${formatCurrency(totalIn)}`, MARGIN_LEFT + 12, kpiY + 38);

  // Card 2: TOTAL CASH OUT (Red #FDE8E8)
  const card2X = MARGIN_LEFT + cardW + kpiGap;
  doc.setFillColor(253, 232, 232); // #FDE8E8
  doc.setDrawColor(254, 202, 202); // #FECACA
  doc.roundedRect(card2X, kpiY, cardW, cardH, 6, 6, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(226, 62, 62); // #E23E3E
  doc.text('TOTAL CASH OUT', card2X + 12, kpiY + 18);

  doc.setFontSize(14);
  doc.text(`Rs. ${formatCurrency(totalOut)}`, card2X + 12, kpiY + 38);

  const card3X = card2X + cardW + kpiGap;
  const isNetPositive = balance >= 0;
  if (isNetPositive) {
    doc.setFillColor(234, 241, 255); // #EAF1FF
    doc.setDrawColor(191, 219, 254); // #BFDBFE
  } else {
    doc.setFillColor(253, 232, 232); // #FDE8E8
    doc.setDrawColor(254, 202, 202); // #FECACA
  }
  doc.setLineWidth(1);
  doc.roundedRect(card3X, kpiY, cardW, cardH, 6, 6, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  if (isNetPositive) {
    doc.setTextColor(22, 86, 214); // #1656D6
  } else {
    doc.setTextColor(226, 62, 62); // #E23E3E
  }
  doc.text('NET BALANCE', card3X + 12, kpiY + 18);

  doc.setFontSize(14);
  doc.text(`Rs. ${formatCurrency(balance)}`, card3X + 12, kpiY + 38);

  // 3. Transactions Table
  const tableRows = transactions.map((t) => {
    const isCashIn = t.type === 'CASH_IN';
    const amountStr = `Rs. ${formatCurrency(t.amount)}`;

    return [
      t.fullDate || t.dateDisplay || '-',
      isCashIn ? 'CASH IN' : 'CASH OUT',
      t.paymentMethod || 'CASH',
      t.notes || 'General Entry',
      amountStr
    ];
  });

  autoTable(doc, {
    startY: 162,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: 70 },
    head: [['Date', 'Type', 'Mode', 'Notes / Remarks', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Dark Header #0F172A
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      cellPadding: 7
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'center' },
      2: { cellWidth: 65, halign: 'center' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 95, halign: 'right', fontStyle: 'bold' }
    },
    foot: [[
      'SUMMARY TOTAL',
      '',
      '',
      `${transactions.length} Transactions logged`,
      `Net: Rs. ${formatCurrency(balance)}`
    ]],
    footStyles: {
      fillColor: [241, 245, 249], // #F1F5F9
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9.5
    },
    didDrawCell: (data) => {
      // Custom styling for Type and Mode cells
      if (data.section === 'body' && data.column.index === 1) {
        const text = String(data.cell.raw);
        const isCashIn = text === 'CASH IN';
        doc.setTextColor(isCashIn ? 30 : 226, isCashIn ? 158 : 62, isCashIn ? 90 : 62);
      } else if (data.section === 'body' && data.column.index === 4) {
        const row = transactions[data.row.index];
        const isCashIn = row?.type === 'CASH_IN';
        doc.setTextColor(isCashIn ? 30 : 226, isCashIn ? 158 : 62, isCashIn ? 90 : 62);
      }
    }
  });

  // Universal Footer
  applyUniversalFooters(doc);

  const cleanStart = startDate.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanEnd = endDate.replace(/[^a-zA-Z0-9]/g, '_');
  saveAndSharePdf(doc, `Cash_Book_Ledger_${cleanStart}_to_${cleanEnd}.pdf`, 'Cash Book Ledger Report');
}

// Alias for existing callers
export const downloadCashBookReportPdf = generateCashBookReportPdf;

// ============================================================================
// 3. MONTHLY STAFF REPORT / BATCH SUMMARY (Monthly_Staff_Report.pdf)
// ============================================================================

export function generateBatchStaffReportPdf(workers: LaborWorker[], monthStr: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const { year, month } = parseYearMonth(monthStr);
  const fullMonth = `${MONTHS_FULL[month - 1] || 'August'} ${year}`;

  // 1. Top Header
  doc.setTextColor(30, 41, 59); // #1E293B
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY STAFF REPORT', MARGIN_LEFT, 65);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // #64748B
  doc.text(`Month: ${fullMonth}`, MARGIN_LEFT, 82);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Staff: ${workers.length}`, PAGE_WIDTH - MARGIN_RIGHT, 82, { align: 'right' });

  // Calculate Grand Totals
  let totalGross = 0;
  let totalAdvance = 0;
  let totalNet = 0;

  const tableRows = workers.map((w) => {
    const stats = calculateMonthStats(w, monthStr);
    totalGross += stats.grossWage;
    totalAdvance += stats.totalAdvance;
    totalNet += stats.balance;

    const isMonthly = (w.salaryType || '').toLowerCase() === 'monthly';
    const rateDisplay = isMonthly ? `${formatCurrency(w.dailyWage)}/m` : `${formatCurrency(w.dailyWage)}/d`;
    const attendSummary = `${stats.presentCount} P | ${stats.absentCount} A | ${stats.overtimeHours}h`;
    const advanceDisplay = stats.totalAdvance > 0 ? formatCurrency(stats.totalAdvance) : '0';
    const netDisplay = `Rs. ${formatCurrency(stats.balance)}`;

    return [
      w.name,
      rateDisplay,
      attendSummary,
      advanceDisplay,
      netDisplay
    ];
  });

  autoTable(doc, {
    startY: 100,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: 90 },
    head: [['Worker', 'Rate', 'Attend. (P / A / OT)', 'Advance', 'Net Pay']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // #0F172A
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      cellPadding: 6
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 5.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 120 },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 100, halign: 'right', fontStyle: 'bold', textColor: [22, 86, 214] }
    },
    foot: [[
      'GRAND TOTALS',
      '',
      '',
      `Rs. ${formatCurrency(totalAdvance)}`,
      `Rs. ${formatCurrency(totalNet)}`
    ]],
    footStyles: {
      fillColor: [224, 242, 254], // #E0F2FE
      textColor: [3, 105, 161],
      fontStyle: 'bold',
      fontSize: 9.5
    }
  });

  // Universal Footer
  applyUniversalFooters(doc);

  const cleanMonth = monthStr.replace(/[^a-zA-Z0-9]/g, '_');
  saveAndSharePdf(doc, `Monthly_Staff_Report_${cleanMonth}.pdf`, `Monthly Staff Report (${monthStr})`);
}

// Alias for existing callers
export const downloadBatchRosterPdf = generateBatchStaffReportPdf;

