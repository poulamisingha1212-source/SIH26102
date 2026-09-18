import React, { useState, useMemo, useRef } from 'react';
import {
  MapPin, Users, TrendingUp, AlertTriangle, ShieldCheck,
  ChevronRight, ZoomIn, ZoomOut, RotateCcw, Info, Filter,
  Scale, Check, Sparkles, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber, scoreColorClass } from '@/lib/format';
import { INDIA_MAP_DATA } from '@/data/indiaMapData';

const PALETTE = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981'];

// Color calculation based on user requirement:
// - Orange if utilization rate is above 70%
// - Green if utilization rate is above 50 and under 70 (50% to 70%)
// - Red if utilization percentage is under 50%
function getUtilizationColor(utilRate, hasData = true) {
  if (!hasData || utilRate === undefined || utilRate === null) {
    return '#cbd5e1'; // Neutral slate/gray for states without active records
  }
  const pct = utilRate <= 1.0 ? utilRate * 100 : utilRate;
  if (pct > 70) {
    return '#f97316'; // Orange: > 70%
  }
  if (pct >= 50) {
    return '#16a34a'; // Green: 50% - 70%
  }
  return '#dc2626'; // Red: < 50%
}

function getUtilizationBadge(utilRate, hasData = true) {
  if (!hasData || utilRate === undefined || utilRate === null) {
    return {
      label: 'No Data',
      color: '#cbd5e1',
      badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
    };
  }
  const pct = utilRate <= 1.0 ? utilRate * 100 : utilRate;
  if (pct > 70) {
    return {
      label: '> 70% (High)',
      color: '#f97316',
      badgeClass: 'border-orange-200 bg-orange-50 text-orange-700 font-semibold',
    };
  }
  if (pct >= 50) {
    return {
      label: '50% - 70% (Optimal)',
      color: '#16a34a',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
    };
  }
  return {
    label: '< 50% (Under-utilized)',
    color: '#dc2626',
    badgeClass: 'border-red-200 bg-red-50 text-red-700 font-semibold',
  };
}

function normalizeStateName(name) {
  if (!name) return '';
  const s = name.toLowerCase().trim();
  if (s === 'uttarakhand' || s === 'uttaranchal') return 'uttaranchal';
  if (s === 'orissa' || s === 'odisha') return 'odisha';
  if (s.includes('delhi')) return 'delhi';
  if (s.includes('andaman')) return 'andaman and nicobar';
  if (s.includes('dadra') || s.includes('daman')) return 'dadra and nagar haveli and daman and diu';
  if (s.includes('pondicherry') || s.includes('puducherry')) return 'puducherry';
  if (s.includes('jammu')) return 'jammu and kashmir';
  return s;
}

export default function IndiaMap({
  states = [],
  inspectedState,
  selectedState,
  selectedStateName,
  onInspectState,
  onSelectState,
  onOpenDossier,
  searchQuery = '',
  compareStates = [],
  onToggleCompareState,
}) {
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'high' (>70) | 'mid' (50-70) | 'low' (<50)
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef(null);

  // Map state records by normalized name for O(1) lookups
  const statesMap = useMemo(() => {
    const map = new Map();
    states.forEach((s) => {
      if (s.state) {
        map.set(normalizeStateName(s.state), s);
      }
    });
    return map;
  }, [states]);

  // Unified list of all 36 states and UTs in alphabetical order
  const allStatesList = useMemo(() => {
    const list = INDIA_MAP_DATA.map((item) => {
      const norm = normalizeStateName(item.name);
      const data = statesMap.get(norm);
      return {
        id: item.id,
        name: data?.state || item.name,
        hasData: !!data,
        utilization: data ? (data.avg_utilization || 0) * 100 : null,
        data: data || {
          state: item.name,
          works_count: 0,
          mp_count: 0,
          total_sanctioned: 0,
          total_disbursed: 0,
          avg_utilization: 0,
          avg_risk_score: 0,
          high_risk_count: 0,
          hasNoData: true,
        },
      };
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [statesMap]);

  // Active state to show in the right detail panel:
  // Strictly locked to the inspected state (does not flip when hovering over other states)
  const activeInspectionState = useMemo(() => {
    const target = inspectedState || selectedState || selectedStateName;
    if (target) {
      if (typeof target === 'string') {
        const found = statesMap.get(normalizeStateName(target));
        return found || {
          state: target,
          works_count: 0,
          mp_count: 0,
          total_sanctioned: 0,
          total_disbursed: 0,
          avg_utilization: 0,
          avg_risk_score: 0,
          high_risk_count: 0,
          hasNoData: true,
        };
      }
      return target;
    }
    if (states.length > 0) return states[0];
    return null;
  }, [inspectedState, selectedState, selectedStateName, states, statesMap]);

  // Statistics across active states
  const stats = useMemo(() => {
    let highCount = 0; // > 70%
    let midCount = 0;  // 50% - 70%
    let lowCount = 0;  // < 50%
    let totalUtilSum = 0;

    states.forEach((s) => {
      const u = (s.avg_utilization || 0) * 100;
      totalUtilSum += u;
      if (u > 70) highCount++;
      else if (u >= 50) midCount++;
      else lowCount++;
    });

    const avg = states.length > 0 ? (totalUtilSum / states.length).toFixed(1) : 0;
    return { highCount, midCount, lowCount, avg, total: states.length };
  }, [states]);

  const handleSelectState = (targetState) => {
    if (onInspectState) onInspectState(targetState);
    if (onSelectState) onSelectState(targetState);
  };

  const handleMouseMove = (e, item, data) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredState({ item, data });
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
  };

  const handlePathClick = (item, data) => {
    const targetState = data || {
      state: item.name,
      works_count: 0,
      mp_count: 0,
      total_sanctioned: 0,
      total_disbursed: 0,
      avg_utilization: 0,
      avg_risk_score: 0,
      high_risk_count: 0,
      hasNoData: true,
    };
    handleSelectState(targetState);
  };

  const handleDossierOpen = () => {
    if (!activeInspectionState) return;
    if (onOpenDossier) {
      onOpenDossier(activeInspectionState.state);
    } else if (onSelectState) {
      onSelectState(activeInspectionState);
    }
  };

  const isInspectedCompared = activeInspectionState && compareStates.some(
    (c) => normalizeStateName(c.state) === normalizeStateName(activeInspectionState.state)
  );

  // Reorder SVG paths so the inspected, compared, or hovered state is rendered last (on top)
  const sortedSvgPaths = useMemo(() => {
    return [...INDIA_MAP_DATA].sort((a, b) => {
      const aNorm = normalizeStateName(a.name);
      const bNorm = normalizeStateName(b.name);
      const aIsSpecial =
        (activeInspectionState && normalizeStateName(activeInspectionState.state) === aNorm) ||
        compareStates.some((c) => normalizeStateName(c.state) === aNorm) ||
        hoveredState?.item?.id === a.id;
      const bIsSpecial =
        (activeInspectionState && normalizeStateName(activeInspectionState.state) === bNorm) ||
        compareStates.some((c) => normalizeStateName(c.state) === bNorm) ||
        hoveredState?.item?.id === b.id;

      if (aIsSpecial && !bIsSpecial) return 1;
      if (!aIsSpecial && bIsSpecial) return -1;
      return 0;
    });
  }, [activeInspectionState, compareStates, hoveredState]);

  return (
    <Card className="glass-panel p-5 rounded-xl space-y-4 relative overflow-hidden border border-border/80">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <h3 className="font-bold font-display text-base sm:text-lg tracking-tight text-foreground">
              Interactive State Utilization Map
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
              36 States & UTs
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Color-coded by fund absorption rate. Click any state on the map to inspect its metrics or add it to comparison.
          </p>
        </div>

        {/* Legend buttons with tier filter toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setTierFilter('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              tierFilter === 'all'
                ? 'ring-2 ring-primary bg-primary/10 text-primary font-bold'
                : 'hover:bg-accent/60 bg-card'
            }`}
            title="Show all states"
          >
            <span className="text-[11px] font-medium">All States</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
              {stats.total}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setTierFilter((prev) => (prev === 'high' ? 'all' : 'high'))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              tierFilter === 'high'
                ? 'ring-2 ring-orange-500 bg-orange-100 font-bold dark:bg-orange-950/40'
                : 'hover:bg-accent/60 bg-card'
            }`}
            title="Filter states with utilization above 70%"
          >
            <span className="w-3 h-3 rounded-full bg-[#f97316] shrink-0" />
            <span className="text-[11px] font-medium">Above 70% (Orange)</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
              {stats.highCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setTierFilter((prev) => (prev === 'mid' ? 'all' : 'mid'))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              tierFilter === 'mid'
                ? 'ring-2 ring-emerald-500 bg-emerald-100 font-bold dark:bg-emerald-950/40'
                : 'hover:bg-accent/60 bg-card'
            }`}
            title="Filter states with utilization between 50% and 70%"
          >
            <span className="w-3 h-3 rounded-full bg-[#16a34a] shrink-0" />
            <span className="text-[11px] font-medium">50% – 70% (Green)</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
              {stats.midCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setTierFilter((prev) => (prev === 'low' ? 'all' : 'low'))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              tierFilter === 'low'
                ? 'ring-2 ring-red-500 bg-red-100 font-bold dark:bg-red-950/40'
                : 'hover:bg-accent/60 bg-card'
            }`}
            title="Filter states with utilization under 50%"
          >
            <span className="w-3 h-3 rounded-full bg-[#dc2626] shrink-0" />
            <span className="text-[11px] font-medium">Under 50% (Red)</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
              {stats.lowCount}
            </Badge>
          </button>

          {tierFilter !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2 text-primary"
              onClick={() => setTierFilter('all')}
            >
              Reset filter
            </Button>
          )}
        </div>
      </div>

      {/* Main Map Visual + Quick Inspect Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SVG Map Display */}
        <div
          ref={containerRef}
          className="lg:col-span-8 relative rounded-xl border bg-gradient-to-b from-card to-muted/20 p-2 sm:p-4 flex items-center justify-center min-h-[440px] overflow-hidden"
        >
          {/* Zoom controls */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 bg-card/90 backdrop-blur-sm border rounded-xl p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setZoomLevel(1)}
              title="Reset view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* National Summary & Quick Jump Selector */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {/* Quick State Select Dropdown */}
            <div className="relative">
              <select
                className="bg-card/90 backdrop-blur-sm border rounded-xl px-2.5 py-1 text-xs shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[210px] truncate"
                value={activeInspectionState?.state || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const item = allStatesList.find((s) => s.name === val);
                  if (item) {
                    handleSelectState(item.data);
                  }
                }}
              >
                <option value="" disabled>Jump to State...</option>
                {allStatesList.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} {s.hasData ? `(${s.utilization.toFixed(0)}%)` : '(No works)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border rounded-xl px-2.5 py-1 text-xs shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground text-[11px]">Avg:</span>
              <span className="font-bold font-mono text-primary">{stats.avg}%</span>
            </div>
          </div>

          {/* Interactive SVG */}
          <svg
            viewBox="0 0 1000 1000"
            className="w-full max-w-[650px] h-auto drop-shadow-md select-none transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            <g id="features">
              {sortedSvgPaths.map((item) => {
                const normName = normalizeStateName(item.name);
                const data = statesMap.get(normName);
                const hasData = !!data;
                const util = data ? (data.avg_utilization || 0) * 100 : null;

                // Check tier filter and search query
                let matchesFilter = true;
                if (tierFilter === 'high') matchesFilter = hasData && util > 70;
                else if (tierFilter === 'mid') matchesFilter = hasData && util >= 50 && util <= 70;
                else if (tierFilter === 'low') matchesFilter = hasData && util < 50;

                const searchQ = searchQuery.trim().toLowerCase();
                const matchesSearch =
                  !searchQ ||
                  normName.includes(searchQ) ||
                  (data?.state && data.state.toLowerCase().includes(searchQ));
                const isDimmed = !matchesFilter || !matchesSearch;

                const compIdx = compareStates.findIndex((c) => normalizeStateName(c.state) === normName);
                const isComp = compIdx >= 0;

                const baseColor = getUtilizationColor(data?.avg_utilization, hasData);
                const fillColor = !isDimmed ? baseColor : '#e2e8f0';
                const isHovered = hoveredState?.item?.id === item.id;
                const isInspected =
                  activeInspectionState && normalizeStateName(activeInspectionState.state) === normName;

                return (
                  <path
                    key={item.id}
                    d={item.d}
                    id={item.id}
                    name={item.name}
                    fill={fillColor}
                    stroke={
                      isComp
                        ? PALETTE[compIdx % PALETTE.length]
                        : isInspected
                        ? '#0f172a'
                        : isHovered
                        ? '#1e293b'
                        : '#ffffff'
                    }
                    strokeWidth={isComp ? '3.5' : isInspected ? '2.8' : isHovered ? '2' : '0.8'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="cursor-pointer transition-all duration-150"
                    style={{
                      opacity: !isDimmed ? (isHovered ? 0.92 : 1) : 0.25,
                      filter: isComp
                        ? `drop-shadow(0 0 6px ${PALETTE[compIdx % PALETTE.length]})`
                        : isInspected
                        ? 'drop-shadow(0 0 8px rgba(15, 23, 42, 0.45))'
                        : isHovered
                        ? 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.2))'
                        : undefined,
                    }}
                    onMouseMove={(e) => handleMouseMove(e, item, data)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handlePathClick(item, data)}
                  />
                );
              })}
            </g>
          </svg>

          {/* Floating Tooltip */}
          {hoveredState && (
            <div
              className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-popover/95 text-popover-foreground shadow-2xl border rounded-xl p-3 text-xs w-64 backdrop-blur-md transition-opacity duration-150"
              style={{
                left: `${Math.max(130, Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 500) - 130))}px`,
                top: `${Math.max(90, tooltipPos.y - 12)}px`,
              }}
            >
              <div className="flex items-center justify-between gap-1 border-b pb-1.5 mb-2">
                <span className="font-bold text-sm truncate flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  {hoveredState.item.name}
                </span>
                {hoveredState.data ? (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      getUtilizationBadge(hoveredState.data.avg_utilization, true).badgeClass
                    }`}
                  >
                    {((hoveredState.data.avg_utilization || 0) * 100).toFixed(1)}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                    No Data
                  </Badge>
                )}
              </div>

              {hoveredState.data ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="grid grid-cols-2 gap-1 py-0.5">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Sanctioned</span>
                      <span className="font-mono font-bold">
                        ₹{formatNumber(Math.round((hoveredState.data.total_sanctioned || 0) / 1e7))} Cr
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Disbursed</span>
                      <span className="font-mono font-bold">
                        ₹{formatNumber(Math.round((hoveredState.data.total_disbursed || 0) / 1e7))} Cr
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t text-[10px]">
                    <span className="text-muted-foreground">
                      {hoveredState.data.mp_count} MPs · {formatNumber(hoveredState.data.works_count)} works
                    </span>
                    <span className={`font-mono font-bold ${scoreColorClass(hoveredState.data.avg_risk_score)}`}>
                      risk {hoveredState.data.avg_risk_score?.toFixed?.(1) ?? hoveredState.data.avg_risk_score}
                    </span>
                  </div>
                  <div className="text-[9px] text-primary font-medium text-center pt-1">
                    Click state to pin & inspect →
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  No active works in current portal filter.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Quick Inspect Detail Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" /> State Detail Card
              </span>
              {activeInspectionState?.rank && (
                <span className="text-[10px] font-mono text-muted-foreground border rounded-md px-1.5 py-0.5">
                  Rank #{activeInspectionState.rank}
                </span>
              )}
            </div>

            {activeInspectionState ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-2">
                    {activeInspectionState.state}
                    {isInspectedCompared && (
                      <Badge className="text-[9px] bg-primary/10 text-primary border-primary/30">
                        In Comparison
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeInspectionState.hasNoData ? (
                      'No recorded works under current filter'
                    ) : (
                      `${activeInspectionState.mp_count || 0} MPs · ${formatNumber(activeInspectionState.works_count || 0)} Works recorded`
                    )}
                  </p>
                </div>

                {/* Utilization gauge */}
                <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Fund Utilization Rate</span>
                    <span
                      className="font-mono font-bold"
                      style={{
                        color: getUtilizationColor(activeInspectionState.avg_utilization, !activeInspectionState.hasNoData),
                      }}
                    >
                      {activeInspectionState.hasNoData
                        ? '0.0%'
                        : `${((activeInspectionState.avg_utilization || 0) * 100).toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (activeInspectionState.avg_utilization || 0) * 100)}%`,
                        backgroundColor: getUtilizationColor(activeInspectionState.avg_utilization, !activeInspectionState.hasNoData),
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground">Threshold Status:</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        getUtilizationBadge(activeInspectionState.avg_utilization, !activeInspectionState.hasNoData).badgeClass
                      }`}
                    >
                      {getUtilizationBadge(activeInspectionState.avg_utilization, !activeInspectionState.hasNoData).label}
                    </Badge>
                  </div>
                </div>

                {/* Metric grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border bg-card p-2.5">
                    <span className="text-[10px] uppercase text-muted-foreground block">Sanctioned</span>
                    <span className="font-bold font-mono">
                      ₹{formatNumber(Math.round((activeInspectionState.total_sanctioned || 0) / 1e7))} Cr
                    </span>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5">
                    <span className="text-[10px] uppercase text-muted-foreground block">Disbursed</span>
                    <span className="font-bold font-mono">
                      ₹{formatNumber(Math.round((activeInspectionState.total_disbursed || 0) / 1e7))} Cr
                    </span>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5">
                    <span className="text-[10px] uppercase text-muted-foreground block">High Risk Flags</span>
                    <span className="font-bold font-mono text-red-600">
                      {formatNumber(activeInspectionState.high_risk_count || 0)}
                    </span>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5">
                    <span className="text-[10px] uppercase text-muted-foreground block">Avg Risk Score</span>
                    <span className={`font-bold font-mono ${scoreColorClass(activeInspectionState.avg_risk_score)}`}>
                      {activeInspectionState.avg_risk_score?.toFixed?.(1) ?? (activeInspectionState.avg_risk_score || '0.0')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 text-xs font-semibold rounded-xl gap-1.5 h-9"
                    onClick={handleDossierOpen}
                  >
                    Inspect Dossier
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  {onToggleCompareState && (
                    <Button
                      variant={isInspectedCompared ? "secondary" : "outline"}
                      className={`text-xs font-semibold rounded-xl gap-1.5 h-9 px-3 ${
                        isInspectedCompared ? 'bg-primary/15 text-primary border-primary/40 font-bold' : ''
                      }`}
                      onClick={() => onToggleCompareState(activeInspectionState)}
                      title="Toggle state in side-by-side comparison"
                    >
                      {isInspectedCompared ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          <span>Compared</span>
                        </>
                      ) : (
                        <>
                          <Scale className="w-3.5 h-3.5" />
                          <span>+ Compare</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground space-y-2">
                <MapPin className="w-8 h-8 mx-auto opacity-30 text-primary" />
                <p className="font-medium text-foreground">Click any State on the map</p>
                <p className="text-[11px] max-w-[200px] mx-auto">
                  Click or hover any region on the India map to preview its fund utilization and risk summary.
                </p>
              </div>
            )}
          </div>

          {/* Utilization color rules explanation guide */}
          <div className="rounded-xl border bg-muted/20 p-3.5 text-xs space-y-2">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-primary" /> Utilization Color Rules
            </h5>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f97316] shrink-0" />
                <span className="font-medium">Above 70%:</span>
                <span className="text-muted-foreground">Orange (High fund delivery velocity)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#16a34a] shrink-0" />
                <span className="font-medium">50% – 70%:</span>
                <span className="text-muted-foreground">Green (Optimal steady milestone execution)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#dc2626] shrink-0" />
                <span className="font-medium">Under 50%:</span>
                <span className="text-muted-foreground">Red (Under-utilized / delayed works)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
