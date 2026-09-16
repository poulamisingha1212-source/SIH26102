import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import PriorityQueue from './components/PriorityQueue';
import CasePacketModal from './components/CasePacketModal';
import PortfolioOverview from './components/PortfolioOverview';
import MPDirectory from './components/MPDirectory';
import StatesView from './components/StatesView';
import CompareView from './components/CompareView';
import MPProfileModal from './components/MPProfileModal';
import { Toaster } from '@/components/ui/sonner';
import { DotPattern } from '@/components/magicui/dot-pattern';
import { apiFetch, clearAuthToken } from '@/lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentRole, setCurrentRole] = useState('Read-Only Public Tier');
  const [loggedInUser, setLoggedInUser] = useState('');

  // Login modal state
  const [pendingRole, setPendingRole] = useState(null);

  const handleRoleSelect = (selectedRole) => {
    if (selectedRole === 'Read-Only Public Tier') {
      clearAuthToken();
      setCurrentRole('Read-Only Public Tier');
      setLoggedInUser('');
      toast.info('Switched to Read-Only Public Tier');
    } else {
      if (loggedInUser && currentRole === selectedRole) {
        return;
      }
      setPendingRole(selectedRole);
    }
  };

  const handleLoginSuccess = (uname, role) => {
    setCurrentRole(role);
    setLoggedInUser(uname);
    setPendingRole(null);
    toast.success(`Welcome ${uname}! Authenticated as ${role}`);
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentRole('Read-Only Public Tier');
    setLoggedInUser('');
    toast.info('Logged out to Public Tier');
  };

  // Works state (Priority Queue)
  const [works, setWorks] = useState([]);
  const [totalWorks, setTotalWorks] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingWorks, setIsLoadingWorks] = useState(true);

  // Filters — mp_name lets the MP Directory deep-link into the audit queue.
  // Global house scope: '' = Both Houses; applied to every data view.
  const [house, setHouse] = useState('');
  const [filters, setFilters] = useState({
    state: '',
    mp_name: '',
    risk_tier: '',
    work_category: '',
    search: '',
  });
  const [filterOptions, setFilterOptions] = useState({
    states: [],
    categories: [],
    statuses: [],
    mps: [],
    risk_tiers: ["High Risk - Review", "Medium Risk - Monitor", "Low Risk"]
  });

  // Selected work for Case Packet modal
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [casePacket, setCasePacket] = useState(null);
  const [isLoadingPacket, setIsLoadingPacket] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // MP profile modal state (stacks beneath the case packet modal)
  const [selectedMP, setSelectedMP] = useState(null);

  // Portfolio Overview state
  const [stats, setStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch filter options (scoped to the selected house)
  useEffect(() => {
    const qs = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/filter-options${qs}`)
      .then((res) => res.json())
      .then((data) => setFilterOptions(data))
      .catch((err) => console.error('Failed to load filter options:', err));
  }, [house]);

  // Fetch works when page, pageSize, or filters change
  useEffect(() => {
    setIsLoadingWorks(true);
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      sort_by: 'priority_rank',
      order: 'asc',
    });

    if (house) params.append('house', house);
    if (filters.state) params.append('state', filters.state);
    if (filters.mp_name) params.append('mp_name', filters.mp_name);
    if (filters.risk_tier) params.append('risk_tier', filters.risk_tier);
    if (filters.work_category) params.append('work_category', filters.work_category);
    if (filters.search) params.append('search', filters.search);

    apiFetch(`/api/works?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setWorks(data.items || []);
        setTotalWorks(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setIsLoadingWorks(false);
      })
      .catch((err) => {
        console.error('Error fetching works:', err);
        setIsLoadingWorks(false);
      });
  }, [page, pageSize, filters, house, currentRole]);

  // Fetch stats and sync status (scoped by house)
  const fetchStats = useCallback(() => {
    const hqs = house ? `?house=${encodeURIComponent(house)}` : '';
    apiFetch(`/api/stats/overview${hqs}`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error('Error fetching stats:', err));

    apiFetch('/api/sync/status')
      .then((res) => res.json())
      .then((data) => setSyncStatus(data))
      .catch((err) => console.error('Error fetching sync status:', err));
  }, [house]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle work selection for Case Packet modal
  const handleSelectWork = (workId) => {
    setSelectedWorkId(workId);
    setIsLoadingPacket(true);
    fetchCasePacket(workId);
  };

  const fetchCasePacket = (workId) => {
    apiFetch(`/api/works/${encodeURIComponent(workId)}`)
      .then((res) => res.json())
      .then((data) => {
        setCasePacket(data);
        setIsLoadingPacket(false);
      })
      .catch((err) => {
        console.error('Error fetching case packet:', err);
        setIsLoadingPacket(false);
      });
  };

  // Submit human review outcome — resolves true when the determination is recorded.
  const handleSubmitReview = async (workId, outcome, notes) => {
    setIsSubmittingReview(true);
    try {
      const res = await apiFetch(`/api/works/${encodeURIComponent(workId)}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outcome,
          notes,
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          clearAuthToken();
          setCurrentRole('Read-Only Public Tier');
          setLoggedInUser('');
          toast.error('Session expired. Please log in again.');
          setIsSubmittingReview(false);
          return false;
        }
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'Review submission failed');
        setIsSubmittingReview(false);
        return false;
      }

      // Re-fetch updated case packet & list
      const updatedRes = await apiFetch(`/api/works/${encodeURIComponent(workId)}`);
      const updatedPacket = await updatedRes.json();
      setCasePacket(updatedPacket);

      // Update in local works list
      setWorks((prev) =>
        prev.map((w) => (w.work_id === workId ? { ...w, human_review_outcome: outcome } : w))
      );

      setIsSubmittingReview(false);
      return true;
    } catch (err) {
      console.error('Review submit failed:', err);
      toast.error('Review submission failed — is the backend reachable?');
      setIsSubmittingReview(false);
      return false;
    }
  };

  // Trigger ingestion. Mode: auto | live (runs in the background server-side)
  const handleTriggerSync = async (mode = 'auto') => {
    setIsSyncing(true);
    const toastId = toast.loading(`Starting ${mode} ingestion…`);
    try {
      const res = await apiFetch(`/api/sync/run?mode=${mode}`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.detail || 'Sync failed', { id: toastId });
      } else if (result.status === 'started') {
        toast.success('Live sync started', {
          id: toastId,
          description: 'Fetching the full portal dataset takes several minutes — the audit log below updates when it finishes.',
          duration: 8000,
        });
        // Poll until the run lands so the UI reflects fresh data.
        const poll = setInterval(async () => {
          await fetchStats();
        }, 30000);
        setTimeout(() => clearInterval(poll), 20 * 60 * 1000);
      } else if (result.status === 'success') {
        toast.success(`Sync complete — ${result.source}`, {
          id: toastId,
          description: `${(result.inserted || 0).toLocaleString('en-IN')} inserted • ${(result.updated || 0).toLocaleString('en-IN')} updated`,
        });
      } else {
        toast.error(result.error || 'Sync failed — last-known-good data preserved.', { id: toastId });
      }
      fetchStats();
      setIsSyncing(false);
      return result;
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Sync failed — is the backend reachable?', { id: toastId });
      setIsSyncing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleFilterByEntity = (filterKey, filterVal) => {
    handleFilterChange(filterKey, filterVal);
    setActiveTab('queue');
  };

  // MP Directory interactions
  const handleOpenMP = useCallback((mpName) => setSelectedMP(mpName), []);
  const handleCloseMP = useCallback(() => setSelectedMP(null), []);
  const handleViewMPWorksInQueue = useCallback((mpName) => {
    setSelectedMP(null);
    handleFilterByEntity('mp_name', mpName);
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* Toast notifications */}
      <Toaster richColors position="top-right" />

      {/* Subtle dotted texture behind the whole app */}
      <DotPattern className="fixed inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_top,white_15%,transparent_65%)]" />

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        onRoleSelect={handleRoleSelect}
        syncStatus={syncStatus}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        house={house}
        setHouse={setHouse}
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
      />

      {/* Login Authentication Modal */}
      {pendingRole && (
        <LoginModal
          targetRole={pendingRole}
          onClose={() => setPendingRole(null)}
          onSuccess={handleLoginSuccess}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'queue' && (
          <PriorityQueue
            works={works}
            totalWorks={totalWorks}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setPage}
            filters={filters}
            onFilterChange={handleFilterChange}
            filterOptions={filterOptions}
            onSelectWork={handleSelectWork}
            isLoading={isLoadingWorks}
            activeFilterCount={activeFilterCount}
            house={house}
          />
        )}

        {activeTab === 'mps' && (
          <MPDirectory
            filterOptions={filterOptions}
            onOpenMP={handleOpenMP}
            house={house}
          />
        )}

        {activeTab === 'states' && (
          <StatesView
            house={house}
            onOpenMP={handleOpenMP}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            house={house}
            onOpenMP={handleOpenMP}
          />
        )}

        {activeTab === 'overview' && (
          <PortfolioOverview
            stats={stats}
            house={house}
            syncStatus={syncStatus}
            onTriggerSync={handleTriggerSync}
            isSyncing={isSyncing}
            currentRole={currentRole}
            onFilterByEntity={handleFilterByEntity}
          />
        )}


      </main>

      {/* MP Transparency Profile (opens beneath the case packet) */}
      {selectedMP && (
        <MPProfileModal
          mpName={selectedMP}
          house={house}
          onClose={handleCloseMP}
          onOpenWork={handleSelectWork}
          onViewWorksInQueue={handleViewMPWorksInQueue}
        />
      )}

      {/* Case Packet Modal — renders after the MP modal so it stacks on top */}
      {selectedWorkId && (
        <CasePacketModal
          workId={selectedWorkId}
          packet={casePacket}
          isLoading={isLoadingPacket}
          onClose={() => {
            setSelectedWorkId(null);
            setCasePacket(null);
          }}
          currentRole={currentRole}
          onSubmitReview={handleSubmitReview}
          isSubmittingReview={isSubmittingReview}
          onRefreshPacket={fetchCasePacket}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 backdrop-blur-xs py-5 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-semibold text-slate-700">JanNidhi</span>
            <span className="text-slate-300">•</span>
            <span>Ministry of Statistics and Programme Implementation (MoSPI)</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.5 rounded-md">
              SIH26102
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Decision Support System — Risk Scores are audit prioritization indicators, not definitive fraud verdicts.
          </p>
        </div>
      </footer>

    </div>
  );
}
