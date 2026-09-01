import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { SecurityBadge } from './SecurityBadge';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string) => void;
  onBackToCustomerPortal: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToCustomerPortal,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the administrator password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ token: string }>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      onLoginSuccess(data.token);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 font-sans animate-fade-in">
      {/* Return to Portal Link */}
      <button
        id="btn-back-to-portal"
        onClick={onBackToCustomerPortal}
        className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-sky-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Customer Portal</span>
      </button>

      {/* Admin Login Card */}
      <div
        id="admin-login-card"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl"
      >
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Admin Vault Access</span>
              <span className="text-[10px] px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full font-mono">
                /admin
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure Key Management &amp; Settings
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Master Password
            </label>
            <div className="relative">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 p-3.5 pl-4 pr-11 text-sm text-white rounded-xl outline-none transition-all placeholder:text-slate-600"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-admin-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 min-h-[48px] bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-sky-500/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6">
        <SecurityBadge compact />
      </div>
    </div>
  );
};
