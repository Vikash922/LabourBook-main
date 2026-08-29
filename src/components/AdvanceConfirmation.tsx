import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Trash2 } from 'lucide-react';
import { AdvanceConfirmationState } from '../types';
import { useLockBodyScroll } from '../utils/scrollLock';

interface AdvanceConfirmationProps {
  confirmation: AdvanceConfirmationState;
  onDismiss: () => void;
}

export const AdvanceConfirmation: React.FC<AdvanceConfirmationProps> = ({
  confirmation,
  onDismiss
}) => {
  const [show, setShow] = useState(false);
  
  useLockBodyScroll(Boolean(confirmation));

  useEffect(() => {
    if (confirmation) {
      // Delay mounting animation to allow initial render
      requestAnimationFrame(() => setShow(true));
      
      // Auto-dismiss timer (1.8 seconds)
      const timer = setTimeout(() => {
        handleClose();
      }, 1800);
      
      // Haptic feedback
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(confirmation.type === 'ADDED' ? [50, 50, 50] : 50);
      }
      
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [confirmation]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onDismiss, 300); // Wait for exit animation to complete
  };

  if (!confirmation && !show) return null;

  const isAdded = confirmation?.type === 'ADDED';
  const workerName = confirmation?.workerName || 'Worker';
  const amount = isAdded && 'amount' in confirmation ? confirmation.amount : 0;
  const paymentMethod = isAdded && 'paymentMethod' in confirmation && confirmation.paymentMethod === 'ONLINE' ? 'Online / UPI 📱' : 'Cash 💵';

  const outerBg = isAdded ? 'bg-[#DCFCE7]' : 'bg-[#FEF2F2]';
  const innerBg = isAdded ? 'bg-[#10B981]' : 'bg-[#EF4444]';

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 px-5"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-[#000000] transition-opacity duration-300 ease-out ${
          show ? 'opacity-45' : 'opacity-0'
        }`} 
        onClick={handleClose} 
      />
      
      {/* Card */}
      <div 
        className={`relative w-full max-w-[340px] md:max-w-[380px] bg-white rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] p-6 flex flex-col items-center
          transition-all duration-[350ms]
          ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-[0.6] opacity-0 translate-y-4'}
        `}
        style={{
          transitionTimingFunction: show ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.4, 0, 1, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Central Icon Badge */}
        <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center ${outerBg} mb-[18px]`}>
          <div className={`w-[56px] h-[56px] rounded-full flex items-center justify-center ${innerBg} shadow-inner
            transition-transform duration-500 delay-100
            ${show ? 'scale-100' : 'scale-50'}
          `}
          style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {isAdded ? (
              <Check className="w-8 h-8 text-white stroke-[3]" />
            ) : (
              <Trash2 className="w-8 h-8 text-white stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[20px] font-bold text-[#111827] text-center leading-tight mb-1.5">
          {isAdded ? 'Advance Saved!' : 'Advance Removed'}
        </h2>
        
        {/* Highlight Amount */}
        {amount > 0 && isAdded && (
          <div className="text-[26px] font-extrabold text-[#10B981] mb-2 leading-none">
            ₹{amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1)}
          </div>
        )}
        
        {/* Subtitle / Info */}
        <p className={`text-[13px] text-[#6B7280] text-center font-medium px-2 leading-relaxed ${isAdded ? 'mb-[22px]' : 'mb-[24px]'}`}>
          {isAdded ? (
            <>
              Updated for <span className="font-bold text-slate-700">{workerName}</span><br/>
              <span className="inline-block mt-1.5 px-3 py-1 bg-[#F3F4F6] text-[#4B5563] text-[11px] rounded-full font-semibold">
                {paymentMethod}
              </span>
            </>
          ) : (
            <>
              Advance has been cleared for <span className="font-bold text-slate-700">{workerName}</span>.
            </>
          )}
        </p>
        
        {/* Bottom Action Button */}
        <button
          type="button"
          onClick={handleClose}
          className={`w-full h-[46px] rounded-[23px] flex items-center justify-center font-bold text-[14px] transition-transform active:scale-95
            ${isAdded 
              ? 'bg-[#10B981] hover:bg-emerald-600 text-white shadow-sm' 
              : 'bg-[#F3F4F6] hover:bg-gray-200 text-[#374151]'
            }
          `}
        >
          {isAdded ? 'Done' : 'Got It'}
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
