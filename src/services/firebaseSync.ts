import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { LaborWorker, CashTransaction, UserProfile, DailyAttendance } from "../types";

/**
 * Format timestamp into readable string e.g. "Aug 25, 2026 04:30 PM"
 */
export function formatSyncTimestamp(date = new Date()): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[date.getMonth()];
  const d = date.getDate();
  const y = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? "0" + minutes : minutes;
  return `${m} ${d}, ${y} ${hours}:${strMinutes} ${ampm}`;
}

/**
 * Clean & sanitize attendance map for lossless, permanent Firebase storage
 */
export function sanitizeAttendanceMap(
  attendance: Record<string, DailyAttendance> = {}
): Record<string, DailyAttendance> {
  const clean: Record<string, DailyAttendance> = {};
  for (const [dateKey, att] of Object.entries(attendance || {})) {
    if (!att) continue;
    const otHours = Number(att.overtimeHours) || 0;
    const otRate = Number(att.overtimeRate) || 0;
    const otAmount =
      att.overtimeAmount !== undefined && att.overtimeAmount !== null
        ? Number(att.overtimeAmount)
        : (otHours > 0 && otRate > 0 ? Math.round(otHours * otRate * 100) / 100 : 0);

    clean[dateKey] = {
      fullDate: att.fullDate || dateKey,
      dayNumber: Number(att.dayNumber) || 1,
      dayOfWeek: att.dayOfWeek || "Mon",
      status: att.status || "UNMARKED",
      overtimeHours: otHours,
      overtimeRate: otRate,
      overtimeAmount: otAmount,
      advanceAmount: Number(att.advanceAmount) || 0,
      note: att.note ? String(att.note) : "",
      paymentMethod: att.paymentMethod === "ONLINE" ? "ONLINE" : "CASH"
    };
  }
  return clean;
}

/**
 * Compute Root Document summary statistics & dynamic Workers List
 */
export function computeUserMetadata(
  profile: UserProfile,
  workers: LaborWorker[],
  transactions: CashTransaction[],
  uid?: string
) {
  let totalAdvances = 0;
  let wagesSum = 0;
  for (const w of workers) {
    wagesSum += Number(w.dailyWage) || 0;
    for (const att of Object.values(w.attendance || {})) {
      if (att.advanceAmount) totalAdvances += Number(att.advanceAmount) || 0;
    }
  }

  let cashInSum = 0;
  let cashOutSum = 0;
  for (const t of transactions) {
    if (t.type === "CASH_IN") cashInSum += Number(t.amount) || 0;
    if (t.type === "CASH_OUT") cashOutSum += Number(t.amount) || 0;
  }

  const now = new Date();
  const formattedNow = formatSyncTimestamp(now);

  // Exact up-to-date active workers array (deleted workers are automatically excluded)
  const workersList = workers.map((w) => ({
    workerId: w.id,
    name: w.name,
    phoneNumber: w.phoneNumber || "",
    dailyWage: Number(w.dailyWage) || 0,
    salaryType: w.salaryType || "Daily"
  }));

  // Up-to-date summary string
  const summaryStr =
    workers.length > 0
      ? workers
          .map(
            (w) =>
              `${w.name}${w.phoneNumber ? ` (${w.phoneNumber})` : ""}: ₹${w.dailyWage || 0}/${w.salaryType === "Monthly" ? "month" : "day"}`
          )
          .join("; ")
      : "No active workers";

  return {
    uid: uid || "",
    businessName: profile.businessName || "Laborbook Business",
    email: profile.email || "",
    userEmail: profile.email || "",
    mobile: profile.mobile || "",
    totalWorkers: workers.length,
    workerCount: workers.length,
    workersList: workersList,
    workersSummary: summaryStr,
    workerSummary: summaryStr,
    totalTransactions: transactions.length,
    transactionCount: transactions.length,
    totalAdvances: totalAdvances,
    totalAdvanceGiven: totalAdvances,
    wagesSum: wagesSum,
    cashInSum: cashInSum,
    totalCashIn: cashInSum,
    cashOutSum: cashOutSum,
    totalCashOut: cashOutSum,
    cashbookBalance: cashInSum - cashOutSum,
    cashbookNetBalance: cashInSum - cashOutSum,
    lastSyncedAt: formattedNow,
    lastSyncTime: formattedNow,
    lastActive: formattedNow,
    lastBackupTime: formattedNow,
    lastAppOpened: formattedNow,
    encryption: "AES-256-GCM / Cloud Firestore Encrypted",
    updatedAtTimestamp: now.getTime()
  };
}

/**
 * 1. Sync Worker to Firestore (Incremental)
 * users/{uid}/workers/{workerId}
 */
export async function syncWorkerToCloud(uid: string, worker: LaborWorker): Promise<void> {
  if (!uid) return;
  try {
    const cleanAttendance = sanitizeAttendanceMap(worker.attendance);
    const workerRef = doc(db, "users", uid, "workers", worker.id);
    await setDoc(
      workerRef,
      {
        id: worker.id,
        name: worker.name,
        phoneNumber: worker.phoneNumber,
        dailyWage: Number(worker.dailyWage) || 0,
        salaryType: worker.salaryType,
        avatarColorHex: worker.avatarColorHex,
        createdAt: Number(worker.createdAt) || Date.now(),
        attendance: cleanAttendance
      },
      { merge: true }
    );
  } catch (err) {
    console.error("[FirebaseSync] Failed to sync worker:", err);
  }
}

/**
 * 2. Delete Worker from Firestore
 */
export async function deleteWorkerFromCloud(uid: string, workerId: string): Promise<void> {
  if (!uid) return;
  try {
    const workerRef = doc(db, "users", uid, "workers", workerId);
    await deleteDoc(workerRef);
  } catch (err) {
    console.error("[FirebaseSync] Failed to delete worker from cloud:", err);
  }
}

/**
 * 3. Sync Cash Transaction to Firestore (Incremental)
 * users/{uid}/payments/{transactionId}
 */
export async function syncTransactionToCloud(
  uid: string,
  transaction: CashTransaction
): Promise<void> {
  if (!uid) return;
  try {
    const txRef = doc(db, "users", uid, "payments", transaction.id);
    await setDoc(
      txRef,
      {
        id: transaction.id,
        dateDisplay: transaction.dateDisplay,
        fullDate: transaction.fullDate,
        type: transaction.type,
        amount: Number(transaction.amount) || 0,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes || "",
        timestamp: Number(transaction.timestamp) || Date.now()
      },
      { merge: true }
    );
  } catch (err) {
    console.error("[FirebaseSync] Failed to sync transaction:", err);
  }
}

/**
 * 4. Delete Cash Transaction from Firestore
 */
export async function deleteTransactionFromCloud(uid: string, txId: string): Promise<void> {
  if (!uid) return;
  try {
    const txRef = doc(db, "users", uid, "payments", txId);
    await deleteDoc(txRef);
  } catch (err) {
    console.error("[FirebaseSync] Failed to delete transaction from cloud:", err);
  }
}

/**
 * 5. Sync User Profile & Root Meta
 * users/{uid}/profile/settings & users/{uid}
 */
export async function syncProfileToCloud(
  uid: string,
  profile: UserProfile,
  workers?: LaborWorker[],
  transactions?: CashTransaction[]
): Promise<void> {
  if (!uid) return;
  try {
    const syncTime = formatSyncTimestamp();
    const profileRef = doc(db, "users", uid, "profile", "settings");
    await setDoc(
      profileRef,
      {
        name: profile.name || "",
        businessName: profile.businessName || "",
        mobile: profile.mobile || "",
        email: profile.email || "",
        language: profile.language === "hi" ? "Hindi" : "English",
        isPro: profile.isPro ?? true,
        isCloudSyncEnabled: profile.isCloudSyncEnabled ?? true,
        lastCloudBackupTime: syncTime
      },
      { merge: true }
    );

    if (workers && transactions) {
      const rootUserRef = doc(db, "users", uid);
      const meta = computeUserMetadata(profile, workers, transactions, uid);
      await setDoc(rootUserRef, meta, { merge: true });
    }
  } catch (err) {
    console.error("[FirebaseSync] Failed to sync profile:", err);
  }
}

/**
 * 6. Full Cloud Push (Batch sync everything to Firestore)
 */
export async function syncAllToCloud(
  uid: string,
  workers: LaborWorker[],
  transactions: CashTransaction[],
  profile: UserProfile
): Promise<string> {
  if (!uid) throw new Error("User UID required for cloud sync");

  const syncTime = formatSyncTimestamp();
  const batch = writeBatch(db);

  // 1. Root Doc with complete refreshed workersList and summaries
  const rootRef = doc(db, "users", uid);
  const meta = computeUserMetadata(profile, workers, transactions, uid);
  batch.set(rootRef, meta, { merge: true });

  // 2. Profile Doc
  const profileRef = doc(db, "users", uid, "profile", "settings");
  batch.set(
    profileRef,
    {
      name: profile.name || "",
      businessName: profile.businessName || "",
      mobile: profile.mobile || "",
      email: profile.email || "",
      language: profile.language === "hi" ? "Hindi" : "English",
      isPro: profile.isPro ?? true,
      isCloudSyncEnabled: profile.isCloudSyncEnabled ?? true,
      lastCloudBackupTime: syncTime
    },
    { merge: true }
  );

  // 3. All Workers
  for (const w of workers) {
    const wRef = doc(db, "users", uid, "workers", w.id);
    const cleanAttendance = sanitizeAttendanceMap(w.attendance);
    batch.set(
      wRef,
      {
        id: w.id,
        name: w.name,
        phoneNumber: w.phoneNumber,
        dailyWage: Number(w.dailyWage) || 0,
        salaryType: w.salaryType,
        avatarColorHex: w.avatarColorHex,
        createdAt: Number(w.createdAt) || Date.now(),
        attendance: cleanAttendance
      },
      { merge: true }
    );
  }

  // 4. All Transactions
  for (const t of transactions) {
    const tRef = doc(db, "users", uid, "payments", t.id);
    batch.set(
      tRef,
      {
        id: t.id,
        dateDisplay: t.dateDisplay,
        fullDate: t.fullDate,
        type: t.type,
        amount: Number(t.amount) || 0,
        paymentMethod: t.paymentMethod,
        notes: t.notes || "",
        timestamp: Number(t.timestamp) || Date.now()
      },
      { merge: true }
    );
  }

  await batch.commit();
  return syncTime;
}

/**
 * 7. Full Cloud Pull (Download user's complete data from Firestore)
 */
export async function loadAllFromCloud(uid: string): Promise<{
  workers: LaborWorker[];
  transactions: CashTransaction[];
  profile: Partial<UserProfile> | null;
}> {
  if (!uid) throw new Error("User UID required for loading data");

  // Fetch Profile, Workers, and Transactions in parallel for instant (<150ms) hydration
  let profile: Partial<UserProfile> | null = null;
  const workers: LaborWorker[] = [];
  const transactions: CashTransaction[] = [];

  const profileRef = doc(db, "users", uid, "profile", "settings");
  const workersCol = collection(db, "users", uid, "workers");
  const txCol = collection(db, "users", uid, "payments");

  const [profileResult, workersResult, txResult] = await Promise.allSettled([
    getDoc(profileRef),
    getDocs(workersCol),
    getDocs(txCol)
  ]);

  // A. Process Profile
  if (profileResult.status === "fulfilled" && profileResult.value.exists()) {
    const data = profileResult.value.data();
    profile = {
      name: data.name,
      businessName: data.businessName,
      mobile: data.mobile,
      email: data.email,
      language: data.language === "Hindi" ? "hi" : "en",
      isCloudSyncEnabled: data.isCloudSyncEnabled ?? true,
      lastCloudBackupTime: data.lastCloudBackupTime || "Just now"
    };
  }

  // B. Process Workers
  if (workersResult.status === "fulfilled") {
    workersResult.value.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.id) {
        workers.push({
          id: d.id,
          name: d.name || "Worker",
          phoneNumber: d.phoneNumber || "",
          dailyWage: Number(d.dailyWage) || 0,
          salaryType: d.salaryType === "Monthly" ? "Monthly" : "Daily",
          avatarColorHex: d.avatarColorHex || "#1D61D2",
          createdAt: Number(d.createdAt) || Date.now(),
          attendance: sanitizeAttendanceMap(d.attendance || {})
        });
      }
    });
  }

  // C. Process Transactions
  if (txResult.status === "fulfilled") {
    txResult.value.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.id) {
        transactions.push({
          id: d.id,
          dateDisplay: d.dateDisplay || "",
          fullDate: d.fullDate || "",
          type: d.type === "CASH_OUT" ? "CASH_OUT" : "CASH_IN",
          amount: Number(d.amount) || 0,
          paymentMethod: d.paymentMethod === "ONLINE" ? "ONLINE" : "CASH",
          notes: d.notes || "",
          timestamp: Number(d.timestamp) || Date.now()
        });
      }
    });
  }

  // Sort workers & transactions
  workers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return { workers, transactions, profile };
}
