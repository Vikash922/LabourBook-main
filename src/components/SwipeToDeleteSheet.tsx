import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { useLockBodyScroll } from '../utils/scrollLock';

interface SwipeToDeleteSheetProps {
  isOpen: boolean;
  workerName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const SwipeToDeleteSheet: React.FC<SwipeToDeleteSheetProps> = ({
  isOpen,
  workerName,
  onConfirm,
  onClose
}) => {
  const [slide, setSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Safely manage body scroll
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current || !knobRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const knobRect = knobRef.current.getBoundingClientRect();
    
    // max slide is width of container minus width of knob minus side padding (4px on each side = 8px)
    const maxSlide = containerRect.width - knobRect.width - 8;
    
    // calculate relative x from left of container to center of knob
    let newX = e.clientX - containerRect.left - (knobRect.width / 2);
    
    // Clamp
    newX = Math.max(4, Math.min(newX, maxSlide + 4));
    
    setSlide(newX - 4); // Set the transform value based on the initial 4px offset

    // If reached 95% of the way, confirm
    if (newX - 4 >= maxSlide * 0.95) {
      setIsDragging(false);
      onConfirm();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    setSlide(0); // Snap back
  };

  const firstLetter = workerName.trim().charAt(0).toUpperCase() || '?';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl pt-3 px-6 pb-8 relative animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-700 transition cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Worker Info */}
        <div className="flex flex-col items-center mt-6 mb-8">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 mb-4 shadow-xs">
            <span className="text-4xl font-black text-slate-800">{firstLetter}</span>
          </div>
          <h2 className="text-[22px] font-bold text-slate-900 leading-tight text-center">
            {workerName}
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            This action cannot be undone
          </p>
        </div>

        {/* Swipe Button */}
        <div
          ref={containerRef}
          className="relative w-full h-[60px] bg-[#C62828] rounded-[20px] flex items-center overflow-hidden touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/90 font-bold text-[15px] pl-8">
              Swipe to Delete Labor
            </span>
          </div>
          
          <div
            ref={knobRef}
            style={{ transform: `translateX(${slide}px)` }}
            className="absolute left-1 w-[52px] h-[52px] bg-white rounded-[16px] flex items-center justify-center cursor-grab active:cursor-grabbing border border-slate-100 shadow-sm transition-none z-10"
          >
            <ArrowRight className="w-6 h-6 text-[#C62828] stroke-[2.5]" />
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
