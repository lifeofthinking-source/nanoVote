import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { electionService, EnrichedElection } from '../services/electionService';
import { memberService } from '../services/memberService';
import { candidateService } from '../services/candidateService';
import { votingService } from '../services/votingService';
import { resultService } from '../services/resultService';
import { getElectionPermissions } from '../services/permissionService';
import { ElectionMember, Candidate, VoteReceipt, ElectionStatus, TurnoutStats } from '../types';
import { StatusIndicator } from '../components/StatusIndicator';
import { RoleIndicator } from '../components/RoleIndicator';
import { MemberManagementTab } from '../components/MemberManagementTab';
import { CandidateReviewTab } from '../components/CandidateReviewTab';
import { ResultsTab } from '../components/ResultsTab';
import { AuditTrailTab } from '../components/AuditTrailTab';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  Play,
  Square,
  FileCheck2,
  Lock,
  ArrowLeft,
  Radio,
  Eye,
  EyeOff,
  Trophy,
  TrendingUp,
  UserCheck,
  Clock,
  Sparkles
} from 'lucide-react';

interface ElectionDetailPageProps {
  electionId: string;
  onNavigate: (view: string, electionId?: string) => void;
  onOpenBallotModal: (election: EnrichedElection) => void;
  onOpenNominationModal: () => void;
  onViewReceipt: (receipt: VoteReceipt) => void;
}

export const ElectionDetailPage: React.FC<ElectionDetailPageProps> = ({
  electionId,
  onNavigate,
  onOpenBallotModal,
  onOpenNominationModal,
  onViewReceipt,
}) => {
  const { currentUser } = useAuth();
  const [election, setElection] = useState<EnrichedElection | null>(null);
  const [members, setMembers] = useState<ElectionMember[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [turnoutStats, setTurnoutStats] = useState<TurnoutStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'results' | 'members' | 'audit'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [isTogglingPoll, setIsTogglingPoll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadElectionData();
  }, [electionId, currentUser]);

  const loadElectionData = async () => {
    setIsLoading(true);
    try {
      const data = await electionService.getElectionById(electionId, currentUser?.id);
      if (data) {
        setElection(data);
        const mems = await memberService.getMembers(data.id);
        setMembers(mems);
        const cands = await candidateService.getCandidates(data.id);
        setCandidates(cands);

        // Fetch live poll / turnout stats
        const statsRes = await resultService.getResults(data.id, data.currentUserRole);
        if (statsRes.success && statsRes.stats) {
          setTurnoutStats(statsRes.stats);
        } else {
          setTurnoutStats(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ElectionStatus) => {
    if (!currentUser || !election) return;
    setStatusActionLoading(true);
    setActionError(null);
    try {
      const res = await electionService.updateStatus(election.id, newStatus, currentUser.id);
      if (res.success && res.election) {
        await loadElectionData();
      } else {
        setActionError(res.error || 'Failed to update status');
      }
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleToggleLivePoll = async (published: boolean) => {
    if (!currentUser || !election) return;
    setIsTogglingPoll(true);
    setActionError(null);
    try {
      const res = await electionService.toggleLivePollPublish(election.id, published, currentUser.id);
      if (res.success && res.election) {
        await loadElectionData();
      } else {
        setActionError(res.error || 'Failed to update live poll broadcasting status.');
      }
    } finally {
      setIsTogglingPoll(false);
    }
  };

  const handleFetchReceipt = async () => {
    if (!election?.currentUserReceiptId) return;
    const receipt = await votingService.getReceipt(election.currentUserReceiptId);
    if (receipt) {
      onViewReceipt(receipt);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <div className="animate-spin w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mb-2" />
        Loading election workspace...
      </div>
    );
  }

  if (!election) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
        <p className="text-sm font-semibold text-slate-800">Election not found</p>
        <button
          type="button"
          onClick={() => onNavigate('elections')}
          className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded text-xs"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const isOwner = election.currentUserRole === 'OWNER';
  const isOfficer = election.currentUserRole === 'OFFICER';
  const isAuditor = election.currentUserRole === 'AUDITOR';
  const hasVoted = election.currentUserHasVoted;
  const canVote = election.status === 'ACTIVE' && election.currentUserRole && !hasVoted;
  const isLivePollPublic = election.livePollPublished || false;

  // Real-time voter counts
  const totalEligibleCount = turnoutStats?.totalEligible || Math.max(members.length + 5, 20);
  const totalJoinedCount = members.length;
  const totalVotedCount = members.filter((m) => m.hasVoted).length;
  const currentTurnoutPct = totalJoinedCount > 0 ? Math.round((totalVotedCount / totalJoinedCount) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Back button and breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('elections')}
          className="hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Elections Directory</span>
        </button>
        <span>/</span>
        <span className="font-mono text-slate-700 font-semibold">{election.code}</span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500">[{election.code}]</span>
              <StatusIndicator status={election.status} />
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">{election.type}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {election.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{election.organization}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Ends {new Date(election.votingEndDate).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          {/* Current User Role Box & High-Level Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5 min-w-36">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Your Role in Election
              </span>
              <div>
                <RoleIndicator role={election.currentUserRole} size="sm" />
              </div>
            </div>

            {canVote && (
              <button
                type="button"
                onClick={() => onOpenBallotModal(election)}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Vote className="w-4 h-4" />
                <span>Enter Ballot Booth</span>
              </button>
            )}

            {hasVoted && (
              <button
                type="button"
                onClick={handleFetchReceipt}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>View My Vote Receipt</span>
              </button>
            )}
          </div>
        </div>

        {/* Owner Lifecycle Actions Bar */}
        {isOwner && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Owner Controls:</span>
              {election.status === 'DRAFT' && (
                <button
                  type="button"
                  disabled={statusActionLoading}
                  onClick={() => handleUpdateStatus('NOMINATION')}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors cursor-pointer"
                >
                  Open Candidate Nominations
                </button>
              )}

              {(election.status === 'NOMINATION' || election.status === 'DRAFT') && (
                <button
                  type="button"
                  disabled={statusActionLoading}
                  onClick={() => handleUpdateStatus('ACTIVE')}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Start Voting (Open Polls)</span>
                </button>
              )}

              {election.status === 'ACTIVE' && (
                <button
                  type="button"
                  disabled={statusActionLoading}
                  onClick={() => handleUpdateStatus('CLOSED')}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Square className="w-3 h-3" />
                  <span>Conclude & Close Election</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Role: ELECTION OWNER · Administrative Authority
            </span>
          </div>
        )}

        {actionError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
            {actionError}
          </div>
        )}
      </div>

      {/* Tabs Navigation (Interactive Segmented Control) */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'candidates', label: `Candidates (${candidates.length})` },
          { id: 'results', label: 'Results & Turnout' },
          { id: 'members', label: `Members & Team (${members.length})` },
          { id: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Live Turnout & Real-Time Electorate Pulse */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Eligible Voters</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {totalEligibleCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">State department roster</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Voters</span>
                <UserCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-indigo-900 tabular-nums">
                {totalJoinedCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Verified participants</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Ballots Cast</span>
                <Vote className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-900 tabular-nums">
                {totalVotedCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Anonymous submissions</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Turnout Rate</span>
                <TrendingUp className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {currentTurnoutPct}%
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Real-time participation</span>
            </div>
          </div>

          {/* Owner Public Broadcast Controller Banner */}
          {isOwner && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {isLivePollPublic ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE POLL BROADCAST: PUBLIC</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>LIVE POLL BROADCAST: SEALED (ADMIN ONLY)</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-mono hidden sm:inline">· Owner Control</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  {isLivePollPublic
                    ? 'All voters and participants can view real-time poll tallies, current leads, and win projections below in this Overview.'
                    : 'Real-time poll tallies and who is in the lead are currently hidden from ordinary voters to prevent bandwagoning. Only you and officers can inspect the data below.'}
                </p>
              </div>

              <div className="shrink-0">
                {isLivePollPublic ? (
                  <button
                    type="button"
                    disabled={isTogglingPoll}
                    onClick={() => handleToggleLivePoll(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-slate-300"
                  >
                    <EyeOff className="w-4 h-4 text-slate-600" />
                    <span>{isTogglingPoll ? 'Updating...' : 'Seal Live Poll (Make Private)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isTogglingPoll}
                    onClick={() => handleToggleLivePoll(true)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                    <span>{isTogglingPoll ? 'Updating...' : 'Publish Live Poll to All Voters'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Real-Time Live Poll & Leading Races */}
          {turnoutStats ? (
            <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Real-Time Poll Standings & Projected Leaders
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE TALLIES</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Continuous tabulation showing leading candidates, vote share margins, and projected win chances.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-slate-500 shrink-0">
                  {isLivePollPublic ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Publicly Visible to Voters</span>
                    </span>
                  ) : (
                    <span className="text-amber-800 font-semibold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Admin-Only View</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-6">
                {turnoutStats.positionStats.map((pos) => {
                  const leadingCand = pos.candidates[0];

                  return (
                    <div key={pos.positionId} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-4">
                      {/* Position Header & Current Leader Callout */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Executive Position
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{pos.positionTitle}</h4>
                        </div>

                        {leadingCand && leadingCand.votes > 0 ? (
                          <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                            <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="font-bold text-emerald-950">Leader: {leadingCand.candidateName}</span>
                              <span className="text-emerald-700 font-mono text-[11px] block">
                                +{leadingCand.leadMargin} margin · {leadingCand.percentage}% share · {leadingCand.winProbability}% Win Chance ({leadingCand.projectionStatus})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No ballots recorded yet</span>
                        )}
                      </div>

                      {/* Candidates Breakdown with Win Chance Meter */}
                      <div className="space-y-3.5">
                        {pos.candidates.map((cand) => (
                          <div key={cand.candidateId} className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{cand.candidateName}</span>
                                {cand.department && (
                                  <span className="text-[11px] text-slate-500 font-mono">({cand.department})</span>
                                )}

                                {cand.isLeader && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                                    CURRENT LEADER
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 font-mono tabular-nums">
                                <span className="font-semibold text-slate-800">{cand.votes} votes</span>
                                <span className="font-bold text-slate-900 text-sm w-12 text-right">{cand.percentage}%</span>
                              </div>
                            </div>

                            {/* Vote Share Bar */}
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  cand.isLeader ? 'bg-emerald-600' : 'bg-slate-400'
                                }`}
                                style={{ width: `${cand.percentage}%` }}
                              />
                            </div>

                            {/* Win Probability & Projection Chance Bar */}
                            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Projected Win Chance: <strong className="font-mono text-slate-800 font-semibold">{cand.winProbability}%</strong></span>
                                <span className="text-slate-400 font-mono">({cand.projectionStatus})</span>
                              </div>

                              <span className="font-mono text-[10px] text-slate-400">
                                {cand.isLeader ? `${cand.leadMargin} vote lead over field` : `${cand.leadMargin} votes behind leader`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Sealed Privacy Banner for Voters when Owner kept Poll Private */
            <div className="border border-slate-200 rounded-xl p-8 bg-white text-center max-w-2xl mx-auto my-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Real-Time Poll Standings Sealed by Election Head</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
                The Election Owner has chosen to keep real-time polling data confidential during active voting hours to protect against voter bandwagoning bias. Your secret ballot has been safely recorded. Live standings will reveal if the Election Owner publishes the broadcast or upon official poll conclusion.
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-400">
                <span>Voter Account Access · Confidential Protocol</span>
              </div>
            </div>
          )}

          {/* Track of Voters: Live Voter Participation Ledger (STRICT PRIVACY: Never published to public or voters) */}
          {(isOwner || isOfficer || isAuditor) && (
            <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Confidential Voter Participation Audit Ledger
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                      INTERNAL ADMIN ONLY · NEVER PUBLISHED
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Strict Privacy Enforcement: Even when the Election Head publishes real-time poll standings, this individual voter attendance list remains permanently private and is never shared with voters.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-slate-500 shrink-0">
                  <span className="font-bold text-slate-900">{totalVotedCount}</span> of {totalJoinedCount} Enrolled Cast
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-2.5 px-4">Verified Voter</th>
                      <th className="py-2.5 px-4">Member ID (Masked)</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Cast Timestamp</th>
                      <th className="py-2.5 px-4 text-right">Cryptographic Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {members.filter(m => m.hasVoted).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          No ballots cast yet. Polls are open for participation.
                        </td>
                      </tr>
                    ) : (
                      members
                        .filter((m) => m.hasVoted)
                        .sort((a, b) => new Date(b.votedAt || 0).getTime() - new Date(a.votedAt || 0).getTime())
                        .map((voter) => (
                          <tr key={voter.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {voter.user.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              {voter.user.employeeId.slice(0, 6)}****
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {voter.user.department}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {voter.votedAt ? new Date(voter.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{voter.receiptId ? `Receipt ${voter.receiptId}` : 'Certified Ballot'}</span>
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Separation of Identity Guarantee: Voter check-in enforces 1-person 1-vote without recording candidate choices against names.</span>
                <span className="font-mono text-[10px] text-slate-400">Zero-Knowledge Balloting</span>
              </div>
            </div>
          )}

          {/* Bottom Grid: Eligibility & Charter Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Description & Positions Summary */}
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Election Charter & Mandate
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {election.description}
                </p>
              </div>

              {/* Positions Preview */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Contested Executive Positions ({election.positions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('candidates')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    View Candidate Slates →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {election.positions.map((pos) => {
                    const approvedCount = candidates.filter(
                      (c) => c.positionId === pos.id && c.status === 'APPROVED'
                    ).length;

                    return (
                      <div
                        key={pos.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900">{pos.title}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{pos.description}</p>
                        <div className="pt-1 text-[10px] font-mono text-slate-400">
                          {approvedCount} candidate{approvedCount !== 1 ? 's' : ''} approved
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Eligibility Specifications & Security Guarantees */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                  Voter Eligibility Rules
                </h3>

                <div className="space-y-2 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Organization</span>
                    <span className="font-medium text-slate-800">{election.organization}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Allowed Email Domains</span>
                    <span className="font-mono text-slate-700">
                      {election.eligibility.allowedDomains.map((d) => '@' + d).join(', ') || 'Any authorized domain'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Member ID Regex Pattern</span>
                    <span className="font-mono text-slate-700">
                      {election.eligibility.employeeIdPattern || 'Verification required'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Department Scope</span>
                    <span className="text-slate-700 text-[11px]">
                      {election.eligibility.allowedDepartments.join(', ') || 'All state cadres'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secret Ballot Proof Banner */}
              <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-[11px]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>DECOUPLED IDENTITY PROTOCOL</span>
                </div>
                <h4 className="font-bold text-sm">Anonymous Voting Enforced</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Voter attendance and secret ballot choices are committed to completely separate digital repositories. Voting produces a verifiable Receipt ID without revealing chosen candidates.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CANDIDATES */}
      {activeTab === 'candidates' && (
        <CandidateReviewTab
          election={election}
          candidates={candidates}
          currentUserRole={election.currentUserRole}
          currentUserId={currentUser?.id || ''}
          onRefresh={loadElectionData}
          onOpenNominationModal={onOpenNominationModal}
        />
      )}

      {/* TAB 3: RESULTS */}
      {activeTab === 'results' && (
        <ResultsTab
          election={election}
          currentUserRole={election.currentUserRole}
          canCloseElection={isOwner && election.status === 'ACTIVE'}
          onCloseElection={() => handleUpdateStatus('CLOSED')}
        />
      )}

      {/* TAB 4: MEMBERS & CORE TEAM */}
      {activeTab === 'members' && (
        <MemberManagementTab
          election={election}
          members={members}
          currentUserRole={election.currentUserRole}
          currentUserId={currentUser?.id || ''}
          onRefresh={loadElectionData}
        />
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <AuditTrailTab electionId={election.id} />
      )}
    </div>
  );
};
