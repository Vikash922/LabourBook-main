import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start parallel scale & fade-in animation on mount
    const animTimer = setTimeout(() => {
      setIsAnimatingIn(true);
    }, 50);

    // Hold for 1500ms after the 800ms animation (Total: 2300ms)
    const holdTimer = setTimeout(() => {
      setIsFadingOut(true);
      const exitTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 400); // Smooth exit transition
      return () => clearTimeout(exitTimer);
    }, 2300);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(holdTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-white text-slate-900 select-none transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ willChange: 'opacity, transform' }}
    >
      {/* Top Spacer for vertical balance */}
      <div className="w-full pt-8" />

      {/* Center Branding Column (Centered Vertically & Horizontally) */}
      <div
        className="flex flex-col items-center text-center px-6 transition-all duration-800 ease-out"
        style={{
          transform: isAnimatingIn ? 'scale(1.0)' : 'scale(0.5)',
          opacity: isAnimatingIn ? 1.0 : 0.0,
          willChange: 'transform, opacity'
        }}
      >
        {/* 1. App Logo / Avatar: 140px x 140px, Circle / Rounded Pill */}
        <div className="w-[140px] h-[140px] rounded-full bg-white shadow-xl shadow-slate-200/60 border border-slate-100 flex items-center justify-center p-3.5 mb-6 ring-1 ring-slate-100">
          <img
            src="/ic_app_logo.png"
            alt="LaborBook Logo"
            className="w-full h-full object-contain drop-shadow-sm"
          />
        </div>

        {/* 2. Dual-Tone App Title (Horizontal Row) */}
        <div className="flex items-center justify-center text-4xl sm:text-[36px] tracking-tight leading-none select-none">
          <span className="font-extrabold text-[#1E4665]">
            Labor
          </span>
          <span className="font-extrabold text-[#F59E0B]">
            Book
          </span>
        </div>

        {/* 3. Tagline / Subtitle: 8px spacing, 16px font, Medium 500, Slate Gray */}
        <p className="mt-2 text-base sm:text-[16px] font-medium text-[#64748B] tracking-normal">
          Your Work. Organized.
        </p>
      </div>

      {/* Bottom Footer (Pinned to Bottom Center, 32px padding, SemiBold 600, Cool Gray) */}
      <div
        className="pb-8 safe-bottom transition-opacity duration-800 ease-out"
        style={{
          opacity: isAnimatingIn ? 1.0 : 0.0,
          willChange: 'opacity'
        }}
      >
        <p className="text-sm sm:text-[14px] font-semibold text-[#94A3B8] tracking-wide">
          By Vikash
        </p>
      </div>
    </div>
  );
};
