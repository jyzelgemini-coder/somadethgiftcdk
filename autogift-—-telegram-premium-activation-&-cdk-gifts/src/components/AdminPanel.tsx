import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  RefreshCw,
  Database,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  Eye,
  X,
  Zap,
  Bot,
  Send,
} from 'lucide-react';
import { CDKItem, OrderItem, AppStats, PremiumPlanDuration, ServiceType } from '../types';
import { TelegramAvatar } from './TelegramAvatar';

interface AdminPanelProps {
  onUseCodeInActivate: (code: string) => void;
  onViewOrderInTrack: (orderId: string) => void;
  onExitAdmin?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onUseCodeInActivate,
  onViewOrderInTrack,
  onExitAdmin,
}) => {
  // Authentication State
  const [adminKey, setAdminKey] = useState<string>(() => {
    return localStorage.getItem('autogift_admin_key') || 'somadeth2026';
  });
  const [inputKey, setInputKey] = useState<string>(adminKey);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);

  // Data States
  const [stats, setStats] = useState<AppStats | null>(null);
  const [cdks, setCdks] = useState<CDKItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'redeemed'>('all');
  const [copiedAdminUrl, setCopiedAdminUrl] = useState(false);

  // Form State for creating CDKs
  const [serviceType, setServiceType] = useState<ServiceType>('chatgpt');
  const [duration, setDuration] = useState<string>('chatgpt_plus');
  const [count, setCount] = useState<number>(3);
  const [prefix, setPrefix] = useState('GPT');
  const [notes, setNotes] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Modal / Action states
  const [selectedOrderForSession, setSelectedOrderForSession] = useState<OrderItem | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Telegram Bot Alert Test State
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Verify stored key on mount
  useEffect(() => {
    if (adminKey) {
      verifyKey(adminKey);
    }
  }, []);

  const verifyKey = async (keyToTest: string) => {
    setIsVerifyingKey(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/admin/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToTest.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('autogift_admin_key', keyToTest.trim());
        setAdminKey(keyToTest.trim());
        fetchData(keyToTest.trim());
      } else {
        setIsAuthenticated(false);
        setAuthError(data.error || 'Invalid Admin Secret Key');
      }
    } catch {
      setIsAuthenticated(false);
      setAuthError('Failed to connect to authentication server');
    } finally {
      setIsVerifyingKey(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setAuthError('Please enter the Admin Secret Key');
      return;
    }
    verifyKey(inputKey.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('autogift_admin_key');
    setIsAuthenticated(false);
    setInputKey('');
    if (onExitAdmin) {
      onExitAdmin();
    }
  };

  const fetchData = async (keyToUse?: string) => {
    const activeKey = keyToUse || adminKey;
    setIsLoading(true);
    try {
      const headers = { 'x-admin-key': activeKey };
      const [resStats, resCdks, resOrders] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/cdk/list', { headers }),
        fetch('/api/orders', { headers }),
      ]);

      const [dataStats, dataCdks, dataOrders] = await Promise.all([
        resStats.json(),
        resCdks.json(),
        resOrders.json(),
      ]);

      if (dataStats.success) setStats(dataStats.stats);
      if (dataCdks.success) setCdks(dataCdks.cdks);
      if (dataOrders.success) setOrders(dataOrders.orders);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceTypeChange = (newType: ServiceType) => {
    setServiceType(newType);
    if (newType === 'chatgpt') {
      setDuration('chatgpt_plus');
      setPrefix('GPT');
    } else {
      setDuration('3_months');
      setPrefix('TG');
    }
  };

  const handleCreateCDKs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setCreateMessage(null);

    try {
      const payload = isCustomMode
        ? { customCode, duration, notes, serviceType }
        : { count, duration, prefix, notes, serviceType };

      const res = await fetch('/api/cdk/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreateMessage(data.message || 'CDK(s) created and saved to database!');
        setCustomCode('');
        fetchData();
      } else {
        setCreateMessage(`Error: ${data.error || 'Failed to create CDK'}`);
      }
    } catch (err: any) {
      setCreateMessage(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Admin Click "Done" / Manual Activation Trigger
  const handleAdminCompleteOrder = async (orderId: string) => {
    setCompletingOrderId(orderId);
    setActionSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMessage(`Order ${orderId} activated and marked Done! Customer tracking updated.`);
        // Refresh data
        fetchData();
        // If viewing in modal, update modal state
        if (selectedOrderForSession && selectedOrderForSession.id === orderId) {
          setSelectedOrderForSession(data.order);
        }
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        alert(data.error || 'Failed to complete order');
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setCompletingOrderId(null);
    }
  };

  const handleDeleteCDK = async (id: string) => {
    if (!confirm('Are you sure you want to remove this CDK from the database?')) return;
    try {
      const res = await fetch(`/api/cdk/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCdks((prev) => prev.filter((c) => c.id !== id));
        fetchData();
      }
    } catch {
      // ignore
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const filteredCdks = cdks.filter((c) => {
    const matchesStatus =
      filterStatus === 'all' ? true : c.status === filterStatus;
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.redeemedBy && c.redeemedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleCopyAdminUrl = () => {
    const adminUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}#admin`
        : 'https://somadethgiftcdk.site/#admin';
    navigator.clipboard.writeText(adminUrl);
    setCopiedAdminUrl(true);
    setTimeout(() => setCopiedAdminUrl(false), 2500);
  };

  const handleTestTelegramAlert = async () => {
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramTestResult({
          type: 'success',
          message: 'Live test message delivered to Telegram Group -1004218002560 successfully!',
        });
      } else {
        setTelegramTestResult({
          type: 'error',
          message: data.error || 'Failed to dispatch Telegram message',
        });
      }
    } catch (err: any) {
      setTelegramTestResult({
        type: 'error',
        message: err.message || 'Network error connecting to Telegram Bot API',
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // ----------------------------------------------------
  // Gate: If not authenticated, show Security Key Gate
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-8 px-4">
        <div className="bg-[#0a1b21] border border-[#163741] rounded-2xl p-6 sm:p-7 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-500/40 text-teal-400 mx-auto flex items-center justify-center mb-4 shadow-lg">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-slate-100 mb-1.5">
            Admin Authentication
          </h2>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Enter your Admin Secret Key to access CDK inventory, generate keys, and view customer orders.
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Admin Secret Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Enter secret key..."
                  className="w-full px-3.5 py-2.5 bg-[#07151a] border border-[#173740] rounded-xl text-sm text-slate-100 font-mono-code focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Default configured key: <span className="font-mono-code text-teal-400/80">somadeth2026</span>
              </p>
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingKey}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#14b8a6] hover:bg-[#0d9488] text-slate-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isVerifyingKey ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying Key...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Admin Panel</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#142e37] flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">DDoS Protected</span>
            {onExitAdmin && (
              <button
                onClick={onExitAdmin}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Site
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Authenticated Admin Dashboard
  // ----------------------------------------------------
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-1">
      {/* Hidden Admin Access Notice Bar */}
      <div className="w-full px-4 py-3 bg-[#0c222b] border border-teal-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
        <div className="flex items-center gap-2.5 text-teal-300">
          <div className="p-1.5 rounded-lg bg-teal-950/80 border border-teal-500/40 text-teal-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Admin Mode Active & Authenticated</span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-teal-900/50 border border-teal-500/30 text-teal-300">
                #admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Direct access link: <span className="font-mono-code text-teal-300">/#admin</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAdminUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14323c] hover:bg-[#1a3f4c] text-teal-300 border border-teal-500/30 font-medium transition-colors cursor-pointer text-xs"
          >
            {copiedAdminUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span>Copied URL!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy #admin Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 font-medium transition-colors cursor-pointer text-xs"
          >
            <Lock className="w-3 h-3" />
            <span>Lock & Exit</span>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-4 px-2">
        <h1 className="font-display text-3xl sm:text-4xl md:text-[44px] text-slate-100 tracking-tight font-normal mb-2 leading-[1.15]">
          Admin Panel & CDK Creator
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          Generate Telegram Premium activation keys, save them to the persistent database, and manage customer orders.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0b1c22] border border-[#163842]">
          <span className="text-[11px] text-slate-400 font-medium block">Total CDKs in DB</span>
          <span className="text-xl sm:text-2xl font-bold font-mono-code text-slate-100">
            {stats?.totalCdks ?? cdks.length}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0b1c22] border border-[#163842]">
          <span className="text-[11px] text-teal-400 font-medium block">Available / Unredeemed</span>
          <span className="text-xl sm:text-2xl font-bold font-mono-code text-teal-300">
            {stats?.availableCdks ?? cdks.filter((c) => c.status === 'available').length}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0b1c22] border border-[#163842]">
          <span className="text-[11px] text-amber-400 font-medium block">Redeemed by Users</span>
          <span className="text-xl sm:text-2xl font-bold font-mono-code text-amber-300">
            {stats?.redeemedCdks ?? cdks.filter((c) => c.status === 'redeemed').length}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0b1c22] border border-[#163842]">
          <span className="text-[11px] text-cyan-400 font-medium block">Total Orders</span>
          <span className="text-xl sm:text-2xl font-bold font-mono-code text-cyan-300">
            {stats?.totalOrders ?? orders.length}
          </span>
        </div>
      </div>

      {/* Telegram Bot Notification Gateway Card */}
      <div className="bg-[#091b20] border border-[#143d47] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#12313a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-950/80 text-teal-400 border border-teal-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100">
                  Telegram Bot Real-time Alert Gateway
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dispatches instant notification to Telegram Group when a customer activates ChatGPT or Telegram Premium
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestTelegramAlert}
            disabled={isTestingTelegram}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-[#142f36] disabled:text-slate-500 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md self-start sm:self-auto"
          >
            {isTestingTelegram ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Test Alert...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Test Alert to Group</span>
              </>
            )}
          </button>
        </div>

        {/* Configuration Summary & Test Result */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 text-xs">
          <div className="p-2.5 rounded-xl bg-[#061418] border border-[#14323b]">
            <span className="text-[10px] text-slate-400 block mb-0.5">Target Group ID</span>
            <span className="font-mono-code font-bold text-teal-300 select-all">-1004218002560</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#061418] border border-[#14323b]">
            <span className="text-[10px] text-slate-400 block mb-0.5">Configured Bot Token</span>
            <span className="font-mono-code text-slate-300 select-all">8933910846:AAFMqj...hDY</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#061418] border border-[#14323b]">
            <span className="text-[10px] text-slate-400 block mb-0.5">Alert Triggers</span>
            <span className="text-slate-200 font-medium">ChatGPT + Telegram + Admin Done</span>
          </div>
        </div>

        {telegramTestResult && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 ${
              telegramTestResult.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
            }`}
          >
            {telegramTestResult.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium leading-snug">{telegramTestResult.message}</div>
          </div>
        )}
      </div>

      {/* CDK Creator Card */}
      <div className="bg-[#0a1b21] border border-[#163741] rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#142e37]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-950 text-teal-400 border border-teal-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">Generate New CDK Keys</h2>
              <p className="text-xs text-slate-400">Save keys to database for users to redeem</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[#061418] border border-[#14343d] rounded-xl text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                !isCustomMode ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Batch Auto-Gen
            </button>
            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                isCustomMode ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom Code
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateCDKs} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Target Service */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Target Service
              </label>
              <select
                value={serviceType}
                onChange={(e) => handleServiceTypeChange(e.target.value as ServiceType)}
                className="w-full px-3 py-2.5 bg-[#07151a] border border-[#173740] rounded-xl text-xs text-slate-100 font-medium focus:border-teal-500 focus:outline-none min-h-[42px]"
              >
                <option value="chatgpt">ChatGPT</option>
                <option value="telegram">Telegram Premium</option>
              </select>
            </div>

            {/* Plan duration */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {serviceType === 'chatgpt' ? 'ChatGPT Plan' : 'Telegram Plan'}
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#07151a] border border-[#173740] rounded-xl text-xs text-slate-100 font-medium focus:border-teal-500 focus:outline-none min-h-[42px]"
              >
                {serviceType === 'chatgpt' ? (
                  <>
                    <option value="chatgpt_plus">ChatGPT Plus</option>
                    <option value="chatgpt_go">ChatGPT Go</option>
                    <option value="chatgpt_pro_x5">ChatGPT Pro x5</option>
                    <option value="chatgpt_pro_x20">ChatGPT Pro x20</option>
                  </>
                ) : (
                  <>
                    <option value="1_month">1 Month Subscription</option>
                    <option value="3_months">3 Months Subscription</option>
                    <option value="6_months">6 Months Subscription</option>
                    <option value="12_months">12 Months Subscription</option>
                  </>
                )}
              </select>
            </div>

            {!isCustomMode ? (
              <>
                {/* Quantity */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Quantity to Generate
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#07151a] border border-[#173740] rounded-xl text-xs text-slate-100 font-medium focus:border-teal-500 focus:outline-none min-h-[42px]"
                  >
                    <option value={1}>1 Key</option>
                    <option value={3}>3 Keys</option>
                    <option value={5}>5 Keys</option>
                    <option value={10}>10 Keys</option>
                    <option value={20}>20 Keys</option>
                  </select>
                </div>

                {/* Prefix */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Key Prefix (e.g. TG, VIP, PROMO)
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="TG"
                    maxLength={8}
                    className="w-full px-3 py-2 bg-[#07151a] border border-[#173740] rounded-xl text-xs text-slate-100 font-mono-code font-bold uppercase focus:border-teal-500 focus:outline-none min-h-[42px]"
                  />
                </div>
              </>
            ) : (
              /* Custom Code input */
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Custom CDK Code (24 chars)
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="CUSTOM01-XXXXXXXX-XXXXXXXX"
                  className="w-full px-3 py-2 bg-[#07151a] border border-[#173740] rounded-xl text-xs text-slate-100 font-mono-code font-bold uppercase focus:border-teal-500 focus:outline-none min-h-[42px]"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Internal Label / Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP Giveaway, Influencer promo, Stock batch #4"
              className="w-full px-3 py-2 bg-[#07151a] border border-[#173740] rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:border-teal-500 focus:outline-none min-h-[42px]"
            />
          </div>

          {/* Feedback message */}
          {createMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                createMessage.startsWith('Error')
                  ? 'bg-rose-950/40 border border-rose-800/40 text-rose-300'
                  : 'bg-teal-950/40 border border-teal-500/30 text-teal-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{createMessage}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-50 min-h-[44px]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Writing to Database...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Save CDK Key(s) to Persistent Database</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Database Inventory Table Card */}
      <div className="bg-[#0a1b21] border border-[#163741] rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#142e37]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100">
              CDK Inventory ({filteredCdks.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keys..."
                className="w-full sm:w-44 pl-8 pr-3 py-1.5 bg-[#07151a] border border-[#173740] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-0.5 bg-[#07151a] border border-[#173740] rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-teal-500/20 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('available')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStatus === 'available'
                    ? 'bg-teal-500/20 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Available
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('redeemed')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStatus === 'redeemed'
                    ? 'bg-teal-500/20 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Redeemed
              </button>
            </div>

            <button
              onClick={() => fetchData()}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#07151a] border border-[#173740] rounded-lg cursor-pointer"
              title="Refresh database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-[#142e37] text-slate-400 font-semibold">
                <th className="py-2.5 px-3">CDK Key Code</th>
                <th className="py-2.5 px-3">Plan</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Redeemed By</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#122830]">
              {filteredCdks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No CDK keys found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredCdks.map((c) => (
                  <tr key={c.id} className="hover:bg-[#0c222b]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono-code font-semibold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{c.code}</span>
                        <button
                          onClick={() => handleCopyCode(c.code, c.id)}
                          className="p-1 text-slate-400 hover:text-teal-300 rounded cursor-pointer"
                          title="Copy Key"
                        >
                          {copiedCodeId === c.id ? (
                            <Check className="w-3 h-3 text-teal-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-300 font-medium">
                      {c.durationLabel}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'available'
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                            : c.status === 'redeemed'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-700/30 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {c.status === 'available' ? 'Available' : 'Redeemed'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      {c.redeemedBy ? (
                        <span className="text-teal-300 font-medium font-mono-code">
                          {c.redeemedBy}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 max-w-[140px] truncate">
                      {c.notes || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === 'available' && (
                          <button
                            onClick={() => onUseCodeInActivate(c.code)}
                            className="px-2 py-1 rounded bg-teal-950 hover:bg-teal-900/80 text-teal-300 border border-teal-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Pre-fill into Activation form"
                          >
                            <span>Test Redeem</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {c.redeemedOrderId && (
                          <button
                            onClick={() => onViewOrderInTrack(c.redeemedOrderId!)}
                            className="px-2 py-1 rounded bg-[#0d2731] hover:bg-[#133744] text-cyan-300 border border-cyan-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="View Track Details"
                          >
                            <span>Order</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteCDK(c.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded cursor-pointer"
                          title="Delete from DB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="p-1 text-emerald-400 hover:text-emerald-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Orders List Card */}
      <div className="bg-[#0a1b21] border border-[#163741] rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#142e37]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100">
              Customer Orders & Activations ({orders.length})
            </h2>
          </div>
          <button
            onClick={() => fetchData()}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#07151a] border border-[#173740] rounded-lg cursor-pointer"
            title="Refresh orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-[#142e37] text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Customer Account</th>
                <th className="py-2.5 px-3">Service & Plan</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Session Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#122830]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isChatGpt = o.serviceType === 'chatgpt' || o.id.startsWith('GPT-');
                  const hasSessionData = !!(o.rawSessionPayload || o.accessToken || o.chatgptVerification);
                  const isPending = o.status !== 'completed' && o.status !== 'failed';
                  const isCompleting = completingOrderId === o.id;

                  return (
                    <tr key={o.id} className="hover:bg-[#0c222b]/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono-code font-bold">
                        <span className={isChatGpt ? 'text-emerald-400' : 'text-teal-400'}>
                          {o.id}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {isChatGpt ? (
                            <div className="w-7 h-7 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <TelegramAvatar
                              avatarUrl={o.verification?.avatarUrl}
                              displayName={o.verification?.displayName || o.username}
                              username={o.username}
                              size="sm"
                              isVerified={o.verification?.isVerifiedBadge}
                              clickable={true}
                            />
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-200 block truncate max-w-[170px]">
                              {o.customerEmail || o.username}
                            </span>
                            {isChatGpt && o.customerEmail && (
                              <span className="text-[10px] text-emerald-400/80 font-mono-code block">
                                ChatGPT Session
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-medium">{o.planLabel}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                            {isChatGpt ? 'OpenAI ChatGPT' : 'Telegram'}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            o.status === 'completed'
                              ? isChatGpt
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {o.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Delivered</span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                              <span>In Queue</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 text-[11px] font-mono-code">
                        {o.sessionDate ? (
                          <div title="Session Auth / Expiration Date">
                            <span className="text-slate-300 block">
                              {new Date(o.sessionDate).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(o.sessionDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* View Full Session / Token Button */}
                          {hasSessionData && (
                            <button
                              onClick={() => setSelectedOrderForSession(o)}
                              className="px-2 py-1 rounded bg-[#0d2a29] hover:bg-[#123837] text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="View Full ChatGPT AccessToken & Session JSON"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Session</span>
                            </button>
                          )}

                          {/* Manual Admin Done Button */}
                          {isPending && (
                            <button
                              onClick={() => handleAdminCompleteOrder(o.id)}
                              disabled={isCompleting}
                              className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                              title="Activate ChatGPT plan and mark order completed immediately"
                            >
                              {isCompleting ? (
                                <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
                              ) : (
                                <Zap className="w-3 h-3 fill-slate-950" />
                              )}
                              <span>Done</span>
                            </button>
                          )}

                          {/* Track button */}
                          <button
                            onClick={() => onViewOrderInTrack(o.id)}
                            className="px-2 py-1 rounded bg-teal-950 hover:bg-teal-900/80 text-teal-300 border border-teal-500/30 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                            title="View Track View"
                          >
                            <span>Track</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Session Token & Details Modal */}
      {selectedOrderForSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a1b21] border border-[#173e4a] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#142e37] flex items-center justify-between bg-[#07161b]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>ChatGPT Session & AccessToken</span>
                    <span className="font-mono-code text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      {selectedOrderForSession.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Customer Account: <span className="text-emerald-300 font-mono-code">{selectedOrderForSession.customerEmail || selectedOrderForSession.username}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderForSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Plan & Date Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#061418] border border-[#15343d]">
                  <span className="text-[10px] text-slate-400 block font-medium">Selected Plan</span>
                  <span className="text-sm font-bold text-emerald-300">
                    {selectedOrderForSession.planLabel}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#061418] border border-[#15343d]">
                  <span className="text-[10px] text-slate-400 block font-medium">Session Auth Date</span>
                  <span className="text-xs font-mono-code font-bold text-slate-200">
                    {selectedOrderForSession.sessionDate
                      ? new Date(selectedOrderForSession.sessionDate).toLocaleString()
                      : selectedOrderForSession.chatgptVerification?.verifiedAt
                      ? new Date(selectedOrderForSession.chatgptVerification.verifiedAt).toLocaleString()
                      : 'Active Now'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#061418] border border-[#15343d] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Order Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      selectedOrderForSession.status === 'completed'
                        ? 'text-emerald-300 bg-emerald-950 border border-emerald-500/30'
                        : 'text-cyan-300 bg-cyan-950 border border-cyan-500/30'
                    }`}
                  >
                    {selectedOrderForSession.status === 'completed' ? 'Delivered / Done' : 'In Queue'}
                  </span>
                </div>
              </div>

              {/* Access Token String */}
              {selectedOrderForSession.accessToken && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span>Full Access Token</span>
                      <span className="text-[10px] font-mono-code text-slate-500">
                        ({selectedOrderForSession.accessToken.length} chars)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrderForSession.accessToken || '');
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedToken ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied Access Token!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Token</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040e11] border border-[#14323b] font-mono-code text-[11px] text-emerald-300/90 break-all select-all max-h-24 overflow-y-auto">
                    {selectedOrderForSession.accessToken}
                  </div>
                </div>
              )}

              {/* Full Raw Session JSON */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Full Session JSON Payload (chatgpt.com/api/auth/session)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOrderForSession.rawSessionPayload || '');
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied Full JSON!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Full JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#040e11] border border-[#14323b] font-mono-code text-[11px] text-slate-300 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap select-all">
                  {selectedOrderForSession.rawSessionPayload
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedOrderForSession.rawSessionPayload), null, 2);
                        } catch {
                          return selectedOrderForSession.rawSessionPayload;
                        }
                      })()
                    : 'No raw payload recorded'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[#142e37] bg-[#07161b] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForSession(null)}
                className="px-4 py-2 rounded-xl bg-[#0f2830] hover:bg-[#163844] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Close
              </button>

              {selectedOrderForSession.status !== 'completed' ? (
                <button
                  type="button"
                  disabled={completingOrderId === selectedOrderForSession.id}
                  onClick={() => handleAdminCompleteOrder(selectedOrderForSession.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {completingOrderId === selectedOrderForSession.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating in DB...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>Activate & Mark Done Now</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activated & Delivered to Customer</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
