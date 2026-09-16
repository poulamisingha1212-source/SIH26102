import React, { useState, useEffect } from 'react';
import {
  AlertCircle, Search, ChevronLeft, ChevronRight, ExternalLink,
  User, MapPin, Building2, CheckCircle2, X, FileDown, ListChecks,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BlurFade } from '@/components/magicui/blur-fade';
import { formatINR, formatNumber, tierBadgeClass, scoreColorClass } from '@/lib/format';

const FILTER_CHIP_DEFS = [
  { key: 'mp_name', label: 'MP' },
  { key: 'state', label: 'State' },
  { key: 'risk_tier', label: 'Tier' },
  { key: 'work_category', label: 'Category' },
  { key: 'search', label: 'Search' },
];

const RISK_TIERS = ["High Risk - Review", "Medium Risk - Monitor", "Low Risk"];

export default function PriorityQueue({
  works,
  totalWorks,
  page,
  pageSize,
  totalPages,
  onPageChange,
  filters,
  onFilterChange,
  filterOptions,
  onSelectWork,
  isLoading,
  activeFilterCount = 0,
  house
}) {
  // Local input state so keystrokes don't fire a query per character.
  const [searchInput, setSearchInput] = useState(filters.search || '');

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) onFilterChange('search', searchInput);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const exportUrl = () => {
    const params = new URLSearchParams({ sort_by: 'priority_rank', order: 'asc', row_limit: '50000' });
    if (house) params.append('house', house);
    if (filters.state) params.append('state', filters.state);
    if (filters.mp_name) params.append('mp_name', filters.mp_name);
    if (filters.risk_tier) params.append('risk_tier', filters.risk_tier);
    if (filters.work_category) params.append('work_category', filters.work_category);
    if (filters.search) params.append('search', filters.search);
    return `/api/export/works?${params.toString()}`;
  };

  return (
    <div className="space-y-5">

      {/* Control bar */}
      <Card className="glass-panel gap-0 rounded-2xl py-0 overflow-hidden">
        <div className="p-6 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary text-[11px]">
                <ListChecks className="w-3 h-3" />
                Default Audit Queue
              </Badge>
              <span className="text-xs text-muted-foreground">
                Showing {formatNumber(((page - 1) * pageSize) + 1)} - {formatNumber(Math.min(page * pageSize, totalWorks))} of {formatNumber(totalWorks)} works
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-1.5">
              Priority Audit Queue
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ranked by the unified risk index (likelihood × impact). High-priority works carry evidence-grounded causes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center flex flex-col justify-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold leading-none">Per Page</span>
              <span className="text-xs font-bold text-slate-700 font-mono mt-0.5 leading-none">{pageSize}</span>
            </div>
            <div className="h-10 px-3 rounded-xl bg-primary/5 border border-primary/20 text-center flex flex-col justify-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold leading-none">Page</span>
              <span className="text-xs font-bold text-primary font-mono mt-0.5 leading-none">{page} / {totalPages || 1}</span>
            </div>
            <Button asChild variant="outline" className="h-10 px-3.5 rounded-xl border-emerald-200/90 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 text-xs font-semibold gap-1.5 shadow-2xs">
              <a href={exportUrl()} title="Download the current filtered view as a CSV open-data file">
                <FileDown className="w-3.5 h-3.5" />
                Export CSV
              </a>
            </Button>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-5">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search Work ID, vendor, or work type..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filters.risk_tier || "ALL"} onValueChange={(v) => onFilterChange('risk_tier', v === "ALL" ? '' : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Risk Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Risk Tiers</SelectItem>
              {RISK_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>{tier}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.state || "ALL"} onValueChange={(v) => onFilterChange('state', v === "ALL" ? '' : v)}>
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

          <Select value={filters.work_category || "ALL"} onValueChange={(v) => onFilterChange('work_category', v === "ALL" ? '' : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {filterOptions?.categories?.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-5 pt-4 border-t">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Filters:
            </span>
            {FILTER_CHIP_DEFS.map(({ key, label }) =>
              filters[key] ? (
                <Badge key={key} variant="outline" className="gap-1.5 py-1 border-primary/30 bg-primary/5 text-accent-foreground">
                  <span className="text-[10px] uppercase font-bold text-primary">{label}</span>
                  <span className="max-w-[220px] truncate font-medium">{filters[key]}</span>
                  <button
                    onClick={() => onFilterChange(key, '')}
                    className="text-primary/70 hover:text-white transition-colors"
                    title={`Clear ${label} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ) : null
            )}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => FILTER_CHIP_DEFS.forEach(({ key }) => filters[key] && onFilterChange(key, ''))}
            >
              Clear all
            </Button>
          </div>
        )}
      </Card>

      {/* Work cases list */}
      {isLoading ? (
        <div className="space-y-3.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-panel rounded-2xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <Skeleton className="w-[54px] h-[54px] rounded-xl" />
                  <Skeleton className="w-[62px] h-[54px] rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="flex gap-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-5 w-28 rounded-full" /></div>
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-80" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full lg:max-w-sm rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : works.length === 0 ? (
        <Card className="glass-panel p-16 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No works matched your filter criteria</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Try resetting filters or adjusting search keywords to inspect other records across the portfolio.
          </p>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {works.map((work, idx) => (
            <BlurFade key={work.work_id} delay={Math.min(idx * 0.025, 0.3)}>
              <Card
                onClick={() => onSelectWork(work.work_id)}
                className="glass-card p-5 rounded-2xl cursor-pointer group hover:bg-accent/40 transition-all duration-200 py-0"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                  {/* Rank, score & identification */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center min-w-[54px] p-2 rounded-xl bg-muted/70 border">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Rank</span>
                      <span className="text-lg font-black text-primary">#{work.priority_rank}</span>
                    </div>

                    <div className={`flex flex-col items-center justify-center min-w-[62px] p-2 rounded-xl border ${scoreColorClass(work.final_risk_score)}`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Risk</span>
                      <span className="text-lg font-black">{work.final_risk_score}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold bg-muted/80 px-2 py-0.5 rounded border">
                          {work.work_id}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${tierBadgeClass(work.risk_tier)}`}>
                          {work.risk_tier}
                        </span>
                        {work.human_review_outcome && (
                          <Badge variant="outline" className="gap-1 py-0 border-purple-200 bg-purple-50 text-purple-700 text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Reviewed: {work.human_review_outcome}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <User className="w-3.5 h-3.5" />
                          {work.mp_name || 'MP Not Specified'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {work.constituency ? `${work.constituency}, ` : ''}{work.state}
                        </span>
                        {work.primary_vendor && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            Vendor: <strong className="text-foreground font-medium">{work.primary_vendor}</strong>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1 italic pt-0.5">
                        {work.work_type || 'Civil / Construction Work'}
                      </p>
                    </div>
                  </div>

                  {/* Explainability preview */}
                  <div className="lg:max-w-md xl:max-w-lg bg-muted/50 p-3 rounded-xl border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Key Detection Causes:
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {work.rule_flag_count} signal{work.rule_flag_count !== 1 ? 's' : ''} triggered
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-foreground/90">
                      {work.causes && work.causes.length > 0 ? (
                        work.causes.slice(0, 2).map((cause, i) => (
                          <div key={i} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-primary font-bold">•</span>
                            <span className="line-clamp-1">{cause}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Routine administrative monitoring</span>
                      )}
                      {work.causes && work.causes.length > 2 && (
                        <span className="text-[10px] text-primary hover:underline block pt-0.5">
                          +{work.causes.length - 2} more evidence factors in Case Packet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial context & action */}
                  <div className="flex items-center justify-between lg:justify-end gap-5 pt-2 lg:pt-0 border-t lg:border-t-0">
                    <div className="text-right">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                        Sanctioned
                      </span>
                      <span className="text-base font-bold font-mono">
                        {formatINR(work.sanction_amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Disbursed: {formatINR(work.total_fund_disbursed)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWork(work.work_id);
                      }}
                      className="group-hover:scale-105 transition-transform"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                </div>
              </Card>
            </BlurFade>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong> ({formatNumber(totalWorks)} total records)
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <Button
              variant={page === 1 ? 'default' : 'outline'}
              size="sm"
              className="w-9 px-0"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>

            {page > 3 && <span className="text-muted-foreground text-xs">…</span>}

            {page > 1 && page < totalPages && (
              <Button variant="default" size="sm" className="w-9 px-0">{page}</Button>
            )}

            {page < totalPages - 2 && <span className="text-muted-foreground text-xs">…</span>}

            <Button
              variant={page === totalPages ? 'default' : 'outline'}
              size="sm"
              className="w-9 px-0"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

    </div>
  );
}
