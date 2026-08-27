import React from 'react';
import { Users, FileText, Settings } from 'lucide-react';
import { useLabor } from '../store/laborStore';

export const BottomNav: React.FC = () => {
  const { currentScreen, navigateTo } = useLabor();

  if (
    currentScreen.type === 'LABOR_DETAIL' ||
    currentScreen.type === 'ADD_LABOR' ||
    currentScreen.type === 'LABOR_REPORT' ||
    currentScreen.type === 'CASH_BOOK_REPORT'
  ) {
    return null;
  }

  const isLaborActive =
    currentScreen.type === 'HOME' ||
    currentScreen.type === 'BATCH_PDF_HUB';

  const isCashBookActive = currentScreen.type === 'CASH_BOOK';

  const isSettingsActive = currentScreen.type === 'SETTINGS';

  return (
    <nav className="bg-white border-t border-slate-200/90 shadow-sm pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md md:max-w-xl mx-auto h-16 flex items-stretch justify-around px-2">
        {/* Tab 1: Labor */}
        <button
          onClick={() => navigateTo({ type: 'HOME' })}
          className="relative flex-1 flex flex-col items-center justify-center pt-1 transition-colors"
        >
          {isLaborActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#1862D6] rounded-b-full" />
          )}
          <Users
            className={`w-5 h-5 mb-1 ${
              isLaborActive ? 'text-[#1862D6] stroke-[2.4]' : 'text-slate-500 stroke-[1.8]'
            }`}
          />
          <span
            className={`text-xs ${
              isLaborActive ? 'text-[#1862D6] font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            Labor
          </span>
        </button>

        {/* Tab 2: Cash book */}
        <button
          onClick={() => navigateTo({ type: 'CASH_BOOK' })}
          className="relative flex-1 flex flex-col items-center justify-center pt-1 transition-colors"
        >
          {isCashBookActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#1862D6] rounded-b-full" />
          )}
          <div className="relative mb-1">
            <FileText
              className={`w-5 h-5 ${
                isCashBookActive ? 'text-[#1862D6] stroke-[2.4]' : 'text-slate-500 stroke-[1.8]'
              }`}
            />
            <span
              className={`absolute inset-0 flex items-center justify-center text-[9px] font-black leading-none ${
                isCashBookActive ? 'text-[#1862D6]' : 'text-slate-500'
              }`}
            >
              ₹
            </span>
          </div>
          <span
            className={`text-xs ${
              isCashBookActive ? 'text-[#1862D6] font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            Cash book
          </span>
        </button>

        {/* Tab 3: Settings */}
        <button
          onClick={() => navigateTo({ type: 'SETTINGS' })}
          className="relative flex-1 flex flex-col items-center justify-center pt-1 transition-colors"
        >
          {isSettingsActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#1862D6] rounded-b-full" />
          )}
          <Settings
            className={`w-5 h-5 mb-1 ${
              isSettingsActive ? 'text-[#1862D6] stroke-[2.4]' : 'text-slate-500 stroke-[1.8]'
            }`}
          />
          <span
            className={`text-xs ${
              isSettingsActive ? 'text-[#1862D6] font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
};

