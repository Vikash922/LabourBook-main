import React from 'react';
import { LaborWorker } from '../types';
import { getAvatarBgWithOpacity, AVATAR_PALETTE } from '../utils/avatar';

interface WorkerCardProps {
  worker: LaborWorker;
  onCardClick: () => void;
  index?: number;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  onCardClick,
  index = 0
}) => {
  const initial = (worker.name.trim()[0] || 'W').toUpperCase();
  const avatarColor = worker.avatarColorHex || AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  const avatarBg = getAvatarBgWithOpacity(avatarColor, 0.14);

  return (
    <div
      onClick={onCardClick}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-150 p-4 sm:p-5 flex items-center gap-4 cursor-pointer card-press select-none"
    >
      {/* 1. Circular Pastel Avatar */}
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-slate-900 text-lg sm:text-xl shrink-0 shadow-2xs"
        style={{ backgroundColor: avatarBg, color: avatarColor }}
      >
        {initial}
      </div>

      {/* 2. Worker Name and Phone Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight truncate hover:text-[#1656D6] transition">
          {worker.name}
        </h3>
        <p className="text-sm sm:text-base text-slate-500 font-medium mt-1 tracking-tight truncate">
          {worker.phoneNumber || "No mobile number"}
        </p>
      </div>
    </div>
  );
};
