import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Database, RefreshCw, Download,
  TrendingUp, AlertTriangle, Building, Landmark, CheckCircle2,
  Clock, ArrowUpRight, Search, FileText, Globe, Layers, Activity
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR, formatNumber } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminDashboard({
  stats,
  house,
  syncStatus,
  onTriggerSync,
  isSyncing,
  onSelectWork,
  onFilterByEntity,
  onNavigateTab,
}) {
  const [highRiskWorks, setHighRiskWorks] = useState([]);
  const [statesAnalytics, setStatesAnalytics] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch top high-risk works requiring MoSPI intervention
  useEffect(() => {
    setIsLoadingQueue(true);
    const qs = house ? `&house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/works?risk_tier=High%20Risk%20-%20Review&page_size=8&sort_by=priority_rank&order=asc${qs}`)
      .then((res) => res.json())
      .then((data) => {
        setHighRiskWorks(data.items || []);
        setIsLoadingQueue(false);
      })
      .catch((err) => {
        console.error('Failed to fetch admin high risk works:', err);
        setIsLoadingQueue(false);
      });
  }, [house]);

  // Fetch state-level risk and audit rankings
  useEffect(() => {
    const qs = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/analytics/states${qs}`)
      .then((res) => res.json())
      .then((data) => setStatesAnalytics(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch((err) => console.error('Failed to load state analytics for admin:', err));
  }, [house]);

  const [localStats, setLocalStats] = useState(stats);

  useEffect(() => {
    if (stats) {
      setLocalStats(stats);
    }
    // Always ensure fresh national stats on mount or house change
    const qs = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/stats/overview${qs}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setLocalStats(data);
      })
      .catch((err) => console.error('Failed to load admin overview stats:', err));
  }, [stats, house]);

  // Master CSV Export handler
  const handleExportCSV = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating national audit ledger CSV export…');
    try {
      const res = await apiFetch('/api/export/csv');
      if (!res.ok) {
        throw new Error('Export generation failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MoSPI_MPLADS_Master_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('National Audit Ledger downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error('Export failed — check backend availability', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const activeStats = localStats || stats || {};
  const totalWorks = activeStats.total_works || 0;
  const highRiskCount = activeStats.high_risk_count || 0;
  const reviewedCount = activeStats.reviewed_works ?? activeStats.reviewed_count ?? 0;
  const auditComplianceRate = totalWorks > 0 ? ((reviewedCount / totalWorks) * 100).toFixed(1) : 0;
  const totalSanctioned = activeStats.total_sanctioned_amount ?? activeStats.total_sanctioned ?? 0;
  const totalDisbursed = activeStats.total_disbursed_amount ?? activeStats.total_disbursed ?? 0;
  const totalAllocated = activeStats.total_allocated_amount ?? activeStats.total_allocated ?? 0;
  const nationalUtilization = activeStats.fund_utilization_pct ?? (totalSanctioned > 0 ? ((totalDisbursed / totalSanctioned) * 100).toFixed(1) : 0);
  const unspentBalance = Math.max(0, totalSanctioned - totalDisbursed);

  return (
    <div className="space-y-6">

      {/* MoSPI Executive Administration Command Header */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-950/80 bg-gradient-to-r from-rose-500/10 via-slate-50 to-amber-500/10 dark:from-rose-950/30 dark:via-slate-900 dark:to-amber-950/20 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                <Landmark className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                MoSPI National Audit & Anomaly Command Center
              </h2>
              <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-2.5 py-0.5 font-semibold">
                MoSPI Executive Admin
              </Badge>
              <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-200">
                {house || 'All Houses / Terms'}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl">
              National oversight authority over all 543 Parliamentary Constituencies, State Nodal Departments, statutory prohibition enforcement, and continuous ingestion pipeline synchronization with mplads.mospi.gov.in.
            </p>
          </div>

          {/* Quick Administrative Action Desk */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {onTriggerSync && (
              <Button
                onClick={() => onTriggerSync('live')}
                disabled={isSyncing}
                className="h-9 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing Ingestion…' : 'Sync Live Portal Data'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="h-9 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs gap-2 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 text-indigo-600 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>Export Master Ledger</span>
            </Button>
          </div>
        </div>

        {/* Live System Ingestion Telemetry Strip */}
        <div className="mt-4 pt-3.5 border-t border-rose-100 dark:border-rose-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <span className={`w-2 h-2 rounded-full ${syncStatus?.is_data_stale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span>Portal Feed: {syncStatus?.is_data_stale ? 'Stale (Sync Advised)' : 'Live & Synchronized'}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-600 dark:text-slate-400">
              Last Ingestion: <strong className="text-slate-800 dark:text-slate-200 font-mono">{syncStatus?.last_sync_time ? new Date(syncStatus.last_sync_time).toLocaleTimeString('en-IN') : 'Recent'}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-600 dark:text-slate-400">
              Database Records: <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatNumber(totalWorks)}</strong> works indexed
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>MongoDB Multi-Agent Sentinel v3.2</span>
          </div>
        </div>
      </div>

      {/* National Financial & Risk KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">National Sanctioned</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatINR(totalSanctioned)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Authorized across 543 Constituencies</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Disbursed</span>
            <Building className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatINR(totalDisbursed)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            National Utilization: <strong className="font-mono text-emerald-600">{nationalUtilization}%</strong>
          </p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Idle / Unspent Outlay</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(unspentBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Committed funds awaiting voucher claim</p>
        </Card>

        <Card className="p-4 border-rose-200 dark:border-rose-900/60 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold">High Risk Anomaly Flags</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {formatNumber(highRiskCount)}
          </div>
          <p className="text-[11px] text-rose-700/80 mt-1">
            Requires District Collector Inquiry
          </p>
        </Card>
      </div>

      {/* Statutory Prohibition Violation Framework Alert Strip */}
      <Card className="p-5 border-amber-200 dark:border-amber-900/80 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>MPLADS Revised 2023 Statutory Prohibition Rules Enforced</span>
          </div>
          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 text-[11px]">
            Automated Rule Engine Active
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">MPLADS23-FIN-001</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Prohibits fund disbursement prior to formal Administrative Sanction order.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">MPLADS23-FIN-002</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Flags expenditure exceeding sanctioned estimate by &gt;10% without revised sanction.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">MPLADS23-TIM-001</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Mandatory 45-day decision window on MP recommendations to prevent intentional delay.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">MPLADS23-FIN-004</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Strict ₹50 Lakh lifetime ceiling on private trust and society infrastructure grants.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Grid: Priority Anomalies Needing MoSPI Escalation + State Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Critical Flagged Works Requiring Immediate MoSPI Action */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Critical Priority Anomalies Requiring MoSPI Escalation
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Top-ranked works flagged by specialist agents for statutory violations or anomalous fund releases
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab && onNavigateTab('queue')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 h-8 gap-1 cursor-pointer"
              >
                <span>View All Queue</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Work ID & Details</th>
                      <th className="py-2.5 px-4">Constituency & State</th>
                      <th className="py-2.5 px-4">Sanctioned</th>
                      <th className="py-2.5 px-4">Risk Score</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingQueue ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                          <span>Loading national priority queue…</span>
                        </td>
                      </tr>
                    ) : highRiskWorks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Zero statutory anomalies detected under current filters.
                        </td>
                      </tr>
                    ) : (
                      highRiskWorks.map((w) => (
                        <tr key={w.work_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                              {w.work_id}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5" title={w.work_description || w.work_type}>
                              {w.work_description || w.work_type || 'Community Development'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Vendor: {w.primary_vendor || 'Assigned Agency'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {w.constituency || 'National'}
                            </span>
                            <span className="text-[11px] text-slate-500">{w.state}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatINR(w.sanction_amount || w.sanctioned_amount)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700 border border-rose-200">
                              Risk {w.final_risk_score || w.risk_score}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectWork && onSelectWork(w.work_id)}
                              className="h-7 px-2.5 text-xs rounded-lg text-rose-700 border-rose-200 hover:bg-rose-50 cursor-pointer"
                            >
                              Inspect Packet
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: State Risk & Anomaly Concentration Ranking */}
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  State Anomaly Density
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Top states by flagged risk volume</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab && onNavigateTab('states')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 h-8 gap-1 cursor-pointer"
              >
                <span>All States</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {statesAnalytics.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading state rankings…</div>
                ) : (
                  statesAnalytics.map((st, idx) => (
                    <div
                      key={st.state || idx}
                      onClick={() => onFilterByEntity && onFilterByEntity('state', st.state)}
                      className="p-3.5 px-5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-4">{idx + 1}.</span>
                          {st.state}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {formatNumber(st.works_count || 0)} works • {formatINR(st.total_sanctioned || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center font-mono font-bold text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          {st.high_risk_count || 0} Flagged
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
