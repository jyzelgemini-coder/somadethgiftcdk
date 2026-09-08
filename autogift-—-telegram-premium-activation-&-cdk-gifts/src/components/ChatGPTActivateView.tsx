import React, { useState, useEffect, useRef } from 'react';
import {
  Ticket,
  ListOrdered,
  Search,
  KeyRound,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Zap,
  Lock,
  FileCode2,
  Key,
  HelpCircle,
  Check,
  Send,
} from 'lucide-react';
import { OrderItem, ChatGPTVerificationDetails } from '../types';

interface ChatGPTActivateViewProps {
  onOrderCreated: (order: OrderItem) => void;
  onGoToTrack: () => void;
  prefilledCode?: string;
}

export const ChatGPTActivateView: React.FC<ChatGPTActivateViewProps> = ({
  onOrderCreated,
  onGoToTrack,
  prefilledCode = '',
}) => {
  const [sessionInput, setSessionInput] = useState('');
  const [code, setCode] = useState('');
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState<ChatGPTVerificationDetails | null>(null);
  const [authMethodUsed, setAuthMethodUsed] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prefilledCode) {
      handleCodeChange(prefilledCode);
    }
  }, [prefilledCode]);

  // Format code into 24-char format: XXXXXXXX-XXXXXXXX-XXXXXXXX
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

  const handleVerify = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 10) return;

    // Check if user accidentally pasted only the raw token
    if (trimmed.startsWith('eyJ') || trimmed.toLowerCase().startsWith('bearer eyj')) {
      setVerifiedProfile(null);
      setErrorMessage(
        'Please provide the FULL session JSON from https://chatgpt.com/api/auth/session (must start with { and contain user and accessToken), not only the token.'
      );
      return;
    }

    if (!trimmed.startsWith('{')) {
      setVerifiedProfile(null);
      setErrorMessage(
        'Please copy and paste the entire JSON content from https://chatgpt.com/api/auth/session (starts with {).'
      );
      return;
    }

    setIsVerifyingSession(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/chatgpt/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInput: trimmed }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        setVerifiedProfile(data.data);
        setAuthMethodUsed(data.data.authProvider || 'Verified OpenAI Session');
      } else {
        setVerifiedProfile(null);
        setErrorMessage(
          data.error ||
            'Could not decode ChatGPT session JSON. Please make sure you copied the full page content from https://chatgpt.com/api/auth/session.'
        );
      }
    } catch {
      setErrorMessage('Verification service busy. Please try again in a moment.');
    } finally {
      setIsVerifyingSession(false);
    }
  };

  const handleSessionChange = (val: string) => {
    setSessionInput(val);
    setErrorMessage(null);

    const trimmed = val.trim();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (trimmed.length >= 15) {
      debounceTimerRef.current = setTimeout(() => {
        handleVerify(trimmed);
      }, 400);
    } else {
      setVerifiedProfile(null);
    }
  };

  const handleInsertSampleJson = () => {
    const sample = JSON.stringify(
      {
        user: {
          id: 'user-openai882910',
          name: 'Alex Developer',
          email: 'alex.openai@domain.com',
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        },
        expires: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        accessToken: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoMHw4ODI5MTAiLCJlbWFpbCI6ImFsZXgub3BlbmFpQGRvbWFpbi5jb20iLCJleHAiOjE3NjgwMDAwMDB9.signature_${Date.now()}`,
        authProvider: 'OpenAI Full Session',
      },
      null,
      2
    );
    setSessionInput(sample);
    handleVerify(sample);
  };

  const rawCodeLength = code.replace(/[^a-zA-Z0-9]/g, '').length;
  const isCompleteCode = rawCodeLength >= 16;
  const canSubmit = Boolean(verifiedProfile && isCompleteCode && !isLoading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/chatgpt/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInput: sessionInput.trim(),
          code,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to activate ChatGPT CDK code.');
        setIsLoading(false);
        return;
      }

      onOrderCreated(data.order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during ChatGPT activation.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Subdomain & Title matching somadethgiftcdk.site/#chatgpt */}
      <div className="text-center mb-5 sm:mb-7 px-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#072420] border border-emerald-500/40 text-emerald-300 text-xs font-mono-code mb-3.5 shadow-md shadow-black/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-300">somadethgiftcdk.site</span>
          <span className="text-emerald-400 font-bold">/#chatgpt</span>
        </div>

        <h1 className="font-display text-2xl sm:text-4xl md:text-[46px] text-slate-100 tracking-tight font-normal mb-2 sm:mb-3 leading-[1.2]">
          Redeem your activation code
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm md:text-[15px] max-w-md mx-auto leading-relaxed">
          Authenticate with your full session JSON from <span className="text-emerald-400 font-mono-code">chatgpt.com/api/auth/session</span>.
        </p>
      </div>

      {/* 3 Badges */}
      <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-3.5 mb-5 sm:mb-7">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:py-3.5 sm:px-4 rounded-xl bg-[#0b1c22] border border-[#15343d] text-center sm:text-left transition-colors">
          <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-950/70 text-emerald-400 shrink-0">
            <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-300 leading-tight">One-time code</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:py-3.5 sm:px-4 rounded-xl bg-[#0b1c22] border border-[#15343d] text-center sm:text-left transition-colors">
          <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-950/70 text-emerald-400 shrink-0">
            <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-300 leading-tight">Fair queue</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:py-3.5 sm:px-4 rounded-xl bg-[#0b1c22] border border-[#15343d] text-center sm:text-left transition-colors">
          <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-950/70 text-emerald-400 shrink-0">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-300 leading-tight">Track anytime</span>
        </div>
      </div>

      {/* Main Activation Card */}
      <div className="w-full bg-[#0a1b21] border border-[#163741] rounded-2xl p-4 sm:p-7 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Step 1: ChatGPT Full Session JSON */}
          <div>
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <label className="text-xs sm:text-sm font-semibold text-slate-200">
                  Customer ChatGPT Login (Full Session JSON)
                </label>
              </div>

              {/* Direct Link to chatgpt.com/api/auth/session */}
              <a
                href="https://chatgpt.com/api/auth/session"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2.5 py-1 rounded-lg bg-[#08221f] border border-emerald-500/30 hover:border-emerald-400/50 transition-all cursor-pointer"
              >
                <span>Open chatgpt.com/api/auth/session</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Step-by-Step Guidance Box */}
            <div className="p-3 rounded-xl bg-[#06151a] border border-[#14343d] mb-2.5 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <FileCode2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>How to copy your Full Session JSON:</span>
                </div>

                <button
                  type="button"
                  onClick={handleInsertSampleJson}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-[#08221f] px-2 py-0.5 rounded border border-emerald-500/30 cursor-pointer"
                >
                  Load Sample JSON
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                Open <span className="text-emerald-400 font-mono-code">chatgpt.com/api/auth/session</span> in your browser while logged into ChatGPT. Press <kbd className="px-1 py-0.5 rounded bg-[#0f2a33] text-slate-300 text-[10px]">Ctrl+A</kbd> (or <kbd className="px-1 py-0.5 rounded bg-[#0f2a33] text-slate-300 text-[10px]">Cmd+A</kbd>) to select everything, copy it, and paste into the box below.
              </p>
            </div>

            {/* Textarea for Full Session JSON */}
            <div className="relative">
              <textarea
                rows={5}
                value={sessionInput}
                onChange={(e) => handleSessionChange(e.target.value)}
                placeholder={'Paste full session JSON here: {"user":{"id":"...","name":"...","email":"..."},"accessToken":"eyJ..."}'}
                className="w-full p-3 bg-[#07151a] border border-[#173740] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs font-mono-code transition-all resize-none leading-relaxed"
              />

              {sessionInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionInput('');
                    setVerifiedProfile(null);
                    setAuthMethodUsed(null);
                  }}
                  className="absolute top-2.5 right-2.5 text-[11px] px-2 py-0.5 rounded bg-[#0c242b] text-slate-400 hover:text-white border border-[#1a414e] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {sessionInput.trim() && (
              <div className="flex items-center justify-between mt-1.5 text-[11px] px-1">
                {sessionInput.trim().startsWith('{') ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Full Session JSON detected</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    Must start with {'{'} (Session JSON object)
                  </span>
                )}

                <span className="text-slate-500">{sessionInput.length} chars</span>
              </div>
            )}

            {isVerifyingSession && (
              <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying ChatGPT session credentials...</span>
              </div>
            )}

            {/* Extracted Customer Email & Account Card */}
            {verifiedProfile && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#071d1b] border border-emerald-500/40 flex items-start gap-3 transition-all shadow-lg">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 font-bold flex items-center justify-center shrink-0 border border-emerald-400/40 shadow">
                  {verifiedProfile.image ? (
                    <img
                      src={verifiedProfile.image}
                      alt={verifiedProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    verifiedProfile.name.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-100 text-sm">
                      {verifiedProfile.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Account Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs font-bold text-emerald-300 bg-[#061514] px-2.5 py-1 rounded-md border border-emerald-500/30">
                    <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono-code truncate select-all">{verifiedProfile.email}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span>
                      Account ID: <span className="font-mono-code text-slate-300">{verifiedProfile.accountId.slice(0, 16)}...</span>
                    </span>
                    {verifiedProfile.expires && (
                      <span>
                        Expires: <span className="text-slate-300">{new Date(verifiedProfile.expires).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: ChatGPT CDK Code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <label className="text-xs sm:text-sm font-semibold text-slate-200">
                  One-time ChatGPT CDK Code
                </label>
              </div>

              {/* Sample keys helper */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCode('GPTPLUS1-OPENAI26-8877AABB')}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-[#08221e] px-2 py-0.5 rounded border border-emerald-500/30 cursor-pointer"
                >
                  Plus
                </button>
                <button
                  type="button"
                  onClick={() => setCode('GPTGO001-OPENAI26-9988CCDD')}
                  className="text-[10px] text-teal-400 hover:text-teal-300 bg-[#08221e] px-2 py-0.5 rounded border border-teal-500/30 cursor-pointer"
                >
                  Go
                </button>
                <button
                  type="button"
                  onClick={() => setCode('GPTPRO51-OPENAI26-7766EEFF')}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 bg-[#08221e] px-2 py-0.5 rounded border border-cyan-500/30 cursor-pointer"
                >
                  Pro x5
                </button>
                <button
                  type="button"
                  onClick={() => setCode('GPTPRO20-OPENAI26-5544GGHH')}
                  className="text-[10px] text-purple-400 hover:text-purple-300 bg-[#08221e] px-2 py-0.5 rounded border border-purple-500/30 cursor-pointer"
                >
                  Pro x20
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={26}
                autoCapitalize="characters"
                spellCheck="false"
                placeholder="GPTPLUS1-XXXXXXXX-XXXXXXXX"
                className="w-full px-3.5 py-3 bg-[#07151a] border border-[#173740] rounded-xl text-slate-100 placeholder-slate-500 font-mono-code tracking-wider focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm sm:text-base font-semibold transition-all uppercase"
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

            {/* 3 Progress Bars */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2">
              <div
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  rawCodeLength >= 8 ? 'bg-emerald-400' : 'bg-[#0e262c]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  rawCodeLength >= 16 ? 'bg-emerald-400' : 'bg-[#0e262c]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  rawCodeLength >= 24 ? 'bg-emerald-400' : 'bg-[#0e262c]'
                }`}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5 text-[11px] sm:text-xs">
              <span className={rawCodeLength >= 16 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {rawCodeLength} characters entered
              </span>
              <span className="text-slate-400">Format: 8-8-8</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3.5 sm:py-4 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg min-h-[48px] ${
              canSubmit
                ? 'bg-[#10b981] hover:bg-[#059669] text-slate-950 shadow-emerald-500/25 active:scale-[0.99]'
                : 'bg-[#0b1e22] text-slate-500 cursor-not-allowed border border-[#143239]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                <span>Activating ChatGPT Plan...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                <span>Redeem activation code</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Track link */}
      <div className="w-full mt-4 flex items-center justify-center">
        <button
          onClick={onGoToTrack}
          className="text-xs text-slate-400 hover:text-emerald-300 transition-colors underline underline-offset-2 cursor-pointer"
        >
          Track activation order
        </button>
      </div>
    </div>
  );
};
