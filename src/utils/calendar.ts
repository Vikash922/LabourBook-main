import { DayInfo } from '../types';

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getTodayYear(): number {
  return new Date().getFullYear();
}

export function getTodayMonth(): number {
  return new Date().getMonth() + 1; // 1-12
}

export function getTodayDay(): number {
  return new Date().getDate();
}

export function formatCurrentMonth(): string {
  const now = new Date();
  return `${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;
}

export function getDateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseYearMonth(monthStr: string): { year: number; month: number } {
  if (!monthStr || monthStr === "All Months") {
    return { year: getTodayYear(), month: getTodayMonth() };
  }

  // format could be "Aug 2026", "2026-08", "August 2026"
  if (monthStr.includes("-")) {
    const parts = monthStr.split("-");
    const y = parseInt(parts[0], 10) || getTodayYear();
    const m = parseInt(parts[1], 10) || getTodayMonth();
    return { year: y, month: m };
  }

  const parts = monthStr.trim().split(" ");
  if (parts.length >= 2) {
    const monthPart = parts[0];
    const yearPart = parseInt(parts[1], 10) || getTodayYear();
    let monthIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === monthPart.toLowerCase().slice(0, 3));
    if (monthIdx === -1) {
      monthIdx = MONTHS_FULL.findIndex(m => m.toLowerCase() === monthPart.toLowerCase());
    }
    return {
      year: yearPart,
      month: monthIdx !== -1 ? monthIdx + 1 : getTodayMonth()
    };
  }

  return { year: getTodayYear(), month: getTodayMonth() };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthDays(monthStr: string): DayInfo[] {
  const { year, month } = parseYearMonth(monthStr);
  const totalDays = getDaysInMonth(year, month);
  const today = new Date();
  const isCurrentYearMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  const currentDay = today.getDate();

  const days: DayInfo[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = DAYS_SHORT[dateObj.getDay()];
    days.push({
      dayNumber: d,
      dayOfWeek,
      dateKey: getDateKey(year, month, d),
      isSunday: dateObj.getDay() === 0,
      isToday: isCurrentYearMonth && d === currentDay
    });
  }
  return days;
}

export function getRollingMonthsList(allTransactionsYearsMonths: string[] = []): string[] {
  const currentYear = getTodayYear();
  const currentMonth = getTodayMonth();
  const result: string[] = [];

  // Last 12 months rolling window
  let y = currentYear;
  let m = currentMonth;
  for (let i = 0; i < 12; i++) {
    result.push(`${MONTHS_SHORT[m - 1]} ${y}`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }

  // Merge with custom ones if any
  for (const ym of allTransactionsYearsMonths) {
    if (ym && !result.includes(ym) && ym !== "All Months") {
      result.push(ym);
    }
  }

  return result;
}

export function formatDisplayDate(dateStr: string): string {
  // input "YYYY-MM-DD" -> "Aug 15, 2026"
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const monthName = MONTHS_SHORT[m - 1] || "Aug";
      return `${monthName} ${String(d).padStart(2, '0')}, ${y}`;
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

export function getPreviousMonth(monthStr: string): string {
  const { year, month } = parseYearMonth(monthStr);
  let newMonth = month - 1;
  let newYear = year;
  if (newMonth < 1) {
    newMonth = 12;
    newYear -= 1;
  }
  return `${MONTHS_SHORT[newMonth - 1]} ${newYear}`;
}

export function getNextMonth(monthStr: string): string {
  const { year, month } = parseYearMonth(monthStr);
  let newMonth = month + 1;
  let newYear = year;
  if (newMonth > 12) {
    newMonth = 1;
    newYear += 1;
  }
  return `${MONTHS_SHORT[newMonth - 1]} ${newYear}`;
}
