import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Gift,
  ArrowRight,
  Bot,
  Mail,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TelegramAvatar } from './TelegramAvatar';
import { OrderItem, OrderStatus } from '../types';

interface TrackOrderViewProps {
  initialOrderId?: string;
  onNavigateToActivate: () => void;
}

export const TrackOrderView: React.FC<TrackOrderViewProps> = ({
  initialOrderId,
  onNavigateToActivate,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialOrderId || '');
  const [currentOrder, setCurrentOrder] = useState<OrderItem | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);

  // Poll order in real-time if not completed
  useEffect(() => {
    if (initialOrderId) {
      fetchOrderById(initialOrderId);
    } else {
      fetchRecentOrders();
    }
  }, [initialOrderId]);

  useEffect(() => {
    if (!currentOrder) return;
    if (currentOrder.status === 'completed' || currentOrder.status === 'failed') {
      if (currentOrder.status === 'completed' && !confettiFired) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#14b8a6', '#2dd4bf', '#38bdf8', '#fbbf24'],
        });
        setConfettiFired(true);
      }
      return;
    }

    // Poll every 1.5 seconds to track real-time queue progress
    const interval = setInterval(() => {
      fetchOrderSilently(currentOrder.id);
    }, 1500);

    return () => clearInterval(interval);
  }, [currentOrder, confettiFired]);

  const fetchRecentOrders = async () => {
    try {
      const res = await fetch('/api/orders/public-recent');
      const data = await res.json();
      if (data.success && data.orders) {
        setRecentOrders(data.orders.slice(0, 5));
        if (!currentOrder && data.orders.length > 0) {
          fetchOrderById(data.orders[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchOrderById = async (id: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setConfettiFired(false);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id.trim())}`);
      const data = await res.json();
      if (data.success && data.order) {
        setCurrentOrder(data.order);
      } else {
        // Try searching by username
        const searchRes = await fetch(`/api/orders/lookup/${encodeURIComponent(id.trim())}`);
        const searchData = await searchRes.json();
        if (searchData.success && searchData.orders && searchData.orders.length > 0) {
          setCurrentOrder(searchData.orders[0]);
        } else {
          setErrorMessage('No order found matching this Order ID or Telegram username.');
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to look up order. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderSilently = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success && data.order) {
        setCurrentOrder(data.order);
      }
    } catch {
      // ignore
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchOrderById(searchQuery.trim());
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Helper for stepper stages
  const getStepState = (stepIndex: number, currentStatus: OrderStatus) => {
    const stages: OrderStatus[] = ['verifying_user', 'in_queue', 'dispatching_api', 'completed'];
    const currentIndex = stages.indexOf(currentStatus);

    if (currentStatus === 'completed') return 'completed';
    if (currentStatus === 'failed') return stepIndex === currentIndex ? 'failed' : 'pending';

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Title */}
      <div className="text-center mb-6 px-2">
        <h1 className="font-display text-4xl sm:text-[44px] text-slate-100 tracking-tight font-normal mb-2 leading-[1.15]">
          Track order status
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Monitor your Telegram Premium activation in real time via our automated delivery queue.
        </p>
      </div>

      {/* Search Bar */}
      <div className="w-full bg-[#0a1b21] border border-[#163741] rounded-2xl p-4 sm:p-5 mb-6 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID (e.g. AG-123456) or @username"
              className="w-full pl-10 pr-4 py-2.5 bg-[#07151a] border border-[#173740] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm font-medium transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="px-6 py-2.5 bg-[#14b8a6] hover:bg-[#0d9488] text-slate-950 font-semibold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-teal-500/20"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4 stroke-[2.2]" />
            )}
            <span>Track Order</span>
          </button>
        </form>

        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Current Order View */}
      {currentOrder ? (
        <div className="w-full space-y-6">
          {/* Status Header Card */}
          <div className="w-full bg-[#0b1c22] border border-[#163842] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            {/* Top Accent line */}
            <div
              className={`absolute top-0 inset-x-0 h-1 ${
                currentOrder.status === 'completed'
                  ? 'bg-teal-400'
                  : currentOrder.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-400 animate-pulse'
              }`}
            />

            {(() => {
              const isChatGpt = currentOrder.serviceType === 'chatgpt' || currentOrder.id.startsWith('GPT-');
              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#142e37]">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <span className={`text-xs font-mono-code font-bold px-2 py-0.5 rounded border ${
                          isChatGpt
                            ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/30'
                            : 'text-teal-400 bg-teal-950/80 border-teal-500/30'
                        }`}>
                          {currentOrder.id}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(currentOrder.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        {isChatGpt && (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            <span>{currentOrder.planLabel}</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                        <span>{isChatGpt ? currentOrder.planLabel : `Telegram Premium ${currentOrder.planLabel}`}</span>
                        <span className="text-slate-400 font-normal text-sm">
                          for <span className={isChatGpt ? "text-emerald-300 font-medium" : "text-teal-300 font-medium"}>
                            {currentOrder.customerEmail || currentOrder.username}
                          </span>
                        </span>
                      </h2>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          currentOrder.status === 'completed'
                            ? (isChatGpt ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-teal-500/15 text-teal-300 border border-teal-500/30')
                            : currentOrder.status === 'failed'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {currentOrder.status === 'completed' ? (
                          <>
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isChatGpt ? 'text-emerald-400' : 'text-teal-400'}`} />
                            <span>Delivered & Activated</span>
                          </>
                        ) : currentOrder.status === 'failed' ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Delivery Failed</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            <span>
                              {currentOrder.status === 'in_queue'
                                ? `In Fair Queue (#${currentOrder.queuePosition})`
                                : isChatGpt
                                ? 'Provisioning ChatGPT Plus API'
                                : 'Calling Telegram Gift API'}
                            </span>
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => fetchOrderById(currentOrder.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#0e242b] border border-[#1a3d47] rounded-lg transition-colors cursor-pointer"
                        title="Refresh status"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Customer Profile Card */}
                  {currentOrder.verification && (
                    <div className={`mt-4 p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isChatGpt ? 'bg-[#071917] border-emerald-500/30' : 'bg-[#08181f] border-teal-500/25'
                    }`}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        {isChatGpt ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 font-bold flex items-center justify-center shrink-0 border-2 border-emerald-400/40 shadow">
                            {currentOrder.verification.avatarUrl ? (
                              <img
                                src={currentOrder.verification.avatarUrl}
                                alt={currentOrder.verification.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Bot className="w-6 h-6 text-slate-950" />
                            )}
                          </div>
                        ) : (
                          <TelegramAvatar
                            avatarUrl={currentOrder.verification.avatarUrl}
                            displayName={currentOrder.verification.displayName}
                            username={currentOrder.username}
                            size="md"
                            isVerified={currentOrder.verification.isVerifiedBadge}
                            clickable={true}
                          />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-100 text-sm sm:text-base leading-tight">
                              {currentOrder.verification.displayName}
                            </span>
                            {isChatGpt ? (
                              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Customer Mail Verified
                              </span>
                            ) : (
                              <span className="text-xs text-teal-300 font-mono-code font-medium">
                                {currentOrder.username}
                              </span>
                            )}
                          </div>

                          {isChatGpt && (currentOrder.customerEmail || currentOrder.username) ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono-code font-bold mt-1">
                              <Mail className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{currentOrder.customerEmail || currentOrder.username}</span>
                            </div>
                          ) : (
                            currentOrder.verification.bio && (
                              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 max-w-md">
                                {currentOrder.verification.bio}
                              </p>
                            )
                          )}
                        </div>
                      </div>

                      {isChatGpt ? (
                        <a
                          href="https://chatgpt.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-300 hover:text-emerald-200 bg-[#0c2925] hover:bg-[#123832] px-3 py-1.5 rounded-lg border border-emerald-500/30 shrink-0 flex items-center justify-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
                        >
                          <span>Open ChatGPT</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <a
                          href={`https://t.me/${currentOrder.username.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-teal-300 hover:text-teal-200 bg-[#0f2a33] hover:bg-[#153a47] px-3 py-1.5 rounded-lg border border-teal-500/30 shrink-0 flex items-center justify-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
                        >
                          <span>Telegram Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Stepper Progress */}
            <div className="py-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
                {/* Step 1: User Verification */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    getStepState(0, currentOrder.status) === 'completed'
                      ? 'bg-[#0e272f] border-teal-500/40 text-slate-100'
                      : 'bg-[#081519] border-[#15323a] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-teal-950 text-teal-400 border border-teal-500/30 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                    <span className="text-xs font-semibold text-slate-200">User Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {currentOrder.verification.displayName}
                  </p>
                </div>

                {/* Step 2: Fair Queue */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    getStepState(1, currentOrder.status) === 'completed'
                      ? 'bg-[#0e272f] border-teal-500/40 text-slate-100'
                      : getStepState(1, currentOrder.status) === 'active'
                      ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-100 animate-pulse'
                      : 'bg-[#081519] border-[#15323a] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        getStepState(1, currentOrder.status) === 'completed'
                          ? 'bg-teal-950 text-teal-400 border border-teal-500/30'
                          : getStepState(1, currentOrder.status) === 'active'
                          ? 'bg-cyan-900 text-cyan-300'
                          : 'bg-[#122830] text-slate-500'
                      }`}
                    >
                      {getStepState(1, currentOrder.status) === 'completed' ? '✓' : '2'}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Fair Queue</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {currentOrder.status === 'in_queue'
                      ? `Position #${currentOrder.queuePosition} (processing)`
                      : 'Passed queue'}
                  </p>
                </div>

                {/* Step 3: Telegram API Dispatch */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    getStepState(2, currentOrder.status) === 'completed'
                      ? 'bg-[#0e272f] border-teal-500/40 text-slate-100'
                      : getStepState(2, currentOrder.status) === 'active'
                      ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-100 animate-pulse'
                      : 'bg-[#081519] border-[#15323a] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        getStepState(2, currentOrder.status) === 'completed'
                          ? 'bg-teal-950 text-teal-400 border border-teal-500/30'
                          : getStepState(2, currentOrder.status) === 'active'
                          ? 'bg-cyan-900 text-cyan-300'
                          : 'bg-[#122830] text-slate-500'
                      }`}
                    >
                      {getStepState(2, currentOrder.status) === 'completed' ? '✓' : '3'}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">
                      {(currentOrder.serviceType === 'chatgpt' || currentOrder.id.startsWith('GPT-'))
                        ? 'Subscription API'
                        : 'Gift API Call'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {(currentOrder.serviceType === 'chatgpt' || currentOrder.id.startsWith('GPT-'))
                      ? 'OpenAI Auth Gateway'
                      : 'Telegram Bot Gateway'}
                  </p>
                </div>

                {/* Step 4: Delivered */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    currentOrder.status === 'completed'
                      ? 'bg-[#0e272f] border-teal-500/50 text-slate-100'
                      : 'bg-[#081519] border-[#15323a] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        currentOrder.status === 'completed'
                          ? 'bg-teal-900 text-teal-300'
                          : 'bg-[#122830] text-slate-500'
                      }`}
                    >
                      {currentOrder.status === 'completed' ? '✓' : '4'}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Delivered</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {currentOrder.status === 'completed' ? 'Ready to claim' : 'Pending dispatch'}
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Gift Box (Shown when completed!) */}
            {currentOrder.status === 'completed' && currentOrder.delivery && (() => {
              const isChatGpt = currentOrder.serviceType === 'chatgpt' || currentOrder.id.startsWith('GPT-');
              return (
                <div className={`mt-4 p-5 rounded-xl border shadow-xl ${
                  isChatGpt
                    ? 'bg-gradient-to-br from-[#0a2723] to-[#071816] border-emerald-500/40 shadow-emerald-950/30'
                    : 'bg-gradient-to-br from-[#0c2b33] to-[#0a1e24] border-teal-500/40 shadow-teal-950/30'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                      isChatGpt
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                        : 'bg-teal-500 text-slate-950 shadow-teal-500/30'
                    }`}>
                      {isChatGpt ? <Bot className="w-5 h-5 stroke-[2.2]" /> : <Gift className="w-5 h-5 stroke-[2.2]" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">
                        {isChatGpt ? 'ChatGPT Plus Subscription Activated!' : 'Telegram Premium Gift Ready!'}
                      </h3>
                      <p className={`text-xs font-medium ${isChatGpt ? 'text-emerald-300' : 'text-teal-300'}`}>
                        {isChatGpt
                          ? `Directly linked and provisioned for customer ${currentOrder.customerEmail || currentOrder.username}`
                          : 'Official link dispatched via Telegram Premium Subscription API'}
                      </p>
                    </div>
                  </div>

                  {/* Direct Gift Link */}
                  <div className="mt-3 p-3 bg-[#061216] border border-[#173d47] rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className={`truncate font-mono-code text-xs select-all px-1 ${
                      isChatGpt ? 'text-emerald-300' : 'text-teal-300'
                    }`}>
                      {currentOrder.delivery.giftUrl}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(currentOrder.delivery?.giftUrl || '')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isChatGpt
                            ? 'bg-[#0a2622] hover:bg-[#113530] text-emerald-300 border-emerald-500/30'
                            : 'bg-[#0e2931] hover:bg-[#153842] text-teal-300 border-teal-500/30'
                        }`}
                      >
                        {copiedLink ? (
                          <>
                            <Check className={`w-3.5 h-3.5 ${isChatGpt ? 'text-emerald-400' : 'text-teal-400'}`} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={currentOrder.delivery.giftUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-950 flex items-center gap-1.5 transition-all shadow-md ${
                          isChatGpt
                            ? 'bg-[#10b981] hover:bg-[#059669] shadow-emerald-500/20'
                            : 'bg-[#14b8a6] hover:bg-[#0d9488] shadow-teal-500/20'
                        }`}
                      >
                        <span>{isChatGpt ? 'Open ChatGPT' : 'Open in Telegram'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Delivery Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#13323b] text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Receipt ID</span>
                      <span className="font-mono-code text-slate-200">
                        {currentOrder.delivery.receiptNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Plan Duration</span>
                      <span className="text-slate-200 font-semibold">
                        {currentOrder.delivery.durationLabel}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Delivered At</span>
                      <span className="text-slate-200">
                        {new Date(currentOrder.delivery.deliveredAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Provider API</span>
                      <span className={`font-medium truncate block ${isChatGpt ? 'text-emerald-400' : 'text-teal-400'}`}>
                        {isChatGpt ? 'OpenAI Plus Auth0 v4' : 'MTProto Bot API v8.1'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Transaction Logs */}
            <div className="mt-5 pt-4 border-t border-[#142e37]">
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Transaction & Real-Time Queue Activity</span>
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {currentOrder.logs.map((log, index) => (
                  <div
                    key={index}
                    className="text-[11px] flex items-start gap-2 text-slate-400 py-0.5"
                  >
                    <span className="font-mono-code text-slate-500 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="w-full text-center py-10 px-4 bg-[#0a1b21] border border-[#163741] rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#0f2830] text-teal-400 flex items-center justify-center mx-auto mb-3 border border-teal-500/20">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">No Order Selected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Enter your Order ID (starts with AG-) or your Telegram @username above to inspect real-time queue and gift delivery.
          </p>
          <button
            onClick={onNavigateToActivate}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#14b8a6] hover:bg-[#0d9488] text-slate-950 transition-all inline-flex items-center gap-1.5"
          >
            <span>Activate a Code</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Orders Quick-Pills */}
      {recentOrders.length > 0 && (
        <div className="w-full mt-6">
          <h4 className="text-xs font-semibold text-slate-400 mb-2 px-1">
            Recent Orders in System:
          </h4>
          <div className="flex flex-wrap gap-2">
            {recentOrders.map((ord) => (
              <button
                key={ord.id}
                onClick={() => {
                  setSearchQuery(ord.id);
                  fetchOrderById(ord.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                  currentOrder?.id === ord.id
                    ? 'bg-[#14b8a6] text-slate-950 border-teal-400 font-bold'
                    : 'bg-[#0a1b21] text-slate-300 border-[#173740] hover:border-teal-500/40'
                }`}
              >
                <span className="font-mono-code">{ord.id}</span>
                <span className="text-[11px] opacity-80">({ord.username})</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ord.status === 'completed' ? 'bg-teal-400' : 'bg-amber-400'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
