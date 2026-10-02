import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { electionService, EnrichedElection } from '../services/electionService';
import { memberService, EligibilityCheckResult } from '../services/memberService';
import { RoleIndicator } from '../components/RoleIndicator';
import { StatusIndicator } from '../components/StatusIndicator';
import {
  CheckCircle2,
  XCircle,
  Building2,
  ShieldCheck,
  Search,
  ArrowRight,
  AlertCircle,
  Vote,
  ExternalLink,
  UserCheck
} from 'lucide-react';

interface JoinElectionPageProps {
  initialElectionId?: string;
  onNavigate: (view: string, electionId?: string) => void;
}

export const JoinElectionPage: React.FC<JoinElectionPageProps> = ({
  initialElectionId,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const [electionCode, setElectionCode] = useState(initialElectionId || '');
  const [availableElections, setAvailableElections] = useState<EnrichedElection[]>([]);
  const [selectedElection, setSelectedElection] = useState<EnrichedElection | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadElections();
  }, [currentUser]);

  const loadElections = async () => {
    try {
      const list = await electionService.getElections(currentUser?.id);
      setAvailableElections(list);

      if (initialElectionId) {
        const match = list.find(
          (e) =>
            e.id === initialElectionId ||
            e.code.toUpperCase() === initialElectionId.toUpperCase()
        );
        if (match) {
          setSelectedElection(match);
          setElectionCode(match.code);
          if (currentUser) {
            checkEligibility(match);
          }
        }
      }
    } catch {
      setError('Unable to load elections. Please try again.');
    }
  };

  const checkEligibility = async (election: EnrichedElection) => {
    if (!currentUser) {
      setError('Please sign in or select a demo persona to verify eligibility.');
      return;
    }
    setIsChecking(true);
    setError(null);
    setEligibilityResult(null);
    try {
      const res = await memberService.checkEligibility(election.id, currentUser);
      setEligibilityResult(res);
    } catch {
      setError('Verification service check failed. Please retry.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = electionCode.trim();
    if (!query) {
      setError('Please enter an election code (e.g. APEA-2026, UNI-2026, EWC-2026).');
      setSelectedElection(null);
      setEligibilityResult(null);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsChecking(true);

    try {
      // Refresh list to ensure we have latest data
      const all = await electionService.getElections(currentUser?.id);
      setAvailableElections(all);

      const raw = query.toUpperCase();
      const cleanRaw = raw.replace(/[^A-Z0-9]/g, '');

      const match = all.find((item) => {
        const itemCode = item.code.toUpperCase();
        const cleanItemCode = itemCode.replace(/[^A-Z0-9]/g, '');
        return (
          itemCode === raw ||
          item.id === query ||
          cleanItemCode === cleanRaw ||
          itemCode.includes(raw) ||
          item.title.toUpperCase().includes(raw)
        );
      });

      if (!match) {
        setError(`No active election found for code "${query}". Try one of the suggested codes below.`);
        setSelectedElection(null);
        setEligibilityResult(null);
        setIsChecking(false);
        return;
      }

      setSelectedElection(match);
      setElectionCode(match.code);

      if (currentUser) {
        const res = await memberService.checkEligibility(match.id, currentUser);
        setEligibilityResult(res);
      } else {
        setError('Please sign in to verify your organizational eligibility.');
      }
    } catch {
      setError('An error occurred while verifying the code. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedElection || !currentUser) return;
    setIsJoining(true);
    setError(null);
    try {
      const res = await memberService.joinElection(selectedElection.id, currentUser.id);
      if (res.success) {
        setSuccessMessage(`VERIFIED: You are eligible to participate. You have joined "${selectedElection.title}" as a VOTER.`);
        setTimeout(() => {
          onNavigate('election-detail', selectedElection.id);
        }, 1400);
      } else {
        setError(res.error || 'Failed to join election');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectCode = (elec: EnrichedElection) => {
    setError(null);
    setSuccessMessage(null);
    setElectionCode(elec.code);
    setSelectedElection(elec);
    if (currentUser) {
      checkEligibility(elec);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Join Election</h1>
        <p className="text-xs text-slate-500 mt-1">
          Possessing an election code initiates automated eligibility validation. The platform checks your organizational credentials and departmental scope before admitting you as a verified participant.
        </p>
      </div>

      {/* Code Entry Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <form onSubmit={handleLookup} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Enter Election Code or Invitation Token
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={electionCode}
                onChange={(e) => setElectionCode(e.target.value)}
                placeholder="e.g. APEA-2026, UNI-2026, EWC-2026"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase tracking-wider border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isChecking}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {isChecking && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isChecking ? 'Verifying...' : 'Verify Code'}</span>
            </button>
          </div>
        </form>

        {/* Quick Click Demo Codes */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] text-slate-500 font-semibold">Available Demo Codes:</span>
          {availableElections.map((elec) => (
            <button
              key={elec.id}
              type="button"
              onClick={() => handleSelectCode(elec)}
              className={`px-2.5 py-1 font-mono rounded text-[11px] transition-colors cursor-pointer border ${
                selectedElection?.id === elec.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {elec.code}
            </button>
          ))}
        </div>
      </div>

      {/* Global Error Banner (Always visible when error is present) */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Notice</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Global Success Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Success</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Current User Session Bar */}
      {currentUser && (
        <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>
              Verifying as <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.employeeId})
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">{currentUser.department}</span>
        </div>
      )}

      {/* Verification Check Results */}
      {isChecking && (
        <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl">
          <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mb-2" />
          Querying organizational registry and matching department constraints...
        </div>
      )}

      {selectedElection && !isChecking && eligibilityResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-500 font-bold">[{selectedElection.code}]</span>
                <StatusIndicator status={selectedElection.status} size="sm" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">{selectedElection.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedElection.organization}</span>
              </div>
            </div>

            {selectedElection.currentUserRole && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Current Enrollment
                </span>
                <RoleIndicator role={selectedElection.currentUserRole} size="sm" />
              </div>
            )}
          </div>

          {/* Detailed Verification Checklist */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
              Simulated Eligibility Verification Results
            </span>

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 divide-y divide-slate-200/80 text-xs">
              <div className="py-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block">Organization Affiliation</span>
                  <span className="text-[11px] text-slate-500 font-mono">{eligibilityResult.details.organization}</span>
                </div>
                {eligibilityResult.passedChecks.organization ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Matched</span>
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Mismatched</span>
                  </span>
                )}
              </div>

              <div className="py-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block">Email Domain Validation</span>
                  <span className="text-[11px] text-slate-500 font-mono">@{eligibilityResult.details.domain}</span>
                </div>
                {eligibilityResult.passedChecks.domain ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Authorized</span>
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Disallowed</span>
                  </span>
                )}
              </div>

              <div className="py-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block">Member / Employee ID Format</span>
                  <span className="text-[11px] text-slate-500 font-mono">{eligibilityResult.details.employeeId}</span>
                </div>
                {eligibilityResult.passedChecks.employeeId ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Conforms</span>
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Invalid Pattern</span>
                  </span>
                )}
              </div>

              <div className="py-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block">Department Scope</span>
                  <span className="text-[11px] text-slate-500 font-mono">{eligibilityResult.details.department}</span>
                </div>
                {eligibilityResult.passedChecks.department ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Eligible Cadre</span>
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Not in Scope</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Outcome Decision Banner */}
          {selectedElection.currentUserRole ? (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>ALREADY ENROLLED: You are already a member of this election.</span>
              </div>
              <p className="text-[11px] text-indigo-800">
                Your designated election role is <strong className="font-semibold">{selectedElection.currentUserRole}</strong>. You have full access to its workspace.
              </p>
            </div>
          ) : eligibilityResult.isEligible ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>VERIFIED: You are eligible to participate.</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                You will be enrolled in "{selectedElection.title}" with role: <strong className="font-semibold">VOTER</strong>.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>ACCESS DENIED: You are not eligible for this election.</span>
              </div>
              <ul className="text-[11px] text-rose-800 list-disc list-inside space-y-0.5">
                {eligibilityResult.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedElection(null);
                setEligibilityResult(null);
                setElectionCode('');
              }}
              className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Clear Selection
            </button>

            {selectedElection.currentUserRole ? (
              <div className="flex items-center gap-2">
                {selectedElection.status === 'ACTIVE' && !selectedElection.currentUserHasVoted && (
                  <button
                    type="button"
                    onClick={() => onNavigate('election-detail', selectedElection.id)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Vote className="w-3.5 h-3.5" />
                    <span>Go to Voting Booth</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('election-detail', selectedElection.id)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Open Election Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!eligibilityResult.isEligible || isJoining}
                onClick={handleJoin}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isJoining ? 'Enrolling...' : 'Confirm & Join as Voter'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
