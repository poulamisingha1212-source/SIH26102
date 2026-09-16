import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Search, X, Loader2, Users, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlurFade } from '@/components/magicui/blur-fade';
import { CHART_ANIMATION, LIGHT_TOOLTIP, TICK_FONT, AXIS_LABEL_FONT } from '@/lib/chart';
import { formatNumber, scoreColorClass } from '@/lib/format';
import { apiFetch } from '@/lib/api';

const MAX_COMPARE = 4;
const PALETTE = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981'];

/**
 * Compare MPs (reference site's Compare section): search-select up to four
 * MPs, then a grouped bar chart + metric table across sanctioned, disbursed,
 * works, utilization and average risk score.
 */
export default function CompareView({ house, onOpenMP }) {
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (searchInput.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      setIsSearching(true);
      const params = new URLSearchParams({ search: searchInput.trim(), page_size: '12' });
      if (house) params.append('house', house);
      apiFetch(`/api/mps?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => { setResults(d.items || []); setShowResults(true); })
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, house]);

  const toggleMP = (mp) => {
    setSelected((prev) => {
      const exists = prev.some((m) => m.mp_name === mp.mp_name);
      if (exists) return prev.filter((m) => m.mp_name !== mp.mp_name);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, mp];
    });
  };

  const chartData = {
    labels: ['Allocated (₹ Cr)', 'Sanctioned (₹ Cr)', 'Disbursed (₹ Cr)', 'Works', 'Avg Risk'],
    datasets: selected.map((mp, i) => ({
      label: mp.mp_name,
      data: [
        Math.round((mp.allocated_amount || 0) / 1e7),
        Math.round((mp.total_sanctioned || 0) / 1e7),
        Math.round((mp.total_disbursed || 0) / 1e7),
        mp.works_count || 0,
        Number((mp.avg_risk_score || 0).toFixed(1)),
      ],
      backgroundColor: PALETTE[i % PALETTE.length],
      borderRadius: 6,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: CHART_ANIMATION,
    plugins: {
      legend: { position: 'bottom', labels: { font: AXIS_LABEL_FONT, boxWidth: 12 } },
      tooltip: LIGHT_TOOLTIP,
    },
    scales: {
      x: { ticks: { font: TICK_FONT }, grid: { display: false } },
      y: { type: 'logarithmic', ticks: { font: TICK_FONT }, grid: { color: 'rgba(148,163,184,0.15)' } },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold font-[Outfit] tracking-tight">Compare MPs</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select up to {MAX_COMPARE} MPs to compare funds, delivery and risk side by side
        </p>
      </div>

      {/* MP selector — z-elevated so the results dropdown never gets overlapped */}
      <Card className="glass-panel p-5 rounded-2xl space-y-3 relative z-30">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Scale className="w-3.5 h-3.5" />
          Select MPs to Compare ({selected.length}/{MAX_COMPARE})
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search MP by name or constituency..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin text-primary absolute right-3 top-1/2 -translate-y-1/2" />
          )}
          {showResults && results.length > 0 && searchInput.length >= 2 && (
            <div className="absolute z-50 top-full mt-1 w-full max-h-80 overflow-y-auto rounded-xl border bg-card shadow-xl">
              {results.map((mp) => {
                const isPicked = selected.some((m) => m.mp_name === mp.mp_name);
                return (
                  <button
                    key={mp.mp_name}
                    onClick={() => { toggleMP(mp); setSearchInput(''); setShowResults(false); }}
                    disabled={!isPicked && selected.length >= MAX_COMPARE}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent/70 disabled:opacity-40 flex items-center justify-between gap-2 border-b last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold block truncate">{mp.mp_name}</span>
                      <span className="text-muted-foreground truncate block">{mp.constituency || mp.state}</span>
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                      risk {mp.avg_risk_score?.toFixed?.(0)}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((mp, i) => (
              <Badge key={mp.mp_name} variant="outline" className="gap-1.5 py-1 text-[11px] font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[i] }} />
                {mp.mp_name}
                <button onClick={() => toggleMP(mp)}><X className="w-3 h-3" /></button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setSelected([])}>
              Clear all
            </Button>
          </div>
        )}
      </Card>

      {/* Comparison chart + table */}
      {selected.length === 0 ? (
        <Card className="glass-panel p-10 rounded-2xl text-center text-sm text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
          Search above and pick MPs to start comparing — sanctioned funds, disbursement,
          delivery volume and AI risk scores, side by side.
        </Card>
      ) : (
        <BlurFade inView>
          <div className="space-y-6">
            <Card className="glass-panel p-5 rounded-2xl">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Metric Comparison</h3>
              <div className="h-80">
                <Bar data={chartData} options={chartOptions} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Logarithmic scale — so MPs with very different fund sizes stay comparable.
              </p>
            </Card>

            <Card className="glass-panel rounded-2xl overflow-hidden py-0 gap-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="text-left p-3 font-bold uppercase tracking-wider">MP</th>
                      <th className="text-right p-3 font-bold uppercase tracking-wider">Works</th>
                      <th className="text-right p-3 font-bold uppercase tracking-wider">Allocated</th>
                      <th className="text-right p-3 font-bold uppercase tracking-wider">Sanctioned</th>
                      <th className="text-right p-3 font-bold uppercase tracking-wider">Disbursed</th>
                      <th className="text-right p-3 font-bold uppercase tracking-wider">Utilization</th>
                      <th className="text-right p-3 font-bold uppercase tracking-wider">High-Risk</th>
                      <th className="text-right p-3 font-bold uppercase tracking-wider">Avg Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((mp) => (
                      <tr key={mp.mp_name} className="border-t hover:bg-accent/40">
                        <td className="p-3">
                          <button className="font-semibold text-left hover:text-primary hover:underline" onClick={() => onOpenMP(mp.mp_name)}>
                            {mp.mp_name}
                          </button>
                          <span className="block text-[10px] text-muted-foreground">{mp.constituency || mp.state}</span>
                        </td>
                        <td className="p-3 text-right font-mono">{formatNumber(mp.works_count)}</td>
                        <td className="p-3 text-right font-mono">₹{formatNumber(Math.round((mp.allocated_amount || 0) / 1e7))} Cr</td>
                        <td className="p-3 text-right font-mono">₹{formatNumber(Math.round((mp.total_sanctioned || 0) / 1e7))} Cr</td>
                        <td className="p-3 text-right font-mono">₹{formatNumber(Math.round((mp.total_disbursed || 0) / 1e7))} Cr</td>
                        <td className="p-3 text-right font-mono">{((mp.avg_utilization || 0) * 100).toFixed(1)}%</td>
                        <td className="p-3 text-right font-mono text-red-600">{mp.high_risk_count || 0}</td>
                        <td className={`p-3 text-right font-mono font-bold ${scoreColorClass(mp.avg_risk_score)}`}>
                          {mp.avg_risk_score?.toFixed?.(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </BlurFade>
      )}
    </div>
  );
}
