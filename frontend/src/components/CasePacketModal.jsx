import React, { useState } from 'react';
import {
  ShieldAlert, AlertTriangle, FileCheck,
  Building2, User, MapPin, Layers, Activity, Scale, Send, Loader2,
  Camera, CheckCircle2, XCircle, MessageSquareText, Image as ImageIcon
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatINR } from '@/lib/format';
import { apiFetch } from '@/lib/api';

const OUTCOMES = [
  { id: 'legitimate', label: 'Legitimate Work', desc: 'Valid docs & progress' },
  { id: 'data-quality issue', label: 'Data-Quality Issue', desc: 'Typo or portal error' },
  { id: 'irregularity', label: 'Potential Irregularity', desc: 'Procedural/cost flaw' },
  { id: 'confirmed fraud', label: 'Confirmed Fraud', desc: 'Fictitious or stolen' },
];

export default function CasePacketModal({
  workId,
  packet,
  isLoading = false,
  onClose,
  currentRole,
  onSubmitReview,
  isSubmittingReview,
  onRefreshPacket
}) {
  const [outcome, setOutcome] = useState('irregularity');
  const [notes, setNotes] = useState('');

  // Public Feedback Form State
  const [pubIsCompleted, setPubIsCompleted] = useState(true);
  const [pubComment, setPubComment] = useState('');
  const [pubReporterName, setPubReporterName] = useState('');
  const [pubPhotoProof, setPubPhotoProof] = useState('');
  const [isSubmittingPublicReview, setIsSubmittingPublicReview] = useState(false);

  const isPublicTier = currentRole === 'Read-Only Public Tier';

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (isPublicTier) return;

    const ok = await onSubmitReview(packet.work_id, outcome, notes);
    if (ok) {
      toast.success('Audit review outcome recorded successfully.');
    } else {
      toast.error('Review submission failed. Check your role and try again.');
    }
  };

  // Convert uploaded image to Base64 (max 1MB, image types only)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('File size exceeds 1MB limit.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WEBP images are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPubPhotoProof(reader.result);
      toast.success('Photo attached successfully.');
    };
    reader.readAsDataURL(file);
  };

  const handlePublicReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingPublicReview(true);

    try {
      const res = await apiFetch(`/api/works/${encodeURIComponent(packet.work_id)}/public-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_completed: pubIsCompleted,
          comment: pubComment.trim() || 'Citizen ground verification',
          photo_proof: pubPhotoProof || null,
          reporter_name: pubReporterName.trim() || 'Anonymous Citizen',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'Failed to submit public verification.');
        setIsSubmittingPublicReview(false);
        return;
      }

      toast.success('Thank you! Your public work verification has been submitted.');
      setPubComment('');
      setPubPhotoProof('');
      setIsSubmittingPublicReview(false);

      if (onRefreshPacket) {
        onRefreshPacket(packet.work_id);
      }
    } catch (err) {
      console.error('Public review error:', err);
      toast.error('Error submitting feedback. Please try again.');
      setIsSubmittingPublicReview(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="glass-panel max-w-4xl sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl gap-0 p-0"
        style={{ zIndex: 70 }}
      >
        {(isLoading || !packet) ? (
          /* Loading skeleton while the case packet is assembled */
          <div className="p-8 space-y-5">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Assembling case packet for <span className="font-mono">{workId}</span>…</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6">

            {/* Header */}
            <div className="space-y-1 border-b pb-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-sm font-bold bg-muted px-3 py-1 rounded-lg border">
                  {packet.work_id}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getTierBadge(packet.risk_tier)}`}>
                  {packet.risk_tier}
                </span>
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-bold">
                  Priority Rank #{packet.priority_rank}
                </Badge>
              </div>
              <DialogTitle asChild>
                <h2 className="text-2xl font-bold tracking-tight pt-1">Audit Case Packet</h2>
              </DialogTitle>
              <DialogDescription>
                Evidence-grounded audit review dossier generated via MoSPI Risk Engine v4.
              </DialogDescription>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <MetricCard label="Final Risk Score">
                <div className="text-2xl font-black mt-1 flex items-baseline gap-1">
                  {packet.final_risk_score}
                  <span className="text-xs font-normal text-muted-foreground">/ 100</span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Statistical review index</span>
              </MetricCard>

              <MetricCard label="Sanctioned Value">
                <div className="text-lg font-bold mt-1 font-mono">{formatINR(packet.sanction_amount)}</div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Approved budget</span>
              </MetricCard>

              <MetricCard label="Fund Disbursed">
                <div className="text-lg font-bold mt-1 font-mono">{formatINR(packet.total_fund_disbursed)}</div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Utilized: {Math.round(packet.utilization_ratio * 100)}%
                </span>
              </MetricCard>

              <MetricCard label="Action Directive">
                <div className="text-xs font-bold text-amber-600 mt-1.5 leading-tight">
                  {packet.recommended_action || 'Routine Monitoring'}
                </div>
                <span className="text-[10px] text-muted-foreground block mt-1">Recommended workflow</span>
              </MetricCard>
            </div>

            {/* Administrative profile */}
            <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Administrative & Execution Profile
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                <Field label="Hon'ble MP:" icon={<User className="w-3.5 h-3.5 text-muted-foreground" />}>
                  {packet.mp_name || 'N/A'}
                </Field>
                <Field label="State & Constituency:" icon={<MapPin className="w-3.5 h-3.5 text-muted-foreground" />}>
                  {packet.constituency ? `${packet.constituency}, ` : ''}{packet.state}
                </Field>
                <Field label="Implementing Agency (IDA):" icon={<Building2 className="w-3.5 h-3.5 text-muted-foreground" />}>
                  {packet.ida || 'Not specified'}
                </Field>
                <Field label="Primary Vendor / Contractor:" icon={<Building2 className="w-3.5 h-3.5 text-muted-foreground" />}>
                  {packet.primary_vendor || 'Vendor not recorded in payments'}
                </Field>
                <Field label="Work Category:" icon={<Layers className="w-3.5 h-3.5 text-muted-foreground" />}>
                  {packet.work_category || 'Normal / Others'}
                </Field>
                <Field label="Work Status:" icon={<Activity className="w-3.5 h-3.5 text-muted-foreground" />}>
                  {packet.work_status || 'Under Implementation'}
                </Field>
              </div>

              <div className="pt-2 border-t text-xs">
                <span className="text-muted-foreground block">Work Description / Type:</span>
                <p className="text-foreground/90 mt-0.5 font-medium">{packet.work_type}</p>
              </div>
            </div>

            {/* Explainability dossier */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Explainability Dossier — Triggered Anomaly Signals
                </h3>
                <span className="text-xs text-muted-foreground">
                  {packet.rule_flag_count} signal{packet.rule_flag_count !== 1 ? 's' : ''} detected
                </span>
              </div>

              <div className="space-y-2.5">
                {packet.causes && packet.causes.length > 0 ? (
                  packet.causes.map((cause, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-background/60 border border-amber-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-semibold text-foreground/90 block">Evidence Factor #{idx + 1}</span>
                        <p className="text-foreground/75 leading-relaxed">{cause}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-background/60 border text-xs text-muted-foreground italic">
                    No individual rule violated; prioritized based on statistical portfolio modeling.
                  </div>
                )}
              </div>

              {packet.impact_note && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-accent-foreground flex items-center gap-2">
                  <Scale className="w-4 h-4 shrink-0 text-primary" />
                  <span>{packet.impact_note}</span>
                </div>
              )}
            </div>

            {/* Public Citizen Verification Form (Public Tier Option) */}
            {isPublicTier ? (
              <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900 space-y-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Public Citizen Verification</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Verify whether this ground work is completed or incomplete, and attach photo proof for MoSPI auditors.
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePublicReviewSubmit} className="space-y-3 text-xs">

                  {/* Status Selection Buttons */}
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1.5">
                      Work Completion Status:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPubIsCompleted(true)}
                        className={`flex-1 p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                          pubIsCompleted
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Work Completed</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPubIsCompleted(false)}
                        className={`flex-1 p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                          !pubIsCompleted
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:border-rose-300'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Work Not Done</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Verification Remarks / Ground Feedback:
                    </label>
                    <Textarea
                      rows={2}
                      value={pubComment}
                      onChange={(e) => setPubComment(e.target.value)}
                      placeholder="Specify ground observation details (e.g. site location, visible progress, missing materials)..."
                      className="bg-white dark:bg-slate-900 text-xs rounded-xl"
                    />
                  </div>

                  {/* Photo Proof Upload */}
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Attach Photo Proof (Image File or Capture):
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="bg-white dark:bg-slate-900 text-xs rounded-xl cursor-pointer"
                      />
                      {pubPhotoProof && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold shrink-0">
                          <ImageIcon className="w-4 h-4" />
                          <span>Photo Attached</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reporter Name (Optional) */}
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Your Name / Designation (Optional):
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Local Resident / Ward Member"
                      value={pubReporterName}
                      onChange={(e) => setPubReporterName(e.target.value)}
                      className="bg-white dark:bg-slate-900 text-xs rounded-xl"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-1 flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmittingPublicReview}
                      className="h-9 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 cursor-pointer"
                    >
                      {isSubmittingPublicReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isSubmittingPublicReview ? 'Submitting...' : 'Submit Verification'}</span>
                    </Button>
                  </div>

                </form>
              </div>
            ) : null}

            {/* Public Reviews Section (Visible to MoSPI Reviewers, District Auditors, and Public) */}
            {packet.public_reviews && packet.public_reviews.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Public Citizen Verification Feedback ({packet.public_reviews.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Field reporting by local citizens</span>
                </div>

                <div className="space-y-3">
                  {packet.public_reviews.map((rev) => (
                    <div key={rev.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {rev.is_completed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Work Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              <XCircle className="w-3 h-3" /> Work Not Done
                            </span>
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{rev.reporter_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-1">{rev.comment}</p>

                      {rev.photo_proof && (
                        <div className="pt-1">
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1">Attached Photo Proof:</span>
                          <img
                            src={rev.photo_proof}
                            alt="Public photo proof"
                            className="max-h-48 w-auto rounded-lg border border-slate-200 object-cover shadow-2xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Human review feedback loop (MoSPI Reviewer & Auditor Role) */}
            {!isPublicTier && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-background via-background to-primary/10 border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold">Human Auditor Review & Decision Record</h3>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Active Role: <strong className="text-primary">{currentRole}</strong>
                  </span>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">

                  <div>
                    <label className="text-muted-foreground font-medium block mb-2">
                      Select Formal Audit Determination (Ground Truth Feedback):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {OUTCOMES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setOutcome(item.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            outcome === item.id
                              ? 'bg-primary/10 border-primary text-primary shadow-sm'
                              : 'bg-background/60 text-muted-foreground hover:border-border'
                          }`}
                        >
                          <span className="font-bold text-xs block">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1.5">
                      Audit Notes / Field Observation Remarks:
                    </label>
                    <Textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Record verification references, inspection dates, contractor verification, or physical verification findings..."
                      className="bg-background/60 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground text-[11px]">
                      Saves determination to the audit log table.
                    </span>

                    <Button type="submit" size="sm" disabled={isSubmittingReview}>
                      {isSubmittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {isSubmittingReview ? 'Recording…' : 'Submit Review'}
                    </Button>
                  </div>

                </form>

                {/* Prior reviews audit trail */}
                {packet.prior_reviews && packet.prior_reviews.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Recorded Review History ({packet.prior_reviews.length})
                    </span>
                    <div className="space-y-1.5">
                      {packet.prior_reviews.map((rev) => (
                        <div key={rev.id} className="p-2.5 rounded-xl bg-background/60 border text-xs flex items-start justify-between gap-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-primary capitalize">{rev.outcome}</span>
                            <p className="text-muted-foreground text-[11px]">{rev.notes || 'No comments attached.'}</p>
                          </div>
                          <div className="text-right text-[10px] text-muted-foreground shrink-0">
                            <span className="block font-medium text-foreground/70">{rev.reviewer_name}</span>
                            <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getTierBadge(tier) {
  if (tier?.includes('High')) return 'bg-red-50 text-red-700 border-red-200';
  if (tier?.includes('Medium')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function MetricCard({ label, children }) {
  return (
    <div className="p-4 rounded-2xl bg-muted/50 border">
      <span className="text-xs text-muted-foreground font-medium block">{label}</span>
      {children}
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <span className="text-muted-foreground block">{label}</span>
      <span className="text-foreground font-medium flex items-center gap-1 mt-0.5">
        {icon}
        {children}
      </span>
    </div>
  );
}
