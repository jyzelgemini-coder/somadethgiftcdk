import React, { useState, useEffect, useRef } from 'react';
import {
  Ticket,
  ListOrdered,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { TelegramAvatar } from './TelegramAvatar';
import { OrderItem, OrderVerificationDetails } from '../types';

interface ActivateFormProps {
  onOrderCreated: (order: OrderItem) => void;
  prefilledCode?: string;
  onGoToTrack: () => void;
}

export const ActivateForm: React.FC<ActivateFormProps> = ({
  onOrderCreated,
  prefilledCode = '',
  onGoToTrack,
}) => {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [isVerifyingUser, setIsVerifyingUser] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState<OrderVerificationDetails | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prefilledCode) {
      handleCodeChange(prefilledCode);
    }
  }, [prefilledCode]);

  // Format code into XXXXXXXX-XXXXXXXX-XXXXXXXX (24 chars)
  const formatCode = (val: string) => {
    const raw = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 24);
    const parts = [];
    if (raw.length > 0) parts.push(raw.slice(0, 8));
    if (raw.length > 8) parts.push(raw.slice(8, 16));
    if (raw.length > 16) parts.push(raw.slice(16, 24));
    return parts.join('-');
  };

  const handleCodeChange = (val: string) => {
    setErrorMessage(null);
    setCode(formatCode(val));
  };

  // Real Telegram username verification check
  const handleVerifyUsername = async (customHandle?: string) => {
    const handleToVerify = (customHandle ?? username).trim();
    const cleanOnly = handleToVerify.replace(/^@/, '');
    if (cleanOnly.length < 3) return;

    setIsVerifyingUser(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: `@${cleanOnly}` }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setVerifiedProfile(data.data);
      } else {
        setVerifiedProfile(null);
        setErrorMessage(data.error || 'Telegram profile could not be verified');
      }
    } catch {
      setErrorMessage('Verification gateway is busy. Please try again.');
    } finally {
      setIsVerifyingUser(false);
    }
  };

  // Auto-trigger verification with debounce when user pauses typing
  const handleUsernameChange = (val: string) => {
    const sanitized = val.replace(/[^a-zA-Z0-9_]/g, '');
    const newUsername = `@${sanitized}`;
    setUsername(newUsername);
    setErrorMessage(null);

    if (verifiedProfile && verifiedProfile.username !== newUsername) {
      setVerifiedProfile(null);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (sanitized.length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        handleVerifyUsername(newUsername);
      }, 700);
    }
  };

  // Raw character count without hyphens
  const rawCodeLength = code.replace(/[^a-zA-Z0-9]/g, '').length;
  const isCompleteCode = rawCodeLength === 24;
  const isValidUsername = username.trim().replace(/^@/, '').length >= 3;
  const canSubmit = isCompleteCode && isValidUsername && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const cleanHandle = username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`;
      const res = await fetch('/api/cdk/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanHandle,
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to activate CDK code. Please check your details.');
        setIsLoading(false);
        return;
      }

      // Success! Pass order to parent and switch to track view
      onOrderCreated(data.order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during activation.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Title & Subtitle matching reference design */}
      <div className="text-center mb-5 sm:mb-7 px-2">
        <h1 className="font-display text-2xl sm:text-4xl md:text-[46px] text-slate-100 tracking-tight font-normal mb-2 sm:mb-3 leading-[1.2]">
          Redeem your activation code
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm md:text-[15px] max-w-md mx-auto leading-relaxed">
          Enter your Telegram username and one-time code. We will place your order in the queue.
        </p>
      </div>

      {/* 3 Badges matching reference design */}
      <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-3.5 mb-5 sm:mb-7">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:py-3.5 sm:px-4 rounded-xl bg-[#0b1c22] border border-[#15343d] text-center sm:text-left transition-colors">
          <div className="p-1 sm:p-1.5 rounded-lg bg-teal-950/60 text-teal-400 shrink-0">
            <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-300 leading-tight">One-time code</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:py-3.5 sm:px-4 rounded-xl bg-[#0b1c22] border border-[#15343d] text-center sm:text-left transition-colors">
          <div className="p-1 sm:p-1.5 rounded-lg bg-teal-950/60 text-teal-400 shrink-0">
            <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-300 leading-tight">Fair queue</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:py-3.5 sm:px-4 rounded-xl bg-[#0b1c22] border border-[#15343d] text-center sm:text-left transition-colors">
          <div className="p-1 sm:p-1.5 rounded-lg bg-teal-950/60 text-teal-400 shrink-0">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-300 leading-tight">Track anytime</span>
        </div>
      </div>

      {/* Form Container Card */}
      <div className="w-full bg-[#0a1b21] border border-[#163741] rounded-2xl p-4 sm:p-7 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Step 1: Telegram Username */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-900/60 text-teal-400 border border-teal-500/30 text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <label className="text-xs sm:text-sm font-medium text-slate-200 flex items-center gap-1.5">
                  <span>@ Telegram username</span>
                </label>
              </div>

              {verifiedProfile && (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-teal-300 font-medium bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-500/30">
                  <CheckCircle2 className="w-3 h-3 text-teal-400" />
                  Live Verified
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-medium text-sm">
                @
              </div>
              <input
                type="text"
                value={username.replace(/^@/, '')}
                onChange={(e) => handleUsernameChange(e.target.value)}
                onBlur={() => handleVerifyUsername()}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="username"
                className="w-full pl-9 pr-24 py-3 bg-[#07151a] border border-[#173740] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm sm:text-base font-medium transition-all"
              />

              {/* Verify button inside input */}
              <div className="absolute inset-y-0 right-1.5 flex items-center">
                <button
                  type="button"
                  onClick={() => handleVerifyUsername()}
                  disabled={isVerifyingUser || username.trim().replace(/^@/, '').length < 3}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#0f2a33] text-teal-300 hover:bg-[#153a47] border border-teal-500/30 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer min-h-[32px]"
                >
                  {isVerifyingUser ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  )}
                  <span>{isVerifyingUser ? 'Checking...' : 'Check'}</span>
                </button>
              </div>
            </div>

            {/* Real Customer Profile Preview Card */}
            {verifiedProfile && (
              <div className="mt-3 p-3 sm:p-3.5 rounded-xl bg-[#071920] border border-teal-500/40 flex items-start gap-3 sm:gap-4 transition-all shadow-lg">
                {/* Mobile-Optimized Telegram Avatar with tap-to-enlarge */}
                <TelegramAvatar
                  avatarUrl={verifiedProfile.avatarUrl}
                  displayName={verifiedProfile.displayName}
                  username={verifiedProfile.username}
                  size="lg"
                  isVerified={verifiedProfile.isVerifiedBadge}
                  clickable={true}
                />

                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-100 text-sm sm:text-base leading-tight">
                      {verifiedProfile.displayName}
                    </span>
                    <span className="text-xs text-teal-300 font-mono-code font-medium">
                      {verifiedProfile.username}
                    </span>
                  </div>

                  {verifiedProfile.bio && (
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {verifiedProfile.bio}
                    </p>
                  )}

                  {verifiedProfile.subscribers && (
                    <p className="text-[11px] text-teal-400/80 mt-0.5 font-medium">
                      {verifiedProfile.subscribers}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-[11px] flex-wrap">
                    <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Live Telegram Profile
                    </span>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="text-slate-400 text-[10px] sm:text-[11px]">Tap photo to enlarge</span>
                    <span className="text-slate-600">•</span>
                    <a
                      href={`https://t.me/${verifiedProfile.username.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-teal-300 underline underline-offset-2 flex items-center gap-0.5 transition-colors"
                    >
                      <span>Preview on Telegram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] sm:text-[12px] text-slate-400 mt-1.5 px-0.5">
              Starts with @ — letters, numbers, and underscore only
            </p>
          </div>

          {/* Step 2: Activation Code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-900/60 text-teal-400 border border-teal-500/30 text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <label className="text-xs sm:text-sm font-medium text-slate-200 flex items-center gap-1.5">
                  <span>🔑 Activation code</span>
                </label>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX"
                maxLength={26}
                className="w-full px-3 sm:px-4 py-3 bg-[#07151a] border border-[#173740] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono-code text-sm sm:text-base font-semibold tracking-wider transition-all"
              />

              {code && (
                <button
                  type="button"
                  onClick={() => setCode('')}
                  className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* 3 Progress Bars matching reference design */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2">
              <div
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  rawCodeLength >= 8 ? 'bg-teal-400' : 'bg-[#15343d]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  rawCodeLength >= 16 ? 'bg-teal-400' : 'bg-[#15343d]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  rawCodeLength >= 24 ? 'bg-teal-400' : 'bg-[#15343d]'
                }`}
              />
            </div>

            {/* Character counter */}
            <div className="flex items-center justify-between mt-1.5 text-[11px] sm:text-xs">
              <span
                className={
                  rawCodeLength === 24
                    ? 'text-teal-400 font-semibold'
                    : 'text-slate-400'
                }
              >
                {rawCodeLength} of 24 characters
              </span>
              <span className="text-slate-400">Format: 8-8-8</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs sm:text-sm flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Activation Action Button matching reference design */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3.5 sm:py-4 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg min-h-[48px] ${
              canSubmit
                ? 'bg-[#14b8a6] hover:bg-[#0d9488] text-slate-950 shadow-teal-500/25 active:scale-[0.99]'
                : 'bg-[#112a32] text-slate-500 cursor-not-allowed border border-[#163741]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                <span>Validating & Queuing Order...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                <span>Activate</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Track link */}
      <div className="w-full mt-4 flex items-center justify-center">
        <button
          onClick={onGoToTrack}
          className="text-xs text-slate-400 hover:text-teal-300 transition-colors underline underline-offset-2 cursor-pointer"
        >
          Have an existing order? Track delivery status
        </button>
      </div>
    </div>
  );
};
