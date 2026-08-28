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
import { AuthScreen } from './screens/AuthScreen';
import { AdvanceConfirmation } from './components/AdvanceConfirmation';
import { CustomToast } from './components/CustomToast';
import { SplashScreen } from './components/SplashScreen';
import {
  initNativePlatform,
  listenToNetworkChanges
} from './services/nativeBridge';
import { scheduleDailyReminders } from './services/notificationService';

const MainContent: React.FC = () => {
  const {
    currentScreen,
    toastMessage,
    clearToast,
    advanceConfirmation,
    clearAdvanceConfirmation,
    isAuthenticated,
    setIsAuthenticated,
    showToast,
    goBack
  } = useLabor();

  const [showSplash, setShowSplash] = useState(true);

  // 1. Initialize Native Android Hardware Bridge & Event Listeners on Mount
  useEffect(() => {
    // Initialize Capacitor Status Bar & Multi-Level Hardware Back Button
    const cleanupNative = initNativePlatform(
      () => goBack(),
      (msg: string) => showToast(msg)
    );

    // Schedule the 3 Native Daily Reminders
    scheduleDailyReminders();

    return () => {
      cleanupNative();
    };
  }, [goBack, showToast]);

  // Screen router
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

  // 1. High-Performance Native Splash Screen (No Flash of Home Screen)
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Jetpack Compose Authentication Screen if Not Logged In
  if (!isAuthenticated) {
    return <AuthScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // 3. Main Authenticated App View with 100% Fixed Header & Footer
  return (
    <div className="h-[100dvh] w-full bg-[#F8F9FB] text-slate-900 font-sans flex flex-col overflow-hidden select-none selection:bg-blue-500 selection:text-white">
      {/* Top Fixed Navbar */}
      <div className="flex-shrink-0 z-40 bg-white">
        <Navbar />
      </div>

      {/* Main Scrollable Screen View (Only List Content Scrolls) */}
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
  );
};

export function App() {
  return <MainContent />;
}

export default App;
