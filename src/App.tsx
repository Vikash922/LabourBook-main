import React, { useEffect, useState } from 'react';
import { useLabor } from './store/laborStore';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { LaborDetailScreen } from './screens/LaborDetailScreen';
import { AddLaborScreen } from './screens/AddLaborScreen';
import { CashBookScreen } from './screens/CashBookScreen';
import { CashBookReportScreen } from './screens/CashBookReportScreen';
import { LaborReportScreen } from './screens/LaborReportScreen';
import { BatchPdfHubScreen } from './screens/BatchPdfHubScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdvanceConfirmation } from './components/AdvanceConfirmation';
import { CustomToast } from './components/CustomToast';
import { AuthScreen } from './screens/AuthScreen';
import { SplashScreen } from './components/SplashScreen';
import { subscribeToAuthChanges } from './services/firebaseAuth';

import {
  registerServiceWorker,
  scheduleDailyReminders
} from './services/notificationService';
import { initNativePlatform, listenToNetworkChanges } from './services/nativeBridge';

const MainContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  const {
    currentScreen,
    toastMessage,
    clearToast,
    advanceConfirmation,
    clearAdvanceConfirmation,
    isAuthenticated,
    setIsAuthenticated,
    handleUserLogin,
    handleUserLogout
  } = useLabor();

  // Listen to Firebase Auth state for seamless multi-user switching and isolated accounts
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (user) {
        handleUserLogin(user);
      } else {
        handleUserLogout();
      }
    });

    return () => unsubscribe();
  }, [handleUserLogin, handleUserLogout]);

  // Online / Reconnection Auto Cloud Sync Listener (Native Network + Web Listener)
  useEffect(() => {
    const cleanup = listenToNetworkChanges(() => {
      const state = useLabor.getState();
      if (state.firebaseUid && state.userProfile.isCloudSyncEnabled) {
        state.syncToCloudNow().then(() => {
          state.showToast('Back online — Cloud synced!');
        });
      }
    });

    return () => cleanup();
  }, []);

  // Initialize PWA Service Worker & 3 Daily Automated Push Reminders
  useEffect(() => {
    registerServiceWorker();
    scheduleDailyReminders(true);
  }, []);

  // Initialize Native Android Status Bar & Multi-Level Hardware Back Button Handling
  useEffect(() => {
    const cleanup = initNativePlatform(
      () => {
        const state = useLabor.getState();
        return state.goBack();
      },
      (msg) => {
        const state = useLabor.getState();
        state.showToast(msg);
      }
    );

    return () => cleanup();
  }, []);

  const renderScreen = () => {
    switch (currentScreen.type) {
      case 'HOME':
        return <HomeScreen />;
      case 'LABOR_DETAIL':
        return <LaborDetailScreen workerId={currentScreen.workerId} />;
      case 'ADD_LABOR':
        return <AddLaborScreen />;
      case 'CASH_BOOK':
        return <CashBookScreen />;
      case 'CASH_BOOK_REPORT':
        return <CashBookReportScreen />;
      case 'LABOR_REPORT':
        return <LaborReportScreen workerId={currentScreen.workerId} />;
      case 'BATCH_PDF_HUB':
        return <BatchPdfHubScreen />;
      case 'SETTINGS':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <>
      {/* 1. High-Performance Splash Screen on Launch */}
      {showSplash && (
        <SplashScreen
          onFinish={() => setShowSplash(false)}
        />
      )}

      {/* 2. Authentication Screen if Not Logged In */}
      {!isAuthenticated ? (
        <AuthScreen onLogin={() => setIsAuthenticated(true)} />
      ) : (
        /* 3. Main Authenticated App View */
        <div className="h-[100dvh] bg-[#F8F9FB] text-slate-900 font-sans flex flex-col overflow-hidden select-none selection:bg-blue-500 selection:text-white">
          {/* Top Fixed Navbar */}
          <div className="flex-shrink-0 z-40 bg-white">
            <Navbar />
          </div>

          {/* Main Scrollable Screen View */}
          <main
            key={currentScreen.type + ('workerId' in currentScreen ? currentScreen.workerId : '')}
            className="flex-1 w-full overflow-y-auto overscroll-y-contain screen-animate"
          >
            {renderScreen()}
          </main>

          {/* Bottom Fixed Navigation */}
          <div className="flex-shrink-0 z-40 bg-white">
            <BottomNav />
          </div>

          {/* Advance Confirmation Notification */}
          <AdvanceConfirmation
            confirmation={advanceConfirmation}
            onDismiss={clearAdvanceConfirmation}
          />

          {/* Floating Bottom In-App Toast Notification */}
          <CustomToast
            message={toastMessage}
            onDismiss={clearToast}
          />
        </div>
      )}
    </>
  );
};

export function App() {
  return <MainContent />;
}

export default App;
