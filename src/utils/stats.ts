import { LaborWorker, WorkerMonthStats } from '../types';
import { parseYearMonth, getDaysInMonth } from './calendar';

export function calculateMonthStats(worker: LaborWorker, monthStr: string): WorkerMonthStats {
  const { year, month } = parseYearMonth(monthStr);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = getDaysInMonth(year, month);

  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  let doubleCount = 0;
  let presentHalfCount = 0;
  let paidLeaveCount = 0;
  let overtimeHours = 0;
  let totalAdvance = 0;
  let totalOvertimeAmount = 0;

  const defaultHourlyRate = worker.dailyWage > 0 ? worker.dailyWage / 8 : 0;

  for (const [dateKey, record] of Object.entries(worker.attendance || {})) {
    if (!dateKey.startsWith(prefix)) continue;

    switch (record.status) {
      case "PRESENT":
      case "OVERTIME":
        presentCount += 1.0;
        break;
      case "ABSENT":
        absentCount += 1.0;
        break;
      case "HALF_DAY":
        presentCount += 0.5;
        halfDayCount += 1.0;
        break;
      case "DOUBLE":
        presentCount += 2.0;
        doubleCount += 1.0;
        break;
      case "PRESENT_HALF":
        presentCount += 1.5;
        presentHalfCount += 1.0;
        break;
      case "PAID_LEAVE":
        presentCount += 1.0;
        paidLeaveCount += 1.0;
        break;
      default:
        break;
    }

    if ((record.overtimeHours && record.overtimeHours > 0) || (record.overtimeAmount && record.overtimeAmount > 0)) {
      if (record.overtimeHours) {
        overtimeHours += record.overtimeHours;
      }
      if (record.overtimeAmount !== undefined && record.overtimeAmount !== null && record.overtimeAmount > 0) {
        totalOvertimeAmount += record.overtimeAmount;
      } else {
        const rate = record.overtimeRate || defaultHourlyRate;
        totalOvertimeAmount += (record.overtimeHours || 0) * rate;
      }
    }

    if (record.advanceAmount > 0) {
      totalAdvance += record.advanceAmount;
    }
  }

  let baseEarnings = 0;
  const isMonthly = (worker.salaryType || "").toLowerCase() === "monthly";

  if (isMonthly) {
    if (daysInMonth > 0) {
      baseEarnings = (presentCount / daysInMonth) * worker.dailyWage;
    } else {
      baseEarnings = (presentCount / 30.0) * worker.dailyWage;
    }
  } else {
    baseEarnings = presentCount * worker.dailyWage;
  }

  const grossWage = baseEarnings + totalOvertimeAmount;
  const balance = grossWage - totalAdvance;

  return {
    presentCount,
    absentCount,
    halfDayCount,
    doubleCount,
    presentHalfCount,
    paidLeaveCount,
    overtimeHours,
    totalAdvance,
    totalOvertimeAmount,
    grossWage,
    balance
  };
}
