import React, { useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativePlatform } from '../services/nativeBridge';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 1. Set Native Status Bar to Pure White matching Splash Screen
    if (isNativePlatform()) {
      StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    }

    // 2. Start parallel scale & fade-in animation on mount
    const animTimer = setTimeout(() => {
      setIsAnimatingIn(true);
    }, 50);

    // 3. Hold for 1800ms, then smoothly transition
    const holdTimer = setTimeout(() => {
      setIsFadingOut(true);
      const exitTimer = setTimeout(() => {
        // Restore Status Bar to Brand Blue after Splash
        if (isNativePlatform()) {
          StatusBar.setBackgroundColor({ color: '#1656D6' }).catch(() => {});
          StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        }
        if (onFinish) onFinish();
      }, 350);
      return () => clearTimeout(exitTimer);
    }, 2000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(holdTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-white text-slate-900 select-none transition-opacity duration-350 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ willChange: 'opacity, transform' }}
    >
      {/* Top Spacer for safe area vertical balance */}
      <div className="w-full pt-[calc(1.5rem+env(safe-area-inset-top,0px))]" />

      {/* Center Branding Column */}
      <div
        className="flex flex-col items-center text-center px-6 transition-all duration-700 ease-out"
        style={{
          transform: isAnimatingIn ? 'scale(1.0)' : 'scale(0.6)',
          opacity: isAnimatingIn ? 1.0 : 0.0,
          willChange: 'transform, opacity'
        }}
      >
        {/* 1. App Logo / Avatar: Clean Circular Badge with Soft Shadow */}
        <div className="w-[125px] h-[125px] rounded-full bg-white shadow-xl shadow-slate-200/60 border border-slate-100 flex items-center justify-center p-3 mb-5 overflow-hidden ring-4 ring-slate-50">
          <img
            src="/ic_app_logo.png"
            alt="LaborBook Logo"
            className="w-full h-full object-contain rounded-full"
          />
        </div>

        {/* 2. Dual-Tone App Title */}
        <div className="flex items-center justify-center text-4xl sm:text-[36px] tracking-tight leading-none select-none">
          <span className="font-extrabold text-[#1E4665]">
            Labor
          </span>
          <span className="font-extrabold text-[#F59E0B]">
            Book
          </span>
        </div>

        {/* 3. Tagline / Subtitle */}
        <p className="mt-2 text-[15px] font-medium text-[#64748B] tracking-normal">
          Your Work. Organized.
        </p>
      </div>

      {/* Bottom Footer Pinned to Bottom */}
      <div
        className="pb-[calc(2rem+env(safe-area-inset-bottom,0px))] transition-opacity duration-700 ease-out"
        style={{
          opacity: isAnimatingIn ? 1.0 : 0.0,
          willChange: 'opacity'
        }}
      >
        <p className="text-[13px] font-semibold text-[#94A3B8] tracking-wider uppercase">
          By Vikash
        </p>
      </div>
    </div>
  );
};
