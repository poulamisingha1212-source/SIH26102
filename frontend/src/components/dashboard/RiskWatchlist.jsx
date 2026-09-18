import React, { useState, useMemo } from 'react';
import {
  MapPin, Users, Building2, AlertTriangle, ArrowUpRight,
  Search, ShieldAlert, ChevronRight, LayoutGrid, CheckCircle2,
  SlidersHorizontal, BarChart3, TrendingUp, Sparkles, ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatINR, scoreColorClass } from '@/lib/format';

/**
 * RiskWatchlist with Side Options
 * 
 * Implements a command-center Master-Detail / Side-Options layout:
 * - Left Side Rail: Interactive option selector cards (States, MPs, Vendors, Comparative View)
 *   with active state highlights, live summary metrics, and cohort exposure indicators.
 * - Right Main Canvas: High-density, beautifully organized ranked data table / cards with:
 *   - Explicit column headers (# Rank, Entity, Volume, Risk Index, High Risk Flags, Sanctioned)
 *   - Precision rank medals (#1 Gold, #2 Silver, #3 Bronze)
 *   - Search & quick filtering
 *   - One-click navigation into the Priority Audit Queue
 */
export default function RiskWatchlist({
  states = [],
  mps = [],
  vendors = [],
  onFilterByEntity,
}) {
  // Default to 'states' so user immediately sees the focused side-option experience
  const [selectedOption, setSelectedOption] = useState('states'); // 'states' | 'mps' | 'vendors' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate cohort summaries for the side option cards
  const summaries = useMemo(() => {
    const calc = (list) => {
      const highRisk = list.reduce((acc, curr) => acc + (curr.high_risk_count || 0), 0);
      const totalSanctioned = list.reduce((acc, curr) => acc + (curr.total_sanctioned || 0), 0);
      const topEntity = list[0] || null;
      return { highRisk, totalSanctioned, topEntity, count: list.length };
    };

    const s = calc(states);
    const m = calc(mps);
    const v = calc(vendors);

    return {
      states: s,
      mps: m,
      vendors: v,
      allTotalHighRisk: s.highRisk + m.highRisk + v.highRisk,
      allTotalSanctioned: s.totalSanctioned + m.totalSanctioned + v.totalSanctioned,
    };
  }, [states, mps, vendors]);

  // Filter datasets by search query
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return states;
    const q = searchQuery.toLowerCase();
    return states.filter((item) => item.name?.toLowerCase().includes(q));
  }, [states, searchQuery]);

  const filteredMps = useMemo(() => {
    if (!searchQuery.trim()) return mps;
    const q = searchQuery.toLowerCase();
    return mps.filter((item) => item.name?.toLowerCase().includes(q));
  }, [mps, searchQuery]);

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter((item) => item.name?.toLowerCase().includes(q));
  }, [vendors, searchQuery]);

  // Side option definitions
  const SIDE_OPTIONS = [
    {
      id: 'states',
      title: 'Top-Risk States',
      subtitle: 'By Flagged Works',
      icon: MapPin,
      badgeText: `${states.length} States`,
      colorTheme: 'sky',
      topSummary: summaries.states.topEntity
        ? `${summaries.states.topEntity.name} (${summaries.states.topEntity.high_risk_count} High)`
        : 'Active surveillance',
      exposure: formatINR(summaries.states.totalSanctioned),
      highFlags: summaries.states.highRisk,
    },
    {
      id: 'mps',
      title: 'Top-Risk MPs',
      subtitle: 'By High-Risk Works',
      icon: Users,
      badgeText: `${mps.length} Constituencies`,
      colorTheme: 'indigo',
      topSummary: summaries.mps.topEntity
        ? `${summaries.mps.topEntity.name} (${summaries.mps.topEntity.high_risk_count} High)`
        : 'Active surveillance',
      exposure: formatINR(summaries.mps.totalSanctioned),
      highFlags: summaries.mps.highRisk,
    },
    {
      id: 'vendors',
      title: 'Top-Risk Vendors',
      subtitle: 'Concentration Signals',
      icon: Building2,
      badgeText: `${vendors.length} Contractors`,
      colorTheme: 'emerald',
      topSummary: summaries.vendors.topEntity
        ? `${summaries.vendors.topEntity.name} (${summaries.vendors.topEntity.high_risk_count} High)`
        : 'Active surveillance',
      exposure: formatINR(summaries.vendors.totalSanctioned),
      highFlags: summaries.vendors.highRisk,
    },
    {
      id: 'all',
      title: 'Comparative Matrix',
      subtitle: 'All 3 Categories Side-by-Side',
      icon: LayoutGrid,
      badgeText: 'Triad Grid',
      colorTheme: 'amber',
      topSummary: 'Full watchlist overview',
      exposure: formatINR(summaries.allTotalSanctioned),
      highFlags: summaries.allTotalHighRisk,
    },
  ];

  return (
    <Card className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Banner: Title & Global Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-900">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-['Satoshi',sans-serif]">
              Audit Prioritization Watchlist
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border-rose-200">
              Concentration Signals
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a side option to focus on anomalous clusters across States, MPs, or Vendors.
          </p>
        </div>

        {/* Global Filter Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Filter by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Command Console: Side Options Rail + Content View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: SIDE OPTIONS RAIL (lg:col-span-4 xl:col-span-3) */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 xl:col-span-3.5 space-y-2.5">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Side Options</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Select view</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {SIDE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedOption === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOption(opt.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-150 relative cursor-pointer group ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow-sm'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/80 hover:border-slate-300'
                  }`}
                >
                  {/* Left Active Glow Indicator */}
                  {isSelected && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-primary" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 border ${
                          isSelected
                            ? 'bg-white/10 border-white/20 text-white'
                            : opt.colorTheme === 'sky'
                            ? 'bg-sky-50 border-sky-200 text-sky-600'
                            : opt.colorTheme === 'indigo'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                            : opt.colorTheme === 'emerald'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-amber-50 border-amber-200 text-amber-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-['Satoshi',sans-serif] font-bold text-xs truncate block ${
                              isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {opt.title}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] block truncate ${
                            isSelected ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {opt.subtitle}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {opt.badgeText}
                    </span>
                  </div>

                  {/* Micro Metric Preview Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10.5px]">
                    <span
                      className={`truncate max-w-[150px] ${
                        isSelected ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {opt.topSummary}
                    </span>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        isSelected ? 'text-amber-300' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.exposure}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Forensic Action Callout in Side Rail */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 space-y-2 mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-white">Watchlist Exposure</span>
              </span>
              <span className="font-mono text-amber-300 font-bold">
                {summaries.allTotalHighRisk} Flags
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Click any entity in the list to drill down directly into high-risk contract evidence.
            </p>
            <button
              type="button"
              onClick={() => onFilterByEntity('priority', 'high')}
              className="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Audit All High-Risk Works</span>
              <ArrowUpRight className="w-3 h-3 text-amber-300" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: MAIN CONTENT CANVAS (lg:col-span-8 xl:col-span-9) */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 xl:col-span-8.5">
          {selectedOption === 'all' ? (
            /* 3-Column Comparative Grid */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SideOptionListCard
                title="Top-Risk States"
                subtitle="By Flagged Works"
                icon={<MapPin className="w-4 h-4 text-sky-600" />}
                iconBg="bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800"
                rows={filteredStates}
                unit="works"
                onSelect={(name) => onFilterByEntity('state', name)}
              />

              <SideOptionListCard
                title="Top-Risk MPs"
                subtitle="By High-Risk Works"
                icon={<Users className="w-4 h-4 text-indigo-600" />}
                iconBg="bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800"
                rows={filteredMps}
                unit="works"
                onSelect={(name) => onFilterByEntity('mp_name', name)}
              />

              <SideOptionListCard
                title="Top-Risk Vendors"
                subtitle="Concentration Signals"
                icon={<Building2 className="w-4 h-4 text-emerald-600" />}
                iconBg="bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800"
                rows={filteredVendors}
                unit="contracts"
                onSelect={(name) => onFilterByEntity('search', name)}
              />
            </div>
          ) : (
            /* Dedicated Focused Leaderboard with Precise Alignment */
            <DetailedOptionView
              type={selectedOption}
              rows={
                selectedOption === 'states'
                  ? filteredStates
                  : selectedOption === 'mps'
                  ? filteredMps
                  : filteredVendors
              }
              unit={selectedOption === 'vendors' ? 'contracts' : 'works'}
              onSelect={(name) => {
                if (selectedOption === 'states') onFilterByEntity('state', name);
                else if (selectedOption === 'mps') onFilterByEntity('mp_name', name);
                else onFilterByEntity('search', name);
              }}
            />
          )}
        </div>

      </div>
    </Card>
  );
}

/**
 * DetailedOptionView — High-density, pristine tabular leaderboard for the selected side option
 */
function DetailedOptionView({ type, rows, unit, onSelect }) {
  const meta = {
    states: {
      title: 'Top-Risk States & Union Territories',
      subtitle: 'Ranked by cumulative high-risk anomaly frequency across all parliamentary constituencies',
      icon: MapPin,
      iconColor: 'text-sky-600',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      entityHeader: 'State / Territory',
    },
    mps: {
      title: 'Top-Risk Parliamentary Constituencies & MPs',
      subtitle: 'Ranked by volume of high-risk flagged projects recommended and sanctioned',
      icon: Users,
      iconColor: 'text-indigo-600',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      entityHeader: 'Member of Parliament / Constituency',
    },
    vendors: {
      title: 'Top-Risk Vendors & Implementing Agencies',
      subtitle: 'Flagged for repetitive contract clustering, single-bidder concentration, or delay anomalies',
      icon: Building2,
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      entityHeader: 'Contractor / Vendor Agency',
    },
  }[type];

  const Icon = meta.icon;

  return (
    <div className="bg-white/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-2xs">
      {/* Option Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${meta.badgeBg} ${meta.iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-['Satoshi',sans-serif]">
              {meta.title}
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {meta.subtitle}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="w-fit text-[10.5px] font-mono font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200">
          {rows.length} Monitored
        </Badge>
      </div>

      {/* Explicit Column Labels */}
      <div className="grid grid-cols-12 gap-2 text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-2 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl">
        <span className="col-span-5 sm:col-span-5"># Rank & {meta.entityHeader}</span>
        <span className="col-span-2 sm:col-span-2 text-right">Volume</span>
        <span className="col-span-2 sm:col-span-2 text-center">Avg Risk</span>
        <span className="col-span-3 sm:col-span-3 text-right">Flags & Exposure</span>
      </div>

      {/* Ranked Items */}
      <div className="space-y-2 text-xs">
        {rows?.length > 0 ? (
          rows.map((entity, idx) => {
            const rank = idx + 1;
            const highRiskRatio =
              entity.count > 0 ? ((entity.high_risk_count / entity.count) * 100).toFixed(0) : 0;

            return (
              <div
                key={entity.name}
                onClick={() => onSelect(entity.name)}
                title={`Click to inspect ${entity.name} in Priority Audit Queue`}
                className="grid grid-cols-12 gap-2 items-center p-2.5 sm:p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs cursor-pointer transition-all duration-150 group"
              >
                {/* Col 1: Rank & Name (col-span-5) */}
                <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-1">
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-md font-mono text-[10.5px] sm:text-xs font-bold flex items-center justify-center border ${
                      rank === 1
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300'
                        : rank === 2
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                        : rank === 3
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {rank}
                  </span>

                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate block text-xs sm:text-[13px]">
                      {entity.name}
                    </span>
                  </div>
                </div>

                {/* Col 2: Volume (col-span-2) */}
                <div className="col-span-2 text-right">
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {entity.count?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {unit}
                  </span>
                </div>

                {/* Col 3: Avg Risk (col-span-2) */}
                <div className="col-span-2 text-center">
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${scoreColorClass(
                      entity.avg_risk_score
                    )}`}
                  >
                    {entity.avg_risk_score?.toFixed?.(1) ?? entity.avg_risk_score}
                  </span>
                </div>

                {/* Col 4: High Risk Flags & Sanctioned (col-span-3) */}
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-mono font-bold text-xs">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {entity.high_risk_count} High
                    </span>
                    <span className="text-[11px] font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200 block mt-0.5">
                      {formatINR(entity.total_sanctioned)}
                    </span>
                  </div>

                  <div className="w-5 h-5 rounded-md hidden sm:flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            No matching entities found.
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Click any row to open cases in Priority Audit Queue</span>
        <span className="flex items-center gap-1 text-primary font-medium">
          <span>Inspect in Queue</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

/**
 * SideOptionListCard — Compact column card used in the 'all' comparative view
 */
function SideOptionListCard({ title, subtitle, icon, iconBg, rows, unit, onSelect }) {
  return (
    <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-['Satoshi',sans-serif]">
              {title}
            </h5>
            <span className="text-[10px] text-slate-400">{subtitle}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{rows.length}</span>
      </div>

      <div className="space-y-1.5 text-xs">
        {rows?.slice(0, 8).map((entity, idx) => (
          <div
            key={entity.name}
            onClick={() => onSelect(entity.name)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="min-w-0 pr-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate block text-xs">
                {idx + 1}. {entity.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {entity.count} {unit} • Risk {entity.avg_risk_score}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono font-bold text-rose-600 block">
                {entity.high_risk_count} High
              </span>
              <span className="text-[10px] font-mono text-slate-500 block">
                {formatINR(entity.total_sanctioned)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
