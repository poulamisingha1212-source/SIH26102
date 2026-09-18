import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, AlertCircle, CheckCircle2, Clock, Search,
  Filter, Plus, Send, ShieldAlert, FileText, ArrowRight,
  ExternalLink, User, Calendar, MapPin, Sparkles, X,
  Building, CheckCircle, RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const STATUS_CONFIG = {
  'Pending Review': {
    color: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    icon: Clock,
    dot: 'bg-amber-500'
  },
  'Action Initiated': {
    color: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300',
    icon: Send,
    dot: 'bg-indigo-500'
  },
  'Under Investigation': {
    color: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300',
    icon: AlertCircle,
    dot: 'bg-purple-500'
  },
  'Resolved': {
    color: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    icon: CheckCircle2,
    dot: 'bg-emerald-500'
  },
};

const CATEGORIES = [
  'All Categories',
  'Drinking Water',
  'Roads & Infrastructure',
  'Sanitation & Sewage',
  'Healthcare',
  'Education & Schools',
  'Community Assets',
  'Electricity & Lighting',
];

const MP_REPLY_TEMPLATES = [
  "Inspection scheduled with District Executive Engineer within 7 working days.",
  "Sanction letter requisition submitted to District Collector for immediate action.",
  "Directing implementing agency to expedite pending civil work and report completion.",
  "Supplementary MPLADS grant allocation initiated to resolve this civic bottleneck.",
  "Verified on-site by field staff; corrective rectification works currently underway."
];

export default function CitizenProblemsView({
  constituency = 'Kota',
  state = 'Rajasthan',
  currentRole = 'Read-Only Public Tier',
  loggedInUser = '',
  onOpenWork = null,
  showReportModalButton = true,
}) {
  const [problems, setProblems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Replying state (for MP)
  const [replyingProblemId, setReplyingProblemId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('Action Initiated');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Auditor note state
  const [auditingProblemId, setAuditingProblemId] = useState(null);
  const [auditNoteText, setAuditNoteText] = useState('');
  const [auditStatus, setAuditStatus] = useState('Under Investigation');
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

  // New Grievance Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    category: 'Drinking Water',
    constituency: constituency || 'Kota',
    district: constituency || 'Kota',
    state: state || 'Rajasthan',
    work_id: '',
    citizen_name: '',
    contact: '',
  });
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const fetchProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (constituency) params.append('constituency', constituency);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await apiFetch(`/api/problems?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load problems');
      }
      const data = await res.json();
      setProblems(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Error loading problems:', err);
      toast.error('Unable to fetch citizen problems. Please check backend connection.');
    } finally {
      setIsLoading(false);
    }
  }, [constituency, statusFilter, searchQuery]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Handle MP Reply Submission
  const handleSubmitMPReply = async (problemId) => {
    if (!replyText.trim()) {
      toast.error('Please write an official reply.');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const res = await apiFetch(`/api/problems/${problemId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mp_reply: replyText.trim(),
          status: replyStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit MP reply');
      }

      toast.success('Official reply dispatched successfully!');
      setReplyingProblemId(null);
      setReplyText('');
      fetchProblems();
    } catch (err) {
      console.error('Submit reply failed:', err);
      toast.error(err.message || 'Failed to submit MP reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Handle Auditor Review Submission
  const handleSubmitAuditReview = async (problemId) => {
    if (!auditNoteText.trim()) {
      toast.error('Please write the audit review inspection notes.');
      return;
    }

    setIsSubmittingAudit(true);
    try {
      const res = await apiFetch(`/api/problems/${problemId}/audit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditor_notes: auditNoteText.trim(),
          status: auditStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit audit review');
      }

      toast.success('District Audit inspection record updated!');
      setAuditingProblemId(null);
      setAuditNoteText('');
      fetchProblems();
    } catch (err) {
      console.error('Submit audit note failed:', err);
      toast.error(err.message || 'Failed to submit audit review.');
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  // Handle Citizen New Problem Submission
  const handleCreateProblem = async (e) => {
    e.preventDefault();
    if (!newProblem.title.trim() || !newProblem.description.trim()) {
      toast.error('Please fill in both a title and description.');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const res = await apiFetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProblem),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit grievance');
      }

      toast.success('Grievance logged! Your MP and District Auditor have been notified.');
      setShowCreateModal(false);
      setNewProblem({
        title: '',
        description: '',
        category: 'Drinking Water',
        constituency: constituency || 'Kota',
        district: constituency || 'Kota',
        state: state || 'Rajasthan',
        work_id: '',
        citizen_name: '',
        contact: '',
      });
      fetchProblems();
    } catch (err) {
      console.error('Create problem error:', err);
      toast.error(err.message || 'Failed to record grievance.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const isMP = currentRole === 'Member of Parliament' || currentRole === 'MoSPI Reviewer';
  const isAuditor = currentRole === 'District Authority Auditor' || currentRole === 'MoSPI Reviewer';

  // Filter client-side by category if specified
  const filteredProblems = problems.filter((p) => {
    if (categoryFilter === 'All Categories') return true;
    return p.category?.toLowerCase().includes(categoryFilter.toLowerCase().split(' ')[0]);
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
              Citizen Grievances & Problems Raised
            </h3>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {totalCount} Total Issues
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Constituency: <span className="font-semibold text-slate-800 dark:text-slate-200">{constituency}</span>, {state}. Direct channel between citizens, MP representation, and district auditors.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProblems}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            title="Refresh issues list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </Button>

          {showReportModalButton && (
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-8 px-3 text-xs rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Civic Issue</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            type="text"
            placeholder="Search problems by keyword, citizen name, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 min-w-[140px] text-xs rounded-xl border-slate-200 bg-white dark:bg-slate-900">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="Pending Review" className="text-xs">Pending Review</SelectItem>
              <SelectItem value="Action Initiated" className="text-xs">Action Initiated</SelectItem>
              <SelectItem value="Under Investigation" className="text-xs">Under Investigation</SelectItem>
              <SelectItem value="Resolved" className="text-xs">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 min-w-[150px] text-xs rounded-xl border-slate-200 bg-white dark:bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Problems List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60" />
          ))}
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No citizen grievances found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try clearing the search query or changing your status filter.'
              : 'Constituents have not raised any pending civic issues for this selection.'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 h-8 text-xs rounded-xl cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Submit First Grievance
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredProblems.map((p) => {
            const statusStyle = STATUS_CONFIG[p.status] || STATUS_CONFIG['Pending Review'];
            const StatusIcon = statusStyle.icon;
            const isReplying = replyingProblemId === p.id;
            const isAuditing = auditingProblemId === p.id;

            return (
              <Card
                key={p.id}
                className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 shadow-2xs hover:shadow-xs bg-white dark:bg-slate-900"
              >
                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* Top Row: Meta, Category, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                        {p.category}
                      </Badge>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {p.constituency}, {p.state}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        <StatusIcon className="w-3 h-3" />
                        <span>{p.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                      {p.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Citizen Info & Linked Work */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Raised by: <strong className="text-slate-700 dark:text-slate-300 font-medium">{p.citizen_name || 'Anonymous Constituent'}</strong>
                      </span>
                      {p.contact_masked && (
                        <span className="text-slate-400 text-[11px]">({p.contact_masked})</span>
                      )}
                    </div>

                    {p.work_id && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">Linked Work:</span>
                        <Badge
                          variant="outline"
                          onClick={() => onOpenWork && onOpenWork(p.work_id)}
                          className="text-[11px] font-mono font-medium hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer border-indigo-200"
                        >
                          {p.work_id}
                          <ExternalLink className="w-2.5 h-2.5 ml-1" />
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Official MP Reply Card (if already answered) */}
                  {p.mp_reply && (
                    <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-300 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>
                            {typeof p.mp_reply === 'object' && p.mp_reply.replied_by
                              ? `Official MP Response from ${p.mp_reply.replied_by}`
                              : 'Official MP Response from Shri Kota Representative'}
                          </span>
                        </div>
                        {(p.mp_replied_at || (typeof p.mp_reply === 'object' && p.mp_reply.replied_at)) && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                            {new Date(p.mp_replied_at || p.mp_reply.replied_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      <p className="text-indigo-950 dark:text-indigo-200 text-xs italic pl-5 border-l-2 border-indigo-300 dark:border-indigo-700">
                        "{typeof p.mp_reply === 'object' ? (p.mp_reply.reply_text || p.mp_reply.action_taken || '') : p.mp_reply}"
                      </p>
                    </div>
                  )}

                  {/* District Auditor Notes Card (if present) */}
                  {p.auditor_notes && (
                    <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>District Authority Audit Inspection Note</span>
                        </div>
                        {(p.auditor_reviewed_at || (typeof p.auditor_notes === 'object' && p.auditor_notes.reviewed_at)) && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">
                            {new Date(p.auditor_reviewed_at || p.auditor_notes.reviewed_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      <p className="text-amber-950 dark:text-amber-200 text-xs pl-5 border-l-2 border-amber-300 dark:border-amber-700">
                        {typeof p.auditor_notes === 'object' ? (p.auditor_notes.auditor_notes || p.auditor_notes.notes || '') : p.auditor_notes}
                      </p>
                    </div>
                  )}

                  {/* Action Controls for MP and District Auditor */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {/* MP Reply Trigger Button */}
                    {isMP && (
                      <Button
                        variant={p.mp_reply ? 'ghost' : 'default'}
                        size="sm"
                        onClick={() => {
                          setReplyingProblemId(isReplying ? null : p.id);
                          const currentText = typeof p.mp_reply === 'object' ? (p.mp_reply.reply_text || '') : (p.mp_reply || '');
                          setReplyText(currentText);
                          setReplyStatus(p.status === 'Pending Review' ? 'Action Initiated' : p.status);
                        }}
                        className={`h-7 px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          p.mp_reply
                            ? 'text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                        }`}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        <span>{p.mp_reply ? 'Update Official MP Reply' : 'Dispatch MP Official Reply'}</span>
                      </Button>
                    )}

                    {/* District Auditor Note Trigger Button */}
                    {isAuditor && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAuditingProblemId(isAuditing ? null : p.id);
                          const currentNotes = typeof p.auditor_notes === 'object' ? (p.auditor_notes.auditor_notes || p.auditor_notes.notes || '') : (p.auditor_notes || '');
                          setAuditNoteText(currentNotes);
                          setAuditStatus(p.status);
                        }}
                        className="h-7 px-2.5 rounded-lg text-xs font-semibold text-amber-800 border-amber-200 hover:bg-amber-50 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 mr-1 text-amber-600" />
                        <span>{p.auditor_notes ? 'Update Audit Findings' : 'Attach Audit Inspection Note'}</span>
                      </Button>
                    )}
                  </div>

                  {/* Inline MP Reply Composer */}
                  {isReplying && (
                    <div className="mt-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/30 dark:border-indigo-900 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-600" />
                          Compose Official Member of Parliament Response
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyingProblemId(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick preset templates */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 tracking-wider">
                          Quick Response Templates:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {MP_REPLY_TEMPLATES.map((tmpl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setReplyText(tmpl)}
                              className="text-[11px] text-left px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-100 hover:border-indigo-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            >
                              {tmpl.slice(0, 48)}…
                            </button>
                          ))}
                        </div>
                      </div>

                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="State official executive action, sanction reference, or directions issued to executing authorities..."
                        rows={3}
                        className="text-xs bg-white dark:bg-slate-900 border-indigo-200 focus:border-indigo-400 rounded-xl"
                      />

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Update Status:</span>
                          <Select value={replyStatus} onValueChange={setReplyStatus}>
                            <SelectTrigger className="h-8 text-xs rounded-lg min-w-[140px] bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Action Initiated" className="text-xs">Action Initiated</SelectItem>
                              <SelectItem value="Under Investigation" className="text-xs">Under Investigation</SelectItem>
                              <SelectItem value="Resolved" className="text-xs">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingProblemId(null)}
                            disabled={isSubmittingReply}
                            className="h-8 px-3 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitMPReply(p.id)}
                            disabled={isSubmittingReply}
                            className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>{isSubmittingReply ? 'Dispatching...' : 'Dispatch Reply'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline District Auditor Note Composer */}
                  {isAuditing && (
                    <div className="mt-3 p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/30 dark:border-amber-900 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          Record District Auditor Field Audit Findings
                        </span>
                        <button
                          type="button"
                          onClick={() => setAuditingProblemId(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <Textarea
                        value={auditNoteText}
                        onChange={(e) => setAuditNoteText(e.target.value)}
                        placeholder="Enter physical site inspection remarks, vendor invoice verification notes, or sanction audit status..."
                        rows={3}
                        className="text-xs bg-white dark:bg-slate-900 border-amber-200 focus:border-amber-400 rounded-xl"
                      />

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Audit Status:</span>
                          <Select value={auditStatus} onValueChange={setAuditStatus}>
                            <SelectTrigger className="h-8 text-xs rounded-lg min-w-[150px] bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Under Investigation" className="text-xs">Under Investigation</SelectItem>
                              <SelectItem value="Action Initiated" className="text-xs">Action Initiated</SelectItem>
                              <SelectItem value="Resolved" className="text-xs">Audit Cleared / Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAuditingProblemId(null)}
                            disabled={isSubmittingAudit}
                            className="h-8 px-3 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitAuditReview(p.id)}
                            disabled={isSubmittingAudit}
                            className="h-8 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{isSubmittingAudit ? 'Saving...' : 'Record Audit Finding'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Citizen Report Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border border-indigo-100">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                  Report Civic Grievance to MP & Auditor
                </h3>
                <p className="text-xs text-slate-500">
                  Submissions are routed directly to the elected MP and the District Authority auditor desk.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateProblem} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Issue Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Incomplete culvert bridge causing monsoon road blockage"
                  value={newProblem.title}
                  onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
                  className="text-xs h-9 rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                  <Select
                    value={newProblem.category}
                    onValueChange={(val) => setNewProblem({ ...newProblem, category: val })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Drinking Water" className="text-xs">Drinking Water</SelectItem>
                      <SelectItem value="Roads & Infrastructure" className="text-xs">Roads & Infrastructure</SelectItem>
                      <SelectItem value="Sanitation & Sewage" className="text-xs">Sanitation & Sewage</SelectItem>
                      <SelectItem value="Healthcare" className="text-xs">Healthcare</SelectItem>
                      <SelectItem value="Education & Schools" className="text-xs">Education & Schools</SelectItem>
                      <SelectItem value="Community Assets" className="text-xs">Community Assets</SelectItem>
                      <SelectItem value="Electricity & Lighting" className="text-xs">Electricity & Lighting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Constituency</label>
                  <Input
                    value={newProblem.constituency}
                    onChange={(e) => setNewProblem({ ...newProblem, constituency: e.target.value, district: e.target.value })}
                    className="text-xs h-9 rounded-xl border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  required
                  rows={3}
                  placeholder="Explain the issue, exact village/ward location, duration of delay, and community impact..."
                  value={newProblem.description}
                  onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })}
                  className="text-xs rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Linked MPLADS Work ID (Optional)
                </label>
                <Input
                  placeholder="e.g. WRK-2024-00123"
                  value={newProblem.work_id}
                  onChange={(e) => setNewProblem({ ...newProblem, work_id: e.target.value })}
                  className="text-xs h-9 rounded-xl border-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Your Name (Optional)</label>
                  <Input
                    placeholder="Citizen name"
                    value={newProblem.citizen_name}
                    onChange={(e) => setNewProblem({ ...newProblem, citizen_name: e.target.value })}
                    className="text-xs h-9 rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone / Contact (Optional)</label>
                  <Input
                    placeholder="+91 Mobile number"
                    value={newProblem.contact}
                    onChange={(e) => setNewProblem({ ...newProblem, contact: e.target.value })}
                    className="text-xs h-9 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmittingNew}
                  className="h-9 px-4 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingNew}
                  className="h-9 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  {isSubmittingNew ? 'Submitting...' : 'Submit Grievance'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
