import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownToLine,
  Check,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  Filter,
  Flame,
  Key,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  PlusCircle,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AuditLogItem, CDKItem, PremiumPlan, SecurityHealthData } from '../types';
import { apiFetch } from '../utils/api';
import { QRCodeModal } from './QRCodeModal';
import { SecurityBadge } from './SecurityBadge';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'cdks' | 'generate' | 'audit' | 'security'>('cdks');
  const [cdks, setCdks] = useState<CDKItem[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, redeemed: 0, revoked: 0, expired: 0 });
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [totalAuditLogs, setTotalAuditLogs] = useState(0);
  const [securityHealth, setSecurityHealth] = useState<SecurityHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters for CDK Manager
  const [cdkSearch, setCdkSearch] = useState('');
  const [cdkStatusFilter, setCdkStatusFilter] = useState('all');
  const [cdkPlanFilter, setCdkPlanFilter] = useState('all');

  // Filters for Audit Logs
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('all');
  const [auditEventTypeFilter, setAuditEventTypeFilter] = useState('all');

  // Generator form state
  const [genCount, setGenCount] = useState(1);
  const [genPlan, setGenPlan] = useState<PremiumPlan>('3_months');
  const [genPrefix, setGenPrefix] = useState('TGPREM');
  const [genCustomLink, setGenCustomLink] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [genExpiresDays, setGenExpiresDays] = useState('');
  const [generatedBatch, setGeneratedBatch] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // QR Modal state
  const [qrModalData, setQrModalData] = useState<{ code: string; plan: string } | null>(null);

  // Settings form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [supportContact, setSupportContact] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [bannerText, setBannerText] = useState('');

  // Copy state helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCdks = async () => {
    try {
      const url = new URL('/api/admin/cdks', window.location.origin);
      if (cdkStatusFilter !== 'all') url.searchParams.set('status', cdkStatusFilter);
      if (cdkPlanFilter !== 'all') url.searchParams.set('plan', cdkPlanFilter);
      if (cdkSearch.trim()) url.searchParams.set('search', cdkSearch.trim());

      const data = await apiFetch<{ cdks: CDKItem[]; stats: any }>(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCdks(data.cdks || []);
      setStats(data.stats || { total: 0, active: 0, redeemed: 0, revoked: 0, expired: 0 });
    } catch (err: any) {
      if (err?.message?.includes('unauthorized') || err?.message?.includes('401')) {
        onLogout();
      } else {
        console.error('Error fetching CDKs:', err);
      }
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const url = new URL('/api/admin/audit-logs', window.location.origin);
      if (auditSeverityFilter !== 'all') url.searchParams.set('severity', auditSeverityFilter);
      if (auditEventTypeFilter !== 'all') url.searchParams.set('eventType', auditEventTypeFilter);
      if (auditSearch.trim()) url.searchParams.set('search', auditSearch.trim());
      url.searchParams.set('limit', '100');

      const data = await apiFetch<{ logs: AuditLogItem[]; total: number }>(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuditLogs(data.logs || []);
      setTotalAuditLogs(data.total || 0);
    } catch (err: any) {
      if (err?.message?.includes('unauthorized') || err?.message?.includes('401')) {
        onLogout();
      } else {
        console.error('Error fetching Audit Logs:', err);
      }
    }
  };

  const fetchSecurityHealth = async () => {
    try {
      const data = await apiFetch<SecurityHealthData>('/api/admin/security-health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSecurityHealth(data);
      if (data.settings) {
        setSupportContact(data.settings.supportTelegramContact || '');
        setMaxAttempts(data.settings.rateLimitMaxAttempts || 5);
        setWindowMinutes(data.settings.rateLimitWindowMinutes || 15);
        setBannerText(data.settings.customBannerText || '');
      }
    } catch (err: any) {
      if (err?.message?.includes('unauthorized') || err?.message?.includes('401')) {
        onLogout();
      } else {
        console.error('Error fetching security health:', err);
      }
    }
  };

  useEffect(() => {
    fetchCdks();
    fetchAuditLogs();
    fetchSecurityHealth();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'cdks') fetchCdks();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'security') fetchSecurityHealth();
  }, [activeTab, cdkStatusFilter, cdkPlanFilter, cdkSearch, auditSeverityFilter, auditEventTypeFilter, auditSearch]);

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const data = await apiFetch<{ count: number; created: CDKItem[] }>('/api/admin/cdks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          count: genCount,
          plan: genPlan,
          prefix: genPrefix,
          customGiftLink: genCustomLink,
          notes: genNotes,
          expiresDays: genExpiresDays,
        }),
      });

      setGeneratedBatch(data.created);
      showNotify('success', `Successfully generated ${data.count} new CDK(s)!`);
      fetchCdks();
      fetchAuditLogs();
    } catch (err: any) {
      showNotify('error', err.message || 'Failed to generate CDKs.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeCdk = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to revoke CDK: ${code}?`)) return;
    try {
      await apiFetch('/api/admin/cdks/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      showNotify('success', `CDK ${code} revoked.`);
      fetchCdks();
      fetchAuditLogs();
    } catch (err: any) {
      showNotify('error', err.message || 'Error revoking CDK.');
    }
  };

  const handleDeleteCdk = async (id: string, code: string) => {
    if (!confirm(`Permanently delete CDK: ${code}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/admin/cdks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotify('success', `CDK ${code} permanently deleted.`);
      fetchCdks();
      fetchAuditLogs();
    } catch (err: any) {
      showNotify('error', err.message || 'Error deleting CDK.');
    }
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      await apiFetch('/api/admin/rate-limit/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ip }),
      });
      showNotify('success', `IP ${ip} has been unblocked.`);
      fetchSecurityHealth();
    } catch (err: any) {
      showNotify('error', err.message || 'Error unblocking IP.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rateLimitMaxAttempts: maxAttempts,
          rateLimitWindowMinutes: windowMinutes,
          supportTelegramContact: supportContact,
          customBannerText: bannerText,
        }),
      });
      showNotify('success', 'Security settings saved.');
      fetchSecurityHealth();
    } catch (err: any) {
      showNotify('error', err.message || 'Error saving settings.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotify('error', 'New passwords do not match.');
      return;
    }
    try {
      await apiFetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: currentPassword,
          newPassword,
        }),
      });
      showNotify('success', 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchAuditLogs();
    } catch (err: any) {
      showNotify('error', err.message || 'Error changing password.');
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await apiFetch('/api/admin/vault/export-backup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotify('success', 'Encrypted vault backup downloaded.');
    } catch (err: any) {
      showNotify('error', err?.message || 'Backup export failed.');
    }
  };

  const handleReEncrypt = async () => {
    try {
      await apiFetch('/api/admin/vault/re-encrypt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotify('success', 'Database re-encrypted and checksum validated.');
      fetchSecurityHealth();
    } catch (err: any) {
      showNotify('error', err?.message || 'Re-encryption failed.');
    }
  };

  const handleClearAuditLogs = async () => {
    if (!confirm('Are you sure you want to clear and rotate all audit logs?')) return;
    try {
      await apiFetch('/api/admin/audit-logs/clear', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotify('success', 'Audit logs cleared.');
      fetchAuditLogs();
    } catch (err: any) {
      showNotify('error', err.message || 'Error clearing logs.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportAuditLogsAsCsv = () => {
    if (!auditLogs.length) return;
    const headers = ['Timestamp', 'Severity', 'Event Type', 'IP Address', 'User Agent', 'Telegram Username', 'Details'];
    const rows = auditLogs.map((l) => [
      l.timestamp,
      l.severity,
      l.eventType,
      l.ipAddress,
      `"${(l.userAgent || '').replace(/"/g, '""')}"`,
      l.telegramUsername || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-mono text-[#E0E0E0]">
      {/* Top Admin Navigation Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#2D333B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold uppercase tracking-widest text-blue-400">
                02. ADMIN VAULT &amp; SECURITY CORE
              </h1>
              <span className="bg-[#0A0C10] text-emerald-400 border border-emerald-800/60 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                AUTHENTICATED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              AES-256 VAULT &bull; PBKDF2 MASTER ENCRYPTION &bull; IMMUTABLE AUDIT TRAIL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-admin-export-backup"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0A0C10] hover:bg-[#1C2128] border border-[#2D333B] text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
            title="Download Encrypted Vault Backup"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Backup</span>
          </button>

          <button
            id="btn-admin-logout"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1C2128] hover:bg-red-950/60 border border-red-800/60 text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock &amp; Logout</span>
          </button>
        </div>
      </header>

      {/* Global Notifications */}
      {notification && (
        <div
          className={`mt-4 p-3 rounded border text-xs flex items-center justify-between font-mono animate-fade-in ${
            notification.type === 'success'
              ? 'bg-[#1C2128] border-l-2 border-emerald-500 text-emerald-300'
              : 'bg-[#1C2128] border-l-2 border-red-500 text-red-300'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 mt-6 border-b border-[#2D333B] pb-px overflow-x-auto">
        <button
          id="tab-cdk-manager"
          onClick={() => setActiveTab('cdks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t border-t border-x transition-colors ${
            activeTab === 'cdks'
              ? 'bg-[#161B22] text-blue-400 border-[#2D333B] border-b-[#161B22]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161B22]/40'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>CDK Registry ({stats.total})</span>
        </button>

        <button
          id="tab-generate-cdks"
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t border-t border-x transition-colors ${
            activeTab === 'generate'
              ? 'bg-[#161B22] text-blue-400 border-[#2D333B] border-b-[#161B22]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161B22]/40'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Generate CDKs</span>
        </button>

        <button
          id="tab-audit-logs"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t border-t border-x transition-colors ${
            activeTab === 'audit'
              ? 'bg-[#161B22] text-blue-400 border-[#2D333B] border-b-[#161B22]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161B22]/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Audit Logs ({totalAuditLogs})</span>
        </button>

        <button
          id="tab-security-health"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t border-t border-x transition-colors ${
            activeTab === 'security'
              ? 'bg-[#161B22] text-blue-400 border-[#2D333B] border-b-[#161B22]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161B22]/40'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Vault &amp; Security</span>
        </button>
      </div>

      {/* TAB 1: CDK MANAGER */}
      {activeTab === 'cdks' && (
        <div className="space-y-6 pt-6 animate-fade-in">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded bg-[#0A0C10] border border-[#2D333B]">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Generated</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{stats.total}</div>
            </div>
            <div className="p-4 rounded bg-[#0A0C10] border border-[#2D333B]">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Active / Ready</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{stats.active}</div>
            </div>
            <div className="p-4 rounded bg-[#0A0C10] border border-[#2D333B]">
              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>Redeemed</span>
              </div>
              <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">{stats.redeemed}</div>
            </div>
            <div className="p-4 rounded bg-[#0A0C10] border border-[#2D333B]">
              <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                <span>Revoked / Expired</span>
              </div>
              <div className="text-2xl font-bold text-red-400 mt-1 font-mono">{stats.revoked + stats.expired}</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#161B22] p-3 rounded border border-[#2D333B]">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="SEARCH_CODE, USERNAME, BATCH..."
                value={cdkSearch}
                onChange={(e) => setCdkSearch(e.target.value)}
                className="w-full bg-[#0A0C10] border border-[#2D333B] rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={cdkStatusFilter}
                onChange={(e) => setCdkStatusFilter(e.target.value)}
                className="bg-[#0A0C10] border border-[#2D333B] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none uppercase font-mono"
              >
                <option value="all">ALL STATUSES</option>
                <option value="active">ACTIVE ONLY</option>
                <option value="redeemed">REDEEMED ONLY</option>
                <option value="revoked">REVOKED ONLY</option>
              </select>

              <select
                value={cdkPlanFilter}
                onChange={(e) => setCdkPlanFilter(e.target.value)}
                className="bg-[#0A0C10] border border-[#2D333B] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none uppercase font-mono"
              >
                <option value="all">ALL PLANS</option>
                <option value="3_months">3 MONTHS (90D)</option>
                <option value="6_months">6 MONTHS (180D)</option>
                <option value="12_months">12 MONTHS (365D)</option>
              </select>

              <button
                onClick={fetchCdks}
                className="p-1.5 rounded bg-[#0A0C10] hover:bg-[#1C2128] border border-[#2D333B] text-slate-300 transition-colors"
                title="Refresh Table"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CDKs Table */}
          <div className="bg-[#161B22] border border-[#2D333B] rounded overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0A0C10] border-b border-[#2D333B] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">CDK CODE</th>
                    <th className="py-3 px-4">PLAN / DURATION</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">CLAIMED BY</th>
                    <th className="py-3 px-4">CREATED</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D333B] font-mono">
                  {cdks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 uppercase tracking-wider text-xs">
                        No CDK keys found matching current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    cdks.map((item) => (
                      <tr key={item.id} className="hover:bg-[#1C2128] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-400 select-all">
                              {item.code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(item.code, item.id)}
                              className="p-1 rounded hover:bg-[#2D333B] text-slate-400 hover:text-slate-200 transition-colors"
                              title="Copy CDK Code"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {item.notes && <div className="text-[10px] text-slate-400 mt-0.5 uppercase">{item.notes}</div>}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              item.plan === '1_month'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                : item.plan === '3_months'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : item.plan === '6_months'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.plan.replace('_', ' ')} ({item.planDurationDays}D)
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.status === 'active'
                                ? 'bg-[#0A0C10] text-emerald-400 border border-emerald-800/60'
                                : item.status === 'redeemed'
                                ? 'bg-[#0A0C10] text-blue-400 border border-blue-800/60'
                                : 'bg-[#0A0C10] text-red-400 border border-red-800/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === 'active'
                                  ? 'bg-emerald-400'
                                  : item.status === 'redeemed'
                                  ? 'bg-blue-400'
                                  : 'bg-red-400'
                              }`}
                            />
                            <span>{item.status}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {item.claimedByUsername ? (
                            <div>
                              <div className="font-bold text-blue-400 font-mono">
                                {item.claimedByUsername}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(item.claimedAt || '').toLocaleString()}
                              </div>
                              {item.claimedIp && (
                                <div className="text-[9px] text-slate-500 font-mono">
                                  IP: {item.claimedIp}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 uppercase text-[10px]">Unclaimed</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[10px]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setQrModalData({ code: item.code, plan: item.plan })}
                              className="p-1.5 rounded bg-[#0A0C10] hover:bg-[#1C2128] border border-[#2D333B] text-blue-400 hover:text-blue-300 transition-colors"
                              title="QR Code & Direct Link"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {item.status === 'active' && (
                              <button
                                onClick={() => handleRevokeCdk(item.id, item.code)}
                                className="p-1.5 rounded bg-[#0A0C10] hover:bg-amber-950/40 border border-amber-800/60 text-amber-400 hover:text-amber-300 transition-colors"
                                title="Revoke CDK"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteCdk(item.id, item.code)}
                              className="p-1.5 rounded bg-[#0A0C10] hover:bg-red-950/40 border border-red-800/60 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Permanently"
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
        </div>
      )}

      {/* TAB 2: GENERATE CDKS */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 animate-fade-in">
          {/* Generator Form */}
          <div className="lg:col-span-1 bg-[#161B22] border border-[#2D333B] rounded-lg p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <PlusCircle className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">01. GENERATE TELEGRAM CDKS</h2>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Telegram Premium Plan
                </label>
                <select
                  value={genPlan}
                  onChange={(e) => setGenPlan(e.target.value as PremiumPlan)}
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500 text-xs"
                >
                  <option value="3_months">3 Months (90 Days)</option>
                  <option value="6_months">6 Months (180 Days)</option>
                  <option value="12_months">12 Months (365 Days Annual)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Quantity (1 to 50)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={genCount}
                  onChange={(e) => setGenCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Key Prefix
                </label>
                <input
                  type="text"
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="E.G. TGPREM, VIP, PROMO"
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Custom Telegram Gift Link (Optional)
                </label>
                <input
                  type="text"
                  value={genCustomLink}
                  onChange={(e) => setGenCustomLink(e.target.value)}
                  placeholder="https://t.me/giftcode/... (blank = auto-generate)"
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  disabled={genCount > 1}
                />
                {genCount > 1 && (
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase">
                    Individual gift links are auto-generated in batch mode.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Batch Tag / Admin Notes
                </label>
                <input
                  type="text"
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="E.G. Order #7810 - Customer VIP"
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-generate-cdks"
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 px-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                >
                  {isGenerating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Generate {genCount} Key(s) Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Generated Batch Output */}
          <div className="lg:col-span-2 bg-[#161B22] border border-[#2D333B] rounded-lg p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#2D333B] mb-4">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-widest text-blue-400">02. BATCH OUTPUT</h3>
                  <p className="text-[10px] text-slate-400 uppercase">Keys are encrypted and stored in vault.</p>
                </div>
                {generatedBatch && generatedBatch.length > 0 && (
                  <button
                    onClick={() => {
                      const text = generatedBatch.map((c) => c.code).join('\n');
                      navigator.clipboard.writeText(text);
                      showNotify('success', 'All keys copied to clipboard!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0A0C10] hover:bg-[#1C2128] border border-[#2D333B] text-blue-400 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy All ({generatedBatch.length})</span>
                  </button>
                )}
              </div>

              {generatedBatch && generatedBatch.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {generatedBatch.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#0A0C10] rounded border border-[#2D333B] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-blue-300 font-bold text-xs select-all">
                          {item.code}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#1C2128] border border-[#2D333B] text-[10px] text-slate-300 uppercase">
                          {item.planDurationDays || item.days || 90} Days
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(item.code, item.id || `${idx}`)}
                          className="p-1 rounded bg-[#1C2128] hover:bg-[#2D333B] border border-[#2D333B] text-slate-300 transition-colors"
                          title="Copy Single Key"
                        >
                          {copiedId === (item.id || `${idx}`) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setQrModalData({ code: item.code, plan: item.plan })}
                          className="p-1 rounded bg-[#1C2128] hover:bg-[#2D333B] border border-[#2D333B] text-blue-400 transition-colors"
                          title="View QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs uppercase tracking-wider">
                  Configure parameters on the left and click Generate to create fresh encrypted keys.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#2D333B] flex items-center justify-between text-[10px] text-slate-400 uppercase">
              <span>All keys encrypted with AES-256-GCM.</span>
              <span className="text-emerald-400 font-bold">Vault Synchronization Active</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT & SECURITY LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-6 pt-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#161B22] p-3 rounded border border-[#2D333B]">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="SEARCH_AUDIT_DETAILS, IP, USER..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-[#0A0C10] border border-[#2D333B] rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={auditSeverityFilter}
                onChange={(e) => setAuditSeverityFilter(e.target.value)}
                className="bg-[#0A0C10] border border-[#2D333B] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none uppercase font-mono"
              >
                <option value="all">ALL SEVERITIES</option>
                <option value="info">INFO</option>
                <option value="warn">WARNINGS</option>
                <option value="security_alert">SECURITY ALERTS</option>
              </select>

              <button
                onClick={exportAuditLogsAsCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0A0C10] hover:bg-[#1C2128] border border-[#2D333B] text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors"
                title="Download CSV report"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleClearAuditLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0A0C10] hover:bg-red-950/40 border border-red-800/60 text-red-400 text-xs font-bold uppercase tracking-wider transition-colors"
                title="Clear and rotate logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#2D333B] rounded overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0A0C10] border-b border-[#2D333B] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">TIMESTAMP</th>
                    <th className="py-3 px-4">SEVERITY</th>
                    <th className="py-3 px-4">EVENT TYPE</th>
                    <th className="py-3 px-4">IP ADDRESS</th>
                    <th className="py-3 px-4">TARGET USER</th>
                    <th className="py-3 px-4">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D333B] font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 uppercase text-xs">
                        No audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1C2128] transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              log.severity === 'info'
                                ? 'bg-[#0A0C10] text-blue-400 border-blue-800/60'
                                : log.severity === 'warn'
                                ? 'bg-[#0A0C10] text-amber-400 border-amber-800/60'
                                : 'bg-[#0A0C10] text-red-400 border-red-800/60 animate-pulse'
                            }`}
                          >
                            {log.severity === 'security_alert' ? 'ALERT' : log.severity}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-200 text-[11px]">
                          {log.eventType}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                          {log.ipAddress}
                        </td>

                        <td className="py-3 px-4 font-mono text-blue-400 text-[11px]">
                          {log.telegramUsername || '-'}
                        </td>

                        <td className="py-3 px-4 text-slate-300 text-xs">
                          <div>{log.details}</div>
                          {log.userAgent && (
                            <div className="text-[9px] text-slate-500 font-mono truncate max-w-xs mt-0.5">
                              {log.userAgent}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VAULT & SECURITY HEALTH */}
      {activeTab === 'security' && (
        !securityHealth ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3 font-mono text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            <span>Loading Vault &amp; Security Diagnostics...</span>
          </div>
        ) : (
          <div className="space-y-6 pt-6 animate-fade-in text-xs font-mono">
            {/* Top Diagnostics Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded bg-[#161B22] border-l-2 border-emerald-500 border-t border-r border-b border-[#2D333B] space-y-1.5">
                <div className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ENCRYPTION ENGINE</span>
                </div>
                <div className="text-white font-mono font-bold text-xs">
                  {securityHealth.encryption?.algorithm || 'AES-256-GCM'}
                </div>
                <div className="text-[10px] text-slate-400 uppercase">
                  IV: {securityHealth.encryption?.ivLengthBits || 96}-BIT &bull; TAG: {securityHealth.encryption?.authTagLengthBits || 128}-BIT
                </div>
              </div>

              <div className="p-4 rounded bg-[#161B22] border-l-2 border-blue-500 border-t border-r border-b border-[#2D333B] space-y-1.5">
                <div className="text-blue-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>KEY DERIVATION</span>
                </div>
                <div className="text-blue-300 font-mono font-bold text-xs">
                  PBKDF2 (100K HMAC-SHA512)
                </div>
                <div className="text-[10px] text-slate-400 uppercase">
                  SHA-256 INTEGRITY CHECKSUM
                </div>
              </div>

              <div className="p-4 rounded bg-[#161B22] border-l-2 border-yellow-500 border-t border-r border-b border-[#2D333B] space-y-1.5">
                <div className="text-yellow-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
                  <span>RATE-LIMIT LOCKDOWN</span>
                </div>
                <div className="text-white font-bold text-xs">
                  {(securityHealth.blockedIps || []).length} ACTIVE IP BANS
                </div>
                <div className="text-[10px] text-slate-400 uppercase">
                  AUTO-BAN TRIGGER ON {maxAttempts} ATTEMPTS / {windowMinutes}M
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blocked IP Management */}
              <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#2D333B] mb-3">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>BLOCKED IP ADDRESSES</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 uppercase">ANTI-BRUTE FORCE</span>
                </div>

                {(!securityHealth.blockedIps || securityHealth.blockedIps.length === 0) ? (
                  <div className="py-8 text-center text-slate-500 uppercase text-[11px]">
                    No IP addresses are currently blocked. All defense monitors clear.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(securityHealth.blockedIps || []).map((b, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded bg-[#0A0C10] border border-[#2D333B] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono text-amber-300 font-bold">{b.ip}</div>
                          <div className="text-[10px] text-slate-400 uppercase">
                            {b.failedAttempts} failed attempts &bull; Unlocks in {b.unblockInSeconds}s
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblockIp(b.ip)}
                          className="px-2.5 py-1 rounded bg-[#1C2128] hover:bg-[#2D333B] border border-[#2D333B] text-slate-200 font-bold text-xs uppercase flex items-center gap-1 transition-colors"
                        >
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>Unblock</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              <div className="mt-4 pt-3 border-t border-[#2D333B] flex items-center justify-between">
                <button
                  onClick={handleReEncrypt}
                  className="py-2 px-3 rounded bg-[#0A0C10] hover:bg-[#1C2128] border border-[#2D333B] text-blue-400 font-bold uppercase text-[10px] tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Encrypt Vault &amp; Verify Checksum</span>
                </button>
              </div>
            </div>

            {/* Change Admin Password */}
            <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 shadow-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-[#2D333B] mb-3 text-blue-400">
                <KeyRound className="w-3.5 h-3.5" />
                <h3 className="font-bold text-xs uppercase tracking-widest text-blue-400">CHANGE ADMIN PASSWORD</h3>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="CURRENT_PASSWORD"
                    className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-1">
                    New Master Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="MIN 8 CHARACTERS"
                    className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="CONFIRM_PASSWORD"
                    className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs transition-colors"
                  >
                    Update Master Password
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* System Settings & Customization */}
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-[#2D333B] mb-4 text-blue-400">
              <Settings className="w-3.5 h-3.5" />
              <h3 className="font-bold text-xs uppercase tracking-widest text-blue-400">
                SECURITY &amp; CUSTOMER PORTAL CONFIGURATION
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Rate Limit: Max Failed Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 5)}
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Rate Limit: Cooldown Window (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(parseInt(e.target.value, 10) || 15)}
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Support Telegram Contact Username
                </label>
                <input
                  type="text"
                  value={supportContact}
                  onChange={(e) => setSupportContact(e.target.value)}
                  placeholder="@PremiumGiftSupport"
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">
                  Custom Customer Portal Banner Text
                </label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="Official Telegram Premium Gift Activation Portal..."
                  className="w-full bg-[#0A0C10] border border-[#2D333B] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="py-2 px-5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest text-xs transition-colors"
                >
                  Save Portal Security Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
        )
      )}

      {/* QR Code / Share Link Modal */}
      {qrModalData && (
        <QRCodeModal
          code={qrModalData.code}
          plan={qrModalData.plan}
          isOpen={true}
          onClose={() => setQrModalData(null)}
        />
      )}
    </div>
  );
};
