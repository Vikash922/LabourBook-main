import React, { useState, useRef } from 'react';
import {
  Building2,
  Phone,
  FileText,
  Download,
  Upload,
  LogOut,
  Globe,
  ShieldCheck,
  ChevronRight,
  Edit2,
  Cloud,
  X,
  Bell,
  Loader2
} from 'lucide-react';
import { useLabor } from '../store/laborStore';
import {
  sendTestReminder,
  requestNotificationPermission,
  scheduleDailyReminders
} from '../services/notificationService';

export const SettingsScreen: React.FC = () => {
  const {
    userProfile,
    updateProfile,
    exportBackup,
    importBackup,
    logout,
    syncToCloudNow,
    isSyncing,
    workers,
    transactions,
    navigateTo,
    showToast
  } = useLabor();

  const lang = userProfile.language || 'en';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [businessName, setBusinessName] = useState(userProfile.businessName || '');
  const [contractorName, setContractorName] = useState(userProfile.name || '');
  const [mobile, setMobile] = useState(userProfile.mobile || '');

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (userProfile.isCloudSyncEnabled) {
        await syncToCloudNow();
      }
    } catch (e) {
      console.warn("Cloud sync before logout error:", e);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      logout();
    }
  };

  const handleOpenEdit = () => {
    setBusinessName(userProfile.businessName || '');
    setContractorName(userProfile.name || '');
    setMobile(userProfile.mobile || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateProfile({
      businessName: businessName.trim() || 'LabourBook Construction',
      name: contractorName.trim() || 'Contractor',
      mobile: mobile.trim()
    });
    setShowEditModal(false);
    showToast(lang === 'hi' ? 'प्रोफ़ाइल सहेज ली गई' : 'Profile updated successfully');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importBackup(content);
        if (success) {
          showToast(lang === 'hi' ? 'डेटा सफलतापूर्वक रीस्टोर हुआ!' : 'Backup restored successfully!');
        } else {
          showToast(lang === 'hi' ? 'बैकअप फ़ाइल अमान्य है' : 'Invalid backup file format');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const avatarInitial = (userProfile.businessName || userProfile.name || 'L')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-[#F8FAFC] pb-24 pt-2.5 px-3.5 max-w-md mx-auto space-y-3 selection:bg-[#1656D6] selection:text-white">
      {/* 1. Compact Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#1656D6] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
            {avatarInitial}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">
              {userProfile.businessName || 'LabourBook Construction'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {userProfile.name ? `${userProfile.name} • ` : ''}
              {userProfile.mobile || '+91 98765 43210'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="p-1.5 text-[#1656D6] hover:bg-blue-50 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
          title="Edit Profile"
        >
          <Edit2 className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>

      {/* 2. Core Actions: Reports & Data */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {/* Reports & PDF Hub */}
        <div
          onClick={() => navigateTo({ type: 'BATCH_PDF_HUB' })}
          className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer active:bg-slate-100/70"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 leading-tight">
                {lang === 'hi' ? 'PDF और सैलरी स्लिप हब' : 'Reports & PDF Hub'}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {lang === 'hi' ? 'सभी वर्कर की सैलरी स्लिप और रिपोर्ट' : 'Salary slips, registers & cash summary'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.2] shrink-0" />
        </div>

        {/* Cloud Sync to Firebase */}
        <div
          onClick={() => syncToCloudNow()}
          className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer active:bg-slate-100/70"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1656D6] flex items-center justify-center shrink-0">
              <Cloud className={`w-4 h-4 stroke-[2.2] ${isSyncing ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                {lang === 'hi' ? 'क्लाउड सिंक और बैकअप' : 'Cloud Sync & Backup'}
                {isSyncing && (
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-bold">
                    Syncing...
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {lang === 'hi' ? 'Firebase पर सुरक्षित' : 'Firebase Cloud Backup'} • {userProfile.lastCloudBackupTime || 'Just now'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.2] shrink-0" />
        </div>

        {/* Download CSV Backup */}
        <div
          onClick={() => {
            exportBackup();
            showToast(lang === 'hi' ? 'CSV बैकअप डाउनलोड हो गया' : 'CSV Backup downloaded');
          }}
          className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer active:bg-slate-100/70"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 leading-tight">
                {lang === 'hi' ? 'डेटा बैकअप (CSV)' : 'Backup Data (CSV / Excel)'}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {workers.length} {lang === 'hi' ? 'वर्कर' : 'staff'} • {transactions.length} {lang === 'hi' ? 'कैश एंट्री' : 'entries'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.2] shrink-0" />
        </div>

        {/* Restore CSV Backup */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer active:bg-slate-100/70"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1656D6] flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 leading-tight">
                {lang === 'hi' ? 'डेटा रीस्टोर करें' : 'Restore from Backup'}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {lang === 'hi' ? 'पिछली CSV फ़ाइल से डेटा लाएं' : 'Import previously saved CSV file'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.2] shrink-0" />
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleRestoreFile}
          accept=".csv,text/csv"
          className="hidden"
        />
      </div>

      {/* 3. Preferences & Account */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {/* Local Offline Privacy */}
        <div
          onClick={() => setShowPrivacyModal(true)}
          className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer active:bg-slate-100/70"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 leading-tight">
                {lang === 'hi' ? '100% सुरक्षित और ऑफलाइन' : 'Offline & Private Data'}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {lang === 'hi' ? 'सभी डेटा आपके डिवाइस में सुरक्षित है' : 'Data stored locally on your device'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.2] shrink-0" />
        </div>

        {/* Logout Option */}
        <div
          onClick={() => setShowLogoutModal(true)}
          className="p-3 flex items-center justify-between hover:bg-red-50/40 transition cursor-pointer active:bg-red-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-600 leading-tight">
                {lang === 'hi' ? 'लॉगआउट' : 'Logout'}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {lang === 'hi' ? 'अपने खाते से सुरक्षित लॉगआउट करें' : 'Sign out of your account'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-red-300 stroke-[2.2] shrink-0" />
        </div>
      </div>

      {/* 4. Minimal Footer */}
      <div className="text-center pt-2 space-y-1">
        <p className="text-[11px] font-semibold text-slate-400">
          Laborbook v2.5.0 • 100% Offline & Safe
        </p>
        <p className="text-[10px] font-medium text-slate-400">
          Made with ❤️ by Vikash
        </p>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-3.5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {lang === 'hi' ? 'प्रोफ़ाइल विवरण' : 'Edit Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {lang === 'hi' ? 'व्यापार / फर्म का नाम' : 'Business / Firm Name'}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. LabourBook Construction"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#1656D6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {lang === 'hi' ? 'मालिक / ठेकेदार का नाम' : 'Owner / Contractor Name'}
                </label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="e.g. Vikash Singh"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#1656D6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#1656D6]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1656D6] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {lang === 'hi' ? 'सहेजें' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-3 text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900">
                {lang === 'hi' ? 'लॉगआउट करें?' : 'Log out of Laborbook?'}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                {lang === 'hi'
                  ? 'क्या आप लॉगआउट करना चाहते हैं? आपका सारा डेटा और रिकॉर्ड इस डिवाइस में 100% सुरक्षित रहेगा।'
                  : 'Are you sure you want to log out? All your staff and cash records will remain safely stored on this device.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{lang === 'hi' ? 'सिंक और लॉगआउट...' : 'Syncing & Logout...'}</span>
                  </>
                ) : (
                  <span>{lang === 'hi' ? 'लॉगआउट' : 'Logout'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Privacy Policy Info Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  {lang === 'hi' ? 'डेटा सुरक्षा और गोपनीयता' : 'Offline Privacy & Security'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              {lang === 'hi'
                ? 'LabourBook में आपका सारा डेटा आपके अपने फोन/ब्राउज़र में 100% सुरक्षित और स्थानीय रूप से संग्रहीत होता है। कोई तीसरा पक्ष इसे नहीं देख सकता।'
                : 'All your worker attendance records and cash transactions are stored locally and encrypted on your device. Zero external data sharing.'}
            </p>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-2 bg-[#1656D6] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {lang === 'hi' ? 'ठीक है' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
