import React, { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  MapPin, Users, Search, Building2, ChevronRight,
  Scale, X, Sparkles, TrendingUp, AlertTriangle, ShieldCheck,
  Info, BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BlurFade } from '@/components/magicui/blur-fade';
import { CHART_ANIMATION, LIGHT_TOOLTIP, TICK_FONT, AXIS_LABEL_FONT } from '@/lib/chart';
import { formatNumber, scoreColorClass } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import IndiaMap from './IndiaMap';

const MAX_COMPARE = 4;
const PALETTE = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981'];

/**
 * State Forensic Dossier Component (modal details)
 */
export function StateDossier({ state, profile, isLoading, error, onOpenMP }) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-3 bg-muted/20 my-2">
        <MapPin className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
        <h4 className="font-bold text-base text-foreground">No Works Recorded for {state}</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          {error || `There are no active MPLADS projects or expenditure records logged for ${state} under the current portal filter.`}
        </p>
      </div>
    );
  }

  const u = profile.avg_utilization || 0;
  return (
    <div className="space-y-5">
      {/* headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {[
          { label: 'Sanctioned', value: `₹${formatNumber(Math.round((profile.total_sanctioned || 0) / 1e7))} Cr` },
          { label: 'Disbursed', value: `₹${formatNumber(Math.round((profile.total_disbursed || 0) / 1e7))} Cr` },
          { label: 'Utilization', value: `${(u * 100).toFixed(1)}%` },
          { label: 'Avg Risk', value: profile.avg_risk_score?.toFixed?.(1) ?? profile.avg_risk_score },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-muted/40 p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">{s.label}</span>
            <span className="text-lg font-black font-mono tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" /> Top MPs by Works
          </h4>
          <div className="space-y-1.5">
            {profile.top_mps && profile.top_mps.length > 0 ? (
              profile.top_mps.slice(0, 6).map((m) => (
                <button
                  key={m.mp_name}
                  type="button"
                  onClick={() => onOpenMP && onOpenMP(m.mp_name)}
                  className="w-full text-left text-xs p-2 rounded-lg border bg-card hover:border-primary/40 hover:bg-accent/60 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="truncate font-medium">{m.mp_name}</span>
                  <span className="font-mono text-muted-foreground shrink-0">{formatNumber(m.works_count)} works</span>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">No MPs recorded</p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Implementing Agencies
          </h4>
          <div className="space-y-1.5">
            {profile.agency_breakdown && profile.agency_breakdown.length > 0 ? (
              profile.agency_breakdown.slice(0, 6).map((a) => (
                <div key={a.name} className="text-xs p-2 rounded-lg border bg-card flex items-center justify-between gap-2">
                  <span className="truncate">{a.name}</span>
                  <span className="font-mono text-muted-foreground shrink-0">{formatNumber(a.count)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">No agencies recorded</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Work Categories</h4>
        <div className="space-y-1.5">
          {profile.category_breakdown && profile.category_breakdown.length > 0 ? (
            profile.category_breakdown.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-accent/60">
                <span className="truncate">{c.name}</span>
                <span className="font-mono text-muted-foreground shrink-0">
                  {formatNumber(c.count)} · ₹{formatNumber(Math.round((c.total_sanctioned || 0) / 1e7))} Cr
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic py-2">No categories recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatesView({ house, onOpenMP }) {
  const [states, setStates] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [inspectedState, setInspectedState] = useState(null); // Active state shown in map detail card
  const [dossierState, setDossierState] = useState(null);     // State open in modal dossier dialog
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Comparison State
  const [compareStates, setCompareStates] = useState([]);
  const [metricMode, setMetricMode] = useState('financials'); // 'financials' | 'volume' | 'performance' | 'all'

  const dossierStateName = typeof dossierState === 'string' ? dossierState : dossierState?.state || '';

  const handleOpenDossier = (st) => {
    if (!st) return;
    const name = typeof st === 'string' ? st : (st.state || '');
    if (name) {
      setDossierState(name);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams({ page_size: '100' });
    if (house) params.append('house', house);
    apiFetch(`/api/states?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        setStates(items);
        if (items.length > 0) {
          setInspectedState((prev) => prev || items[0]);
        }
        // Default comparison: initial top 2 states if none picked yet
        setCompareStates((prev) => (prev.length === 0 && items.length >= 2 ? items.slice(0, 2) : prev));
      })
      .catch((err) => console.error('States fetch failed:', err));
  }, [house]);

  // Fetch full state dossier profile when user opens the modal
  useEffect(() => {
    if (!dossierStateName) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    setProfileLoading(true);
    setProfile(null);
    setProfileError(null);

    const qs = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/states/${encodeURIComponent(dossierStateName)}${qs}`)
      .then(async (r) => {
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.warn('State profile fetch warning:', err.message);
        setProfileError(`No active MPLADS works recorded for ${dossierStateName} under the selected filter.`);
      })
      .finally(() => setProfileLoading(false));
  }, [dossierStateName, house]);

  const toggleCompareState = (st) => {
    if (!st || !st.state) return;
    setCompareStates((prev) => {
      const exists = prev.some((s) => s.state.toLowerCase() === st.state.toLowerCase());
      if (exists) {
        return prev.filter((s) => s.state.toLowerCase() !== st.state.toLowerCase());
      }
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, st];
    });
  };

  const applyPreset = (type) => {
    if (!states.length) return;
    if (type === 'top_sanctioned') {
      const sorted = [...states].sort((a, b) => (b.total_sanctioned || 0) - (a.total_sanctioned || 0));
      setCompareStates(sorted.slice(0, 3));
    } else if (type === 'highest_risk') {
      const sorted = [...states].sort((a, b) => (b.avg_risk_score || 0) - (a.avg_risk_score || 0));
      setCompareStates(sorted.slice(0, 3));
    } else if (type === 'utilization') {
      const sorted = [...states].sort((a, b) => (b.avg_utilization || 0) - (a.avg_utilization || 0));
      setCompareStates(sorted.slice(0, 3));
    }
  };

  // Build chart data based on active metric mode
  const { chartData, chartOptions } = useMemo(() => {
    let labels = [];
    let getData = () => [];
    let isLogarithmic = false;

    if (metricMode === 'financials') {
      labels = ['Allocated (₹ Cr)', 'Sanctioned (₹ Cr)', 'Disbursed (₹ Cr)'];
      getData = (s) => [
        Math.round((s.allocated_amount || s.total_allocated || 0) / 1e7),
        Math.round((s.total_sanctioned || 0) / 1e7),
        Math.round((s.total_disbursed || 0) / 1e7),
      ];
    } else if (metricMode === 'volume') {
      labels = ['MPs Count', 'Works Volume', 'High Risk Works'];
      getData = (s) => [
        s.mp_count || 0,
        s.works_count || 0,
        s.high_risk_count || 0,
      ];
    } else if (metricMode === 'performance') {
      labels = ['Utilization %', 'Avg Risk Score', 'Disbursement Ratio %'];
      getData = (s) => {
        const util = (s.avg_utilization || 0) * 100;
        const disbRatio = s.total_sanctioned > 0
          ? ((s.total_disbursed || 0) / s.total_sanctioned) * 100
          : 0;
        return [
          Number(util.toFixed(1)),
          Number((s.avg_risk_score || 0).toFixed(1)),
          Number(disbRatio.toFixed(1)),
        ];
      };
    } else {
      labels = ['Allocated (₹ Cr)', 'Sanctioned (₹ Cr)', 'Disbursed (₹ Cr)', 'Works', 'MPs', 'Avg Risk'];
      isLogarithmic = true;
      getData = (s) => [
        Math.max(1, Math.round((s.allocated_amount || s.total_allocated || 0) / 1e7)),
        Math.max(1, Math.round((s.total_sanctioned || 0) / 1e7)),
        Math.max(1, Math.round((s.total_disbursed || 0) / 1e7)),
        Math.max(1, s.works_count || 0),
        Math.max(1, s.mp_count || 0),
        Math.max(1, Number((s.avg_risk_score || 0).toFixed(1))),
      ];
    }

    const data = {
      labels,
      datasets: compareStates.map((st, i) => ({
        label: st.state,
        data: getData(st),
        backgroundColor: PALETTE[i % PALETTE.length],
        borderRadius: 6,
      })),
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: CHART_ANIMATION,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: AXIS_LABEL_FONT, boxWidth: 12 },
        },
        tooltip: LIGHT_TOOLTIP,
      },
      scales: {
        x: { ticks: { font: TICK_FONT }, grid: { display: false } },
        y: {
          type: isLogarithmic ? 'logarithmic' : 'linear',
          ticks: { font: TICK_FONT },
          grid: { color: 'rgba(148,163,184,0.15)' },
        },
      },
    };

    return { chartData: data, chartOptions: options };
  }, [compareStates, metricMode]);

  return (
    <div className="space-y-6">
      {/* Page Title & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">States & Territories</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geographic fund utilization choropleth map with integrated multi-state comparison analytics
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search & highlight state..."
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value;
              setSearchInput(val);
              if (val.trim().length >= 2) {
                const match = states.find((s) => s.state.toLowerCase().includes(val.trim().toLowerCase()));
                if (match) {
                  setInspectedState(match);
                }
              }
            }}
            className="pl-9 pr-8 h-8 text-xs"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Interactive India Map with State Selection & Compare triggers */}
      <IndiaMap
        states={states}
        inspectedState={inspectedState}
        onInspectState={(st) => setInspectedState(st)}
        onOpenDossier={(stName) => handleOpenDossier(stName)}
        searchQuery={searchInput}
        compareStates={compareStates}
        onToggleCompareState={toggleCompareState}
      />

      {/* 2. Integrated State Performance Comparison Section */}
      <Card className="glass-panel p-5 rounded-xl space-y-4 border border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <h3 className="font-bold font-display text-base sm:text-lg tracking-tight text-foreground">
                State Performance Comparison
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                {compareStates.length}/{MAX_COMPARE} Selected
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Side-by-side comparative analysis. Add states by clicking <span className="font-semibold text-foreground">+ Compare</span> on the map or pick a preset below.
            </p>
          </div>

          {/* Quick Presets & Clear Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets:
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] rounded-lg"
              onClick={() => applyPreset('top_sanctioned')}
            >
              Top Sanctioned
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] rounded-lg"
              onClick={() => applyPreset('highest_risk')}
            >
              High Risk
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] rounded-lg"
              onClick={() => applyPreset('utilization')}
            >
              High Utilization
            </Button>
            {compareStates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setCompareStates([])}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Selected State Chips */}
        {compareStates.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {compareStates.map((st, i) => (
              <Badge
                key={st.state}
                variant="outline"
                className="gap-1.5 py-1 px-2.5 text-[11px] font-medium rounded-lg"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                {st.state}
                <button
                  type="button"
                  onClick={() => toggleCompareState(st)}
                  className="hover:opacity-75 focus:outline-none"
                  title="Remove from comparison"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground space-y-2">
            <Scale className="w-8 h-8 mx-auto opacity-30 text-primary" />
            <p className="font-medium text-foreground">No states selected for comparison</p>
            <p className="text-[11px]">
              Click <strong>+ Compare</strong> in the map's state detail card or choose a preset above to begin.
            </p>
          </div>
        )}

        {/* Comparison Visuals & Table when states are selected */}
        {compareStates.length > 0 && (
          <BlurFade inView>
            <div className="space-y-6 pt-2">
              {/* Chart Card */}
              <div className="rounded-xl border bg-card/60 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2.5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-primary" /> Comparative Metric Distribution
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Multi-dimensional view across compared states
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl self-start sm:self-auto">
                    <Button
                      variant={metricMode === 'financials' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-[11px] px-2.5 rounded-lg"
                      onClick={() => setMetricMode('financials')}
                    >
                      Financials (₹ Cr)
                    </Button>
                    <Button
                      variant={metricMode === 'volume' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-[11px] px-2.5 rounded-lg"
                      onClick={() => setMetricMode('volume')}
                    >
                      Volumes
                    </Button>
                    <Button
                      variant={metricMode === 'performance' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-[11px] px-2.5 rounded-lg"
                      onClick={() => setMetricMode('performance')}
                    >
                      Rates & Risk
                    </Button>
                    <Button
                      variant={metricMode === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-[11px] px-2.5 rounded-lg"
                      onClick={() => setMetricMode('all')}
                    >
                      Logarithmic All
                    </Button>
                  </div>
                </div>

                <div className="h-72">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>

              {/* Side-by-Side Metric Matrix Table */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-3.5 border-b bg-muted/30 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Side-by-Side Metric Matrix
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Click state name to focus on map · Click &quot;Dossier&quot; for complete records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="text-left p-3 font-bold uppercase tracking-wider">State</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">MPs</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">Works</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">Allocated</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">Sanctioned</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">Disbursed</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">Utilization</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">High-Risk</th>
                        <th className="text-right p-3 font-bold uppercase tracking-wider">Avg Risk</th>
                        <th className="text-center p-3 font-bold uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareStates.map((st, i) => {
                        const u = st.avg_utilization || 0;
                        return (
                          <tr key={st.state} className="border-t hover:bg-accent/40 transition-colors">
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => setInspectedState(st)}
                                className="font-bold text-left hover:text-primary hover:underline flex items-center gap-1.5"
                                title="Click to view details in map card above"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                                />
                                {st.state}
                              </button>
                              <span className="block text-[10px] text-muted-foreground ml-3.5">
                                Rank #{st.rank || i + 1}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-medium">
                              {formatNumber(st.mp_count || 0)}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {formatNumber(st.works_count || 0)}
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₹{formatNumber(Math.round((st.allocated_amount || st.total_allocated || 0) / 1e7))} Cr
                            </td>
                            <td className="p-3 text-right font-mono font-semibold">
                              ₹{formatNumber(Math.round((st.total_sanctioned || 0) / 1e7))} Cr
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₹{formatNumber(Math.round((st.total_disbursed || 0) / 1e7))} Cr
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-mono font-semibold">
                                  {(u * 100).toFixed(1)}%
                                </span>
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      u > 0.7 ? 'bg-orange-500' : u >= 0.5 ? 'bg-emerald-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, u * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono text-red-600 font-bold">
                              {formatNumber(st.high_risk_count || 0)}
                            </td>
                            <td className={`p-3 text-right font-mono font-bold ${scoreColorClass(st.avg_risk_score)}`}>
                              {st.avg_risk_score?.toFixed?.(1) ?? (st.avg_risk_score || '0.0')}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-primary gap-1"
                                onClick={() => handleOpenDossier(st.state)}
                              >
                                Dossier
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </BlurFade>
        )}
      </Card>

      {/* State Dossier Modal */}
      <Dialog open={!!dossierStateName} onOpenChange={(o) => !o && setDossierState(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {dossierStateName} Forensic Dossier
            </DialogTitle>
          </DialogHeader>
          <StateDossier
            state={dossierStateName}
            profile={profile}
            isLoading={profileLoading}
            error={profileError}
            onOpenMP={(mp) => onOpenMP && onOpenMP(mp)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
