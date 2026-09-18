import React from 'react';
import {
  UserCheck, Landmark, RefreshCw,
  LayoutDashboard, ListChecks, Users, MapPin, Scale,
  Heart, ExternalLink, Globe, ShieldCheck, MessageSquare
} from 'lucide-react';
import BrandLogo from './BrandLogo';
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
  { id: 'grievances', label: 'Citizen Grievances', icon: MessageSquare },
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
  userProfile,
  onLogout,
}) {
  const handleRoleChange = (selectedRole) => {
    if (onRoleSelect) {
      onRoleSelect(selectedRole);
    } else {
      setCurrentRole(selectedRole);
    }
  };

  const getRoleLabel = () => {
    if (currentRole === 'Member of Parliament') {
      return `MP: ${userProfile?.constituency || 'Kota'}`;
    }
    if (currentRole === 'District Authority Auditor') {
      return `Auditor: ${userProfile?.constituency || 'Kota'}`;
    }
    if (currentRole === 'MoSPI Reviewer') {
      return 'Admin';
    }
    return 'Public';
  };

  return (
    <TooltipProvider delayDuration={150}>
      <header className="glass-panel border-b sticky top-0 z-40 px-3 sm:px-6 py-2 transition-all bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5 xl:gap-3">
          
          {/* Top Bar: Brand Logo & Mobile Status */}
          <div className="flex items-center justify-between shrink-0 pl-1 sm:pl-2 mr-1 sm:mr-3">
            <button
              type="button"
              className="flex items-center select-none cursor-pointer text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl p-1 -m-1 transition-transform active:scale-[0.99]"
              onClick={() => setActiveTab('overview')}
              title="JanNidhi — Return to Dashboard"
            >
              <BrandLogo />
            </button>

            {/* Compact Mobile Quick-Status (< xl only) */}
            <div className="flex xl:hidden items-center gap-1.5 shrink-0">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                currentRole === 'Read-Only Public Tier'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : currentRole === 'Member of Parliament'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : currentRole === 'District Authority Auditor'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-300 bg-slate-100 text-slate-800'
              }`}>
                {getRoleLabel()}
              </span>
              <div
                className={`h-6 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 ${
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
          <nav className="flex items-center justify-center gap-0.5 sm:gap-1 bg-slate-100/90 dark:bg-muted/60 border border-slate-200/80 dark:border-border/80 p-1 rounded-xl shadow-2xs overflow-x-auto max-w-full shrink-0">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
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
          <div className="hidden xl:flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* House Scope Filter */}
            <Select value={house || "ALL"} onValueChange={(v) => setHouse(v === "ALL" ? '' : v)}>
              <SelectTrigger className="h-8 min-w-[140px] px-2.5 gap-1.5 rounded-xl border-slate-200/90 bg-white text-xs font-medium shadow-2xs hover:bg-slate-50 transition-colors focus:ring-primary/20 cursor-pointer">
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
                className="h-8 px-2.5 rounded-lg border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 text-xs font-semibold shadow-2xs gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing…' : 'Sync Live'}</span>
              </Button>
            )}

            {/* Civic Action / Public Community Contribution Badge */}
            <a
              href="https://civicquest-tau.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-lg bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200 text-emerald-800 text-xs font-semibold inline-flex items-center gap-2 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all duration-150 cursor-pointer select-none group whitespace-nowrap"
              title="Open CivicQuest citizen participation portal"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Heart className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/25 group-hover:scale-110 transition-transform shrink-0" />
              <span>Contribute to Society</span>
              <span className="hidden 2xl:inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200/80">
                CivicQuest
              </span>
              <ExternalLink className="w-3 h-3 text-emerald-600/70 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>

            {/* RBAC Role Switcher */}
            <Select value={currentRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="h-8 min-w-[155px] px-2.5 gap-1.5 rounded-lg border-slate-200/90 bg-white text-xs font-medium shadow-2xs hover:bg-slate-50 transition-colors focus:ring-primary/20 cursor-pointer">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl shadow-lg border-slate-200/80">
                <SelectItem value="Read-Only Public Tier" className="text-xs cursor-pointer font-medium text-emerald-700">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Public Transparency</span>
                  </div>
                </SelectItem>
                <SelectItem value="Member of Parliament" className="text-xs cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Member of Parliament (MP)</span>
                  </div>
                </SelectItem>
                <SelectItem value="District Authority Auditor" className="text-xs cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>District Auditor</span>
                  </div>
                </SelectItem>
                <SelectItem value="MoSPI Reviewer" className="text-xs cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>MoSPI Reviewer (Admin)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* User logout button if logged in */}
            {loggedInUser && currentRole !== 'Read-Only Public Tier' && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {userProfile?.constituency ? `${userProfile.constituency}` : loggedInUser}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="h-8 px-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Secondary Controls Bar (< xl only) */}
          <div className="flex xl:hidden flex-col gap-2 pt-1.5 border-t border-slate-200/60">
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
                  <SelectItem value="Read-Only Public Tier" className="text-xs text-emerald-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Public View</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Member of Parliament" className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>MP View</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="District Authority Auditor" className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>District Auditor</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MoSPI Reviewer" className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>MoSPI Reviewer</span>
                    </div>
                  </SelectItem>
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
                  <span>{isSyncing ? 'Syncing…' : 'Sync'}</span>
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
                href="https://civicquest-tau.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold inline-flex items-center gap-1.5 shadow-2xs select-none group"
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <Heart className="w-3 h-3 text-emerald-600 fill-emerald-600/30" />
                <span>Contribute to Society</span>
                <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
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
