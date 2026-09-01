import confetti from 'canvas-confetti';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Gift,
  HelpCircle,
  KeyRound,
  Lock,
  QrCode,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ActivationResult, PremiumPlan, PublicSystemStatus, VerificationResult } from '../types';
import { apiFetch } from '../utils/api';
import { soundEngine } from '../utils/audio';
import { SecurityBadge } from './SecurityBadge';

interface CustomerRedemptionPortalProps {
  systemStatus: PublicSystemStatus | null;
}

const PHASES = [
  {
    name: 'Connecting to Telegram Server',
    desc: 'Establishing secure communication with Telegram network...',
    minPercent: 0,
    maxPercent: 25,
  },
  {
    name: 'Validating Subscription Voucher',
    desc: 'Checking cryptographic signature and key validity...',
    minPercent: 25,
    maxPercent: 55,
  },
  {
    name: 'Binding Recipient Username',
    desc: 'Allocating Telegram Premium gift to your account...',
    minPercent: 55,
    maxPercent: 80,
  },
  {
    name: 'Generating Claim Voucher Link',
    desc: 'Finalizing encrypted redemption token...',
    minPercent: 80,
    maxPercent: 100,
  },
];

export const CustomerRedemptionPortal: React.FC<CustomerRedemptionPortalProps> = ({
  systemStatus,
}) => {
  const [cdkInput, setCdkInput] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [step, setStep] = useState<'input_cdk' | 'enter_username' | 'activating' | 'success'>('input_cdk');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationResult | null>(null);
  const [activationData, setActivationData] = useState<ActivationResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);

  // Exact 1-Minute (60 seconds) automated processing
  const TOTAL_DURATION_SECONDS = 60;
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Read ?cdk= from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cdkParam = params.get('cdk');
    if (cdkParam) {
      const clean = cdkParam.trim().toUpperCase();
      setCdkInput(clean);
      handleAutoVerify(clean);
    }
  }, []);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Exact 1-minute automated processing interval
  useEffect(() => {
    if (step !== 'activating') return;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        const currentPercent = Math.min(100, (next / TOTAL_DURATION_SECONDS) * 100);

        // Friendly progress log updates
        if (next % 3 === 0 || next === 1 || next === TOTAL_DURATION_SECONDS) {
          const time = new Date().toLocaleTimeString();
          const activePhase =
            PHASES.find((p) => currentPercent >= p.minPercent && currentPercent <= p.maxPercent) ||
            PHASES[PHASES.length - 1];

          setTerminalLogs((logs) => [
            ...logs.slice(-25),
            `[${time}] ${activePhase.name}: ${Math.round(currentPercent)}% complete`,
          ]);

          soundEngine.playStageTick();
        }

        // Completion at exact 60 seconds (1 minute)
        if (next >= TOTAL_DURATION_SECONDS) {
          clearInterval(timer);
          triggerActivationSuccess();
          return TOTAL_DURATION_SECONDS;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const handleAutoVerify = async (code: string) => {
    setIsVerifying(true);
    setError(null);
    try {
      const data = await apiFetch<VerificationResult>('/api/redeem/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cdk: code }),
      });
      soundEngine.playVerifyChirp();
      setVerificationData(data);
      setStep('enter_username');
    } catch (err: any) {
      setError(err.message || 'Failed to verify CDK key. Please check the code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cdkInput.trim()) {
      setError('Please enter your CDK activation key.');
      return;
    }
    await handleAutoVerify(cdkInput.trim());
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanUsername = telegramUsername.trim();
    if (!cleanUsername) {
      setError('Please enter your Telegram username (e.g. @username).');
      return;
    }
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = `@${cleanUsername}`;
    }

    const rawName = cleanUsername.replace(/^@/, '');
    if (!/^[a-zA-Z0-9_]{4,32}$/.test(rawName)) {
      setError('Invalid Telegram username. Please enter 4 to 32 letters, numbers or underscores.');
      return;
    }

    setError(null);
    setSecondsElapsed(0);

    setTerminalLogs([
      `[${new Date().toLocaleTimeString()}] Starting 1-minute automated activation for ${cleanUsername}`,
      `[${new Date().toLocaleTimeString()}] Verifying CDK voucher...`,
      `[${new Date().toLocaleTimeString()}] Establishing secure connection with Telegram servers...`,
    ]);

    try {
      const data = await apiFetch<ActivationResult>('/api/redeem/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cdk: cdkInput.trim(),
          telegramUsername: cleanUsername,
        }),
      });

      setActivationData(data);
      setStep('activating');
      soundEngine.playVerifyChirp();
    } catch (err: any) {
      setError(err.message || 'An error occurred during activation.');
    }
  };

  const triggerActivationSuccess = () => {
    setStep('success');
    soundEngine.playSuccessFanfare();

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const formatPlanTitle = (plan: PremiumPlan) => {
    switch (plan) {
      case '3_months':
        return '3 Months Telegram Premium';
      case '6_months':
        return '6 Months Telegram Premium';
      case '12_months':
        return '12 Months (1 Year) Telegram Premium';
      default:
        return 'Telegram Premium Gift';
    }
  };

  const handleReset = () => {
    setCdkInput('');
    setTelegramUsername('');
    setVerificationData(null);
    setActivationData(null);
    setError(null);
    setSecondsElapsed(0);
    setStep('input_cdk');
  };

  const progressPercent = Math.min(100, (secondsElapsed / TOTAL_DURATION_SECONDS) * 100);
  const remainingSeconds = Math.max(0, TOTAL_DURATION_SECONDS - secondsElapsed);
  const remMin = Math.floor(remainingSeconds / 60);
  const remSec = remainingSeconds % 60;
  const timeFormatted = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;

  const currentPhase =
    PHASES.find((p) => progressPercent >= p.minPercent && progressPercent < p.maxPercent) ||
    PHASES[PHASES.length - 1];

  const qrImageUrl = activationData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        activationData.giftPayload
      )}&bgcolor=0b0f19&color=38bdf8&margin=2`
    : '';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8 font-sans">
      {/* App Header Card */}
      <div className="mb-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 mx-auto sm:mx-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
            <Send className="w-6 h-6 -rotate-12 translate-x-0.5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <span>SOMADETH</span>
              <span className="text-xs px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full font-medium">
                Gift Gateway
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated 1-Minute Telegram Premium Activation
            </p>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end">
          <SecurityBadge compact />
        </div>
      </div>

      {/* Main Action Card */}
      <div
        id="redemption-card"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl relative"
      >
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-1">
            <div
              className={`flex items-center gap-1.5 font-medium whitespace-nowrap ${
                step === 'input_cdk' ? 'text-sky-400 font-semibold' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 'input_cdk'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                1
              </span>
              <span>Enter Key</span>
            </div>

            <span className="text-slate-700">&rsaquo;</span>

            <div
              className={`flex items-center gap-1.5 font-medium whitespace-nowrap ${
                step === 'enter_username' ? 'text-sky-400 font-semibold' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 'enter_username'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                2
              </span>
              <span>Username</span>
            </div>

            <span className="text-slate-700">&rsaquo;</span>

            <div
              className={`flex items-center gap-1.5 font-medium whitespace-nowrap ${
                step === 'activating' ? 'text-sky-400 font-semibold' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 'activating'
                    ? 'bg-sky-500 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                3
              </span>
              <span>Activating (1m)</span>
            </div>

            <span className="text-slate-700">&rsaquo;</span>

            <div
              className={`flex items-center gap-1.5 font-medium whitespace-nowrap ${
                step === 'success' ? 'text-emerald-400 font-semibold' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 'success'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                4
              </span>
              <span>Claim</span>
            </div>
          </div>

          <button
            onClick={() => setShowFaq(!showFaq)}
            className="text-slate-400 hover:text-sky-400 flex items-center gap-1 text-xs font-medium transition-colors shrink-0 ml-2"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* STEP 1: Enter CDK */}
        {step === 'input_cdk' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-sky-400" />
                <span>Enter Your Activation Key</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Paste the CDK code you purchased to verify your Telegram Premium duration.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  CDK Key
                </label>
                <input
                  id="input-cdk-key"
                  type="text"
                  value={cdkInput}
                  onChange={(e) => setCdkInput(e.target.value.toUpperCase())}
                  placeholder="TGPREM-XXXX-XXXX-XXXX"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 p-3.5 text-center text-sm sm:text-base tracking-wider text-white rounded-xl font-mono outline-none transition-all placeholder:text-slate-600"
                  autoFocus
                />
              </div>

              <div className="pt-2">
                <button
                  id="btn-verify-cdk"
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3.5 min-h-[48px] bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-sky-500/20"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Key...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue &bull; Verify Key</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Enter Telegram Username & Confirm */}
        {step === 'enter_username' && verificationData && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Key Verified Successfully</span>
                </span>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-sky-400 flex items-center gap-1 font-medium transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Change Key</span>
                </button>
              </div>

              {/* Plan Card */}
              <div className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {formatPlanTitle(verificationData.plan)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Key: <span className="text-slate-300 font-semibold">{verificationData.maskedCode}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20 shrink-0">
                  {verificationData.planDurationDays} Days
                </span>
              </div>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>Your Telegram Username</span>
                </label>
                <div className="relative">
                  <input
                    id="input-telegram-username"
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 p-3.5 text-sm text-white rounded-xl outline-none transition-all placeholder:text-slate-600"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Enter the handle where you want to receive the Telegram Premium gift.
                </p>
              </div>

              <div className="pt-2">
                <button
                  id="btn-start-1min-process"
                  type="submit"
                  className="w-full py-3.5 min-h-[48px] bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-sky-500/20"
                >
                  <Zap className="w-4 h-4" />
                  <span>Start 1-Minute Activation</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: Activating (Exact 1-Minute Locked Sequence) */}
        {step === 'activating' && (
          <div className="space-y-5 text-center">
            {/* Top Timer Indicator */}
            <div className="py-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
                <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Processing Time: 1 Minute</span>
              </div>

              <div className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-tight">
                {timeFormatted}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Please keep this page open while we generate your official Telegram gift link.
              </p>
            </div>

            {/* Clean Progress Bar */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium text-sky-400">{currentPhase.name}</span>
                <span className="font-mono font-bold">{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">{currentPhase.desc}</p>
            </div>

            {/* Clean Terminal Logs */}
            <div className="text-left bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 font-mono text-[11px] text-slate-400 h-28 overflow-y-auto space-y-1">
              {terminalLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  <span className="text-sky-400/80">&gt; </span>
                  <span>{log}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}

        {/* STEP 4: Success - Claim Gift */}
        {step === 'success' && activationData && (
          <div className="space-y-5 animate-fade-in text-center">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
              <Gift className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Your Telegram Premium is Ready!
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Allocated for <span className="text-sky-400 font-semibold">{activationData.recipientUsername}</span> &bull; {activationData.planDurationDays} Days
              </p>
            </div>

            {/* Primary Action: Direct Claim on Telegram */}
            <div className="space-y-3">
              <a
                id="btn-claim-telegram-link"
                href={activationData.giftPayload}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 min-h-[50px] bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
              >
                <Send className="w-4 h-4" />
                <span>Open &amp; Claim on Telegram</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Secondary Action: Copy Link */}
              <button
                id="btn-copy-gift-link"
                onClick={() => {
                  navigator.clipboard.writeText(activationData.giftPayload);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Gift Link Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Direct Gift Link</span>
                  </>
                )}
              </button>
            </div>

            {/* QR Code and Receipt Accordions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => setShowQrCode(!showQrCode)}
                className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-sky-400" />
                  <span>Scan QR Code to Claim on Phone</span>
                </span>
                {showQrCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showQrCode && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center gap-2 animate-fade-in">
                  <img
                    src={qrImageUrl}
                    alt="Telegram Premium Gift QR Code"
                    className="w-44 h-44 rounded-lg border border-slate-800"
                  />
                  <p className="text-[11px] text-slate-400">
                    Open your phone camera to claim instantly
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowReceiptDetails(!showReceiptDetails)}
                className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>View Verification Receipt</span>
                </span>
                {showReceiptDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showReceiptDetails && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs text-slate-400 space-y-2 font-mono animate-fade-in">
                  <div className="flex justify-between">
                    <span>Voucher ID:</span>
                    <span className="text-slate-200 font-semibold">{activationData.voucherId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Key:</span>
                    <span className="text-slate-200">{activationData.maskedCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-semibold">REDEEMED &bull; ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timestamp:</span>
                    <span className="text-slate-300">{new Date(activationData.redeemedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-200 underline font-medium"
              >
                Activate Another Code
              </button>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {showFaq && (
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-3 text-xs animate-fade-in">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 mb-3">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>Frequently Asked Questions</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1">How does the 1-minute activation work?</div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Once you enter your CDK and Telegram handle, our secure gateway validates your key against the encrypted vault and produces an official Telegram Premium subscription gift link.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1">Do I need to share my Telegram password?</div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Never. We only require your public @username handle to assign the gift voucher. Your account remains 100% secure.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1">What if my key is marked invalid?</div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Each CDK key can only be redeemed once. If you experience any difficulty, please contact customer support at <span className="text-sky-400 font-mono">{systemStatus?.supportContact || '@PremiumGiftSupport'}</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Security Details Footer Card */}
      <div className="mt-6">
        <SecurityBadge />
      </div>
    </div>
  );
};
