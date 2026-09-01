import { Clock, Lock, Send, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginPage } from './components/AdminLoginPage';
import { CustomerRedemptionPortal } from './components/CustomerRedemptionPortal';
import { PublicSystemStatus } from './types';
import { apiFetch } from './utils/api';
import { soundEngine } from './utils/audio';

export default function App() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<PublicSystemStatus | null>(null);
  const [currentRoute, setCurrentRoute] = useState<'customer' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.startsWith('/admin') || hash === '#admin') {
        return 'admin';
      }
    }
    return 'customer';
  });
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());
  const [utcTime, setUtcTime] = useState(new Date().toUTCString().slice(17, 25));

  // Sync route on popstate and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.startsWith('/admin') || hash === '#admin') {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('customer');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (route: 'customer' | 'admin') => {
    setCurrentRoute(route);
    const targetPath = route === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setUtcTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('tg_admin_token');
    if (savedToken) {
      apiFetch('/api/admin/check-session', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then(() => {
          setAdminToken(savedToken);
        })
        .catch(() => {
          sessionStorage.removeItem('tg_admin_token');
        });
    }

    apiFetch<PublicSystemStatus>('/api/public/system-status')
      .then((data) => setSystemStatus(data))
      .catch((err) => console.error('Failed to fetch public status:', err));
  }, []);

  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
    sessionStorage.setItem('tg_admin_token', token);
    navigateTo('admin');
  };

  const handleLogout = () => {
    if (adminToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    setAdminToken(null);
    sessionStorage.removeItem('tg_admin_token');
    navigateTo('customer');
  };

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundEngine.playVerifyChirp();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Optional Top Announcement Banner */}
      {systemStatus?.bannerText && (
        <div className="bg-slate-900 border-b border-slate-800 text-center py-2 px-4 text-xs text-sky-300 font-medium flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{systemStatus.bannerText}</span>
        </div>
      )}

      {/* Clean Global Header */}
      <header className="h-16 border-b border-slate-800/80 flex items-center justify-between px-4 sm:px-8 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <button
          onClick={() => navigateTo('customer')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
            <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                SOMADETH
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium hidden xs:inline">
                Online
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:block">
              {currentRoute === 'admin' ? 'Administration Vault' : 'Telegram Premium Gift Gateway'}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Live UTC Clock */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>{utcTime} UTC</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={isMuted ? 'Turn on sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Admin Navigation Bar (Visible ONLY on /admin route) */}
          {currentRoute === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                id="nav-to-customer-portal"
                onClick={() => navigateTo('customer')}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                Customer Portal
              </button>
              {adminToken && (
                <button
                  onClick={handleLogout}
                  className="bg-red-950/50 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs text-red-300 hover:bg-red-900/60 font-medium transition-colors"
                >
                  Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-4 sm:py-8">
        {currentRoute === 'admin' ? (
          adminToken ? (
            <AdminDashboard token={adminToken} onLogout={handleLogout} />
          ) : (
            <AdminLoginPage
              onLoginSuccess={handleLoginSuccess}
              onBackToCustomerPortal={() => navigateTo('customer')}
            />
          )
        ) : (
          <CustomerRedemptionPortal systemStatus={systemStatus} />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="h-12 border-t border-slate-800/80 bg-slate-950 flex items-center px-4 sm:px-8 justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-400">SOMADETH</span>
          <span>&bull; Encrypted Telegram Gift Gateway</span>
        </div>
        <div>
          &copy; 2026 SOMADETH
        </div>
      </footer>
    </div>
  );
}
