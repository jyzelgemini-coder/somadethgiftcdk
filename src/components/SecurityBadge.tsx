import { CheckCircle, Database, Lock, ShieldCheck } from 'lucide-react';
import React from 'react';

export const SecurityBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div
        id="security-badge-compact"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-emerald-400 text-xs font-medium"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <Lock className="w-3 h-3 text-emerald-400" />
        <span>256-Bit Encrypted</span>
      </div>
    );
  }

  return (
    <div
      id="security-badge-full"
      className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-slate-300"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs sm:text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Activation Architecture</span>
        </div>
        <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          Verified Safe
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-xl">
          <div className="flex items-center gap-2 text-sky-400 font-semibold mb-1">
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>Secure Vault Storage</span>
          </div>
          <div className="text-slate-400 text-[11px] leading-relaxed">
            All CDK keys are encrypted at rest with industry-standard AES-256 cipher.
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Direct Telegram Delivery</span>
          </div>
          <div className="text-slate-400 text-[11px] leading-relaxed">
            Gift voucher links are generated directly for your Telegram account.
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>No Account Login Required</span>
          </div>
          <div className="text-slate-400 text-[11px] leading-relaxed">
            Never requires your password or private session. 100% safe &amp; instant.
          </div>
        </div>
      </div>
    </div>
  );
};
