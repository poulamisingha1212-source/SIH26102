import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, FileCheck,
  Building2, User, MapPin, Layers, Activity, Scale, Send, Loader2,
  Camera, CheckCircle2, XCircle, MessageSquareText, Image as ImageIcon,
  ChevronDown, ChevronRight, CheckCircle, Bot, Upload, RefreshCw,
  Trash2, ExternalLink, Lock, SwitchCamera, AlertCircle, Crosshair
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

  // Geolocation state
  const [pubLocation, setPubLocation] = useState(null); // { latitude, longitude, accuracy }
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Camera capture state & refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const isPublicTier = currentRole === 'Read-Only Public Tier';

  // Stop camera stream tracks helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start live camera stream
  const startCamera = async (facingMode = 'environment') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
      } else {
        toast.error('Direct camera streaming not supported. Please use the Upload Photo option.');
      }
      return;
    }

    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('getUserMedia error, falling back to native capture input:', err);
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
      } else {
        toast.error('Unable to open camera. Please check camera permissions or use Upload Photo.');
      }
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setPubPhotoProof(dataUrl);
    stopCameraStream();
    setIsCameraOpen(false);
    toast.success('Photo captured successfully.');
  };

  const handleToggleCameraFacing = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
  };

  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Location Fetcher
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsFetchingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPubLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsFetchingLocation(false);
        setLocationError(null);
      },
      (err) => {
        setIsFetchingLocation(false);
        let msg = 'Unable to fetch GPS location.';
        if (err.code === 1) msg = 'Location permission denied. Please enable GPS permissions.';
        else if (err.code === 2) msg = 'Location unavailable on this device.';
        else if (err.code === 3) msg = 'Location request timed out. Please retry.';
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Handle Photo File Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit.');
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

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
  };

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

  // Section completeness validation: every section must be filled to submit without Name
  const hasValidStatus = pubIsCompleted !== null && pubIsCompleted !== undefined;
  const hasValidComment = Boolean(pubComment && pubComment.trim().length >= 5);
  const hasValidPhoto = Boolean(pubPhotoProof);
  const hasValidLocation = Boolean(pubLocation && pubLocation.latitude !== null && pubLocation.longitude !== null);
  const canSubmitPublicReview = hasValidStatus && hasValidComment && hasValidPhoto && hasValidLocation && !isSubmittingPublicReview;

  const handlePublicReviewSubmit = async (e) => {
    e.preventDefault();

    if (!hasValidComment) {
      toast.error('Please enter verification remarks (minimum 5 characters).');
      return;
    }
    if (!hasValidPhoto) {
      toast.error('Please attach photo proof using Capture or Upload.');
      return;
    }
    if (!hasValidLocation) {
      toast.error('GPS location is required for ground verification. Please allow location access or click Retry.');
      return;
    }

    setIsSubmittingPublicReview(true);

    try {
      const res = await apiFetch(`/api/works/${encodeURIComponent(packet.work_id)}/public-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_completed: pubIsCompleted,
          comment: pubComment.trim(),
          photo_proof: pubPhotoProof,
          reporter_name: pubReporterName.trim() || 'Anonymous Citizen',
          latitude: pubLocation.latitude,
          longitude: pubLocation.longitude,
          location_accuracy: pubLocation.accuracy,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'Failed to submit public verification.');
        setIsSubmittingPublicReview(false);
        return;
      }

      toast.success('Thank you! Your citizen verification with photo and location has been submitted.');
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

            {/* Explainability dossier — per-agent breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Explainability Dossier — Agent Findings
                </h3>
                <span className="text-xs text-muted-foreground">
                  {packet.rule_flag_count} signal{packet.rule_flag_count !== 1 ? 's' : ''} · {packet.agents_flagged || 0}/{packet.agents_total || 6} agents flagged
                </span>
              </div>

              {/* Per-agent breakdown cards */}
              <div className="space-y-2.5">
                {packet.agent_findings && packet.agent_findings.length > 0 ? (
                  packet.agent_findings.map((finding) => (
                    <AgentFindingCard key={finding.key} finding={finding} />
                  ))
                ) : (
                  /* Fallback: flat causes list for rows without agent_findings */
                  packet.causes && packet.causes.length > 0 ? (
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
                  )
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Public Citizen Verification</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Verify whether this ground work is completed or incomplete, attach photo proof, and record verified GPS location.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                    Field Evidence Protocol
                  </Badge>
                </div>

                <form onSubmit={handlePublicReviewSubmit} className="space-y-3.5 text-xs">

                  {/* Section 1: Work Completion Status */}
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1.5">
                      1. Work Completion Status <span className="text-rose-500 font-bold">*</span>
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

                  {/* Section 2: Verification Remarks / Ground Feedback */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">
                        2. Verification Remarks / Ground Feedback <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className={`text-[10px] ${pubComment.trim().length >= 5 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        {pubComment.trim().length >= 5 ? '✓ Remarks entered' : 'Min 5 characters required'}
                      </span>
                    </div>
                    <Textarea
                      rows={2}
                      value={pubComment}
                      onChange={(e) => setPubComment(e.target.value)}
                      placeholder="Specify ground observation details (e.g. site location, visible progress, quality, contractor presence)..."
                      className="bg-white dark:bg-slate-900 text-xs rounded-xl"
                    />
                  </div>

                  {/* Section 3: Photo Proof (Capture & Upload both options) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">
                        3. Attached Photo Proof <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {pubPhotoProof ? '✓ Photo attached' : 'Choose Capture or Upload'}
                      </span>
                    </div>

                    {/* Hidden Native / File Inputs */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <input
                      ref={nativeCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    {/* Interactive Live Camera Viewfinder */}
                    {isCameraOpen ? (
                      <div className="p-3 rounded-2xl bg-black border border-slate-700 space-y-2">
                        <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-52 sm:h-60 object-cover"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] flex items-center gap-1 backdrop-blur-xs">
                            <Camera className="w-3 h-3 text-red-400 animate-pulse" /> Live Camera Stream
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCloseCamera}
                            className="text-white border-slate-600 hover:bg-slate-800 text-xs cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSnapPhoto}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 cursor-pointer px-4 shadow-sm"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Snap Photo</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleToggleCameraFacing}
                            className="text-white border-slate-600 hover:bg-slate-800 text-xs cursor-pointer gap-1"
                            title="Switch Camera"
                          >
                            <SwitchCamera className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Flip</span>
                          </Button>
                        </div>
                      </div>
                    ) : pubPhotoProof ? (
                      /* Photo Preview with Remove/Retake Option */
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={pubPhotoProof}
                            alt="Captured verification photo"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
                          />
                          <div>
                            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Photo Proof Attached</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Ready for auditor inspection</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPubPhotoProof('')}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </Button>
                      </div>
                    ) : (
                      /* Two Clear Buttons: Capture and Upload */
                      <div className="grid grid-cols-2 gap-2.5">
                        <Button
                          type="button"
                          onClick={() => startCamera(cameraFacingMode)}
                          className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capture Photo</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Upload Photo</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Geolocation (Fetched & Confidential for Auditors) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>4. Ground GPS Location</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                        <Lock className="w-3 h-3" /> Confidential to Auditors
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      {isFetchingLocation ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 py-1">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span className="text-xs font-medium">Acquiring GPS ground coordinates…</span>
                        </div>
                      ) : pubLocation ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>GPS Coordinates Captured & Attached</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={fetchLocation}
                              className="h-6 px-2 text-[10px] text-indigo-600 hover:text-indigo-700 gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Re-fetch
                            </Button>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal flex items-start gap-1">
                            <Lock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Privacy Protection:</strong> Your exact GPS coordinates will be encrypted and made available <em>only to authorized MoSPI / District Auditors</em>. Other public visitors will NOT see your location.
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                              {locationError || 'GPS location not acquired yet.'}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={fetchLocation}
                              className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 cursor-pointer"
                            >
                              <Crosshair className="w-3 h-3" />
                              <span>Fetch Location</span>
                            </Button>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Location access is required to authenticate ground verification and deter fictitious reporting.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 5: Reporter Name (Optional) */}
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      5. Your Name / Designation <span className="text-slate-400 font-normal">(Optional — submit with name or anonymously)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Local Resident / Ward Member / Student (Leave empty for Anonymous)"
                      value={pubReporterName}
                      onChange={(e) => setPubReporterName(e.target.value)}
                      className="bg-white dark:bg-slate-900 text-xs rounded-xl"
                    />
                  </div>

                  {/* Real-time Checklist Badges & Submit Button */}
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-slate-500 font-medium mr-1">Required to Submit:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                        hasValidStatus ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {hasValidStatus ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : '○'} Status
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                        hasValidComment ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {hasValidComment ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : '○'} Remarks
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                        hasValidPhoto ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {hasValidPhoto ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : '○'} Photo Proof
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                        hasValidLocation ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {hasValidLocation ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : '○'} GPS Location
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-normal bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Name (Optional)
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        {!canSubmitPublicReview ? 'Fill all required sections to enable submit.' : 'All sections ready for verification.'}
                      </span>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!canSubmitPublicReview}
                        className="h-9 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isSubmittingPublicReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{isSubmittingPublicReview ? 'Submitting…' : 'Submit Verification'}</span>
                      </Button>
                    </div>
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

                      {/* Location Display: Visible ONLY to Auditors */}
                      {rev.latitude != null && rev.longitude != null ? (
                        <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-indigo-900 dark:text-indigo-200">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="font-semibold">GPS Ground Location:</span>
                            <span className="font-mono">{rev.latitude.toFixed(5)}° N, {rev.longitude.toFixed(5)}° E</span>
                            {rev.location_accuracy && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                                (±{Math.round(rev.location_accuracy)}m)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-900/50 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-700">
                              🔒 Auditor View Only
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${rev.latitude},${rev.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" /> Map
                            </a>
                          </div>
                        </div>
                      ) : (
                        /* For Public Users: Location coordinates are strictly concealed for citizen privacy */
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <Lock className="w-3 h-3" />
                          <span>GPS location verified & confidential (accessible only to authorized MoSPI auditors).</span>
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

/** Per-agent breakdown card shown in the Explainability Dossier. */
function AgentFindingCard({ finding }) {
  const [open, setOpen] = useState(finding.score > 0);
  const hasFired = finding.score > 0;
  const scorePct = Math.round(finding.score * 100);

  const scoreColor = scorePct >= 70
    ? 'bg-red-500'
    : scorePct >= 40
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const borderColor = hasFired
    ? scorePct >= 70
      ? 'border-red-200 dark:border-red-900/60'
      : 'border-amber-200 dark:border-amber-900/60'
    : 'border-border/40';

  const bgColor = hasFired
    ? scorePct >= 70
      ? 'bg-red-50/60 dark:bg-red-950/30'
      : scorePct >= 40
        ? 'bg-amber-50/60 dark:bg-amber-950/30'
        : 'bg-orange-50/40 dark:bg-orange-950/20'
    : 'bg-muted/30';

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      {/* Card header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
      >
        {/* Agent icon */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          hasFired ? 'bg-amber-500/15' : 'bg-emerald-500/10'
        }`}>
          {hasFired
            ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            : <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          }
        </div>

        {/* Title + score bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground truncate">{finding.title}</span>
            <span className={`text-xs font-mono font-bold shrink-0 ${
              hasFired ? (scorePct >= 70 ? 'text-red-600' : 'text-amber-600') : 'text-emerald-600'
            }`}>
              {hasFired ? `${scorePct}%` : 'Clear'}
            </span>
          </div>
          {/* Score progress bar */}
          <div className="mt-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hasFired ? scoreColor : 'bg-emerald-500'}`}
              style={{ width: hasFired ? `${scorePct}%` : '100%', opacity: hasFired ? 1 : 0.3 }}
            />
          </div>
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 text-muted-foreground">
          {open
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />
          }
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-3.5 space-y-2.5 border-t border-inherit">
          {/* Agent description */}
          <p className="text-[11px] text-muted-foreground pt-2.5 leading-relaxed italic">
            {finding.description}
          </p>

          {hasFired && finding.flag_notes && finding.flag_notes.length > 0 ? (
            <div className="space-y-2">
              {finding.flag_notes.map((note, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/60 border border-amber-200/60 dark:border-amber-900/40"
                >
                  <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-amber-500" />
                  </div>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              No signals raised by this agent for this work.
            </div>
          )}

          {/* Weight indicator */}
          <div className="flex items-center justify-end">
            <span className="text-[10px] text-muted-foreground/60">
              Agent weight in final score: {Math.round(finding.weight * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
