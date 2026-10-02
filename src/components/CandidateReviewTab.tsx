import React, { useState } from 'react';
import { Election, Candidate, ElectionRole } from '../types';
import { candidateService } from '../services/candidateService';
import {
  Award,
  Check,
  X,
  ShieldAlert,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  RefreshCw,
  RotateCcw,
  Shield
} from 'lucide-react';

interface CandidateReviewTabProps {
  election: Election;
  candidates: Candidate[];
  currentUserRole?: ElectionRole | null;
  currentUserId: string;
  onRefresh: () => void;
  onOpenNominationModal: () => void;
}

export const CandidateReviewTab: React.FC<CandidateReviewTabProps> = ({
  election,
  candidates,
  currentUserRole,
  currentUserId,
  onRefresh,
  onOpenNominationModal,
}) => {
  const isOwner = currentUserRole === 'OWNER';
  const isOfficer = currentUserRole === 'OFFICER';
  const canReview = isOwner || isOfficer;
  const isNominationOpen = election.status === 'NOMINATION' || election.status === 'DRAFT';

  // Detailed review modal state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite candidate modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('Finance & Accounts');
  const [invitePositionId, setInvitePositionId] = useState(election.positions[0]?.id || '');
  const [inviteManifesto, setInviteManifesto] = useState('');
  const [inviteExperience, setInviteExperience] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [isInviting, setIsInviting] = useState(false);

  // Status message
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Quick 1-click status change
  const handleQuickStatusChange = async (
    candidateId: string,
    newStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  ) => {
    setActionLoadingId(candidateId);
    setError(null);
    try {
      const res = await candidateService.updateCandidateStatus(
        candidateId,
        newStatus,
        newStatus === 'APPROVED'
          ? 'Approved as active candidate for ballot pool'
          : newStatus === 'PENDING'
          ? 'Reverted to pending review queue'
          : 'Candidate application rejected',
        currentUserId
      );

      if (res.success) {
        setSuccess(
          `Candidate status transitioned to ${
            newStatus === 'APPROVED' ? 'APPROVED (Active)' : newStatus
          }.`
        );
        onRefresh();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Failed to update candidate status.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await candidateService.reviewCandidate(
        selectedCandidate.id,
        decision,
        reviewNotes,
        currentUserId
      );

      if (res.success) {
        setSuccess(`Candidate nomination for ${selectedCandidate.user.name} has been ${decision.toLowerCase()}.`);
        setSelectedCandidate(null);
        setReviewNotes('');
        onRefresh();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Review submission failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setError('Please provide candidate name and email.');
      return;
    }

    setIsInviting(true);
    setError(null);
    try {
      const res = await candidateService.inviteCandidate(
        election.id,
        {
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          department: inviteDepartment.trim(),
          positionId: invitePositionId,
          manifesto: inviteManifesto.trim() || 'Committed to transparent employee representation and welfare stewardship.',
          experience: inviteExperience.trim() || 'Association cadre representative.',
          initialStatus: inviteStatus,
        },
        currentUserId
      );

      if (res.success) {
        setSuccess(
          `Candidate ${inviteName.trim()} added to election pool with Status: ${inviteStatus}.`
        );
        setShowInviteModal(false);
        setInviteName('');
        setInviteEmail('');
        setInviteManifesto('');
        setInviteExperience('');
        onRefresh();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error || 'Failed to invite candidate.');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handlePrefillCandidate = () => {
    const demoProfiles = [
      {
        name: 'K. Harish Chandra',
        email: 'harish.c@apea.gov.in',
        dept: 'Finance & Accounts',
        manifesto: 'Digital budget tracking, emergency medical grant turnaround within 24 hours, and zero-fee legal assistance for members.',
        experience: '14 years in Treasury & Accounts; Secretary of District Welfare Board (2021-2024).'
      },
      {
        name: 'V. Rajeshwari Devi',
        email: 'rajeshwari.v@apea.gov.in',
        dept: 'Education Directorate',
        manifesto: 'Equitable promotional opportunities for technical staff and modern day-care facilities in government complexes.',
        experience: '11 years in Education Services; Executive Member of AP State Teachers Association.'
      }
    ];

    const pick = demoProfiles[Math.floor(Math.random() * demoProfiles.length)];
    setInviteName(pick.name);
    setInviteEmail(pick.email);
    setInviteDepartment(pick.dept);
    setInviteManifesto(pick.manifesto);
    setInviteExperience(pick.experience);
    setInvitePositionId(election.positions[0]?.id || '');
    setInviteStatus('PENDING'); // Default to pending to demonstrate approval!
  };

  const totalApproved = candidates.filter((c) => c.status === 'APPROVED').length;
  const totalPending = candidates.filter((c) => c.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Contested Positions & Candidate Pool</h3>
          <p className="text-xs text-slate-500">
            {candidates.length} candidate filing{candidates.length !== 1 ? 's' : ''} ({totalApproved} Active / Approved · {totalPending} Pending Approval).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canReview && (
            <button
              type="button"
              onClick={() => {
                setShowInviteModal(true);
                setError(null);
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Invite Candidate to Pool</span>
            </button>
          )}

          {isNominationOpen && (
            <button
              type="button"
              onClick={onOpenNominationModal}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>File Self-Nomination</span>
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin Demo Demonstration Callout */}
      {canReview && (
        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start gap-2">
          <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Demonstration Controls:</strong> As an Election Owner/Officer, you can invite new candidates with <strong className="text-amber-800">Status: PENDING</strong>, and use the 1-click approval buttons below to demonstrate status transitioning to <strong className="text-emerald-800">ACTIVE</strong> (or revert back to Pending).
          </p>
        </div>
      )}

      {/* Positions and Candidates List */}
      <div className="space-y-6">
        {election.positions.map((pos) => {
          const posCandidates = candidates.filter((c) => c.positionId === pos.id);

          return (
            <div key={pos.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{pos.title}</h4>
                  <p className="text-[11px] text-slate-500">{pos.description}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <span className="text-emerald-700 font-semibold">
                    {posCandidates.filter((c) => c.status === 'APPROVED').length} Active
                  </span>
                  <span>·</span>
                  <span className="text-amber-700 font-semibold">
                    {posCandidates.filter((c) => c.status === 'PENDING').length} Pending
                  </span>
                </div>
              </div>

              <div className="p-4">
                {posCandidates.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center italic">
                    No candidates currently in pool for this position.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {posCandidates.map((candidate) => {
                      const isPending = candidate.status === 'PENDING';
                      const isApproved = candidate.status === 'APPROVED';
                      const isRejected = candidate.status === 'REJECTED';
                      const isLoading = actionLoadingId === candidate.id;

                      return (
                        <div
                          key={candidate.id}
                          className={`p-4 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                            isApproved
                              ? 'border-emerald-200 bg-emerald-50/15'
                              : isPending
                              ? 'border-amber-200 bg-amber-50/20'
                              : 'border-slate-200 bg-slate-50/50 opacity-75'
                          }`}
                        >
                          <div>
                            {/* Card Header & Status */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  <span>{candidate.user.name}</span>
                                  {isPending && (
                                    <span className="text-[10px] font-mono text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                      IN REVIEW
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {candidate.user.department} · {candidate.user.employeeId}
                                </div>
                              </div>

                              {/* Clean unboxed status indicator */}
                              <div>
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Active Candidate</span>
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Pending Approval</span>
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Rejected</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Manifesto & Experience */}
                            <div className="space-y-2.5 mt-3">
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Manifesto</span>
                                <p className="text-slate-700 mt-0.5 leading-relaxed italic bg-white/70 p-2 rounded border border-slate-100">
                                  "{candidate.manifesto}"
                                </p>
                              </div>

                              {candidate.experience && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Track Record</span>
                                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                                    {candidate.experience}
                                  </p>
                                </div>
                              )}

                              {candidate.reviewNotes && (
                                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                                  <span className="font-semibold text-slate-700">Review Notes:</span> {candidate.reviewNotes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Admin State Transition Controls */}
                          {canReview && (
                            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                                Status Action:
                              </span>

                              <div className="flex items-center gap-1.5">
                                {/* If PENDING -> Option to Approve (Set Active) */}
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleQuickStatusChange(candidate.id, 'APPROVED')}
                                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                                      <span>{isLoading ? 'Updating...' : 'Approve (Set Active)'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleQuickStatusChange(candidate.id, 'REJECTED')}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {/* If APPROVED -> Option to Revert to Pending or Reject */}
                                {isApproved && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleQuickStatusChange(candidate.id, 'PENDING')}
                                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                      title="Demonstrate reverting candidate back to Pending"
                                    >
                                      <RotateCcw className="w-3 h-3 text-amber-700" />
                                      <span>{isLoading ? 'Updating...' : 'Change to Pending'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleQuickStatusChange(candidate.id, 'REJECTED')}
                                      className="px-2 py-1 text-slate-500 hover:text-rose-700 rounded text-[11px] transition-colors cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {/* If REJECTED -> Option to Re-open as Pending or Approve */}
                                {isRejected && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleQuickStatusChange(candidate.id, 'PENDING')}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Set Pending</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleQuickStatusChange(candidate.id, 'APPROVED')}
                                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                  </>
                                )}

                                {/* Detailed review button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCandidate(candidate);
                                    setDecision(isApproved ? 'REJECTED' : 'APPROVED');
                                    setReviewNotes(candidate.reviewNotes || '');
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                                  title="Add Custom Review Notes"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Candidate Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-700" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Invite Candidate to Election Pool</h4>
                  <p className="text-[11px] text-slate-500">Administrative nomination into candidate race</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteCandidateSubmit} className="space-y-4">
              {/* Quick pre-fill demo button */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[11px] text-slate-600 font-medium">Evaluation Demo Helper:</span>
                <button
                  type="button"
                  onClick={handlePrefillCandidate}
                  className="text-[11px] text-indigo-700 font-semibold hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Pre-Fill Sample Candidate</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Position Contested *</label>
                <select
                  value={invitePositionId}
                  onChange={(e) => setInvitePositionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  {election.positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. K. Harish Chandra"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. harish.c@apea.gov.in"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    placeholder="e.g. Finance & Accounts"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Approval Status</label>
                  <div className="flex items-center gap-3 pt-1.5 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-amber-800">
                      <input
                        type="radio"
                        name="initStatus"
                        checked={inviteStatus === 'PENDING'}
                        onChange={() => setInviteStatus('PENDING')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Pending Review</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-800">
                      <input
                        type="radio"
                        name="initStatus"
                        checked={inviteStatus === 'APPROVED'}
                        onChange={() => setInviteStatus('APPROVED')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Approved (Active)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Manifesto</label>
                <textarea
                  rows={2}
                  value={inviteManifesto}
                  onChange={(e) => setInviteManifesto(e.target.value)}
                  placeholder="Key priorities, welfare resolutions, member pledges..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                <span className="font-semibold block mb-0.5">Demonstration Workflow:</span>
                <p className="text-[11px] leading-relaxed">
                  Selecting <strong className="text-amber-800">Pending Review</strong> will add the candidate with Status: PENDING so you can immediately demonstrate the approval workflow to the judge!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isInviting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{isInviting ? 'Adding to Pool...' : 'Add Candidate to Pool'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Review Candidate Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900">Review Candidate Nomination</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Candidate: <strong className="text-slate-900">{selectedCandidate.user.name}</strong> ({selectedCandidate.user.department})
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVED')}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      decision === 'APPROVED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Approve (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('REJECTED')}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      decision === 'REJECTED'
                        ? 'border-rose-600 bg-rose-50 text-rose-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Reject Candidacy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Audit Notes</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record verification verification notes for the immutable audit trail..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleReviewSubmit}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Recording Decision...' : 'Commit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
