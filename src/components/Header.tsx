import React, { useState } from 'react';
import { Gift, Globe, Moon, Sun, Bot } from 'lucide-react';

interface HeaderProps {
  currentLang: string;
  setLang: (lang: string) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenAdmin?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: 'activate' | 'chatgpt') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  setLang,
  isDark,
  setIsDark,
  activeTab = 'chatgpt',
  onSelectTab,
}) => {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'es', label: 'Español' },
    { code: 'ar', label: 'العربية' },
    { code: 'zh', label: '中文' },
  ];

  const isChatGpt = activeTab === 'chatgpt';

  return (
    <header className="w-full border-b border-[#14282f]/80 bg-[#081519]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Brand logo matching image */}
        <div
          className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer"
          onClick={() => onSelectTab && onSelectTab(isChatGpt ? 'chatgpt' : 'activate')}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shrink-0 transition-all ${
            isChatGpt
              ? 'bg-gradient-to-br from-[#10b981] to-[#059669] shadow-emerald-500/20'
              : 'bg-gradient-to-br from-[#14b8a6] to-[#0d9488] shadow-teal-500/20'
          }`}>
            {isChatGpt ? (
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            ) : (
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight leading-none">AutoGift</span>
              <span className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
                isChatGpt
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-teal-500/15 text-teal-400 border-teal-500/30'
              }`}>
                {isChatGpt ? 'ChatGPT Plus' : 'API v8.1'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
              {isChatGpt ? 'somadethgiftcdk.site/#chatgpt' : 'Telegram Premium gifts'}
            </p>
          </div>
        </div>

        {/* Right controls: Language & Theme */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector matching photo */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-[#0f2329] hover:bg-[#15323a] border border-[#1b3b44] rounded-xl transition-all"
            >
              <Globe className="w-4 h-4 text-teal-400" />
              <span>{languages.find((l) => l.code === currentLang)?.label || 'English'}</span>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 py-1.5 bg-[#0e2127] border border-[#1b3d47] rounded-xl shadow-xl z-50">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      currentLang === l.code
                        ? 'text-teal-400 bg-teal-950/40 font-semibold'
                        : 'text-slate-300 hover:bg-[#142e36]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle matching photo */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-200 bg-[#0f2329] hover:bg-[#15323a] border border-[#1b3b44] rounded-xl transition-all"
            title="Toggle theme appearance"
            aria-label="Toggle theme appearance"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
