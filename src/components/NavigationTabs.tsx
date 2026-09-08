import React from 'react';
import { Gift, Search, KeyRound, LogOut, Bot } from 'lucide-react';

export type AppTab = 'activate' | 'chatgpt' | 'track' | 'buy' | 'admin';

interface NavigationTabsProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  activeOrderCount: number;
  availableCdkCount: number;
  isAdminMode?: boolean;
  onExitAdmin?: () => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  setActiveTab,
  activeOrderCount,
  availableCdkCount,
  isAdminMode = false,
  onExitAdmin,
}) => {
  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 py-2">
      {/* Activate Telegram Tab */}
      <button
        onClick={() => setActiveTab('activate')}
        className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
          activeTab === 'activate'
            ? 'bg-[#14b8a6] hover:bg-[#0d9488] text-slate-950 shadow-lg shadow-teal-500/25'
            : 'bg-[#0f2329] hover:bg-[#153038] text-slate-300 border border-[#1b3b44]'
        }`}
      >
        <Gift className="w-4 h-4 stroke-[2.2]" />
        <span>Telegram CDK</span>
      </button>

      {/* ChatGPT Plus CDK Tab */}
      <button
        onClick={() => setActiveTab('chatgpt')}
        className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
          activeTab === 'chatgpt'
            ? 'bg-[#10b981] hover:bg-[#059669] text-slate-950 shadow-lg shadow-emerald-500/25'
            : 'bg-[#09221e] hover:bg-[#0f2e29] text-emerald-300 border border-emerald-500/30'
        }`}
      >
        <Bot className="w-4 h-4 stroke-[2.2]" />
        <span>ChatGPT Plus</span>
      </button>

      {/* Track Order Tab */}
      <button
        onClick={() => setActiveTab('track')}
        className={`relative flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
          activeTab === 'track'
            ? 'bg-[#14b8a6] hover:bg-[#0d9488] text-slate-950 shadow-lg shadow-teal-500/25'
            : 'bg-[#0f2329] hover:bg-[#153038] text-slate-300 border border-[#1b3b44]'
        }`}
      >
        <Search className="w-4 h-4 stroke-[2.2]" />
        <span>Track order</span>
        {activeOrderCount > 0 && (
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-400 text-slate-950 animate-pulse">
            {activeOrderCount} live
          </span>
        )}
      </button>

      {/* Admin Tab - ONLY visible if opened via #admin */}
      {isAdminMode && (
        <div className="flex items-center gap-1.5 bg-[#0a1f26] p-1 rounded-xl border border-teal-500/30">
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-[#14b8a6] text-slate-950 shadow-md font-bold'
                : 'text-teal-300 hover:bg-[#13323c]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Admin Panel</span>
            {availableCdkCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#0b2830] text-teal-300 border border-teal-500/30">
                {availableCdkCount}
              </span>
            )}
          </button>

          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              title="Exit Admin Panel (Removes #admin)"
              className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
