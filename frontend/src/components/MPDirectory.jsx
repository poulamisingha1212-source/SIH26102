import React, { useState, useEffect } from 'react';
import {
  Search, ChevronLeft, ChevronRight, ChevronDown, MapPin,
  AlertTriangle, ArrowUpDown, Users, Globe2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { BlurFade } from '@/components/magicui/blur-fade';
import { formatINR, formatNumber } from '@/lib/format';
import { apiFetch } from '@/lib/api';

const SORT_COLUMNS = [
  { key: 'total_sanctioned', label: 'Sanctioned' },
  { key: 'works_count', label: 'Works' },
  { key: 'avg_risk_score', label: 'Avg Risk' },
  { key: 'high_risk_count', label: 'High-Risk' },
  { key: 'avg_utilization', label: 'Utilization' },
  { key: 'name', label: 'MP Name' },
];

export function UtilizationMeter({ ratio }) {
  const pct = Math.round((Number(ratio) || 0) * 100);
  const clamped = Math.max(0, Math.min(pct, 100));
  const barColor =
    pct >= 80 ? '[&>div]:bg-emerald-500'
    : pct >= 50 ? '[&>div]:bg-amber-500'
    : pct > 0 ? '[&>div]:bg-red-500'
    : '[&>div]:bg-slate-600';
  return (
    <div className="flex items-center gap-2">
      <Progress value={clamped} className={`h-2 w-24 ${barColor}`} aria-label={`${pct}% utilized`} />
      <span className={`text-xs font-semibold font-mono ${
        pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
      }`}>
        {pct}%
      </span>
    </div>
  );
}

export default function MPDirectory({
  house, filterOptions, onOpenMP }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sortBy, setSortBy] = useState('total_sanctioned');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce the search box so typing doesn't hammer the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      sort_by: sortBy,
      order,
    });
    if (house) params.append('house', house);
    if (search) params.append('search', search);
    if (stateFilter) params.append('state', stateFilter);

    apiFetch(`/api/mps?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load the MP directory. Is the backend running?');
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [page, search, stateFilter, sortBy, order, house]);

  const handleSortClick = (key) => {
    if (sortBy === key) {
      setOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setOrder(key === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const items = data?.items || [];

  return (
    <div className="space-y-6">

      {/* Header card */}
      <Card className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 text-[11px]">
              <Globe2 className="w-3 h-3" />
              Public Transparency
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight mt-1.5">MP Fund Directory</h2>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Every rupee routed through MPLADS, aggregated per Member of Parliament —
              sanctioned vs disbursed, utilization and audit-risk profile in one view.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-center">
              <span className="text-[11px] text-muted-foreground block">MPs Listed</span>
              {data ? (
                <NumberTickerSoft value={data.total} />
              ) : (
                <span className="text-base font-bold text-sky-400">—</span>
              )}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 text-center">
              <span className="text-[11px] text-muted-foreground block">Page</span>
              <span className="text-base font-bold text-primary font-mono">{page} / {data?.total_pages || 1}</span>
            </div>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-5">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by MP or constituency..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={stateFilter || "ALL"} onValueChange={(v) => { setStateFilter(v === "ALL" ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="ALL">All States</SelectItem>
              {filterOptions?.states?.map((st) => (
                <SelectItem key={st} value={st}>{st}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={`${sortBy}:${order}`} onValueChange={(v) => {
            const [k, o] = v.split(':');
            setSortBy(k); setOrder(o); setPage(1);
          }}>
            <SelectTrigger className="w-full">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_COLUMNS.map((c) => (
                <SelectGroup key={c.key}>
                  <SelectLabel>{c.label}</SelectLabel>
                  <SelectItem value={`${c.key}:desc`}>High → Low</SelectItem>
                  <SelectItem value={`${c.key}:asc`}>Low → High</SelectItem>
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Directory table */}
      {isLoading ? (
        <Card className="glass-panel rounded-2xl p-5 space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg hidden lg:block" />
            </div>
          ))}
        </Card>
      ) : error ? (
        <Card className="glass-panel p-16 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-semibold">{error}</h3>
        </Card>
      ) : items.length === 0 ? (
        <Card className="glass-panel p-16 rounded-2xl text-center space-y-3">
          <Users className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No MPs matched</h3>
          <p className="text-muted-foreground text-sm">Try a different name, constituency or state.</p>
        </Card>
      ) : (
        <BlurFade>
          <Card className="glass-panel rounded-2xl overflow-hidden py-0 gap-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                    <TableHead className="w-12 pl-5">#</TableHead>
                    <TableHead className="min-w-[220px]">Member of Parliament</TableHead>
                    <SortHead label="Sanctioned" colKey="total_sanctioned" sortBy={sortBy} order={order} onClick={handleSortClick} className="text-right" />
                    <TableHead className="text-right hidden lg:table-cell">Disbursed</TableHead>
                    <TableHead>
                      <SortHead label="Utilization" colKey="avg_utilization" sortBy={sortBy} order={order} onClick={handleSortClick} />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortHead label="Works" colKey="works_count" sortBy={sortBy} order={order} onClick={handleSortClick} className="text-right" />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortHead label="Avg Risk" colKey="avg_risk_score" sortBy={sortBy} order={order} onClick={handleSortClick} className="text-right" />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortHead label="High-Risk" colKey="high_risk_count" sortBy={sortBy} order={order} onClick={handleSortClick} className="text-right" />
                    </TableHead>
                    <TableHead className="text-right w-16 pr-5">Profile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((mp) => (
                    <TableRow
                      key={mp.mp_name}
                      onClick={() => onOpenMP(mp.mp_name)}
                      className="cursor-pointer group"
                    >
                      <TableCell className="pl-5 text-muted-foreground font-mono text-xs">{mp.rank}</TableCell>
                      <TableCell>
                        <span className="font-semibold group-hover:text-sky-700 transition-colors block truncate max-w-[260px]">
                          {mp.mp_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {mp.constituency || '—'}{mp.state ? ` • ${mp.state}` : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold font-mono text-xs">{formatINR(mp.total_sanctioned)}</span>
                        <span className="block text-[10px] text-muted-foreground lg:hidden">{formatINR(mp.total_disbursed)} disbursed</span>
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        <span className="font-medium text-foreground/80 font-mono text-xs">{formatINR(mp.total_disbursed)}</span>
                      </TableCell>
                      <TableCell>
                        <UtilizationMeter ratio={mp.avg_utilization} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-foreground/80">{formatNumber(mp.works_count)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`font-mono text-xs ${
                          mp.avg_risk_score >= 70
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : mp.avg_risk_score >= 40
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          {mp.avg_risk_score.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${
                              mp.high_risk_count > 0 ? 'text-red-400' : 'text-muted-foreground/50'
                            }`}>
                              {mp.high_risk_count > 0 && <AlertTriangle className="w-3 h-3" />}
                              {mp.high_risk_count}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{mp.high_risk_count} works flagged High Risk — Review</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-200 text-[11px] opacity-70 group-hover:opacity-100 transition-opacity">
                          View
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data?.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-muted/40">
                <div className="text-xs text-muted-foreground">
                  Page <strong className="text-foreground">{data.page}</strong> of <strong className="text-foreground">{data.total_pages}</strong>
                  {' '}• {formatNumber(data.total)} MPs
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  <Button size="sm" onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page >= data.total_pages}>
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </BlurFade>
      )}
    </div>
  );
}

function SortHead({ label, colKey, sortBy, order, onClick, className = '' }) {
  const active = sortBy === colKey;
  return (
    <button
      onClick={() => onClick(colKey)}
      className={`inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors ${
        active ? 'text-sky-600' : ''
      } ${className}`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${active ? 'text-sky-600' : 'text-muted-foreground/50'}`} />
      {active && <ChevronDown className={`w-3 h-3 transition-transform ${order === 'desc' ? '' : 'rotate-180'}`} />}
    </button>
  );
}

function NumberTickerSoft({ value }) {
  return (
    <span className="text-base font-bold text-sky-700 font-mono tabular-nums">
      {formatNumber(value)}
    </span>
  );
}
