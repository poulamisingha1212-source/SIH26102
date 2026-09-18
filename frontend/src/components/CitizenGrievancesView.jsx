import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, AlertCircle, CheckCircle2, Clock, Search,
  Filter, Plus, Send, ShieldAlert, FileText, ArrowRight,
  ExternalLink, User, Calendar, MapPin, Sparkles, X,
  Building, CheckCircle, RefreshCw, Camera, Upload, Trash2,
  Navigation, Eye, Check, ChevronRight, LocateFixed, Landmark,
  BarChart3, Layers
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
  'Others',
];

const MP_REPLY_TEMPLATES = [
  "Inspection scheduled with District Executive Engineer within 7 working days.",
  "Sanction letter requisition submitted to District Collector for immediate action.",
  "Directing implementing agency to expedite pending civil work and report completion.",
  "Supplementary MPLADS grant allocation initiated to resolve this civic bottleneck.",
  "Verified on-site by field staff; corrective rectification works currently underway."
];

export default function CitizenGrievancesView({
  currentRole = 'Read-Only Public Tier',
  loggedInUser = '',
  userProfile = null,
  onOpenWork = null,
}) {
  const [problems, setProblems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Top Filter States
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedConstituency, setSelectedConstituency] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Geography Hierarchy data
  const [geoHierarchy, setGeoHierarchy] = useState({
    states: [],
    districts_by_state: {},
    constituencies_by_state: {}
  });

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
    constituency: 'KOLKATA DAKSHIN',
    district: 'KOLKATA DAKSHIN',
    state: 'West Bengal',
    work_id: '',
    citizen_name: '',
    contact: '',
  });
  const [otherCategoryDetail, setOtherCategoryDetail] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Photo state
  const [photoProof, setPhotoProof] = useState(null);
  const [photoMeta, setPhotoMeta] = useState(null);
  const fileInputRef = useRef(null);

  // Lightbox preview for full photo inspection
  const [previewingPhoto, setPreviewingPhoto] = useState(null);

  // Constituency selection modes inside modal: 'steps' | 'gps'
  const [constituencySelectMode, setConstituencySelectMode] = useState('steps');
  const [modalGeoState, setModalGeoState] = useState('West Bengal');
  const [modalGeoDistrict, setModalGeoDistrict] = useState('KOLKATA DAKSHIN');
  const [modalMPName, setModalMPName] = useState('Mala Roy');
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessInfo, setLocationSuccessInfo] = useState(null);

  // Load geography hierarchy once
  useEffect(() => {
    apiFetch('/api/geography/hierarchy')
      .then((res) => {
        if (!res.ok) throw new Error('Hierarchy endpoint returned error');
        return res.json();
      })
      .then((data) => {
        if (data && data.states) {
          setGeoHierarchy(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load geography hierarchy:', err);
      });
  }, []);

  // Fetch 500 complaints with active filters
  const fetchProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedConstituency && selectedConstituency !== 'ALL') {
        params.append('constituency', selectedConstituency);
      }
      if (selectedState && selectedState !== 'ALL') {
        params.append('state', selectedState);
      }
      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (categoryFilter && categoryFilter !== 'All Categories') {
        params.append('category', categoryFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', '500');

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
  }, [selectedConstituency, selectedState, statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // When top state filter changes, reset constituency filter to ALL
  const handleTopStateChange = (st) => {
    setSelectedState(st);
    setSelectedConstituency('ALL');
  };

  // Available constituencies for top filter dropdown
  const topFilterConstituencies = React.useMemo(() => {
    if (!selectedState || selectedState === 'ALL') {
      const all = [];
      Object.values(geoHierarchy.constituencies_by_state || {}).forEach((arr) => {
        arr.forEach((c) => all.push(c.constituency));
      });
      return Array.from(new Set(all)).sort();
    }
    const stateConsts = geoHierarchy.constituencies_by_state[selectedState] || [];
    return stateConsts.map((c) => c.constituency);
  }, [selectedState, geoHierarchy.constituencies_by_state]);

  // Statistics calculation across loaded problems
  const statsSummary = React.useMemo(() => {
    const total = totalCount || problems.length;
    let pending = 0;
    let action = 0;
    let investigation = 0;
    let resolved = 0;

    problems.forEach((p) => {
      if (p.status === 'Pending Review') pending++;
      else if (p.status === 'Action Initiated') action++;
      else if (p.status === 'Under Investigation') investigation++;
      else if (p.status === 'Resolved') resolved++;
    });

    return { total, pending, action, investigation, resolved };
  }, [problems, totalCount]);

  // Modal Step-by-Step State Change
  const handleModalStateChange = (newState) => {
    setModalGeoState(newState);
    const districts = geoHierarchy.districts_by_state[newState] || [];
    const firstDistrict = districts[0] || '';
    setModalGeoDistrict(firstDistrict);

    const consts = geoHierarchy.constituencies_by_state[newState] || [];
    const matchedConst = consts.find((c) => c.district === firstDistrict) || consts[0];
    if (matchedConst) {
      setNewProblem((prev) => ({
        ...prev,
        state: newState,
        district: matchedConst.district || firstDistrict,
        constituency: matchedConst.constituency
      }));
      setModalMPName(matchedConst.mp_name || '');
    } else {
      setNewProblem((prev) => ({
        ...prev,
        state: newState,
        district: firstDistrict,
        constituency: firstDistrict
      }));
      setModalMPName('');
    }
  };

  // Modal Step-by-Step District Change
  const handleModalDistrictChange = (newDistrict) => {
    setModalGeoDistrict(newDistrict);
    const consts = geoHierarchy.constituencies_by_state[modalGeoState] || [];
    const matchedConst = consts.find((c) => c.district === newDistrict) || consts[0];
    if (matchedConst) {
      setNewProblem((prev) => ({
        ...prev,
        district: newDistrict,
        constituency: matchedConst.constituency
      }));
      setModalMPName(matchedConst.mp_name || '');
    } else {
      setNewProblem((prev) => ({
        ...prev,
        district: newDistrict,
        constituency: newDistrict
      }));
      setModalMPName('');
    }
  };

  // Modal Step-by-Step Constituency Change
  const handleModalConstituencyChange = (newConst) => {
    const consts = geoHierarchy.constituencies_by_state[modalGeoState] || [];
    const item = consts.find((c) => c.constituency === newConst);
    setNewProblem((prev) => ({
      ...prev,
      constituency: newConst,
      district: item?.district || prev.district,
      state: modalGeoState
    }));
    setModalMPName(item?.mp_name || '');
  };

  // GPS Location detection handler with client-side reverse geocoding
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationSuccessInfo(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          let clientState = null;
          let clientDistrict = null;

          try {
            const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
            const bdcRes = await fetch(bdcUrl);
            if (bdcRes.ok) {
              const bdcJson = await bdcRes.json();
              clientState = bdcJson.principalSubdivision || null;
              const adminDivs = bdcJson.localityInfo?.administrative || [];
              const lvl5 = adminDivs.find((a) => a.adminLevel === 5)?.name;
              clientDistrict = lvl5 ? lvl5.replace(/ district/i, '') : (bdcJson.locality || bdcJson.city || null);
            }
          } catch (clientErr) {
            console.warn('Client-side reverse geocode fetch warning:', clientErr);
          }

          const params = new URLSearchParams({
            lat: latitude.toString(),
            lon: longitude.toString(),
          });
          if (clientState) params.append('state_hint', clientState);
          if (clientDistrict) params.append('district_hint', clientDistrict);

          const res = await apiFetch(`/api/geography/reverse-geocode?${params.toString()}`);
          if (!res.ok) throw new Error('Reverse geocode failed');
          const data = await res.json();
          if (data && data.success && data.constituency) {
            setNewProblem((prev) => ({
              ...prev,
              constituency: data.constituency,
              district: data.district || data.constituency,
              state: data.state,
              latitude,
              longitude
            }));
            setModalGeoState(data.state);
            setModalGeoDistrict(data.district || data.constituency);
            setModalMPName(data.mp_name || '');
            setLocationSuccessInfo({
              constituency: data.constituency,
              district: data.district,
              state: data.state,
              mp_name: data.mp_name,
              display_name: data.display_name
            });
            toast.success(`📍 Located in ${data.constituency}, ${data.state}!`);
          } else {
            toast.info('GPS coordinates acquired; please confirm constituency from dropdown.');
          }
        } catch (err) {
          console.error('GPS reverse geocode error:', err);
          toast.error('Could not auto-detect constituency from coordinates. Please select step-by-step.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation permission error:', err);
        setIsLocating(false);
        if (err.code === 1) {
          toast.error('Browser location permission was denied. Please select your State & District manually below.');
        } else {
          toast.error('Location detection timed out. Please choose State and District below.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Client-side photo upload & automatic canvas compression
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        if (compressedBase64.length > 1_800_000) {
          compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        }

        setPhotoProof(compressedBase64);
        setPhotoMeta({
          name: file.name,
          size: `${Math.round((compressedBase64.length * 0.75) / 1024)} KB`
        });
        toast.success('Photo proof attached successfully!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoProof(null);
    setPhotoMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

    let finalCategory = newProblem.category;
    if (newProblem.category === 'Others') {
      if (otherCategoryDetail.trim()) {
        finalCategory = `Others: ${otherCategoryDetail.trim()}`;
      } else {
        finalCategory = 'Others';
      }
    }

    setIsSubmittingNew(true);
    try {
      const payload = {
        ...newProblem,
        category: finalCategory,
        photo_proof: photoProof || null
      };

      const res = await apiFetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        constituency: 'KOLKATA DAKSHIN',
        district: 'KOLKATA DAKSHIN',
        state: 'West Bengal',
        work_id: '',
        citizen_name: '',
        contact: '',
      });
      setOtherCategoryDetail('');
      setPhotoProof(null);
      setPhotoMeta(null);
      setLocationSuccessInfo(null);
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

  return (
    <div className="space-y-6">
      {/* Top Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-950/70 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-xs px-2.5 py-0.5 backdrop-blur-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                Live Civic Accountability Desk
              </Badge>
              <span className="text-xs text-indigo-200/80 font-mono">
                {statsSummary.total} Verified Complaints Across 240+ Constituencies
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
              Citizen Grievances & Problems Raised
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Transparent, public grievance portal enabling citizens across India to report MPLADS implementation bottlenecks, substandard works, and civic delays directly to their elected Lok Sabha MP and District Authority Auditors.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="lg"
              onClick={() => setShowCreateModal(true)}
              className="h-11 px-5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20 gap-2 cursor-pointer border border-amber-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>Report Civic Grievance</span>
            </Button>
          </div>
        </div>

        {/* Decorative background ambient glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Summary Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Total Complaints</span>
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display mt-2">
            {statsSummary.total}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across all Indian states</span>
        </Card>

        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display mt-2">
            {statsSummary.pending}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting MP review</span>
        </Card>

        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400">
            <span className="font-semibold">Action Initiated</span>
            <Send className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display mt-2">
            {statsSummary.action + statsSummary.investigation}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">In active enquiry/audit</span>
        </Card>

        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
            <span className="font-semibold">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display mt-2">
            {statsSummary.resolved}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Field verified complete</span>
        </Card>
      </div>

      {/* Advanced Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          {/* Live Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search by title, village, citizen name, or MPLADS Work ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
            />
          </div>

          {/* Quick Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProblems}
            disabled={isLoading}
            className="h-9 px-3 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
            title="Refresh issues list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="ml-1.5 hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* State Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">State</label>
            <select
              value={selectedState}
              onChange={(e) => handleTopStateChange(e.target.value)}
              className="w-full text-xs h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="ALL">All States ({geoHierarchy.states?.length || 36})</option>
              {(geoHierarchy.states || []).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Constituency Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Constituency</label>
            <select
              value={selectedConstituency}
              onChange={(e) => setSelectedConstituency(e.target.value)}
              className="w-full text-xs h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="ALL">All Constituencies ({topFilterConstituencies.length})</option>
              {topFilterConstituencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Action Initiated">Action Initiated</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Problems Feed */}
      {isLoading ? (
        <div className="space-y-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60" />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No citizen grievances found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No complaints match your active filter criteria. Try clearing search keywords or switching state/constituency.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedState('ALL');
              setSelectedConstituency('ALL');
              setStatusFilter('ALL');
              setCategoryFilter('All Categories');
              setSearchQuery('');
            }}
            className="h-8 text-xs rounded-xl cursor-pointer"
          >
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing <strong>{problems.length}</strong> grievances matching criteria</span>
            <span>Sorted by most recent submission</span>
          </div>

          <div className="space-y-3.5">
            {problems.map((p) => {
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
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-600" />
                          <strong className="text-slate-800 dark:text-slate-200">{p.constituency}</strong>
                          {p.state && `, ${p.state}`}
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

                    {/* Sanctioned Work Title (if present) */}
                    {p.work_title && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800 w-fit">
                        <Landmark className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Sanctioned Work:</span>
                        <span className="truncate max-w-md">{p.work_title}</span>
                      </div>
                    )}

                    {/* Attached Photo Proof Thumbnail (if present) */}
                    {p.photo_proof && (
                      <div className="pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">
                          <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Attached Photo Evidence:</span>
                        </div>
                        <div
                          onClick={() => setPreviewingPhoto({ url: p.photo_proof, title: p.title })}
                          className="group relative inline-block cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all duration-200 bg-slate-100 dark:bg-slate-800"
                          title="Click to view full photo evidence"
                        >
                          <img
                            src={p.photo_proof}
                            alt="Citizen grievance photo proof"
                            className="h-24 w-36 sm:h-28 sm:w-44 object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Expand</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Citizen Info & Linked Work */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Raised by: <strong className="text-slate-700 dark:text-slate-300 font-medium">{p.citizen_name || 'Concerned Citizen'}</strong>
                        </span>
                        {p.contact_masked && (
                          <span className="text-slate-400 text-[11px]">({p.contact_masked})</span>
                        )}
                      </div>

                      {p.work_id && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">Linked Work:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenWork) onOpenWork(p.work_id);
                            }}
                            title={`Inspect official MoSPI Case Packet & Audit Dossier for Work #${p.work_id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:border-amber-500 cursor-pointer shadow-xs active:scale-95 transition-all group"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                            <span>#{p.work_id}</span>
                            <span className="text-[10px] font-sans font-medium text-amber-800 dark:text-amber-300 opacity-90 underline underline-offset-2">
                              Inspect Case Packet
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                          </button>
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
                                : `Official MP Response for ${p.constituency}`}
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
        </div>
      )}

      {/* Citizen Report Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                  Report Civic Grievance to MP & Auditor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Submissions are routed directly to the elected Lok Sabha MP and the District Authority auditor desk.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateProblem} className="space-y-4">
              {/* Constituency Selection Section (GPS or Step-by-Step) */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3.5 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Select Target Constituency</span>
                  </label>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setConstituencySelectMode('steps')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        constituencySelectMode === 'steps'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      Step-by-Step
                    </button>
                    <button
                      type="button"
                      onClick={() => setConstituencySelectMode('gps')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                        constituencySelectMode === 'gps'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <Navigation className="w-3 h-3" />
                      Auto GPS
                    </button>
                  </div>
                </div>

                {/* Mode A: GPS Auto-Detect */}
                {constituencySelectMode === 'gps' && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">One-Tap Geolocation</p>
                        <p className="text-[11px] text-slate-500">Detects your Lok Sabha constituency and local MP using browser GPS.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs gap-1.5 cursor-pointer shrink-0"
                      >
                        <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'Detecting...' : 'Detect My Location'}</span>
                      </Button>
                    </div>

                    {locationSuccessInfo && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1 animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Successfully Located: {locationSuccessInfo.constituency}</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          District: <strong>{locationSuccessInfo.district || locationSuccessInfo.constituency}</strong> | State: <strong>{locationSuccessInfo.state}</strong>
                          {locationSuccessInfo.mp_name && (
                            <span> | Routed to MP: <strong>{locationSuccessInfo.mp_name}</strong></span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode B: Step-by-Step Selection */}
                {constituencySelectMode === 'steps' && (
                  <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Step 1: State */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          1. State / UT
                        </label>
                        <select
                          value={modalGeoState}
                          onChange={(e) => handleModalStateChange(e.target.value)}
                          className="w-full text-xs h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                        >
                          {(geoHierarchy.states?.length > 0 ? geoHierarchy.states : ['West Bengal', 'Rajasthan', 'Uttar Pradesh']).map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Step 2: District */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          2. District
                        </label>
                        <select
                          value={modalGeoDistrict}
                          onChange={(e) => handleModalDistrictChange(e.target.value)}
                          className="w-full text-xs h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                        >
                          {(geoHierarchy.districts_by_state[modalGeoState] || ['Kolkata', 'Darjeeling', 'Howrah']).map((dist) => (
                            <option key={dist} value={dist}>
                              {dist}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Step 3: Lok Sabha Constituency */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          3. Lok Sabha Seat
                        </label>
                        <select
                          value={newProblem.constituency}
                          onChange={(e) => handleModalConstituencyChange(e.target.value)}
                          className="w-full text-xs h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                        >
                          {(
                            geoHierarchy.constituencies_by_state[modalGeoState]?.filter(
                              (c) => !modalGeoDistrict || c.district === modalGeoDistrict
                            ).length > 0
                              ? geoHierarchy.constituencies_by_state[modalGeoState].filter(
                                  (c) => !modalGeoDistrict || c.district === modalGeoDistrict
                                )
                              : geoHierarchy.constituencies_by_state[modalGeoState] || [{ constituency: 'KOLKATA DAKSHIN', mp_name: 'Mala Roy' }]
                          ).map((c) => (
                            <option key={c.constituency} value={c.constituency}>
                              {c.constituency} {c.mp_name ? `(${c.mp_name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Representative info badge */}
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      <span>
                        Target: <strong className="text-slate-900 dark:text-slate-100">{newProblem.constituency}</strong> ({newProblem.state})
                      </span>
                      {modalMPName && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                          <Building className="w-3 h-3" /> MP: {modalMPName}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Issue Title */}
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

              {/* Category Selection with 'Others' Option */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category <span className="text-rose-500">*</span>
                  </label>
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
                      <SelectItem value="Others" className="text-xs font-semibold text-indigo-600">Others (Specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newProblem.category === 'Others' && (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Specify Category Details <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Park maintenance, flood drain overflow, sports ground repair..."
                      value={otherCategoryDetail}
                      onChange={(e) => setOtherCategoryDetail(e.target.value)}
                      className="text-xs h-9 rounded-xl border-indigo-200 focus:border-indigo-500 bg-indigo-50/20"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Detailed Description */}
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

              {/* Photo Proof Upload Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    Attach Photo Proof (Optional)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">JPEG, PNG, WEBP (Auto-compressed)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {!photoProof ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-indigo-50/30 transition-all cursor-pointer text-center group"
                  >
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:border-indigo-300 text-slate-500 group-hover:text-indigo-600 transition-colors shadow-2xs">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                      Click to upload photo evidence from device or camera
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Provides verifiable visual proof to MP and district auditors
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/30 dark:border-indigo-900 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={photoProof}
                        alt="Proof thumbnail"
                        className="w-12 h-12 rounded-lg object-cover border border-indigo-200 dark:border-indigo-800 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 truncate">
                          {photoMeta?.name || 'photo_proof.jpg'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-indigo-600 dark:text-indigo-400">
                          <span className="flex items-center gap-0.5">
                            <Check className="w-3 h-3 text-emerald-600" /> Attached
                          </span>
                          <span>•</span>
                          <span>{photoMeta?.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 px-2 text-[11px] text-indigo-700 hover:bg-indigo-100 rounded-lg cursor-pointer"
                      >
                        Change
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleRemovePhoto}
                        className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Work ID */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Linked MPLADS Work ID (Optional)
                </label>
                <Input
                  placeholder="e.g. 152872 (Official MoSPI Work ID)"
                  value={newProblem.work_id}
                  onChange={(e) => setNewProblem({ ...newProblem, work_id: e.target.value })}
                  className="text-xs h-9 rounded-xl border-slate-200 font-mono"
                />
              </div>

              {/* Citizen Name & Phone */}
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

              {/* Action Buttons */}
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

      {/* Full-size Photo Preview Lightbox */}
      {previewingPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewingPhoto(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-4 relative overflow-hidden space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 font-display">
                  {previewingPhoto.title || 'Civic Grievance Photo Evidence'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingPhoto(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewingPhoto.url}
                alt="Grievance evidence proof preview"
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
              <span>Verified field photo proof submitted by citizen</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewingPhoto(null)}
                className="h-7 text-xs rounded-lg"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
