import React, { useState, useEffect } from 'react';
import {
  User, MapPin, Wallet, AlertTriangle, Layers, Activity,
  Building2, FileCheck, ChevronRight, ShieldAlert, Loader2, ListFilter,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BlurFade } from '@/components/magicui/blur-fade';
import { formatINR, formatNumber, formatPct, RISK_TIER_COLORS, tierBadgeClass, paletteColor } from '@/lib/format';
import { Bar } from 'react-chartjs-2';
import { LIGHT_TOOLTIP, TICK_FONT, AXIS_LABEL_FONT } from '@/lib/chart';
import { UtilizationMeter } from './MPDirectory';
import { apiFetch } from '@/lib/api';

export default function MPProfileModal({ mpName, house, onClose, onOpenWork, onViewWorksInQueue }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const query = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/mps/${encodeURIComponent(mpName)}${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) { setProfile(data); setIsLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError('Profile unavailable for this MP.'); setIsLoading(false); }
      });
    return () => { cancelled = true; };
  }, [mpName, house]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="glass-panel max-w-5xl sm:max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl gap-0 p-0"
        style={{ zIndex: 60 }}
      >
        <div className="p-6 sm:p-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b pb-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20 border border-sky-400/30">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 text-[11px]">
                  MP Transparency Profile
                </Badge>
                <DialogTitle asChild>
                  <h2 className="text-2xl font-bold tracking-tight mt-1">{mpName}</h2>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile ? `${profile.constituency || 'Constituency N/A'} • ${profile.state || 'State N/A'}` : 'Loading…'}
                </DialogDescription>
              </div>
            </div>
            {onViewWorksInQueue && (
              <Button size="sm" onClick={() => onViewWorksInQueue(mpName)} className="hidden sm:inline-flex shrink-0">
                <ListFilter className="w-3.5 h-3.5" />
                Audit Queue
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
                {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                <p className="text-muted-foreground text-sm">Compiling MP dossier…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-10 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-foreground/90 text-sm font-medium">{error}</p>
            </div>
          )}

          {profile && (
            <>
              {/* Fund summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
                <SummaryCard
                  icon={<Wallet className="w-4 h-4 text-purple-400" />}
                  label="Total Allocated"
                  value={formatINR(profile.allocated_amount)}
                  sub={`MPLADS limit for MP`}
                />
                <SummaryCard
                  icon={<Wallet className="w-4 h-4 text-emerald-400" />}
                  label="Total Sanctioned"
                  value={formatINR(profile.sanction_amount)}
                  sub={`${formatNumber(profile.works_count)} works`}
                />
                <SummaryCard
                  icon={<Wallet className="w-4 h-4 text-sky-400" />}
                  label="Total Disbursed"
                  value={formatINR(profile.total_disbursed)}
                  sub={`paid to vendors`}
                />
                <div className="p-4 rounded-2xl bg-muted/50 border">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary" /> Utilization Rate
                  </span>
                  <div className="mt-2.5">
                    <UtilizationMeter ratio={profile.avg_utilization} />
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-1.5">{formatPct(profile.avg_utilization)} of allocated</span>
                </div>
                <SummaryCard
                  icon={<ShieldAlert className="w-4 h-4 text-amber-400" />}
                  label="Avg Risk Score"
                  value={profile.avg_risk_score.toFixed(1)}
                  sub={`peak ${profile.max_risk_score.toFixed(0)}/100`}
                  valueClass={profile.avg_risk_score >= 70 ? 'text-red-600' : profile.avg_risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600'}
                />
                <SummaryCard
                  icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
                  label="High-Risk Works"
                  value={formatNumber(profile.high_risk_count)}
                  sub={`${formatNumber(profile.reviewed_count)} reviewed`}
                  valueClass={profile.high_risk_count > 0 ? 'text-red-600' : 'text-emerald-600'}
                />
              </div>

              {/* Tier split + execution status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Audit Risk Tier Split
                  </h3>
                  <TierBar distribution={profile.tier_distribution} total={profile.works_count} />
                  <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                    <TierLegend color={RISK_TIER_COLORS['High Risk - Review']} label="High — Review" count={profile.high_risk_count} />
                    <TierLegend color={RISK_TIER_COLORS['Medium Risk - Monitor']} label="Medium — Monitor" count={profile.medium_risk_count} />
                    <TierLegend color={RISK_TIER_COLORS['Low Risk']} label="Low Risk" count={profile.low_risk_count} />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" /> Execution Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.status_breakdown.map((s) => (
                      <Badge key={s.name} variant="secondary" className="py-1.5">
                        {s.name} <strong className="font-mono ml-1">{s.count}</strong>
                        <span className="text-muted-foreground text-[10px] ml-1">({formatPct(s.count / profile.works_count)})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial performance + project delivery (reference-style) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Financial Performance
                  </h3>
                  {(() => {
                    const sanctioned = profile.sanction_amount || 0;
                    const disbursed = profile.fund_disbursed_amount || 0;
                    const pct = sanctioned > 0 ? Math.min(100, (disbursed / sanctioned) * 100) : 0;
                    return (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Sanctioned</span><strong className="font-mono">₹{formatNumber(Math.round(sanctioned / 1e7))} Cr</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Disbursed</span><strong className="font-mono">₹{formatNumber(Math.round(disbursed / 1e7))} Cr</strong></div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden border">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% of sanctioned funds disbursed</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Project Delivery
                  </h3>
                  {(() => {
                    const completed = (profile.status_breakdown || [])
                      .filter((s) => /complet/i.test(s.name))
                      .reduce((a, s) => a + s.count, 0);
                    const inProgress = Math.max(0, (profile.works_count || 0) - completed);
                    const rate = profile.works_count > 0 ? (completed / profile.works_count) * 100 : 0;
                    return (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><strong className="font-mono text-emerald-600">{formatNumber(completed)}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">In Progress / Ongoing</span><strong className="font-mono text-amber-600">{formatNumber(inProgress)}</strong></div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden border">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{rate.toFixed(1)}% completion rate</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Category + agencies/vendors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <BreakdownPanel
                  title="Where the Funds Go — Categories"
                  icon={<Layers className="w-3.5 h-3.5 text-primary" />}
                  rows={profile.category_breakdown}
                />
                <div className="space-y-5">
                  <EntityList
                    title="Implementing Agencies"
                    icon={<Building2 className="w-3.5 h-3.5 text-sky-400" />}
                    rows={profile.agency_breakdown}
                  />
                  <EntityList
                    title="Top Contractors by Value"
                    icon={<Building2 className="w-3.5 h-3.5 text-amber-400" />}
                    rows={profile.top_vendors}
                  />
                </div>
              </div>

              {/* Highest-risk works */}
              <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Highest-Risk Works
                  </h3>
                  <span className="text-[10px] text-muted-foreground">click a work to open its audit case packet</span>
                </div>
                <div className="space-y-2">
                  {profile.top_risk_works.map((w, i) => (
                    <BlurFade key={w.work_id} delay={i * 0.04}>
                      <div
                        onClick={() => onOpenWork(w.work_id)}
                        className="p-3 rounded-xl bg-background/60 hover:bg-accent/60 border cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border">
                              {w.work_id}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tierBadgeClass(w.risk_tier)}`}>
                              {w.risk_tier}
                            </span>
                            <span className="text-[10px] font-bold text-primary">Risk {w.final_risk_score}</span>
                          </div>
                          <p className="text-xs text-foreground/85 truncate mt-1 group-hover:text-foreground transition-colors">
                            {w.work_type || 'Civil / construction work'}
                          </p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <span className="font-mono text-xs font-bold">{formatINR(w.sanction_amount)}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-600 transition-colors" />
                        </div>
                      </div>
                    </BlurFade>
                  ))}
                </div>
              </div>

              {/* Recent reviews */}
              {profile.recent_reviews.length > 0 && (
                <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Latest Auditor Determinations
                  </h3>
                  <div className="space-y-1.5">
                    {profile.recent_reviews.map((rev) => (
                      <div key={rev.id} className="p-2.5 rounded-xl bg-background/60 border text-xs flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-primary capitalize">{rev.outcome}</span>
                          <span className="text-muted-foreground font-mono text-[10px] ml-2">{rev.work_id}</span>
                        </div>
                        <div className="text-right text-[10px] text-muted-foreground shrink-0">
                          <span className="block text-foreground/70">{rev.reviewer_name}</span>
                          {rev.created_at && new Date(rev.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ icon, label, value, sub, valueClass = '' }) {
  return (
    <div className="p-4 rounded-2xl bg-muted/50 border">
      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">{icon} {label}</span>
      <div className={`text-xl font-black mt-1.5 font-mono ${valueClass}`}>{value}</div>
      <span className="text-[10px] text-muted-foreground block mt-0.5">{sub}</span>
    </div>
  );
}

function TierBar({ distribution, total }) {
  const totalSafe = total || 1;
  const segments = [
    { key: 'High Risk - Review', color: RISK_TIER_COLORS['High Risk - Review'] },
    { key: 'Medium Risk - Monitor', color: RISK_TIER_COLORS['Medium Risk - Monitor'] },
    { key: 'Low Risk', color: RISK_TIER_COLORS['Low Risk'] },
  ];
  return (
    <div className="w-full h-3.5 rounded-full bg-muted overflow-hidden flex shadow-inner border">
      {segments.map((seg) => {
        const count = distribution?.[seg.key] || 0;
        const pct = (count / totalSafe) * 100;
        return pct === 0 ? null : (
          <div
            key={seg.key}
            style={{ width: `${pct}%`, backgroundColor: seg.color }}
            title={`${seg.key}: ${count}`}
            className="h-full transition-all duration-500"
          />
        );
      })}
    </div>
  );
}

function TierLegend({ color, label, count }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-foreground/90">{label}: <strong className="font-mono">{formatNumber(count)}</strong></span>
    </div>
  );
}

function BreakdownPanel({ title, icon, rows }) {
  return (
    <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">{icon} {title}</h3>
      <div className="chart-wrap" style={{ height: Math.max(rows.slice(0, 6).length * 38 + 30, 100) }}>
        <Bar
          aria-label={title}
          data={{
            labels: rows.slice(0, 6).map((r) => (r.name.length > 20 ? r.name.slice(0, 19) + '…' : r.name)),
            datasets: [{
              data: rows.slice(0, 6).map((r) => Math.round(r.total_sanctioned / 10000000)),
              backgroundColor: rows.slice(0, 6).map((_, i) => paletteColor(i) + 'd9'),
              hoverBackgroundColor: rows.slice(0, 6).map((_, i) => paletteColor(i)),
              borderRadius: 7,
              barThickness: 16,
            }],
          }}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
            plugins: {
              legend: { display: false },
              tooltip: {
                ...LIGHT_TOOLTIP,
                callbacks: {
                  label: (ctx) => ` ₹${formatNumber(ctx.parsed.x)} Cr sanctioned`,
                  afterLabel: (ctx) => {
                    const r = rows[ctx.dataIndex];
                    return `${formatNumber(r.count)} works • ${r.high_risk_count} high-risk`;
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
                  maxTicksLimit: 4,
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
      </div>
    </div>
  );
}

function EntityList({ title, icon, rows }) {
  return (
    <div className="p-5 rounded-2xl bg-muted/40 border space-y-2.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">{icon} {title}</h3>
      <div className="space-y-1.5">
        {rows.map((r, idx) => (
          <div key={r.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background/60 border">
            <span className="text-foreground/90 truncate max-w-[65%]">
              <span className="text-muted-foreground font-mono mr-1.5">{idx + 1}.</span>{r.name}
            </span>
            <span className="text-right shrink-0">
              <span className="font-mono text-[11px] text-foreground/80 block">{formatINR(r.total_sanctioned)}</span>
              <span className="text-[10px] text-muted-foreground">{r.count} works</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
