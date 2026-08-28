import React, { useEffect } from 'react';

interface CustomToastProps {
  message: string | null;
  onDismiss: () => void;
}

export const CustomToast: React.FC<CustomToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;


  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9990] px-5 py-2.5 bg-[#424242] text-white text-[13px] font-normal rounded-full shadow-md max-w-[85vw] animate-in fade-in slide-in-from-bottom-2 duration-200 select-none pointer-events-none"
    >
      <span className="tracking-wide text-center block">
        {message}
      </span>
    </div>
  );
};
