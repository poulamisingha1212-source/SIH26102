import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, UserCheck, AlertTriangle,
  Building, MapPin, CheckCircle2, Clock, FileText,
  ExternalLink, ChevronRight, Search, Landmark,
  TrendingUp, Wallet, ArrowUpRight, MessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR, formatNumber } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import CitizenProblemsView from './CitizenProblemsView';

export default function DistrictAuditorDashboard({
  userProfile = {},
  currentRole = 'District Authority Auditor',
  onSelectWork = null,
  onOpenMP = null,
}) {
  const constituency = userProfile?.constituency || 'Kota';
  const state = userProfile?.state || 'Rajasthan';

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAuditorTab, setActiveAuditorTab] = useState('overview'); // 'overview' | 'problems' | 'works'

  useEffect(() => {
    setIsLoading(true);
    apiFetch(`/api/dashboard/constituency?constituency=${encodeURIComponent(constituency)}&state=${encodeURIComponent(state)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load constituency dashboard');
        return res.json();
      })
      .then((data) => {
        setDashboardData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching auditor dashboard data:', err);
        setIsLoading(false);
      });
  }, [constituency, state]);

  const stats = dashboardData?.stats || dashboardData || {};
  const mp = dashboardData?.mp || {};
  const highRiskWorks = dashboardData?.high_risk_works || [];
  const problemsSummary = dashboardData?.problems_summary || {};

  return (
    <div className="space-y-6">
      {/* Auditor Jurisdiction Notice Banner */}
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-linear-to-r from-indigo-500/10 via-slate-50 to-amber-500/10 dark:from-indigo-950/40 dark:via-slate-900 dark:to-amber-950/30 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                District Authority Auditor Desk
              </h2>
              <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs px-2.5 py-0.5 font-semibold">
                District Scoped Audit
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Assigned Jurisdiction: <strong className="text-slate-900 dark:text-slate-200">{constituency} District</strong> ({state}). Access restricted exclusively to local constituency works and MP oversight under MPLADS audit regulations.
            </p>
          </div>

          {/* Tab Navigation inside Auditor Desk */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveAuditorTab('overview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeAuditorTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400'
              }`}
            >
              Auditor Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveAuditorTab('problems')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeAuditorTab === 'problems'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Citizen Problems ({problemsSummary?.total ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAuditorTab('works')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeAuditorTab === 'works'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Flagged Works ({stats?.high_risk_count ?? 0})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Local District KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Works In Jurisdiction</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? <Skeleton className="h-8 w-16" /> : formatNumber(stats.total_works || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Local projects in {constituency}</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Sanctioned Funds</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? <Skeleton className="h-8 w-20" /> : `₹${((stats.total_sanctioned_amount || stats.total_sanctioned || 0) / 1e7).toFixed(2)} Cr`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Authorized by District Collector</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">High-Risk Audit Backlog</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-14" /> : formatNumber(stats.high_risk_count || 0)}
          </div>
          <p className="text-[11px] text-rose-600/80 mt-1">Requires physical verification</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Citizen Grievances</span>
            <MessageSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {isLoading ? <Skeleton className="h-8 w-14" /> : formatNumber(problemsSummary.pending || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {problemsSummary.action_initiated || 0} in progress • {problemsSummary.resolved || 0} resolved
          </p>
        </Card>
      </div>

      {/* Main Content by Tab */}
      {activeAuditorTab === 'overview' && (
        <div className="space-y-6">
          {/* Section: MPs of this Constituency */}
          <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 py-3.5 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <CardTitle className="text-sm font-bold font-display text-slate-900 dark:text-slate-100">
                    Elected Representatives (MPs) of {constituency} Constituency
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border-indigo-200">
                  Local Jurisdictional MP
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                        {mp.name || 'Shri Kota Representative'}
                      </h4>
                      <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 text-slate-700">
                        {mp.house || '18th Lok Sabha'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Party: <strong>{mp.party || 'Bharatiya Janata Party'}</strong></span>
                      <span>•</span>
                      <span>Constituency: <strong>{constituency} ({state})</strong></span>
                      <span>•</span>
                      <span>Term: {mp.terms || '2024–present'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Official Contact: {mp.email || 'mp.office@sansad.nic.in'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 flex-wrap">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Constituency Works</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                      {formatNumber(stats.total_works || 0)} projects
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Fund Utilization</div>
                    <div className="text-sm font-bold font-mono text-emerald-600">
                      {stats.utilization_pct ?? 52.2}%
                    </div>
                  </div>
                  {onOpenMP && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenMP(mp.name || 'Shri Kota Representative')}
                      className="h-8 px-3 text-xs rounded-xl text-indigo-700 hover:bg-indigo-50 border-indigo-200 cursor-pointer"
                    >
                      <span>Inspect MP Ledger</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: High-Risk Works in District */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <CardTitle className="text-sm font-bold font-display text-slate-900 dark:text-slate-100">
                  Priority Audit Queue — {constituency} District
                </CardTitle>
              </div>
              <span className="text-xs text-slate-500">
                {highRiskWorks.length} high-risk works flagged by risk model
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Work ID & Description</th>
                      <th className="py-2.5 px-4">Sanctioned</th>
                      <th className="py-2.5 px-4">Risk Score</th>
                      <th className="py-2.5 px-4">Audit Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {highRiskWorks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No high-risk works currently pending audit in {constituency}.
                        </td>
                      </tr>
                    ) : (
                      highRiskWorks.map((w) => (
                        <tr key={w.work_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 max-w-sm">
                            <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100 block">
                              {w.work_id}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {w.work_description}
                            </span>
                            <span className="text-[10px] text-slate-400">{w.work_category}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                            {formatINR(w.sanctioned_amount)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700 border border-rose-200">
                              {w.risk_score} / 100
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-800">
                              {w.human_review_outcome || 'Pending Field Audit'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectWork && onSelectWork(w.work_id)}
                              className="h-7 px-2.5 text-xs rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                            >
                              Inspect Case Packet
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

          {/* Section: Problems Raised by the People (Preview on Overview) */}
          <div className="pt-2">
            <CitizenProblemsView
              constituency={constituency}
              state={state}
              currentRole={currentRole}
              loggedInUser={userProfile?.username || 'District Auditor'}
              onOpenWork={onSelectWork}
            />
          </div>
        </div>
      )}

      {/* Full Citizen Problems Tab */}
      {activeAuditorTab === 'problems' && (
        <CitizenProblemsView
          constituency={constituency}
          state={state}
          currentRole={currentRole}
          loggedInUser={userProfile?.username || 'District Auditor'}
          onOpenWork={onSelectWork}
        />
      )}

      {/* Flagged Works Full Tab */}
      {activeAuditorTab === 'works' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-2xs">
          <CardHeader className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold font-display text-slate-900 dark:text-slate-100">
              High-Risk Works Audit Backlog — {constituency} District
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Work ID</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Sanctioned</th>
                    <th className="py-2.5 px-4">Risk Score</th>
                    <th className="py-2.5 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {highRiskWorks.map((w) => (
                    <tr key={w.work_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold">{w.work_id}</td>
                      <td className="py-3 px-4 max-w-xs">{w.work_description}</td>
                      <td className="py-3 px-4">{w.work_category}</td>
                      <td className="py-3 px-4 font-mono">{formatINR(w.sanctioned_amount)}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-600">{w.risk_score}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectWork && onSelectWork(w.work_id)}
                          className="h-7 text-xs text-indigo-700 border-indigo-200 cursor-pointer"
                        >
                          Audit Packet
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
