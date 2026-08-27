import React, { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  ChevronRight,
  X,
  Plus,
  Minus
} from 'lucide-react';
import { useLabor } from '../store/laborStore';
import { CashTransaction, TransactionType } from '../types';
import { TransactionModal } from '../components/TransactionModal';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { parseYearMonth } from '../utils/calendar';

export const CashBookScreen: React.FC = () => {
  const {
    transactions,
    selectedMonth,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    navigateTo
  } = useLabor();

  const [search, setSearch] = useState('');
  const [activeModalType, setActiveModalType] = useState<TransactionType | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<CashTransaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);

  const { year, month } = parseYearMonth(selectedMonth);
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  // Filter transactions by month and search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month filter
      if (selectedMonth !== "All Months") {
        if (t.fullDate && !t.fullDate.startsWith(monthPrefix)) {
          return false;
        }
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesNote = (t.notes || '').toLowerCase().includes(q);
        const matchesAmount = String(t.amount).includes(q);
        const matchesDate = (t.fullDate || t.dateDisplay || '').toLowerCase().includes(q);
        if (!matchesNote && !matchesAmount && !matchesDate) return false;
      }
      return true;
    }).sort((a, b) => {
      if (b.fullDate && a.fullDate && b.fullDate !== a.fullDate) {
        return b.fullDate.localeCompare(a.fullDate);
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [transactions, selectedMonth, monthPrefix, search]);

  // Compute Totals
  const { totalIn, totalOut, netBalance } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    for (const t of filteredTransactions) {
      if (t.type === 'CASH_IN') {
        inSum += t.amount || 0;
      } else {
        outSum += t.amount || 0;
      }
    }
    return {
      totalIn: inSum,
      totalOut: outSum,
      netBalance: inSum - outSum
    };
  }, [filteredTransactions]);

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

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-white pb-48 selection:bg-[#1862D6] selection:text-white">
      <div className="max-w-md md:max-w-xl mx-auto px-4 pt-3.5 space-y-3.5">
        {/* 1. Search Bar */}
        <div className="relative">
          <div className="w-full px-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl flex items-center gap-2.5 shadow-2xs">
            <Search className="w-4 h-4 text-[#1862D6] stroke-[2.2] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions"
              className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Summary Card with View Report Button */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5">
          {/* Cash In */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-sm font-normal text-slate-500">
              Cash In
            </span>
            <span className="text-base font-bold text-[#10B981]">
              ₹ {totalIn.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Cash Out */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-sm font-normal text-slate-500">
              Cash Out
            </span>
            <span className="text-base font-bold text-[#EF4444]">
              ₹ {totalOut.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between py-0.5 pt-1 border-t border-slate-100">
            <span className="text-sm sm:text-base font-bold text-slate-900">
              Balance
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900">
              ₹ {netBalance.toLocaleString('en-IN')}
            </span>
          </div>

          {/* View Report Button */}
          <button
            type="button"
            onClick={() => navigateTo({ type: 'CASH_BOOK_REPORT' })}
            className="w-full py-2.5 bg-[#F0F5FF] hover:bg-blue-100/70 border border-blue-100/80 rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm text-[#1862D6] shadow-2xs transition active:scale-[0.99] cursor-pointer mt-1"
          >
            <FileText className="w-4 h-4 stroke-[2.2]" />
            <span>View Report</span>
          </button>
        </div>

        {/* 3. Transactions Table */}
        <div className="pt-1">
          {/* Table Header */}
          <div className="grid grid-cols-[3.8rem_1fr_6rem] border-t border-b border-slate-200/90 py-2.5 px-3 bg-white text-xs font-bold text-slate-900 select-none">
            <div>Date</div>
            <div>Notes</div>
            <div className="text-left">₹ Amount</div>
          </div>

          {/* Table Rows */}
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-white space-y-2 border-b border-slate-100">
              <p className="text-xs text-slate-400 font-medium">No transactions found for this month.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {filteredTransactions.map((tx) => {
                const isCashIn = tx.type === 'CASH_IN';
                const { day, dayOfWeek } = parseTxDate(tx.fullDate || tx.dateDisplay);

                return (
                  <div
                    key={tx.id}
                    onClick={() => setDetailTransaction(tx)}
                    className="grid grid-cols-[3.8rem_1fr_6rem] items-center py-3 px-3 hover:bg-slate-50 transition cursor-pointer active:bg-slate-100"
                  >
                    {/* Column 1: Date */}
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                        {day}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight">
                        {dayOfWeek}
                      </span>
                    </div>

                    {/* Column 2: Notes & Payment Mode */}
                    <div className="pr-2">
                      <span className="text-xs sm:text-sm font-medium text-slate-900 block leading-tight line-clamp-1">
                        {tx.notes || (isCashIn ? 'Cash In' : 'Expense')}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block leading-tight mt-0.5">
                        {tx.paymentMethod === 'ONLINE' ? 'UPI' : 'CASH'}
                      </span>
                    </div>

                    {/* Column 3: Amount & Chevron */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          isCashIn ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        ₹{tx.amount}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 stroke-[2] shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Docked Action Bar: ALWAYS VISIBLE ABOVE BOTTOM NAV WITHOUT SCROLLING */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-md md:max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveModalType('CASH_IN')}
            className="flex-1 py-3 bg-[#28A76B] hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-[#28A76B]/25 flex items-center justify-center gap-1.5 cursor-pointer transition uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>CASH IN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalType('CASH_OUT')}
            className="flex-1 py-3 bg-[#E02D3C] hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-[#E02D3C]/25 flex items-center justify-center gap-1.5 cursor-pointer transition uppercase tracking-wider"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
            <span>CASH OUT</span>
          </button>
        </div>
      </div>

      {/* 5. Transaction Detail View Modal */}
      {detailTransaction !== null && (
        <TransactionDetailModal
          isOpen={true}
          transaction={detailTransaction}
          onEdit={() => {
            setEditingTransaction(detailTransaction);
            setDetailTransaction(null);
          }}
          onClose={() => setDetailTransaction(null)}
        />
      )}

      {/* 6. Add / Edit Transaction Modal */}
      {(activeModalType !== null || editingTransaction !== null) && (
        <TransactionModal
          isOpen={true}
          defaultType={activeModalType || 'CASH_IN'}
          initialTransaction={editingTransaction}
          selectedMonth={selectedMonth}
          onSave={(amount, type, method, date, notes) => {
            if (editingTransaction) {
              updateTransaction({
                ...editingTransaction,
                amount,
                type,
                paymentMethod: method,
                fullDate: date,
                dateDisplay: date,
                notes
              });
            } else {
              addTransaction(amount, type, method, date, notes);
            }
            setActiveModalType(null);
            setEditingTransaction(null);
          }}
          onDelete={(id) => {
            deleteTransaction(id);
            setEditingTransaction(null);
          }}
          onClose={() => {
            setActiveModalType(null);
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
};
