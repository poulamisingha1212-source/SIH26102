import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Users, MapPin, AlertTriangle, CheckCircle,
  TrendingUp, Wallet, Layers, Activity, FileDown, Landmark, Gauge, Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Doughnut, Bar } from 'react-chartjs-2';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { BorderBeam } from '@/components/magicui/border-beam';
import { BlurFade } from '@/components/magicui/blur-fade';
import { paletteColor, formatINR, formatNumber } from '@/lib/format';
import { LIGHT_TOOLTIP, TICK_FONT, AXIS_LABEL_FONT } from '@/lib/chart';
import UtilizationGauge from '@/components/dashboard/UtilizationGauge';
import StateAllocationChart from '@/components/dashboard/StateAllocationChart';
import RiskTierDonut from '@/components/dashboard/RiskTierDonut';
import { apiFetch } from '@/lib/api';

export default function PortfolioOverview({
  stats,
  house,
  _syncStatus,
  _onTriggerSync,
  _isSyncing,
  _currentRole,
  onFilterByEntity
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

  return (
    <div className="space-y-6">

      {/* Dashboard title + house scope */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold font-[Outfit] tracking-tight">MPLADS Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of the Member of Parliament Local Area Development Scheme
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 w-fit border-primary/30 bg-primary/5 text-primary text-xs font-semibold">
          <Landmark className="w-3.5 h-3.5" />
          {house || 'Both Houses'}
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

      {/* Open-data download strip */}
      <Card className="glass-panel p-4 rounded-2xl border-emerald-500/15 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <FileDown className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
              Open Data Access
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download the full machine-readable scored dataset (CSV, first 50,000 rows) for independent scrutiny and research.
            </p>
          </div>
        </div>
        <ShimmerButton
          onClick={() => window.open('/api/export/works?row_limit=50000', '_blank')}
          className="text-xs font-semibold px-4 py-2 shrink-0"
          borderRadius="12px"
        >
          <FileDown className="w-3.5 h-3.5 mr-1.5" />
          Download CSV
        </ShimmerButton>
      </Card>

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
                      <span className={`block text-[10px] font-mono ${s.avg_risk_score >= 70 ? 'text-red-600' : s.avg_risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
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

      {/* Entity risk tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <EntityCard
          title="Top-Risk States"
          note="By Flagged Works"
          icon={<MapPin className="w-4 h-4 text-primary" />}
          rows={stats.top_risk_states}
          onClick={(name) => onFilterByEntity('state', name)}
          unit="works"
        />

        <EntityCard
          title="Top-Risk MPs"
          note="By High-Risk Works"
          icon={<Users className="w-4 h-4 text-primary" />}
          rows={stats.top_risk_mps}
          onClick={(name) => onFilterByEntity('mp_name', name)}
          unit="works"
        />

        <EntityCard
          title="Top-Risk Vendors"
          note="Concentration Signals"
          icon={<Building2 className="w-4 h-4 text-primary" />}
          rows={stats.top_risk_vendors}
          onClick={(name) => onFilterByEntity('search', name)}
          unit="contracts"
        />
      </div>

      {/* About */}
      <Card className="glass-panel p-6 rounded-2xl space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">About JanNidhi</h3>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          JanNidhi is an AI-driven audit-prioritization platform for MPLADS (MoSPI, SIH26102).
          Every work is scored by a hybrid rule-based + machine-learning risk engine that surfaces
          cost anomalies, vendor concentration, duplicate descriptions, timeline violations, and
          utilization mismatches — so reviewers see the highest-risk cases first.
        </p>
        <p className="text-[11px] text-muted-foreground">
          Live data is pulled directly from the official MPLADS dashboard (mplads.mospi.gov.in)
          and risk-scored on every sync. Risk scores are prioritization indicators, not definitive
          fraud verdicts.
        </p>
      </Card>

    </div>
  );
}

function MetricCard({ label, icon, sub, valueClass = '', children }) {
  return (
    <Card className="glass-panel p-5 rounded-2xl relative overflow-hidden">
      <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-2 ${valueClass}`}>{children}</div>
      <span className="text-[11px] text-muted-foreground block mt-1">{sub}</span>
      <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
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

function EntityCard({ title, note, icon, rows, onClick, unit }) {
  return (
    <Card className="glass-panel p-5 rounded-2xl space-y-3">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">{note}</span>
      </div>

      <div className="space-y-2 text-xs">
        {rows?.map((entity, idx) => (
          <div
            key={entity.name}
            onClick={() => onClick(entity.name)}
            className="p-2.5 rounded-xl bg-muted/60 hover:bg-accent/70 border cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="font-semibold text-foreground/90 group-hover:text-primary transition-colors truncate block">
                {idx + 1}. {entity.name}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {entity.count.toLocaleString('en-IN')} {unit} • Avg Risk {entity.avg_risk_score}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-red-600 block font-mono">
                {entity.high_risk_count} High
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {formatINR(entity.total_sanctioned)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
