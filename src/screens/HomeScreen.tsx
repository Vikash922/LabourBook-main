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
    <div className="min-h-[calc(100dvh-4rem)] pb-36 pt-3 px-3.5 max-w-md md:max-w-xl mx-auto space-y-4 selection:bg-[#1656D6] selection:text-white">
      {/* 1. Search Bar (Exact Reference Design: Rounded Box, Clean Search Icon) */}
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

      {/* 2. Section Heading: My Labour */}
      <div className="space-y-2.5">
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

        {/* 3. Worker Cards List (Exact Reference Layout) */}
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

      {/* 4. Floating Action Button: + ADD LABOUR */}
      <button
        type="button"
        onClick={() => navigateTo({ type: 'ADD_LABOR' })}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 z-30 flex items-center gap-2 px-4.5 py-3 bg-[#1656D6] hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-[0_8px_24px_rgba(22,86,214,0.45)] uppercase tracking-wider transition-all duration-150 cursor-pointer"
      >
        <UserPlus className="w-4 h-4 stroke-[2.5]" />
        <span>ADD LABOUR</span>
      </button>
    </div>
  );
};
