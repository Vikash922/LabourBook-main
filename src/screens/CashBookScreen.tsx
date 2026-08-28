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
    <div className="relative flex flex-col h-full bg-white selection:bg-[#1862D6] selection:text-white">
      {/* Search Bar + Summary Card */}
      <div className="flex-shrink-0 max-w-md md:max-w-xl mx-auto w-full px-4 pt-3.5 space-y-3.5">
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
      </div>

      {/* 3. Sticky Table Header (Matches Reference Image) */}
      <div className="flex-shrink-0 border-y border-slate-200 bg-white shadow-sm z-10">
        <div className="max-w-md md:max-w-xl mx-auto px-4">
          <div className="grid grid-cols-[4.5rem_1fr_7.5rem] py-3 items-center text-sm font-bold text-slate-900 select-none">
            <div className="border-r border-slate-200 text-center">Date</div>
            <div className="border-r border-slate-200 px-4">Notes</div>
            <div className="pl-4">₹ Amount</div>
          </div>
        </div>
      </div>

      {/* 4. Transactions Table */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-24 bg-white">
        <div className="max-w-md md:max-w-xl mx-auto px-4">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-white mt-2 rounded-xl shadow-2xs border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">No transactions found for this month.</p>
            </div>
          ) : (
            <div className="bg-white border-x border-b border-slate-200">
              {filteredTransactions.map((tx, idx) => {
                const isCashIn = tx.type === 'CASH_IN';
                const { day, dayOfWeek } = parseTxDate(tx.fullDate || tx.dateDisplay);
                const isLast = idx === filteredTransactions.length - 1;

                return (
                  <div
                    key={tx.id}
                    onClick={() => setDetailTransaction(tx)}
                    className={`grid grid-cols-[4.5rem_1fr_7.5rem] items-center py-2.5 hover:bg-slate-50 transition cursor-pointer active:bg-slate-100 ${
                      !isLast ? 'border-b border-slate-200' : ''
                    }`}
                  >
                    {/* Column 1: Date */}
                    <div className="border-r border-slate-200 h-full flex flex-col justify-center items-center">
                      <span className="text-[17px] font-bold text-slate-900 block leading-tight">
                        {day}
                      </span>
                      <span className="text-[13px] text-slate-400 block leading-tight mt-0.5">
                        {dayOfWeek}
                      </span>
                    </div>

                    {/* Column 2: Notes & Payment Mode */}
                    <div className="border-r border-slate-200 px-4 h-full flex flex-col justify-center">
                      <span className="text-[15px] text-slate-900 block leading-tight line-clamp-1">
                        {tx.notes || (isCashIn ? 'Cash In' : 'Expense')}
                      </span>
                      <span className="text-[12px] text-slate-400 uppercase tracking-wide block leading-tight mt-1">
                        {tx.paymentMethod === 'ONLINE' ? 'UPI' : 'CASH'}
                      </span>
                    </div>

                    {/* Column 3: Amount & Chevron */}
                    <div className="pl-4 pr-3 h-full flex items-center justify-between">
                      <span
                        className={`text-[15px] font-bold ${
                          isCashIn ? 'text-[#28A745]' : 'text-[#DC3545]'
                        }`}
                      >
                        ₹{tx.amount}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 stroke-[2.5]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Docked Action Bar: ALWAYS VISIBLE ABOVE BOTTOM NAV WITHOUT SCROLLING */}
      <div className="absolute bottom-2 left-0 right-0 z-30 px-4">
        <div className="max-w-md md:max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveModalType('CASH_IN')}
            className="flex-1 py-4 bg-gradient-to-r from-[#28A76B] to-[#1F8C58] hover:from-[#1F8C58] hover:to-[#28A76B] active:scale-95 text-white font-black text-[13px] sm:text-base rounded-2xl shadow-[0_12px_28px_rgba(40,167,107,0.45)] ring-2 ring-white/20 flex items-center justify-center gap-2 cursor-pointer transition uppercase tracking-widest"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>CASH IN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalType('CASH_OUT')}
            className="flex-1 py-4 bg-gradient-to-r from-[#E02D3C] to-[#B91C2A] hover:from-[#B91C2A] hover:to-[#E02D3C] active:scale-95 text-white font-black text-[13px] sm:text-base rounded-2xl shadow-[0_12px_28px_rgba(224,45,60,0.45)] ring-2 ring-white/20 flex items-center justify-center gap-2 cursor-pointer transition uppercase tracking-widest"
          >
            <Minus className="w-5 h-5 stroke-[3]" />
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
