import React, { useState } from 'react';
import { Lock, User, KeyRound, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, setAuthToken } from '@/lib/api';
import BrandLogo from './BrandLogo';

export default function LoginModal({ targetRole, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const executeLoginWith = async (u, p) => {
    setUsername(u);
    setPassword(p);
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u.trim(),
          password: p.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data.detail || 'Incorrect username or password');
        setIsSubmitting(false);
        return;
      }

      if (data.access_token) {
        setAuthToken(data.access_token);
      }

      onSuccess(data.username, data.role, data);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Server connection failed. Please check backend API.');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }
    executeLoginWith(username, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Logo Identity */}
        <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <BrandLogo size="compact" showTagline={true} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Role Authentication
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Login required for <span className="font-semibold text-indigo-600 dark:text-indigo-400">{targetRole}</span> access
            </p>
          </div>
        </div>

        {/* Quick Demo Credentials Pill Bar with 1-Click Quick Login */}
        <div className="mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Quick Login Presets</span>
            <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400">Click to enter instantly</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => executeLoginWith('admin', 'Admin@MPLADS2026!')}
              className={`p-2 rounded-lg text-[11px] font-medium border text-left transition-all cursor-pointer select-none hover:shadow-xs active:scale-[0.98] ${
                username === 'admin'
                  ? 'bg-amber-100/90 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200 ring-1 ring-amber-400/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-amber-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-bold truncate flex items-center justify-between">
                <span>Admin</span>
                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950 px-1 py-0.2 rounded border border-amber-200/80">Login</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate block mt-0.5">MoSPI Exec</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => executeLoginWith('auditor', 'Auditor@MPLADS2026!')}
              className={`p-2 rounded-lg text-[11px] font-medium border text-left transition-all cursor-pointer select-none hover:shadow-xs active:scale-[0.98] ${
                username === 'auditor'
                  ? 'bg-indigo-100/90 border-indigo-300 text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-bold truncate flex items-center justify-between">
                <span>Auditor</span>
                <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950 px-1 py-0.2 rounded border border-indigo-200/80">Login</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate block mt-0.5">Kota District</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => executeLoginWith('mp', 'MP@MPLADS2026!')}
              className={`p-2 rounded-lg text-[11px] font-medium border text-left transition-all cursor-pointer select-none hover:shadow-xs active:scale-[0.98] ${
                username === 'mp'
                  ? 'bg-emerald-100/90 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-400/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-bold truncate flex items-center justify-between">
                <span>MP</span>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.2 rounded border border-emerald-200/80">Login</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate block mt-0.5">Om Birla (Kota)</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in slide-in-from-top-1 duration-150">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-username" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl text-xs font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
