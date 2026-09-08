/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NavigationTabs, AppTab } from './components/NavigationTabs';
import { ActivateForm } from './components/ActivateForm';
import { ChatGPTActivateView } from './components/ChatGPTActivateView';
import { TrackOrderView } from './components/TrackOrderView';
import { AdminPanel } from './components/AdminPanel';
import { OrderItem } from './types';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#admin';
  });
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') return 'admin';
      if (hash === '#activate' || hash === '#telegram') return 'activate';
      if (hash === '#track') return 'track';
      return 'chatgpt';
    }
    return 'chatgpt';
  });
  const [currentLang, setCurrentLang] = useState('en');
  const [isDark, setIsDark] = useState(true);
  const [trackedOrderId, setTrackedOrderId] = useState<string | undefined>(undefined);
  const [prefilledCode, setPrefilledCode] = useState<string>('');

  const [activeOrderCount, setActiveOrderCount] = useState<number>(0);
  const [availableCdkCount, setAvailableCdkCount] = useState<number>(0);

  // Synchronize hash-based routing: somadethgiftcdk.site/#chatgpt, #activate, #track, #admin
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      const isHashAdmin = hash === '#admin';
      setIsAdminMode(isHashAdmin);
      if (isHashAdmin) {
        setActiveTab('admin');
      } else if (hash === '#activate' || hash === '#telegram') {
        setActiveTab('activate');
      } else if (hash === '#track') {
        setActiveTab('track');
      } else if (hash === '#chatgpt' || hash.includes('chatgpt')) {
        setActiveTab('chatgpt');
      } else if (!hash) {
        // Default to #chatgpt per user request: somadethgiftcdk.site/#chatgpt
        window.location.hash = '#chatgpt';
        setActiveTab('chatgpt');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleNavigateTab = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab === 'chatgpt') {
      window.location.hash = '#chatgpt';
    } else if (tab === 'activate') {
      window.location.hash = '#activate';
    } else if (tab === 'track') {
      window.location.hash = '#track';
    } else if (tab === 'admin') {
      window.location.hash = '#admin';
    }
  };

  const handleExitAdmin = () => {
    window.location.hash = '#chatgpt';
    setIsAdminMode(false);
    setActiveTab('chatgpt');
  };

  // Fetch summary stats on mount and occasionally
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setActiveOrderCount(data.stats.activeOrders);
        setAvailableCdkCount(data.stats.availableCdks);
      }
    } catch {
      // ignore
    }
  };

  const handleOrderCreated = (order: OrderItem) => {
    setTrackedOrderId(order.id);
    setActiveTab('track');
    fetchStats();
  };

  const handleUseCodeInActivate = (code: string) => {
    setPrefilledCode(code);
    setActiveTab('activate');
  };

  const handleViewOrderInTrack = (orderId: string) => {
    setTrackedOrderId(orderId);
    handleNavigateTab('track');
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#081519] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header matching photo and somadethgiftcdk.site/#chatgpt branding */}
      <Header
        currentLang={currentLang}
        setLang={setCurrentLang}
        isDark={isDark}
        setIsDark={setIsDark}
        activeTab={activeTab}
        onSelectTab={handleNavigateTab}
        onOpenAdmin={() => {
          handleNavigateTab('admin');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center">
        {/* Navigation Tabs - ChatGPT Plus, Telegram CDK, Track Order & Admin */}
        <div className="mb-6 w-full">
          <NavigationTabs
            activeTab={activeTab}
            setActiveTab={handleNavigateTab}
            activeOrderCount={activeOrderCount}
            availableCdkCount={availableCdkCount}
            isAdminMode={isAdminMode}
            onExitAdmin={handleExitAdmin}
          />
        </div>

        {/* View Router */}
        <div className="w-full flex-1">
          {activeTab === 'chatgpt' && (
            <ChatGPTActivateView
              onOrderCreated={handleOrderCreated}
              prefilledCode={prefilledCode}
              onGoToTrack={() => handleNavigateTab('track')}
            />
          )}

          {activeTab === 'activate' && (
            <ActivateForm
              onOrderCreated={handleOrderCreated}
              prefilledCode={prefilledCode}
              onGoToTrack={() => handleNavigateTab('track')}
            />
          )}

          {activeTab === 'track' && (
            <TrackOrderView
              initialOrderId={trackedOrderId}
              onNavigateToActivate={() => handleNavigateTab('chatgpt')}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              onUseCodeInActivate={handleUseCodeInActivate}
              onViewOrderInTrack={handleViewOrderInTrack}
              onExitAdmin={handleExitAdmin}
            />
          )}
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full border-t border-[#14282f]/80 bg-[#061216]/90 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-300">somadethgiftcdk.site</span>
            <span>/#chatgpt — CDK Activation & Queue</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 flex-wrap justify-center">
            <button
              onClick={() => handleNavigateTab('chatgpt')}
              className="hover:text-emerald-400 transition-colors cursor-pointer font-medium text-emerald-400"
            >
              #chatgpt
            </button>
            <button
              onClick={() => handleNavigateTab('activate')}
              className="hover:text-teal-400 transition-colors cursor-pointer"
            >
              Telegram CDK
            </button>
            <button
              onClick={() => handleNavigateTab('track')}
              className="hover:text-teal-400 transition-colors cursor-pointer"
            >
              Track Order
            </button>
            {isAdminMode && (
              <button
                onClick={handleExitAdmin}
                className="text-teal-400/90 hover:text-rose-400 transition-colors cursor-pointer font-medium"
              >
                Exit Admin (#admin)
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
