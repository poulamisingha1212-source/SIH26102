import React, { useState, useEffect } from 'react';
import { MapPin, Users, Search, Building2, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BlurFade } from '@/components/magicui/blur-fade';
import { formatNumber } from '@/lib/format';
import { apiFetch } from '@/lib/api';

/**
 * States view (reference site's States section): a responsive grid of state
 * cards — funds, utilization progress bar, risk badge, rank — with a
 * click-through dossier per state.
 */

function riskBadge(avgRisk) {
  if (avgRisk >= 70) return { label: 'High Risk', className: 'border-red-200 bg-red-50 text-red-700' };
  if (avgRisk >= 40) return { label: 'Medium Risk', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  return { label: 'Low Risk', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
}

function utilColor(u) {
  return u > 0.7 ? 'bg-emerald-500' : u > 0.4 ? 'bg-amber-500' : 'bg-red-500';
}

function StateCard({ state, rank, onOpen }) {
  const u = state.avg_utilization || 0;
  const rb = riskBadge(state.avg_risk_score || 0);
  return (
    <BlurFade inView delay={Math.min(rank * 0.03, 0.4)}>
      <Card
        className="glass-panel p-5 rounded-2xl space-y-3 cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all hover:-translate-y-0.5 h-full"
        onClick={() => onOpen(state.state)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate" title={state.state}>{state.state}</h3>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" /> {state.mp_count} MPs · {formatNumber(state.works_count)} works
            </span>
          </div>
          <span className="text-[10px] font-bold font-mono text-muted-foreground border rounded-lg px-1.5 py-0.5 shrink-0">
            #{rank + 1}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground block">Sanctioned</span>
            <span className="font-bold font-mono">₹{formatNumber(Math.round((state.total_sanctioned || 0) / 1e7))} Cr</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Disbursed</span>
            <span className="font-bold font-mono">₹{formatNumber(Math.round((state.total_disbursed || 0) / 1e7))} Cr</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Utilization</span>
            <span className="font-mono font-semibold">{(u * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${utilColor(u)}`}
              style={{ width: `${Math.min(100, u * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`text-[10px] font-bold ${rb.className}`}>
            avg risk {state.avg_risk_score?.toFixed?.(1) ?? state.avg_risk_score}
          </Badge>
          <span className="text-[10px] font-semibold text-primary flex items-center">
            Dossier <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </Card>
    </BlurFade>
  );
}

function StateDossier({ _state, profile, isLoading, onOpenMP }) {
  if (isLoading || !profile) {
    return (
      <div className="space-y-3 py-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
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
            <span className="text-lg font-black font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" /> Top MPs by Works
          </h4>
          <div className="space-y-1.5">
            {profile.top_mps?.slice(0, 6).map((m) => (
              <button
                key={m.mp_name}
                onClick={() => onOpenMP(m.mp_name)}
                className="w-full text-left text-xs p-2 rounded-lg border bg-card hover:border-primary/40 hover:bg-accent/60 transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate font-medium">{m.mp_name}</span>
                <span className="font-mono text-muted-foreground shrink-0">{formatNumber(m.works_count)} works</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Implementing Agencies
          </h4>
          <div className="space-y-1.5">
            {profile.agency_breakdown?.slice(0, 6).map((a) => (
              <div key={a.name} className="text-xs p-2 rounded-lg border bg-card flex items-center justify-between gap-2">
                <span className="truncate">{a.name}</span>
                <span className="font-mono text-muted-foreground shrink-0">{formatNumber(a.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Work Categories</h4>
        <div className="space-y-1.5">
          {profile.category_breakdown?.map((c) => (
            <div key={c.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-accent/60">
              <span className="truncate">{c.name}</span>
              <span className="font-mono text-muted-foreground shrink-0">
                {formatNumber(c.count)} · ₹{formatNumber(Math.round((c.total_sanctioned || 0) / 1e7))} Cr
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StatesView({ house, onOpenMP }) {
  const [states, setStates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({ page_size: '100' });
    if (house) params.append('house', house);
    if (search) params.append('search', search);
    apiFetch(`/api/states?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setStates(d.items || []))
      .catch((err) => console.error('States failed:', err))
      .finally(() => setIsLoading(false));
  }, [house, search]);

  useEffect(() => {
    if (!selectedState) return;
    setProfileLoading(true);
    const qs = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/states/${encodeURIComponent(selectedState)}${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setProfile)
      .catch((err) => console.error('State profile failed:', err))
      .finally(() => setProfileLoading(false));
  }, [selectedState, house]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold font-[Outfit] tracking-tight">States</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fund utilization and risk concentration by state
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search states..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {states.map((s, idx) => (
            <StateCard key={s.state} state={s} rank={idx} onOpen={setSelectedState} />
          ))}
        </div>
      )}

      <Dialog open={!!selectedState} onOpenChange={(o) => !o && setSelectedState(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {selectedState}
            </DialogTitle>
          </DialogHeader>
          <StateDossier
            state={selectedState}
            profile={profile}
            isLoading={profileLoading}
            onOpenMP={(mp) => onOpenMP(mp)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
