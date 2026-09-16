import React from 'react';
import {
  UserCheck, Landmark, RefreshCw,
  LayoutDashboard, ListChecks, Users, MapPin, Scale,
  Heart, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';

const NAV_TABS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'queue', label: 'Priority Queue', icon: ListChecks },
  { id: 'mps', label: 'MPs', icon: Users },
  { id: 'states', label: 'States', icon: MapPin },
  { id: 'compare', label: 'Compare', icon: Scale },
];

export default function Header({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  onRoleSelect,
  syncStatus,
  onTriggerSync,
  isSyncing,
  house,
  setHouse,
  loggedInUser,
  onLogout,
}) {
  const handleRoleChange = (selectedRole) => {
    if (onRoleSelect) {
      onRoleSelect(selectedRole);
    } else {
      setCurrentRole(selectedRole);
    }
  };
  return (
    <TooltipProvider delayDuration={150}>
      <header className="glass-panel border-b sticky top-0 z-40 px-4 sm:px-6 py-2.5 transition-all bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
          
          {/* Left Section: Brand Logo */}
          <div className="flex items-center justify-between lg:justify-start shrink-0">
            <div
              className="flex items-center gap-2 sm:gap-3 shrink-0 select-none cursor-pointer group py-0.5"
              onClick={() => setActiveTab('overview')}
              title="JanNidhi — Return to Dashboard"
            >
              <img
                src="/brand/jannidhi-brand.png"
                alt="JanNidhi brand logo"
                className="h-12 sm:h-14 lg:h-16 w-auto max-w-[260px] sm:max-w-[320px] lg:max-w-[380px] object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>

            {/* Compact Mobile Quick-Status (< lg only) */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                currentRole === 'Read-Only Public Tier'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700'
              }`}>
                {currentRole === 'Read-Only Public Tier' ? 'Public' : 'Auditor'}
              </span>
              <div
                className={`h-7 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 ${
                  syncStatus?.is_data_stale
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${syncStatus?.is_data_stale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span>{syncStatus?.is_data_stale ? 'Stale' : 'Live'}</span>
              </div>
            </div>
          </div>

          {/* Center Section: Navigation Tabs */}
          <nav className="flex items-center justify-center gap-1 bg-slate-100/90 dark:bg-muted/60 border border-slate-200/80 dark:border-border/80 p-1 rounded-xl shadow-2xs overflow-x-auto max-w-full">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/25'
                      : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-white/80 dark:hover:bg-accent/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: Controls & Scope Cluster on Desktop */}
          <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
            {/* House Scope Filter */}
            <Select value={house || "ALL"} onValueChange={(v) => setHouse(v === "ALL" ? '' : v)}>
              <SelectTrigger className="h-9 min-w-[170px] px-3 gap-2 rounded-xl border-slate-200/90 bg-white text-xs font-medium shadow-2xs hover:bg-slate-50 transition-colors focus:ring-primary/20 cursor-pointer">
                <Landmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl shadow-lg border-slate-200/80">
                <SelectItem value="ALL" className="text-xs cursor-pointer">All Houses / Terms</SelectItem>
                <SelectItem value="18th Lok Sabha" className="text-xs cursor-pointer">18th Lok Sabha (Current)</SelectItem>
                <SelectItem value="17th Lok Sabha" className="text-xs cursor-pointer">17th Lok Sabha (2019–2024)</SelectItem>
                <SelectItem value="Rajya Sabha" className="text-xs cursor-pointer">Rajya Sabha</SelectItem>
              </SelectContent>
            </Select>

            {/* Live Sync Action Button */}
            {currentRole === 'MoSPI Reviewer' && onTriggerSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTriggerSync('live')}
                disabled={isSyncing}
                className="h-9 px-3 rounded-xl border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 text-xs font-semibold shadow-2xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Live Data'}</span>
              </Button>
            )}

            {/* Contribute to Society Button */}
            <a
              href="https://frontend-steel-psi-55.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 hover:from-rose-600 hover:via-pink-600 hover:to-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer border border-white/20 select-none group whitespace-nowrap"
            >
              <Heart className="w-3.5 h-3.5 text-rose-100 fill-rose-100/30 group-hover:scale-110 transition-transform" />
              <span>Contribute to Society</span>
              <ExternalLink className="w-3 h-3 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </a>

            {/* RBAC Role Switcher */}
            <Select value={currentRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="h-9 min-w-[170px] px-3 gap-2 rounded-xl border-slate-200/90 bg-white text-xs font-medium shadow-2xs hover:bg-slate-50 transition-colors focus:ring-primary/20 cursor-pointer">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl shadow-lg border-slate-200/80">
                <SelectItem value="Read-Only Public Tier" className="text-xs cursor-pointer font-medium text-emerald-700">
                  🌐 Public Transparency (Citizen)
                </SelectItem>
                <SelectItem value="District Authority Auditor" className="text-xs cursor-pointer">
                  🛡️ District Auditor
                </SelectItem>
                <SelectItem value="MoSPI Reviewer" className="text-xs cursor-pointer">
                  🏛️ MoSPI Reviewer (Admin)
                </SelectItem>
              </SelectContent>
            </Select>

            {/* User logout button if logged in */}
            {loggedInUser && currentRole !== 'Read-Only Public Tier' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="h-9 px-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                Logout ({loggedInUser})
              </Button>
            )}
          </div>

          {/* Mobile Secondary Controls Bar (< lg only) */}
          <div className="flex lg:hidden flex-col gap-2 pt-2 border-t border-slate-200/60">
            <div className="flex items-center gap-1.5 w-full">
              <Select value={house || "ALL"} onValueChange={(v) => setHouse(v === "ALL" ? '' : v)}>
                <SelectTrigger className="h-8 text-xs rounded-lg flex-1 border-slate-200/90 bg-white">
                  <Landmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Houses / Terms</SelectItem>
                  <SelectItem value="18th Lok Sabha" className="text-xs">18th Lok Sabha (Current)</SelectItem>
                  <SelectItem value="17th Lok Sabha" className="text-xs">17th Lok Sabha (2019–24)</SelectItem>
                  <SelectItem value="Rajya Sabha" className="text-xs">Rajya Sabha</SelectItem>
                </SelectContent>
              </Select>

              <Select value={currentRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="h-8 text-xs rounded-lg flex-1 border-slate-200/90 bg-white">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Read-Only Public Tier" className="text-xs text-emerald-700 font-medium">🌐 Public View</SelectItem>
                  <SelectItem value="District Authority Auditor" className="text-xs">🛡️ District Auditor</SelectItem>
                  <SelectItem value="MoSPI Reviewer" className="text-xs">🏛️ MoSPI Reviewer</SelectItem>
                </SelectContent>
              </Select>

              {currentRole === 'MoSPI Reviewer' && onTriggerSync && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTriggerSync('live')}
                  disabled={isSyncing}
                  className="h-8 px-2.5 rounded-lg border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold gap-1 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                </Button>
              )}

              {loggedInUser && currentRole !== 'Read-Only Public Tier' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="h-8 px-2 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                >
                  Logout
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <a
                href="https://frontend-steel-psi-55.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 shadow-2xs select-none"
              >
                <Heart className="w-3 h-3 text-rose-100 fill-rose-100/30" />
                <span>Contribute to Society</span>
                <ExternalLink className="w-2.5 h-2.5 text-white/80" />
              </a>
              <span className="text-[10px] text-muted-foreground">
                {currentRole === 'Read-Only Public Tier' ? 'Public Transparency Mode' : `Auditor: ${loggedInUser || 'Session'}`}
              </span>
            </div>
          </div>

        </div>
      </header>
    </TooltipProvider>
  );
}
