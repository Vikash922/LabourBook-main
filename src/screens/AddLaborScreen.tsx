import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  RotateCw, 
  Contact, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Search, 
  X,
  ShieldCheck
} from 'lucide-react';
import { Contacts } from '@capacitor-community/contacts';
import { useLabor } from '../store/laborStore';
import { SalaryType } from '../types';
import { getAvatarBgWithOpacity, AVATAR_PALETTE } from '../utils/avatar';
import { Capacitor } from '@capacitor/core';

interface DeviceContact {
  id: string;
  name: string;
  phone: string;
}

const STORAGE_CONTACTS_KEY = 'laborbook_device_contacts';
const STORAGE_PERMISSION_KEY = 'laborbook_contacts_permission_granted';

export const AddLaborScreen: React.FC = () => {
  const { addWorker, navigateTo, showToast } = useLabor();

  // Permission State (persisted in localStorage)
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_PERMISSION_KEY) === 'true';
  });

  // Accordion state for "Add Staff" (default open or toggled)
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);

  // Manual Form State
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dailyWage, setDailyWage] = useState('');

  // Contacts state (persisted in localStorage)
  const [contacts, setContacts] = useState<DeviceContact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONTACTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal for adding a tapped contact
  const [selectedContact, setSelectedContact] = useState<DeviceContact | null>(null);
  const [modalSalaryType, setModalSalaryType] = useState<SalaryType>('Daily');
  const [modalWageStr, setModalWageStr] = useState('500');

  // Permission dialog state
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Sync contacts & permission to storage
  useEffect(() => {
    localStorage.setItem(STORAGE_CONTACTS_KEY, JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PERMISSION_KEY, String(hasPermission));
  }, [hasPermission]);

  // Auto-prompt for contacts on mount if native and permission not granted
  useEffect(() => {
    let isMounted = true;
    if (!hasPermission && Capacitor.isNativePlatform()) {
      // Small delay to ensure UI renders first
      setTimeout(() => {
        if (isMounted) handlePickRealContacts();
      }, 300);
    }
    return () => { isMounted = false; };
  }, []);

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''))
    );
  }, [contacts, searchQuery]);

  // Handle refresh contacts
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Contacts refreshed');
    }, 500);
  };

  // Native / Web Contact Picker Handler
  const handlePickRealContacts = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        showToast('Checking permissions...');
        // Check permissions
        let perm = await Contacts.checkPermissions();
        if (perm.contacts !== 'granted') {
          perm = await Contacts.requestPermissions();
        }

        if (perm.contacts === 'granted') {
          setHasPermission(true);
          setShowPermissionModal(false);
          showToast('Fetching your contacts, please wait...');
          
          // Fetch ALL contacts to display in the list
          const result = await Contacts.getContacts({
            projection: { name: true, phones: true }
          });
          
          if (result && result.contacts && result.contacts.length > 0) {
            const imported: DeviceContact[] = [];
            
            result.contacts.forEach((c) => {
              const name = c.name?.display;
              const phone = c.phones && c.phones.length > 0 ? c.phones[0].number : '';
              if (name && phone) {
                imported.push({
                  id: `c-native-${c.contactId || Date.now()}-${Math.random()}`,
                  name,
                  phone
                });
              }
            });

            if (imported.length > 0) {
              setContacts(imported); // Replace with phone contacts directly for better UX
              showToast(`Loaded ${imported.length} contacts from phone`);
            } else {
              showToast('No phone numbers found in contacts');
            }
          } else {
            showToast('No contacts found on device');
          }
        } else {
          showToast('Contact permission denied');
        }
        return;
      }

      // Web Fallback
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        const selected = await (navigator as any).contacts.select(props, opts);
        
        if (selected && selected.length > 0) {
          const imported: DeviceContact[] = selected
            .filter((item: any) => item.name?.[0] || item.tel?.[0])
            .map((item: any, idx: number) => ({
              id: `c-real-${Date.now()}-${idx}`,
              name: item.name?.[0] || item.tel?.[0] || 'Unknown',
              phone: item.tel?.[0] || ''
            }));

          if (imported.length > 0) {
            setContacts((prev) => {
              const existingPhones = new Set(prev.map(p => p.phone));
              const newUnique = imported.filter(i => !existingPhones.has(i.phone));
              return [...newUnique, ...prev];
            });
            setHasPermission(true);
            showToast(`Loaded ${imported.length} contact(s) from phone`);
            return;
          }
        }
      } else {
        setShowPermissionModal(true);
      }
    } catch (err: any) {
      if (err.name !== 'SecurityError' && err.name !== 'AbortError' && !err.message?.includes('User canceled')) {
        console.warn("Contact picker error:", err);
        showToast("Error loading contacts: " + err.message);
      }
    }
  };

  // Grant Permission Confirmation Handler (Web only fallback)
  const handleGrantPermission = () => {
    setShowPermissionModal(false);
    setHasPermission(true);
    showToast('Permission allowed. Pick real contacts from your phone.');
  };

  // Manual Form Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const wage = parseFloat(dailyWage) || 0;
    const workerId = addWorker(name.trim(), phoneNumber.trim(), wage, 'Daily');
    showToast(`Laborer ${name.trim()} added`);
    navigateTo({ type: 'LABOR_DETAIL', workerId });
  };

  // Submit from Tapped Contact Modal
  const handleAddContactWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    const wage = parseFloat(modalWageStr) || 0;
    const workerId = addWorker(
      selectedContact.name,
      selectedContact.phone,
      wage,
      modalSalaryType
    );
    showToast(`${selectedContact.name} added to Laborbook`);
    setSelectedContact(null);
    navigateTo({ type: 'LABOR_DETAIL', workerId });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col selection:bg-[#1862D6] selection:text-white">
      {/* 1. Header Matching Reference */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-md md:max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo({ type: 'HOME' })}
              className="p-1 -ml-1 text-slate-900 hover:text-slate-700 active:scale-95 transition"
              title="Back"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Add Labor
            </h1>
          </div>

          <button
            onClick={handleRefresh}
            className={`p-1.5 text-slate-900 hover:text-slate-700 active:scale-95 transition ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Refresh Contacts"
          >
            <RotateCw className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-md md:max-w-xl mx-auto w-full px-4 pt-3.5 pb-28 space-y-3.5">
        
        {/* Card 1: Contacts Permission Banner (Hides once permission is granted) */}
        {!hasPermission && (
          <div className="bg-[#F0F7FF] border border-[#D0E4FE] rounded-2xl p-4 sm:p-5 shadow-2xs transition-all animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="text-[#1862D6] flex items-center justify-center">
                <Contact className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h2 className="text-[15px] sm:text-base font-bold text-[#1862D6] leading-tight">
                Contacts Permission Needed
              </h2>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed mt-2">
              Allow Laborbook to access your device contacts to quickly add laborers without typing their numbers manually.
            </p>

            <div className="flex gap-2.5 mt-4">
              <button
                onClick={handlePickRealContacts}
                className="flex-1 py-3 px-3 bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs sm:text-[13px] rounded-2xl text-center shadow-xs transition"
              >
                Allow Contact Access
              </button>
              <button
                onClick={handlePickRealContacts}
                className="flex-1 py-3 px-3 bg-[#333E4E] hover:bg-[#252E3A] active:scale-98 text-white font-semibold text-xs sm:text-[13px] rounded-2xl text-center shadow-xs transition"
              >
                Pick from Device Contacts
              </button>
            </div>
          </div>
        )}

        {/* Card 2: Add Staff (Non-contact staff info) Accordion Matching Screenshot */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden transition-all">
          <div
            onClick={() => setIsStaffFormOpen(!isStaffFormOpen)}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 active:bg-slate-50 transition select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EEF5FF] text-[#1862D6] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-bold text-[#1862D6] text-sm sm:text-base leading-tight">
                  Add Staff
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Non-contact staff info
                </p>
              </div>
            </div>

            {isStaffFormOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </div>

          {/* Form matching exact Screenshot layout */}
          {isStaffFormOpen && (
            <div className="px-4 pb-5 pt-1 space-y-3.5 animate-in fade-in duration-200">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                {/* 1. Enter Labor Name with active blue border */}
                <div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Labor Name"
                    className="w-full px-4 sm:px-5 py-3.5 bg-white border-2 border-[#1862D6] rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs transition"
                  />
                </div>

                {/* 2. Mobile Number */}
                <div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Mobile Number"
                    className="w-full px-4 sm:px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1862D6] shadow-2xs transition"
                  />
                </div>

                {/* 3. ₹ Daily Wage */}
                <div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={dailyWage}
                    onChange={(e) => setDailyWage(e.target.value)}
                    placeholder="₹ Daily Wage"
                    className="w-full px-4 sm:px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1862D6] shadow-2xs transition"
                  />
                </div>

                {/* 4. Full Width Add Labor Button */}
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-xs sm:text-sm transition shadow-xs flex items-center justify-center ${
                    name.trim()
                      ? 'bg-[#1862D6] hover:bg-blue-700 active:scale-98 text-white shadow-blue-500/20'
                      : 'bg-[#CBD5E1] text-white cursor-not-allowed'
                  }`}
                >
                  Add Labor
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 3. Search Bar Matching Reference */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1862D6]">
            <Search className="w-4 h-4 text-[#1862D6] stroke-[2.2]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name or Mobile number"
            className="w-full pl-10 pr-9 py-3 bg-white border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1862D6]/20 focus:border-[#1862D6] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* 4. Section Header: Your saved contacts */}
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs font-semibold text-slate-600">
            Your saved contacts ({filteredContacts.length})
          </span>
          <span
            onClick={handlePickRealContacts}
            className="text-xs font-semibold text-[#1862D6] cursor-pointer hover:underline"
          >
            Tap contact to add
          </span>
        </div>

        {/* 5. Empty State / Contacts List */}
        {filteredContacts.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-7 sm:p-8 text-center shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              No contacts found
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed mt-2">
              Use the 'Add Staff' form above to register staff directly, or tap 'Allow Contact Access' to import from your phone.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {filteredContacts.map((contact, index) => {
              const initial = (contact.name.trim()[0] || 'C').toUpperCase();
              const avatarBg = getAvatarBgWithOpacity(
                AVATAR_PALETTE[index % AVATAR_PALETTE.length],
                0.12
              );

              return (
                <div
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact);
                    setModalWageStr('500');
                    setModalSalaryType('Daily');
                  }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 active:bg-slate-100/70 cursor-pointer transition select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-slate-800 text-lg shrink-0 shadow-2xs"
                      style={{ backgroundColor: avatarBg }}
                    >
                      {initial}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                        {contact.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 tracking-tight">
                        {contact.phone || "No phone number"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    <span className="text-xs sm:text-sm font-bold text-[#1862D6] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-1.5 rounded-full transition shadow-xs">
                      + Add
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 6. Floating Action Button (FAB) on Bottom-Left Matching Reference */}
      <button
        onClick={handlePickRealContacts}
        className="fixed bottom-6 left-6 z-30 w-13 h-13 sm:w-14 sm:h-14 bg-black hover:bg-neutral-800 active:scale-95 text-white rounded-full flex items-center justify-center shadow-2xl transition"
        title="Pick Contacts from Phone"
      >
        <Contact className="w-6 h-6 text-white stroke-[2.2]" />
      </button>

      {/* Modal 1: Permission Dialog / Fallback File Picker */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1862D6] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-slate-900 text-base">
                Device Contacts Access
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Allow Laborbook to access your device contacts to quickly add laborers without typing numbers manually.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Don't Allow
              </button>
              <button
                onClick={handleGrantPermission}
                className="flex-1 py-2.5 bg-[#1862D6] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Contact Wage Setup */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  Add to Laborers
                </h3>
                <p className="text-xs text-slate-500">{selectedContact.name}</p>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContactWorker} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Salary Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalSalaryType('Daily')}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      modalSalaryType === 'Daily'
                        ? 'bg-[#1862D6] text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Daily Wage
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSalaryType('Monthly')}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      modalSalaryType === 'Monthly'
                        ? 'bg-[#1862D6] text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Monthly Salary
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {modalSalaryType === 'Daily' ? 'Daily Wage Rate (₹ / Day)' : 'Monthly Fixed Salary (₹ / Month)'} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    autoFocus
                    value={modalWageStr}
                    onChange={(e) => setModalWageStr(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1862D6]/20 focus:border-[#1862D6] transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1862D6] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Add Laborer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

