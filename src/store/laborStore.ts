import localforage from 'localforage';
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
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
import { formatCurrentMonth, parseYearMonth, getDateKey, DAYS_SHORT } from '../utils/calendar';
import { AVATAR_PALETTE } from '../utils/avatar';
import {
  syncWorkerToCloud,
  deleteWorkerFromCloud,
  syncTransactionToCloud,
  deleteTransactionFromCloud,
  syncProfileToCloud,
  syncAllToCloud,
  loadAllFromCloud,
  formatSyncTimestamp
} from '../services/firebaseSync';
import {
  registerSyncStateProvider,
  queueWorkerChange,
  queueWorkerDelete,
  queueTransactionChange,
  queueTransactionDelete,
  queueProfileChange,
  flushSyncQueue,
  clearSyncQueue
} from '../services/syncQueue';
import { forceUnlockAllBodyScroll } from '../utils/scrollLock';
import { signOutFirebase } from '../services/firebaseAuth';

// ─────────────────────────────────────────────
// 1. IndexedDB storage engine via localForage
// ─────────────────────────────────────────────
localforage.config({
  name: 'laborbook',
  storeName: 'laborbook_store',
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  description: 'LabourBook offline-first database'
});

const localForageStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await localforage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name);
  }
};

// ─────────────────────────────────────────────
// 2. Initial profile
// ─────────────────────────────────────────────
export const INITIAL_PROFILE: UserProfile = {
  name: "Vikash Singh",
  businessName: "LabourBook Construction",
  mobile: "+91 98765 43210",
  email: "vikashsingh2007x@gmail.com",
  language: "en",
  isCloudSyncEnabled: true,
  isLoggedIn: true,
  lastCloudBackupTime: "Today, 10:45 AM",
  isPro: true,
  authProvider: "Google"
};

// ─────────────────────────────────────────────
// 3. Store interface
// ─────────────────────────────────────────────
interface LaborState {
  // Persisted data
  workers: LaborWorker[];
  transactions: CashTransaction[];
  userProfile: UserProfile;
  isAuthenticated: boolean;
  firebaseUid: string | null;

  // Session-only (not persisted)
  selectedMonth: string;
  currentScreen: Screen;
  navigationHistory: Screen[];
  modalCloseHandlers: (() => boolean)[];
  searchQuery: string;
  toastMessage: string | null;
  advanceConfirmation: AdvanceConfirmationState;
  _hasHydrated: boolean;
  isSyncing: boolean;

  // Actions — Navigation & UI
  navigateTo: (screen: Screen, replace?: boolean) => void;
  goBack: () => boolean;
  pushModalHandler: (handler: () => boolean) => () => void;
  setSelectedMonth: (month: string) => void;
  setSearchQuery: (query: string) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  clearAdvanceConfirmation: () => void;
  setIsAuthenticated: (val: boolean) => void;
  setFirebaseUid: (uid: string | null) => void;

  // Actions — Workers
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

  // Actions — Transactions
  addTransaction: (
    amount: number,
    type: TransactionType,
    paymentMethod: PaymentMethod,
    fullDate: string,
    notes: string
  ) => void;
  updateTransaction: (tx: CashTransaction) => void;
  deleteTransaction: (id: string) => void;

  // Actions — Profile
  updateProfile: (profile: Partial<UserProfile>) => void;
  setLanguage: (lang: 'en' | 'hi') => void;

  // Actions — Backup & Cloud Sync
  exportBackup: () => string;
  importBackup: (csvText: string) => boolean;
  syncToCloudNow: () => Promise<void>;
  loadFromCloudNow: (targetUid?: string) => Promise<boolean>;
  handleUserLogin: (user: { uid: string; email?: string | null; displayName?: string | null }) => Promise<void>;
  handleUserLogout: () => void;
  clearAllData: () => void;
  logout: () => void;
}

// ─────────────────────────────────────────────
// 4. CSV helpers (inline to avoid circular deps)
// ─────────────────────────────────────────────
function escapeCsv(val: string | number): string {
  let str = String(val ?? "").replace(/\r/g, " ").replace(/\n/g, " ");
  if (str.includes(",") || str.includes("\"") || str.includes(";")) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

function unescapeCsv(val: string): string {
  let str = (val || "").trim();
  if (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
    str = str.substring(1, str.length - 1).replace(/""/g, '"');
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const tokens: string[] = [];
  let sb = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        sb += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      tokens.push(sb.trim());
      sb = '';
    } else {
      sb += c;
    }
    i++;
  }
  tokens.push(sb.trim());
  return tokens.map(unescapeCsv);
}

function exportBackupCsv(
  workers: LaborWorker[],
  transactions: CashTransaction[],
  profile: UserProfile
): string {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const lines: string[] = [];

  // UTF-8 BOM is added on export for Microsoft Excel / Google Sheets compatibility
  lines.push(`# ==============================================================================`);
  lines.push(`# LABOURBOOK MASTER DATA BACKUP & EXCEL REPORT`);
  lines.push(`# Generated: ${escapeCsv(now)} | Business: ${escapeCsv(profile.businessName || "LabourBook")}`);
  lines.push(`# ==============================================================================\n`);

  lines.push("[SECTION_PROFILE]");
  lines.push("Name,Business Name,Mobile,Email,Language,IsPro,AuthProvider");
  lines.push(
    `${escapeCsv(profile.name || "Contractor")},${escapeCsv(profile.businessName || "My Business")},${escapeCsv(profile.mobile || "")},${escapeCsv(profile.email || "")},${escapeCsv(profile.language || "en")},${profile.isPro ?? true},${escapeCsv(profile.authProvider || "Google")}\n`
  );

  lines.push("[SECTION_WORKERS]");
  lines.push("Worker ID,Worker Name,Phone Number,Daily Wage (Rs),Salary Type,Created Timestamp,Avatar Color");
  for (const w of workers) {
    lines.push(
      `${escapeCsv(w.id)},${escapeCsv(w.name)},${escapeCsv(w.phoneNumber || "")},${w.dailyWage || 0},${escapeCsv(w.salaryType || "Daily")},${w.createdAt || Date.now()},${escapeCsv(w.avatarColorHex || "#1D61D2")}`
    );
  }
  lines.push("");

  lines.push("[SECTION_ATTENDANCE_LOGS]");
  lines.push(
    "Worker ID,Worker Name,Full Date,Day Number,Day Of Week,Status,Overtime Hours,Advance Amount (Rs),Note / Remarks,Overtime Rate (Rs/hr),Payment Method,Overtime Amount (Rs)"
  );
  for (const w of workers) {
    for (const [dateKey, att] of Object.entries(w.attendance || {})) {
      if (!att) continue;
      const fullDate = att.fullDate || dateKey;
      const noteClean = (att.note || "").replace(/[\r\n]+/g, " ");
      const otAmt =
        att.overtimeAmount !== undefined && att.overtimeAmount !== null
          ? att.overtimeAmount
          : (att.overtimeHours || 0) * (att.overtimeRate || 0);
      lines.push(
        `${escapeCsv(w.id)},${escapeCsv(w.name)},${escapeCsv(fullDate)},${att.dayNumber || 1},${escapeCsv(att.dayOfWeek || "Mon")},${escapeCsv(att.status || "UNMARKED")},${att.overtimeHours || 0},${att.advanceAmount || 0},${escapeCsv(noteClean)},${att.overtimeRate || 0},${escapeCsv(att.paymentMethod || "CASH")},${otAmt}`
      );
    }
  }
  lines.push("");

  lines.push("[SECTION_TRANSACTIONS]");
  lines.push("Transaction ID,Date Display,Full Date,Type,Amount (Rs),Payment Method,Notes / Description,Timestamp");
  for (const t of transactions) {
    const noteClean = (t.notes || "").replace(/[\r\n]+/g, " ");
    lines.push(
      `${escapeCsv(t.id)},${escapeCsv(t.dateDisplay || t.fullDate)},${escapeCsv(t.fullDate)},${escapeCsv(t.type)},${t.amount || 0},${escapeCsv(t.paymentMethod || "CASH")},${escapeCsv(noteClean)},${t.timestamp || Date.now()}`
    );
  }

  return lines.join("\n");
}

function parseBackupCsv(rawContent: string): {
  workers: LaborWorker[];
  transactions: CashTransaction[];
  profile?: UserProfile;
} {
  const cleanContent = rawContent.startsWith("\uFEFF") ? rawContent.substring(1) : rawContent;
  const lines = cleanContent.split(/\r?\n/);

  let currentSection = "";
  let profile: UserProfile | undefined;
  const workersMap: Record<string, LaborWorker> = {};
  const transactions: CashTransaction[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line;
      continue;
    }

    const tokens = parseCsvLine(line);
    if (!tokens.length) continue;

    const firstTokenLower = (tokens[0] || "").toLowerCase().replace(/[^a-z]/g, "");

    if (currentSection === "[SECTION_PROFILE]") {
      if (firstTokenLower === "name") continue; // skip header
      profile = {
        name: tokens[0] || "",
        businessName: tokens[1] || "",
        mobile: tokens[2] || "",
        email: tokens[3] || "",
        language: tokens[4] === "hi" ? "hi" : "en",
        isCloudSyncEnabled: true,
        isLoggedIn: true,
        lastCloudBackupTime: "Just now",
        isPro: tokens[5] === "true",
        authProvider: tokens[6] || "Google"
      };
    } else if (currentSection === "[SECTION_WORKERS]") {
      if (firstTokenLower === "workerid" || firstTokenLower === "id") continue; // skip header
      const id = tokens[0] || `worker-${Date.now()}`;
      workersMap[id] = {
        id,
        name: tokens[1] || "Worker",
        phoneNumber: tokens[2] || "",
        dailyWage: parseFloat(tokens[3]) || 0,
        salaryType: (tokens[4] === "Monthly" ? "Monthly" : "Daily") as SalaryType,
        createdAt: parseInt(tokens[5], 10) || Date.now(),
        avatarColorHex: tokens[6] || "#1D61D2",
        attendance: {}
      };
    } else if (currentSection === "[SECTION_ATTENDANCE_LOGS]") {
      if (firstTokenLower === "workerid" || firstTokenLower === "id") continue; // skip header
      const workerId = tokens[0];
      const worker = workersMap[workerId];
      if (worker) {
        const fullDate = tokens[2] || "";
        const dayNumber = parseInt(tokens[3], 10) || 1;
        const dayOfWeek = tokens[4] || "Mon";
        const status = (tokens[5] || "UNMARKED") as AttendanceStatus;
        const overtimeHours = parseFloat(tokens[6]) || 0;
        const advanceAmount = parseFloat(tokens[7]) || 0;
        const note = tokens[8] || "";
        const overtimeRate = parseFloat(tokens[9]) || 0;
        const paymentMethod = (tokens[10] === "ONLINE" ? "ONLINE" : "CASH") as PaymentMethod;
        const overtimeAmount = tokens[11] ? parseFloat(tokens[11]) || 0 : overtimeHours * overtimeRate;

        worker.attendance[fullDate] = {
          fullDate,
          dayNumber,
          dayOfWeek,
          status,
          overtimeHours,
          overtimeRate,
          overtimeAmount,
          advanceAmount,
          note,
          paymentMethod
        };
      }
    } else if (currentSection === "[SECTION_TRANSACTIONS]") {
      if (firstTokenLower === "transactionid" || firstTokenLower === "id") continue; // skip header
      transactions.push({
        id: tokens[0] || `tx-${Date.now()}`,
        dateDisplay: tokens[1] || "",
        fullDate: tokens[2] || "",
        type: (tokens[3] === "CASH_OUT" ? "CASH_OUT" : "CASH_IN") as TransactionType,
        amount: parseFloat(tokens[4]) || 0,
        paymentMethod: (tokens[5] === "ONLINE" ? "ONLINE" : "CASH") as PaymentMethod,
        notes: tokens[6] || "",
        timestamp: parseInt(tokens[7], 10) || Date.now()
      });
    }
  }

  return { workers: Object.values(workersMap), transactions, profile };
}

// ─────────────────────────────────────────────
// 5. Migrate old localStorage data → IndexedDB
// ─────────────────────────────────────────────
function migrateFromLocalStorage(): {
  workers: LaborWorker[];
  transactions: CashTransaction[];
  profile: UserProfile;
  isAuthenticated: boolean;
} | null {
  try {
    const hasOldData = localStorage.getItem('laborbook_workers_v1') ||
                       localStorage.getItem('laborbook_transactions_v1') ||
                       localStorage.getItem('laborbook_profile_v1');
    if (!hasOldData) return null;

    let workers: LaborWorker[] = [];
    const rawW = localStorage.getItem('laborbook_workers_v1');
    if (rawW) {
      workers = JSON.parse(rawW).filter((w: LaborWorker) => w.id !== 'worker-1' && w.id !== 'worker-2');
    }

    let transactions: CashTransaction[] = [];
    const rawT = localStorage.getItem('laborbook_transactions_v1');
    if (rawT) {
      transactions = JSON.parse(rawT).filter((t: CashTransaction) => !['tx-1', 'tx-2', 'tx-3', 'tx-4'].includes(t.id));
    }

    let profile = INITIAL_PROFILE;
    const rawP = localStorage.getItem('laborbook_profile_v1');
    if (rawP) {
      profile = JSON.parse(rawP);
    }

    const authRaw = localStorage.getItem('laborbook_is_authenticated');
    const isAuthenticated = authRaw !== 'false';

    // Clear old localStorage keys after successful read
    localStorage.removeItem('laborbook_workers_v1');
    localStorage.removeItem('laborbook_transactions_v1');
    localStorage.removeItem('laborbook_profile_v1');
    localStorage.removeItem('laborbook_is_authenticated');

    console.log('[LabourBook] Migrated data from localStorage → IndexedDB');
    return { workers, transactions, profile, isAuthenticated };
  } catch (e) {
    console.error('[LabourBook] Migration from localStorage failed:', e);
    return null;
  }
}

// ─────────────────────────────────────────────
// 6. Create Zustand store with IndexedDB persist + Cloud Sync
// ─────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useLaborStore = create<LaborState>()(
  persist(
    (set, get) => {
      // Check for old localStorage data on first load
      const migrated = migrateFromLocalStorage();

      return {
        // ── Persisted State ──
        workers: migrated?.workers ?? [],
        transactions: migrated?.transactions ?? [],
        userProfile: migrated?.profile ?? INITIAL_PROFILE,
        isAuthenticated: migrated?.isAuthenticated ?? true,
        firebaseUid: null,

        // ── Session State (not persisted) ──
        selectedMonth: formatCurrentMonth(),
        currentScreen: { type: 'HOME' } as Screen,
        navigationHistory: [] as Screen[],
        modalCloseHandlers: [] as (() => boolean)[],
        searchQuery: '',
        toastMessage: null,
        advanceConfirmation: null as AdvanceConfirmationState,
        _hasHydrated: false,
        isSyncing: false,

        // ── Navigation & UI ──
        navigateTo: (screen, replace = false) => {
          const current = get().currentScreen;
          // If navigating to a different screen, track in history unless replace is true
          if (!replace && JSON.stringify(current) !== JSON.stringify(screen)) {
            const history = [...get().navigationHistory, current];
            if (history.length > 25) history.shift();
            set({ navigationHistory: history, currentScreen: screen });
          } else {
            set({ currentScreen: screen });
          }
          forceUnlockAllBodyScroll();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          // Silently flush any pending debounced writes when switching screens
          flushSyncQueue();
        },

        goBack: () => {
          // 1. Check if any active modal or sheet is open
          const handlers = get().modalCloseHandlers;
          if (handlers.length > 0) {
            const topHandler = handlers[handlers.length - 1];
            const newHandlers = handlers.slice(0, -1);
            set({ modalCloseHandlers: newHandlers });
            if (topHandler && topHandler()) {
              return true; // Modal dismissed
            }
          }

          // 2. If no modal, pop previous screen from navigation history
          const history = [...get().navigationHistory];
          if (history.length > 0) {
            const prevScreen = history.pop()!;
            set({ navigationHistory: history, currentScreen: prevScreen });
            forceUnlockAllBodyScroll();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return true; // Screen back handled
          }

          // 3. If at root screen, return false to let Android exit app
          return false;
        },

        pushModalHandler: (handler) => {
          set((s) => ({ modalCloseHandlers: [...s.modalCloseHandlers, handler] }));
          return () => {
            set((s) => ({
              modalCloseHandlers: s.modalCloseHandlers.filter((h) => h !== handler)
            }));
          };
        },
        setSelectedMonth: (month) => set({ selectedMonth: month }),
        setSearchQuery: (query) => set({ searchQuery: query }),
        showToast: (msg) => {
          if (toastTimer) clearTimeout(toastTimer);
          set({ toastMessage: msg });
          toastTimer = setTimeout(() => {
            set((s) => (s.toastMessage === msg ? { toastMessage: null } : {}));
          }, 2800);
        },
        clearToast: () => {
          if (toastTimer) clearTimeout(toastTimer);
          set({ toastMessage: null });
        },
        clearAdvanceConfirmation: () => set({ advanceConfirmation: null }),
        setIsAuthenticated: (val) => set({ isAuthenticated: val }),
        setFirebaseUid: (uid) => set({ firebaseUid: uid }),

        // ── Workers ──
        setAttendance: (workerId, dayNumber, status, monthStr) => {
          const state = get();
          const ms = monthStr || state.selectedMonth;
          const { year, month } = parseYearMonth(ms);
          const dateKey = getDateKey(year, month, dayNumber);
          const dateObj = new Date(year, month - 1, dayNumber);
          const dayOfWeek = DAYS_SHORT[dateObj.getDay()];

          const newWorkers = state.workers.map((w) => {
            if (w.id !== workerId) return w;
            const currentRec = w.attendance[dateKey] || {
              fullDate: dateKey, dayNumber, dayOfWeek,
              status: 'UNMARKED' as AttendanceStatus,
              overtimeHours: 0, advanceAmount: 0, note: '',
              overtimeRate: 0, paymentMethod: 'CASH' as PaymentMethod
            };
            return {
              ...w,
              attendance: {
                ...w.attendance,
                [dateKey]: { ...currentRec, fullDate: dateKey, dayNumber, dayOfWeek, status }
              }
            };
          });

          // 1. Instant 0ms UI update
          set({ workers: newWorkers });

          // 2. Smart Debounced Delta Queue (Only this worker doc syncs)
          queueWorkerChange(workerId);
        },

        updateDayDetails: (
          workerId,
          dayNumber,
          advance,
          note,
          otHours,
          otRate,
          monthStr,
          paymentMethod,
          otAmount
        ) => {
          const state = get();
          const { year, month } = parseYearMonth(monthStr);
          const dateKey = getDateKey(year, month, dayNumber);
          const dateObj = new Date(year, month - 1, dayNumber);
          const dayOfWeek = DAYS_SHORT[dateObj.getDay()];

          const newWorkers = state.workers.map((w) => {
            if (w.id !== workerId) return w;
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
              setTimeout(() => set({
                advanceConfirmation: { type: 'ADDED', amount: advance, workerName: w.name }
              }), 0);
            } else if (advance === 0 && prevAdvance > 0) {
              setTimeout(() => set({
                advanceConfirmation: { type: 'REMOVED', workerName: w.name }
              }), 0);
            }

            const computedOtAmount =
              otAmount !== undefined && otAmount !== null && otAmount > 0
                ? Number(otAmount)
                : (otHours > 0 && otRate > 0 ? Math.round(otHours * otRate * 100) / 100 : (otHours > 0 ? (currentRec.overtimeAmount || 0) : 0));

            return {
              ...w,
              attendance: {
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
              }
            };
          });

          // 1. Instant 0ms UI update
          set({ workers: newWorkers });

          // 2. Smart Debounced Delta Queue (Only this worker doc syncs)
          queueWorkerChange(workerId);
        },

        addWorker: (name, phone, wage, salaryType) => {
          const id = `worker-${Date.now()}`;
          const avatarColorHex = AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
          const newWorker: LaborWorker = {
            id, name: name.trim(), phoneNumber: phone.trim(),
            dailyWage: wage, avatarColorHex, createdAt: Date.now(),
            salaryType, attendance: {}
          };
          const updatedWorkers = [newWorker, ...get().workers];
          set({ workers: updatedWorkers });
          get().showToast(`Added ${name.trim()} successfully`);

          // Smart Debounced Delta Queue (Only new worker doc syncs)
          queueWorkerChange(id);
          return id;
        },

        updateWorker: (updated) => {
          const updatedWorkers = get().workers.map((w) => (w.id === updated.id ? updated : w));
          set({ workers: updatedWorkers });
          get().showToast(`Updated ${updated.name}`);

          // Smart Debounced Delta Queue
          queueWorkerChange(updated.id);
        },

        deleteWorker: (workerId) => {
          const updatedWorkers = get().workers.filter((w) => w.id !== workerId);
          set({ workers: updatedWorkers });
          get().showToast("Staff deleted");

          // Smart Debounced Delta Queue (Only this worker doc deleted)
          queueWorkerDelete(workerId);
        },

        // ── Transactions ──
        addTransaction: (amount, type, paymentMethod, fullDate, notes) => {
          const id = `tx-${Date.now()}`;
          const newTx: CashTransaction = {
            id, dateDisplay: fullDate, fullDate, type,
            amount, paymentMethod, notes: notes.trim(),
            timestamp: Date.now()
          };
          const updatedTxs = [newTx, ...get().transactions];
          set({ transactions: updatedTxs });
          get().showToast(type === 'CASH_IN' ? 'Cash In added' : 'Cash Out recorded');

          // Smart Debounced Delta Queue (Only new tx doc syncs)
          queueTransactionChange(id);
        },

        updateTransaction: (tx) => {
          const updatedTxs = get().transactions.map((t) => (t.id === tx.id ? tx : t));
          set({ transactions: updatedTxs });
          get().showToast("Transaction updated");

          // Smart Debounced Delta Queue
          queueTransactionChange(tx.id);
        },

        deleteTransaction: (id) => {
          const updatedTxs = get().transactions.filter((t) => t.id !== id);
          set({ transactions: updatedTxs });
          get().showToast("Transaction removed");

          // Smart Debounced Delta Queue (Only this tx doc deleted)
          queueTransactionDelete(id);
        },

        // ── Profile ──
        updateProfile: (profileUpdate) => {
          const newProfile = { ...get().userProfile, ...profileUpdate };
          set({ userProfile: newProfile });
          get().showToast("Profile settings saved");
          queueProfileChange();
        },

        setLanguage: (lang) => {
          const newProfile = { ...get().userProfile, language: lang };
          set({ userProfile: newProfile });
          get().showToast(lang === 'hi' ? "भाषा बदलकर हिंदी कर दी गई" : "Language set to English");
          queueProfileChange();
        },

        // ── Backup & Cloud Sync ──
        exportBackup: () => {
          const { workers, transactions, userProfile } = get();
          const csv = exportBackupCsv(workers, transactions, userProfile);
          // Prepend UTF-8 BOM so Microsoft Excel / Google Sheets open with 100% crystal-clear formatting
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const dateStr = new Date().toISOString().slice(0, 10);
          const safeBiz = (userProfile.businessName || 'LabourBook').replace(/[^a-zA-Z0-9]/g, '_');
          link.setAttribute('href', url);
          link.setAttribute('download', `LabourBook_Report_${safeBiz}_${dateStr}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          get().showToast("Excel CSV downloaded successfully");
          return csv;
        },

        importBackup: (csvText) => {
          try {
            const parsed = parseBackupCsv(csvText);
            if (parsed.workers.length > 0 || parsed.transactions.length > 0) {
              set({
                workers: parsed.workers,
                transactions: parsed.transactions,
                ...(parsed.profile ? { userProfile: parsed.profile } : {})
              });
              get().showToast(`Restored ${parsed.workers.length} workers & ${parsed.transactions.length} entries`);

              // Cloud sync imported data
              const state = get();
              if (state.firebaseUid && state.userProfile.isCloudSyncEnabled) {
                syncAllToCloud(state.firebaseUid, parsed.workers, parsed.transactions, parsed.profile || state.userProfile);
              }
              return true;
            } else {
              get().showToast("Invalid or empty backup file");
              return false;
            }
          } catch (e) {
            console.error(e);
            get().showToast("Failed to parse backup CSV file");
            return false;
          }
        },

        syncToCloudNow: async () => {
          const state = get();
          if (!state.firebaseUid) {
            get().showToast("Please log in to sync with cloud");
            return;
          }
          set({ isSyncing: true });
          try {
            const syncTime = await syncAllToCloud(
              state.firebaseUid,
              state.workers,
              state.transactions,
              state.userProfile
            );
            set((s) => ({
              userProfile: { ...s.userProfile, lastCloudBackupTime: syncTime },
              isSyncing: false
            }));
            get().showToast("Cloud sync complete!");
          } catch (err) {
            console.error("Cloud sync failed:", err);
            set({ isSyncing: false });
            get().showToast("Cloud sync failed. Check internet.");
          }
        },

        loadFromCloudNow: async (targetUid) => {
          const uid = targetUid || get().firebaseUid;
          if (!uid) return false;

          set({ isSyncing: true });
          try {
            const cloudData = await loadAllFromCloud(uid);
            set((s) => ({
              workers: cloudData.workers || [],
              transactions: cloudData.transactions || [],
              userProfile: cloudData.profile ? { ...s.userProfile, ...cloudData.profile } : s.userProfile,
              isSyncing: false
            }));
            get().showToast("Data restored from cloud!");
            return true;
          } catch (err) {
            console.error("Load from cloud failed:", err);
            set({ isSyncing: false });
            return false;
          }
        },

        handleUserLogin: async (firebaseUser) => {
          const currentUid = get().firebaseUid;
          const isDifferentAccount = currentUid && currentUid !== firebaseUser.uid;

          // Clear any pending debounced writes from previous session so data NEVER leaks
          clearSyncQueue();

          set({
            firebaseUid: firebaseUser.uid,
            isAuthenticated: true,
            isSyncing: true
          });

          try {
            // Load this specific user's private cloud data from Firestore
            const cloudData = await loadAllFromCloud(firebaseUser.uid);

            let resolvedProfile: UserProfile;
            if (cloudData.profile) {
              resolvedProfile = {
                ...INITIAL_PROFILE,
                ...cloudData.profile,
                email: firebaseUser.email || cloudData.profile.email || '',
                isLoggedIn: true
              };
            } else {
              resolvedProfile = {
                ...INITIAL_PROFILE,
                name: firebaseUser.displayName || 'Contractor',
                businessName: firebaseUser.displayName ? `${firebaseUser.displayName} Construction` : 'My Business',
                email: firebaseUser.email || '',
                isLoggedIn: true,
                isCloudSyncEnabled: true
              };
            }

            // Strictly set state to this user's cloud data (isolated per account)
            set({
              workers: cloudData.workers || [],
              transactions: cloudData.transactions || [],
              userProfile: resolvedProfile,
              isSyncing: false
            });

            // If brand new account (0 workers in cloud), initialize root profile once
            if (cloudData.workers.length === 0 && !cloudData.profile) {
              syncProfileToCloud(firebaseUser.uid, resolvedProfile, [], []);
            }
          } catch (err) {
            console.error("[Auth] Failed to load cloud data for user:", err);
            set({ isSyncing: false });
          } finally {
            clearSyncQueue();
          }
        },

        handleUserLogout: () => {
          clearSyncQueue();
          signOutFirebase().catch((err) => console.warn("Firebase signout error", err));
          set({
            workers: [],
            transactions: [],
            userProfile: INITIAL_PROFILE,
            isAuthenticated: false,
            firebaseUid: null,
            currentScreen: { type: 'HOME' }
          });
        },

        clearAllData: () => {
          set({ workers: [], transactions: [], userProfile: INITIAL_PROFILE });
          get().showToast("All application data cleared");
        },

        logout: () => {
          const lang = get().userProfile.language;
          get().handleUserLogout();
          get().showToast(lang === 'hi' ? 'सफलतापूर्वक लॉगआउट हो गया' : 'Logged out successfully');
        }
      };
    },
    {
      name: 'laborbook-store',
      storage: createJSONStorage(() => localForageStorage),
      // Only persist data, not UI state
      partialize: (state) => ({
        workers: state.workers,
        transactions: state.transactions,
        userProfile: state.userProfile,
        isAuthenticated: state.isAuthenticated,
        firebaseUid: state.firebaseUid
      }),
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.error('[LabourBook] Failed to rehydrate from IndexedDB:', error);
          } else {
            console.log('[LabourBook] ✅ Rehydrated from IndexedDB');
          }
          useLaborStore.setState({ _hasHydrated: true });
        };
      }
    }
  )
);

// ─────────────────────────────────────────────
// 7. Backward-compatible useLabor hook & Sync Provider Registration
// ─────────────────────────────────────────────
export const useLabor = useLaborStore;

// Register state provider for background debounced delta sync
registerSyncStateProvider(() => {
  const s = useLaborStore.getState();
  return {
    firebaseUid: s.firebaseUid,
    workers: s.workers,
    transactions: s.transactions,
    userProfile: s.userProfile,
    isCloudSyncEnabled: s.userProfile.isCloudSyncEnabled
  };
});


