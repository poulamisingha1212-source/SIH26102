import React, { useState, useEffect } from 'react';
import {
  Landmark, Building, Users, AlertTriangle, CheckCircle2,
  TrendingUp, Wallet, MessageSquare, Send, Calendar,
  MapPin, Clock, ArrowUpRight, Award, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { formatINR, formatNumber } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import CitizenProblemsView from './CitizenProblemsView';

export default function MPDashboard({
  userProfile = {},
  currentRole = 'Member of Parliament',
  onSelectWork = null,
}) {
  const mpName = userProfile?.mp_name || 'Shri Kota Representative';
  const constituency = userProfile?.constituency || 'Kota';
  const state = userProfile?.state || 'Rajasthan';

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMPTab, setActiveMPTab] = useState('grievances'); // 'grievances' | 'works' | 'utilization'

  useEffect(() => {
    setIsLoading(true);
    apiFetch(`/api/dashboard/constituency?constituency=${encodeURIComponent(constituency)}&state=${encodeURIComponent(state)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load constituency data');
        return res.json();
      })
      .then((data) => {
        setDashboardData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching MP dashboard data:', err);
        setIsLoading(false);
      });
  }, [constituency, state]);

  const stats = dashboardData?.stats || dashboardData || {};
  const mp = dashboardData?.mp || {};
  const highRiskWorks = dashboardData?.high_risk_works || [];
  const problemsSummary = dashboardData?.problems_summary || {};
  const utilizationPct = stats.utilization_pct ?? 52.2;

  return (
    <div className="space-y-6">
      {/* MP Identity & Constituency Banner */}
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-linear-to-r from-indigo-600/10 via-slate-50 to-emerald-600/10 dark:from-indigo-950/40 dark:via-slate-900 dark:to-emerald-950/20 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Landmark className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                  {mpName}
                </h2>
                <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2.5 py-0.5 font-semibold">
                  MP Portal
                </Badge>
                <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-200">
                  {mp.house || '18th Lok Sabha'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                <span>Constituency: <strong className="text-slate-900 dark:text-slate-200">{constituency}</strong> ({state})</span>
                <span>•</span>
                <span>Party: <strong>{mp.party || 'Bharatiya Janata Party'}</strong></span>
                <span>•</span>
                <span>Term: {mp.terms || '2024–present'}</span>
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMPTab('grievances')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMPTab === 'grievances'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Constituent Problems ({problemsSummary?.total ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMPTab('works')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMPTab === 'works'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Sanctioned Works ({stats?.total_works ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMPTab('utilization')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMPTab === 'utilization'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Fund Utilization</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Works Recommended</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? <Skeleton className="h-8 w-16" /> : formatNumber(stats.total_works || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Recommended in {constituency}</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Sanctioned</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? <Skeleton className="h-8 w-20" /> : `₹${formatNumber(Math.round((stats.total_sanctioned_amount || 0) / 1e7))} Cr`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sanctioned via District Collector</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Disbursed</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-20" /> : `₹${formatNumber(Math.round((stats.total_disbursed_amount || 0) / 1e7))} Cr`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Payments disbursed to vendors</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Constituent Issues</span>
            <MessageSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {isLoading ? <Skeleton className="h-8 w-14" /> : formatNumber(problemsSummary.total || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {problemsSummary.pending || 0} pending • {problemsSummary.action_initiated || 0} responded
          </p>
        </Card>
      </div>

      {/* Tab: Grievances Raised by the People (Default and primary for MP) */}
      {activeMPTab === 'grievances' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
            <Send className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-xs text-indigo-950 dark:text-indigo-200">
              <strong className="font-semibold block mb-0.5">MP Official Response Protocol:</strong>
              As the elected representative for {constituency}, you can review each constituent issue below, click <strong>"Dispatch MP Official Reply"</strong>, and provide executive directives or status updates. Your response is published transparently on the citizen grievance ledger.
            </div>
          </div>

          <CitizenProblemsView
            constituency={constituency}
            state={state}
            currentRole={currentRole}
            loggedInUser={mpName}
            onOpenWork={onSelectWork}
          />
        </div>
      )}

      {/* Tab: Works Recommended */}
      {activeMPTab === 'works' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-2xs">
          <CardHeader className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold font-display text-slate-900 dark:text-slate-100">
                Recommended Works in {constituency} Constituency
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of projects funded under the MP's annual entitlement
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {highRiskWorks.length} Critical Items
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Work ID & Details</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Sanctioned Amount</th>
                    <th className="py-2.5 px-4">Priority Risk Tier</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {highRiskWorks.map((w) => (
                    <tr key={w.work_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 max-w-sm">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                          {w.work_id}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {w.work_description}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                          {w.work_category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {formatINR(w.sanctioned_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700 border border-rose-200">
                          Risk Score {w.risk_score}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectWork && onSelectWork(w.work_id)}
                          className="h-7 px-2.5 text-xs rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                        >
                          View Details
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

      {/* Tab: Fund Utilization Details */}
      {activeMPTab === 'utilization' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h4 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Expenditure vs Sanction Ratio
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Fund Utilization Rate</span>
                <span className="font-bold font-mono text-emerald-600">{utilizationPct}%</span>
              </div>
              <Progress value={Math.min(utilizationPct, 100)} className="h-3" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Represents disbursed contractor vouchers against authorized administrative sanctions in {constituency}.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[11px]">Total Sanctioned</span>
                <strong className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  ₹{formatNumber(Math.round((stats.total_sanctioned_amount || 0) / 1e7))} Cr
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">Disbursed</span>
                <strong className="text-sm font-bold font-mono text-emerald-800 dark:text-emerald-200">
                  ₹{formatNumber(Math.round((stats.total_disbursed_amount || 0) / 1e7))} Cr
                </strong>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h4 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Constituency Oversight Checklist
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Quarterly coordination meeting completed with District Collector.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Zero pending sanction requisitions past 45-day statutory limit.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{problemsSummary.pending || 0} constituent complaints awaiting MP response.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{stats.high_risk_count || 0} works flagged for audit documentation review.</span>
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
