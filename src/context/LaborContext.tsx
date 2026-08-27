import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LaborWorker,
  CashTransaction,
  UserProfile,
  AttendanceStatus,
  PaymentMethod,
  TransactionType,
  SalaryType,
  Screen,
  AdvanceConfirmationState
} from '../types';
import {
  loadWorkersFromStorage,
  saveWorkersToStorage,
  loadTransactionsFromStorage,
  saveTransactionsToStorage,
  loadProfileFromStorage,
  saveProfileToStorage,
  exportBackupCsv,
  parseBackupCsv,
  INITIAL_PROFILE
} from '../utils/storage';
import { formatCurrentMonth, parseYearMonth, getDateKey, DAYS_SHORT } from '../utils/calendar';
import { AVATAR_PALETTE } from '../utils/avatar';

interface LaborContextType {
  workers: LaborWorker[];
  transactions: CashTransaction[];
  userProfile: UserProfile;
  selectedMonth: string;
  currentScreen: Screen;
  searchQuery: string;
  toastMessage: string | null;
  advanceConfirmation: AdvanceConfirmationState;
  navigateTo: (screen: Screen) => void;
  setSelectedMonth: (month: string) => void;
  setSearchQuery: (query: string) => void;
  showToast: (msg: string) => void;
  clearAdvanceConfirmation: () => void;
  setAttendance: (workerId: string, dayNumber: number, status: AttendanceStatus, monthStr?: string) => void;
  updateDayDetails: (
    workerId: string,
    dayNumber: number,
    advance: number,
    note: string,
    otHours: number,
    otRate: number,
    monthStr: string,
    paymentMethod: PaymentMethod,
    otAmount?: number
  ) => void;
  addWorker: (name: string, phone: string, wage: number, salaryType: SalaryType) => string;
  updateWorker: (worker: LaborWorker) => void;
  deleteWorker: (workerId: string) => void;
  addTransaction: (
    amount: number,
    type: TransactionType,
    paymentMethod: PaymentMethod,
    fullDate: string,
    notes: string
  ) => void;
  updateTransaction: (tx: CashTransaction) => void;
  deleteTransaction: (id: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  exportBackup: () => string;
  importBackup: (csvText: string) => boolean;
  clearAllData: () => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  logout: () => void;
}

const LaborContext = createContext<LaborContextType | undefined>(undefined);

export const LaborProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workers, setWorkers] = useState<LaborWorker[]>(() => loadWorkersFromStorage());
  const [transactions, setTransactions] = useState<CashTransaction[]>(() => loadTransactionsFromStorage());
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadProfileFromStorage());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => formatCurrentMonth());
  const [currentScreen, setCurrentScreen] = useState<Screen>({ type: 'HOME' });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [advanceConfirmation, setAdvanceConfirmation] = useState<AdvanceConfirmationState>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('laborbook_is_authenticated');
    return saved !== 'false';
  });

  // Sync auth state
  useEffect(() => {
    localStorage.setItem('laborbook_is_authenticated', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  // Sync to storage
  useEffect(() => {
    saveWorkersToStorage(workers);
  }, [workers]);

  useEffect(() => {
    saveTransactionsToStorage(transactions);
  }, [transactions]);

  useEffect(() => {
    saveProfileToStorage(userProfile);
  }, [userProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setAttendance = (
    workerId: string,
    dayNumber: number,
    status: AttendanceStatus,
    monthStr: string = selectedMonth
  ) => {
    const { year, month } = parseYearMonth(monthStr);
    const dateKey = getDateKey(year, month, dayNumber);
    const dateObj = new Date(year, month - 1, dayNumber);
    const dayOfWeek = DAYS_SHORT[dateObj.getDay()];

    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== workerId) return w;
        const currentRec = w.attendance[dateKey] || {
          fullDate: dateKey,
          dayNumber,
          dayOfWeek,
          status: 'UNMARKED',
          overtimeHours: 0,
          advanceAmount: 0,
          note: '',
          overtimeRate: 0,
          paymentMethod: 'CASH' as PaymentMethod
        };

        const updatedAttendance = {
          ...w.attendance,
          [dateKey]: {
            ...currentRec,
            fullDate: dateKey,
            dayNumber,
            dayOfWeek,
            status
          }
        };

        return { ...w, attendance: updatedAttendance };
      })
    );
  };

  const updateDayDetails = (
    workerId: string,
    dayNumber: number,
    advance: number,
    note: string,
    otHours: number,
    otRate: number,
    monthStr: string,
    paymentMethod: PaymentMethod,
    otAmount?: number
  ) => {
    const { year, month } = parseYearMonth(monthStr);
    const dateKey = getDateKey(year, month, dayNumber);
    const dateObj = new Date(year, month - 1, dayNumber);
    const dayOfWeek = DAYS_SHORT[dateObj.getDay()];

    let targetWorkerName = "Staff";

    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== workerId) return w;
        targetWorkerName = w.name;
        const currentRec = w.attendance[dateKey] || {
          fullDate: dateKey,
          dayNumber,
          dayOfWeek,
          status: 'UNMARKED' as AttendanceStatus,
          overtimeHours: 0,
          advanceAmount: 0,
          note: '',
          overtimeRate: 0,
          paymentMethod: 'CASH' as PaymentMethod
        };

        const prevAdvance = currentRec.advanceAmount || 0;

        if (advance > 0 && advance !== prevAdvance) {
          setAdvanceConfirmation({
            type: 'ADDED',
            amount: advance,
            workerName: w.name
          });
        } else if (advance === 0 && prevAdvance > 0) {
          setAdvanceConfirmation({
            type: 'REMOVED',
            workerName: w.name
          });
        }

        const computedOtAmount =
          otAmount !== undefined && otAmount !== null && otAmount > 0
            ? Number(otAmount)
            : (otHours > 0 && otRate > 0 ? Math.round(otHours * otRate * 100) / 100 : (otHours > 0 ? (currentRec.overtimeAmount || 0) : 0));

        const updatedAttendance = {
          ...w.attendance,
          [dateKey]: {
            ...currentRec,
            fullDate: dateKey,
            dayNumber,
            dayOfWeek,
            advanceAmount: advance,
            note,
            overtimeHours: otHours,
            overtimeRate: otRate,
            overtimeAmount: computedOtAmount,
            paymentMethod
          }
        };

        return { ...w, attendance: updatedAttendance };
      })
    );
  };

  const addWorker = (
    name: string,
    phone: string,
    wage: number,
    salaryType: SalaryType
  ): string => {
    const id = `worker-${Date.now()}`;
    const avatarColorHex = AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
    const newWorker: LaborWorker = {
      id,
      name: name.trim(),
      phoneNumber: phone.trim(),
      dailyWage: wage,
      avatarColorHex,
      createdAt: Date.now(),
      salaryType,
      attendance: {}
    };

    setWorkers((prev) => [newWorker, ...prev]);
    showToast(`Added ${name.trim()} successfully`);
    return id;
  };

  const updateWorker = (updated: LaborWorker) => {
    setWorkers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    showToast(`Updated ${updated.name}`);
  };

  const deleteWorker = (workerId: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
    showToast("Staff deleted");
  };

  const addTransaction = (
    amount: number,
    type: TransactionType,
    paymentMethod: PaymentMethod,
    fullDate: string,
    notes: string
  ) => {
    const id = `tx-${Date.now()}`;
    const newTx: CashTransaction = {
      id,
      dateDisplay: fullDate,
      fullDate,
      type,
      amount,
      paymentMethod,
      notes: notes.trim(),
      timestamp: Date.now()
    };

    setTransactions((prev) => [newTx, ...prev]);
    showToast(type === 'CASH_IN' ? 'Cash In added' : 'Cash Out recorded');
  };

  const updateTransaction = (tx: CashTransaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    showToast("Transaction updated");
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast("Transaction removed");
  };

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profileUpdate }));
    showToast("Profile settings saved");
  };

  const setLanguage = (lang: 'en' | 'hi') => {
    setUserProfile((prev) => ({ ...prev, language: lang }));
    showToast(lang === 'hi' ? "भाषा बदलकर हिंदी कर दी गई" : "Language set to English");
  };

  const exportBackup = (): string => {
    const csv = exportBackupCsv(workers, transactions, userProfile);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laborbook_Master_Backup_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Backup CSV downloaded successfully");
    return csv;
  };

  const importBackup = (csvText: string): boolean => {
    try {
      const parsed = parseBackupCsv(csvText);
      if (parsed.workers.length > 0 || parsed.transactions.length > 0) {
        setWorkers(parsed.workers);
        setTransactions(parsed.transactions);
        if (parsed.profile) {
          setUserProfile(parsed.profile);
        }
        showToast(`Restored ${parsed.workers.length} workers & ${parsed.transactions.length} entries`);
        return true;
      } else {
        showToast("Invalid or empty backup file");
        return false;
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to parse backup CSV file");
      return false;
    }
  };

  const clearAllData = () => {
    setWorkers([]);
    setTransactions([]);
    setUserProfile(INITIAL_PROFILE);
    localStorage.clear();
    showToast("All application data cleared");
  };

  const clearAdvanceConfirmation = () => {
    setAdvanceConfirmation(null);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentScreen({ type: 'HOME' });
    showToast(userProfile.language === 'hi' ? 'सफलतापूर्वक लॉगआउट हो गया' : 'Logged out successfully');
  };

  return (
    <LaborContext.Provider
      value={{
        workers,
        transactions,
        userProfile,
        selectedMonth,
        currentScreen,
        searchQuery,
        toastMessage,
        advanceConfirmation,
        navigateTo,
        setSelectedMonth,
        setSearchQuery,
        showToast,
        clearAdvanceConfirmation,
        setAttendance,
        updateDayDetails,
        addWorker,
        updateWorker,
        deleteWorker,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        updateProfile,
        setLanguage,
        exportBackup,
        importBackup,
        clearAllData,
        isAuthenticated,
        setIsAuthenticated,
        logout
      }}
    >
      {children}
    </LaborContext.Provider>
  );
};

export const useLabor = () => {
  const context = useContext(LaborContext);
  if (!context) {
    throw new Error('useLabor must be used within a LaborProvider');
  }
  return context;
};
