import React, { useMemo } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { useLabor } from '../store/laborStore';
import { WorkerCard } from '../components/WorkerCard';

export const HomeScreen: React.FC = () => {
  const { 
    workers, 
    searchQuery, 
    setSearchQuery, 
    navigateTo 
  } = useLabor();

  // Filter workers based on search query
  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workers;
    const q = searchQuery.toLowerCase().trim();
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.phoneNumber && w.phoneNumber.includes(q))
    );
  }, [workers, searchQuery]);

  return (
    <div className="relative flex flex-col h-full w-full">
      {/* 1. Header Area: Search Bar and Heading (Fixed / Non-scrolling) */}
      <div className="flex-shrink-0 pt-3 px-3.5 max-w-md md:max-w-xl mx-auto space-y-3 w-full">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name or Mobile number"
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-sm font-normal text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1656D6]/20 focus:border-[#1656D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Section Heading: My Labour */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            My Labour
          </h2>
          {workers.length > 0 && (
            <span className="text-xs font-semibold text-slate-400">
              {filteredWorkers.length} {filteredWorkers.length === 1 ? 'Worker' : 'Workers'}
            </span>
          )}
        </div>
      </div>

      {/* 2. Worker Cards List (Only this part scrolls) */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 pb-24">
        <div className="max-w-md md:max-w-xl mx-auto space-y-2.5 pt-1">
          {filteredWorkers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3 shadow-2xs animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1656D6] flex items-center justify-center mx-auto shadow-inner">
                <Users className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {searchQuery ? 'No labour found' : 'No labours added yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try searching with another name or mobile number.'
                  : 'Add your first labour to start tracking attendance, wages, advances, and cash book.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => navigateTo({ type: 'ADD_LABOR' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1656D6] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-full shadow-md shadow-[#1656D6]/25 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>+ Add First Labour</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredWorkers.map((worker, index) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  index={index}
                  onCardClick={() => navigateTo({ type: 'LABOR_DETAIL', workerId: worker.id })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigateTo({ type: 'ADD_LABOR' })}
        className="absolute bottom-6 right-5 sm:bottom-8 sm:right-6 z-30 flex items-center justify-center px-7 py-3.5 bg-gradient-to-r from-[#1656D6] to-[#0A3F9E] hover:from-[#0A3F9E] hover:to-[#1656D6] active:scale-95 text-white font-black text-[13px] sm:text-sm rounded-full shadow-[0_12px_28px_rgba(22,86,214,0.45)] ring-2 ring-white/20 uppercase tracking-widest transition-all duration-300 cursor-pointer"
      >
        <span>ADD LABOUR</span>
      </button>
    </div>
  );
};
