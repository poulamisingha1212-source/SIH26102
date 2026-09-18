import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Users, MapPin, AlertTriangle, CheckCircle,
  TrendingUp, Wallet, Layers, Activity, Landmark, Gauge, Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Doughnut, Bar } from 'react-chartjs-2';
import { BorderBeam } from '@/components/magicui/border-beam';
import { BlurFade } from '@/components/magicui/blur-fade';
import { paletteColor, formatINR, formatNumber } from '@/lib/format';
import { LIGHT_TOOLTIP, TICK_FONT, AXIS_LABEL_FONT } from '@/lib/chart';
import UtilizationGauge from '@/components/dashboard/UtilizationGauge';
import StateAllocationChart from '@/components/dashboard/StateAllocationChart';
import RiskTierDonut from '@/components/dashboard/RiskTierDonut';
import RiskWatchlist from '@/components/dashboard/RiskWatchlist';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, ShieldAlert, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';

export default function PortfolioOverview({
  stats,
  house,
  syncStatus,
  onTriggerSync,
  isSyncing,
  currentRole = 'Read-Only Public Tier',
  onFilterByEntity,
  onNavigateTab,
}) {
  const [categoryData, setCategoryData] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [statesData, setStatesData] = useState([]);
  const categoryChartRef = useRef(null);

  // Chart aggregations for the transparency panels below (scoped by house).
  useEffect(() => {
    const qs = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/analytics/categories${qs}`)
      .then((res) => res.json())
      .then(setCategoryData)
      .catch((err) => console.error('Category analytics failed:', err));
    apiFetch(`/api/analytics/status${qs}`)
      .then((res) => res.json())
      .then(setStatusData)
      .catch((err) => console.error('Status analytics failed:', err));
    // States for the fund-utilization & allocation charts
    apiFetch(`/api/states?page_size=100${house ? `&house=${encodeURIComponent(house)}` : ''}`)
      .then((res) => res.json())
      .then((d) => setStatesData(d.items || []))
      .catch((err) => console.error('States failed:', err));
  }, [house]);

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  const highPct = stats.total_works > 0 ? ((stats.high_risk_count / stats.total_works) * 100).toFixed(1) : 0;
  const medPct = stats.total_works > 0 ? ((stats.medium_risk_count / stats.total_works) * 100).toFixed(1) : 0;
  const lowPct = stats.total_works > 0 ? ((stats.low_risk_count / stats.total_works) * 100).toFixed(1) : 0;

  const isAdmin = currentRole === 'MoSPI Reviewer';

  return (
    <div className="space-y-6">

      {/* Admin Executive Command Center Banner (MoSPI Reviewer) */}
      {isAdmin && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-linear-to-r from-amber-500/15 via-slate-50 to-indigo-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-indigo-950/30 p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-amber-600 text-white shadow-xs">
                  <Database className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
                  MoSPI Executive Administration & Data Management Desk
                </h3>
                <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2.5 py-0.5 font-semibold">
                  Administrator Authority
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                Comprehensive national oversight over all 543 Parliamentary Constituencies, State Nodal Departments, and real-time portal synchronization with mplads.mospi.gov.in.
              </p>
            </div>

            {/* Live Sync Action & Status */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="text-right text-xs">
                <div className="flex items-center justify-end gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${syncStatus?.is_data_stale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span>Portal Sync: {syncStatus?.is_data_stale ? 'Sync Recommended' : 'Online & Live'}</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Last: {syncStatus?.last_sync_time ? new Date(syncStatus.last_sync_time).toLocaleTimeString('en-IN') : 'Recent'} • {stats.total_works?.toLocaleString('en-IN')} works indexed
                </span>
              </div>

              {onTriggerSync && (
                <Button
                  onClick={() => onTriggerSync('live')}
                  disabled={isSyncing}
                  className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Synchronizing Ingestion…' : 'Sync Live Portal Data'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard title + house scope */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
            {isAdmin ? 'National MPLADS Administration Overview' : 'MPLADS Transparency Dashboard'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAdmin
              ? 'Complete national expenditure ledger, AI anomaly prioritization, and district data feeds.'
              : 'Overview of the Member of Parliament Local Area Development Scheme across India'}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 w-fit border-primary/30 bg-primary/5 text-primary text-xs font-semibold">
          <Landmark className="w-3.5 h-3.5" />
          {house || 'All Houses / Terms'}
        </Badge>
      </div>

      {/* Portfolio metrics — portal ledger + risk layer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Allocated" icon={<Landmark className="w-4 h-4 text-indigo-500" />} sub="MP fund ceiling, current house scope">
          <span className="text-2xl font-bold font-mono">₹{formatNumber(Math.round((stats.total_allocated_amount ?? 0) / 1e7))} Cr</span>
        </MetricCard>
        <MetricCard label="Total Sanctioned" icon={<TrendingUp className="w-4 h-4 text-primary" />} sub="Works recommended by MPs">
          <span className="text-2xl font-bold font-mono">₹{formatNumber(Math.round((stats.total_sanctioned_amount ?? 0) / 1e7))} Cr</span>
        </MetricCard>
        <MetricCard label="Total Expenditure" icon={<Wallet className="w-4 h-4 text-sky-500" />} sub="Vendor payments recorded">
          <span className="text-2xl font-bold font-mono">₹{formatNumber(Math.round((stats.total_disbursed_amount ?? 0) / 1e7))} Cr</span>
        </MetricCard>
        <div className="relative overflow-hidden">
          <MetricCard label="High-Risk Works" icon={<AlertTriangle className="w-4 h-4 text-red-500" />} sub={`Top ${highPct}% audit priority`} valueClass="text-red-500">
            <span className="text-2xl font-bold font-mono text-red-600">{formatNumber(stats.high_risk_count)}</span>
          </MetricCard>
          <BorderBeam size={70} duration={8} colorFrom="#ef4444" colorTo="#f59e0b" />
        </div>
        <MetricCard label="Fund Utilization" icon={<Gauge className="w-4 h-4 text-emerald-500" />} sub="Sanctioned vs allocated (MoSPI)">
          <span className="text-2xl font-bold font-mono text-emerald-600">{stats.fund_utilization_pct ?? 0}%</span>
        </MetricCard>
        <MetricCard label="Expenditure Rate" icon={<Activity className="w-4 h-4 text-sky-500" />} sub="Disbursed vs allocated">
          <span className="text-2xl font-bold font-mono text-sky-600">{stats.expenditure_rate_pct ?? 0}%</span>
        </MetricCard>
        <MetricCard label="Works Completed" icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} sub={`${formatNumber(stats.works_pending)} still pending`}>
          <span className="text-2xl font-bold font-mono">{formatNumber(stats.works_completed)}</span>
        </MetricCard>
        <MetricCard label="Ongoing-Work Payments" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} sub="Paid to vendors, work not complete">
          <span className="text-2xl font-bold font-mono text-amber-600">₹{formatNumber(Math.round((stats.ongoing_work_payments ?? 0) / 1e7))} Cr</span>
        </MetricCard>
      </div>

      {/* Tier distribution */}
      <Card className="glass-panel p-6 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Risk Tier Distribution (Likelihood Percentiles)
          </h3>
          <span className="text-xs text-muted-foreground font-mono">
            {stats.total_works?.toLocaleString('en-IN')} Works Total
          </span>
        </div>

        <div className="w-full h-4 rounded-full bg-muted overflow-hidden flex shadow-inner border">
          <div style={{ width: `${highPct}%` }} className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500" title={`High Risk: ${stats.high_risk_count} (${highPct}%)`} />
          <div style={{ width: `${medPct}%` }} className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-500" title={`Medium Risk: ${stats.medium_risk_count} (${medPct}%)`} />
          <div style={{ width: `${lowPct}%` }} className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500" title={`Low Risk: ${stats.low_risk_count} (${lowPct}%)`} />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-1 text-xs">
          <TierLegend color="#ef4444" label={`High Risk (${highPct}%)`} count={stats.high_risk_count} />
          <TierLegend color="#f59e0b" label={`Medium Risk (${medPct}%)`} count={stats.medium_risk_count} />
          <TierLegend color="#10b981" label={`Low Risk (${lowPct}%)`} count={stats.low_risk_count} />
        </div>
      </Card>

      {/* Reference-style visual analytics: utilisation gauges + risk spread */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <BlurFade inView delay={0.05} className="h-full">
          <UtilizationGauge utilization={stats.fund_utilization_pct ?? 0} title="Fund Utilization"
            subtitle="Sanctioned share of allocated funds (MoSPI definition)" />
        </BlurFade>
        <BlurFade inView delay={0.08} className="h-full">
          <UtilizationGauge utilization={stats.expenditure_rate_pct ?? 0} title="Expenditure Rate"
            subtitle="Disbursed share of allocated funds" />
        </BlurFade>
        <BlurFade inView delay={0.1} className="h-full">
          <RiskTierDonut tier={stats.tier_distribution} />
        </BlurFade>
      </div>

      <BlurFade inView delay={0.12}>
        <StateAllocationChart states={statesData} />
      </BlurFade>

      {/* Fund allocation & execution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category share */}
        <Card className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Where the Funds Go</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">by sanctioned value — click to filter queue</span>
          </div>

          {categoryData ? (
            <div className="chart-wrap h-[248px]">
              <Bar
                ref={categoryChartRef}
                aria-label="Sanctioned funds by work category"
                data={{
                  labels: categoryData.slice(0, 6).map((c) => truncateLabel(c.name, 22)),
                  datasets: [{
                    data: categoryData.slice(0, 6).map((c) => Math.round(c.total_sanctioned / 10000000)),
                    backgroundColor: categoryData.slice(0, 6).map((_, i) => paletteColor(i) + 'd9'),
                    hoverBackgroundColor: categoryData.slice(0, 6).map((_, i) => paletteColor(i)),
                    borderRadius: 8,
                    barThickness: 22,
                  }],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 800, easing: 'easeOutQuart' },
                  onClick: (evt) => {
                    const els = categoryChartRef.current?.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                    if (els?.length) onFilterByEntity('work_category', categoryData[els[0].index].name);
                  },
                  onHover: (evt, els) => {
                    evt.native.target.style.cursor = els.length ? 'pointer' : 'default';
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      ...LIGHT_TOOLTIP,
                      callbacks: {
                        label: (ctx) => ` ₹${formatNumber(ctx.parsed.x)} Cr sanctioned`,
                        afterLabel: (ctx) => {
                          const cat = categoryData[ctx.dataIndex];
                          return `${formatNumber(cat.count)} works • ${cat.high_risk_count} high-risk`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: 'rgba(148, 163, 184, 0.18)' },
                      border: { display: false },
                      ticks: {
                        color: '#64748b',
                        font: TICK_FONT,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 5,
                        callback: (v) => `₹${formatNumber(v)} Cr`,
                      },
                    },
                    y: {
                      grid: { display: false },
                      border: { display: false },
                      ticks: { color: '#334155', font: AXIS_LABEL_FONT },
                    },
                  },
                }}
              />
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                click a bar to filter the audit queue by that category
              </p>
            </div>
          ) : (
            <ChartSkeleton />
          )}
        </Card>

        {/* Execution status donut */}
        <Card className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold">Execution Status</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">works by implementation stage</span>
          </div>

          {statusData ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* ui-ux-pro-max chart guidance: part-to-whole → donut, ≤6 slices,
                      largest segment starting at 12 o'clock, values in the legend */}
              <div className="relative shrink-0 chart-wrap h-[186px] w-[186px]">
                <Doughnut
                  aria-label="Works by execution status"
                  data={{
                    labels: statusData.slice(0, 6).map((s) => s.name),
                    datasets: [{
                      data: statusData.slice(0, 6).map((s) => s.count),
                      backgroundColor: statusData.slice(0, 6).map((_, i) => paletteColor(i)),
                      borderColor: '#ffffff',
                      borderWidth: 2,
                      hoverOffset: 8,
                    }],
                  }}
                  options={{
                    cutout: '68%',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { animateRotate: true, duration: 900 },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        ...LIGHT_TOOLTIP,
                        callbacks: {
                          label: (ctx) => {
                            const total = statusData.reduce((acc, s) => acc + s.count, 0) || 1;
                            return ` ${formatNumber(ctx.parsed)} works (${((ctx.parsed / total) * 100).toFixed(1)}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black font-mono">{formatNumber(stats.total_works)}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">works</span>
                </div>
              </div>
              <div className="space-y-2 w-full text-xs">
                {statusData.slice(0, 6).map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-accent/60 transition-colors">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: paletteColor(idx) }} />
                      <span className="text-foreground/90 truncate">{s.name}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <strong className="font-mono">{formatNumber(s.count)}</strong>
                      <span className="text-muted-foreground ml-1.5">({(s.share * 100).toFixed(1)}%)</span>
                      <span className={`block text-[10px] font-mono ${s.avg_risk_score > 70 ? 'text-red-600' : s.avg_risk_score >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        avg risk {s.avg_risk_score}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ChartSkeleton />
          )}
        </Card>
      </div>

      {/* Organized Entity Risk Watchlist */}
      <RiskWatchlist
        states={stats.top_risk_states}
        mps={stats.top_risk_mps}
        vendors={stats.top_risk_vendors}
        onFilterByEntity={onFilterByEntity}
      />

      {/* Dedicated Citizen Grievance Portal Banner / Quick Access */}
      <Card className="glass-panel p-5 rounded-2xl border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/30 dark:from-indigo-950/30 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
                  Citizen Grievances & Live Action Desk
                </h3>
                <Badge variant="outline" className="text-[11px] font-semibold border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  500 Verified Complaints Across 240+ Seats
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Direct citizen accountability channel routing field complaints with photo proof to elected MPs and District Authority Auditors.
              </p>
            </div>
          </div>
          {onNavigateTab && (
            <Button
              size="sm"
              onClick={() => onNavigateTab('grievances')}
              className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs gap-1.5 cursor-pointer shrink-0"
            >
              <span>Explore All Grievances</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </Card>

      {/* About JanNidhi */}
      <Card className="glass-panel p-6 rounded-2xl border-slate-200/80 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">About JanNidhi Portal</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          JanNidhi is an open transparency and decision-support portal for the Members of Parliament Local Area Development Scheme (MPLADS).
          It bridges official public records with automated anomaly detection to ensure public funds translate directly into completed community development.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
            <span className="font-bold text-slate-800 block">Citizen Transparency</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Explore public expenditures, MP allocations, and project statuses across all parliamentary constituencies with transparent data visualizations.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
            <span className="font-bold text-slate-800 block">Audit Prioritization</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Assists district authorities and reviewers in prioritizing high-risk cases — such as cost deviation, timeline slippage, and vendor concentration.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
            <span className="font-bold text-slate-800 block">Verified Official Data</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Synchronized directly with the official portal (mplads.mospi.gov.in). Risk scores serve as audit decision filters, not legal verdicts.
            </p>
          </div>
        </div>
      </Card>

    </div>
  );
}

function MetricCard({ label, icon, sub, valueClass = '', children }) {
  return (
    <Card className="glass-panel p-5 rounded-xl relative overflow-hidden border border-border/80 shadow-2xs hover:border-border transition-colors">
      <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-2 ${valueClass}`}>{children}</div>
      <span className="text-[11px] text-muted-foreground block mt-1">{sub}</span>
    </Card>
  );
}

function TierLegend({ color, label, count }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-foreground/90">
        {label}: <strong className="text-foreground font-mono">{count?.toLocaleString('en-IN')}</strong>
      </span>
    </div>
  );
}



function truncateLabel(text, max) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function ChartSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${85 - i * 12}%` }} />
      ))}
      <p className="text-[11px] text-muted-foreground text-center pt-2">Loading analytics…</p>
    </div>
  );
}
