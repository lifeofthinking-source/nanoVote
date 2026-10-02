import React, { useState, useEffect } from 'react';
import { Election, Candidate, VoteReceipt, BallotPositionSelection } from '../types';
import { votingService, VoterVerificationStatus } from '../services/votingService';
import { candidateService } from '../services/candidateService';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Lock,
  ArrowRight,
  Vote,
  AlertCircle,
  KeyRound,
  FileCheck2
} from 'lucide-react';

interface BallotBoothModalProps {
  election: Election;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onVoteSuccess: (receipt: VoteReceipt) => void;
}

export const BallotBoothModal: React.FC<BallotBoothModalProps> = ({
  election,
  userId,
  isOpen,
  onClose,
  onVoteSuccess,
}) => {
  // Steps: 'VERIFY' -> 'CREDENTIAL' -> 'BALLOT' -> 'CONFIRM' -> 'SUBMITTING'
  const [step, setStep] = useState<'VERIFY' | 'CREDENTIAL' | 'BALLOT' | 'CONFIRM' | 'SUBMITTING'>('VERIFY');

  const [verification, setVerification] = useState<VoterVerificationStatus | null>(null);
  const [credentialToken, setCredentialToken] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({}); // positionId -> candidateId
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isIssuingCred, setIsIssuingCred] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('VERIFY');
      setError(null);
      setSelections({});
      setCredentialToken(null);
      loadCandidatesAndVerify();
    }
  }, [isOpen, election.id, userId]);

  const loadCandidatesAndVerify = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const cands = await candidateService.getCandidates(election.id);
      setCandidates(cands.filter((c) => c.status === 'APPROVED'));

      const vStatus = await votingService.verifyVoter(election.id, userId);
      setVerification(vStatus);

      if (!vStatus.verified) {
        setError(vStatus.error || 'Voter verification failed');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleIssueCredential = async () => {
    setIsIssuingCred(true);
    setError(null);
    try {
      const res = await votingService.issueVotingCredential(election.id, userId);
      if (res.success && res.credentialToken) {
        setCredentialToken(res.credentialToken);
        setStep('CREDENTIAL');
      } else {
        setError(res.error || 'Failed to issue voting credential');
      }
    } finally {
      setIsIssuingCred(false);
    }
  };

  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({
      ...prev,
      [positionId]: candidateId,
    }));
  };

  const handleProceedToConfirm = () => {
    // Ensure all positions have a selection
    for (const pos of election.positions) {
      if (!selections[pos.id]) {
        setError(`Please cast your selection for the position of "${pos.title}" before continuing.`);
        return;
      }
    }
    setError(null);
    setStep('CONFIRM');
  };

  const handleSubmitBallot = async () => {
    if (!credentialToken) return;
    setStep('SUBMITTING');
    setError(null);

    const ballotSelections: BallotPositionSelection[] = Object.entries(selections).map(
      ([positionId, candidateId]) => ({ positionId, candidateId })
    );

    const res = await votingService.castBallot(
      election.id,
      credentialToken,
      userId,
      ballotSelections
    );

    if (res.success && res.receipt) {
      onVoteSuccess(res.receipt);
    } else {
      setError(res.error || 'Failed to record ballot');
      setStep('CONFIRM');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-indigo-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Official Ballot Booth</h2>
              <p className="text-[11px] text-slate-500">{election.title} · Private Ballot UX</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-xs shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px]">
            <span className={step === 'VERIFY' ? 'font-bold text-slate-900' : 'text-slate-500'}>1. Verification</span>
            <span className="text-slate-300">/</span>
            <span className={step === 'CREDENTIAL' ? 'font-bold text-slate-900' : 'text-slate-500'}>2. Credential</span>
            <span className="text-slate-300">/</span>
            <span className={step === 'BALLOT' ? 'font-bold text-slate-900' : 'text-slate-500'}>3. Ballot Choice</span>
            <span className="text-slate-300">/</span>
            <span className={step === 'CONFIRM' ? 'font-bold text-slate-900' : 'text-slate-500'}>4. Encrypted Receipt</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">ANONYMOUS BOOTH</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Validation Failed</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: VERIFICATION */}
          {step === 'VERIFY' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Pre-Voting Identity & Eligibility Registry
                </h3>

                {isVerifying ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mb-2" />
                    Checking voter registry and eligibility criteria...
                  </div>
                ) : verification ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Identity Authenticated:</span>
                      <span className="font-medium text-slate-900 flex items-center gap-1">
                        {verification.checks.identityVerified ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{verification.details.userName} ({verification.details.employeeId})</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Election Enrollment:</span>
                      <span className="font-medium text-slate-900 flex items-center gap-1">
                        {verification.checks.membershipVerified ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>Active Enrolled Member</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Organizational Eligibility:</span>
                      <span className="font-medium text-slate-900 flex items-center gap-1">
                        {verification.checks.eligibilityVerified ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>Verified: {verification.details.department}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Poll Status:</span>
                      <span className="font-medium text-slate-900 flex items-center gap-1">
                        {verification.checks.electionActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{verification.details.electionStatus}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-600">Voting Status:</span>
                      <span className="font-medium text-slate-900 flex items-center gap-1">
                        {verification.checks.notYetVoted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span className={verification.checks.notYetVoted ? 'text-emerald-700' : 'text-rose-700 font-bold'}>
                          {verification.checks.notYetVoted ? 'Not Yet Voted' : 'ALREADY VOTED'}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {verification?.verified ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    All 5 verification checks passed. Proceed to generate your decoupled, single-use voting credential.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-700">
                  <p className="font-semibold mb-1">VOTING NOT AVAILABLE</p>
                  <p className="text-[11px] text-slate-600">
                    {verification?.details.hasVoted
                      ? 'This voter has already cast a ballot in this election. The system enforces single-vote integrity.'
                      : 'Voting is restricted to verified eligible voters while the election status is ACTIVE.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ONE-TIME CREDENTIAL */}
          {step === 'CREDENTIAL' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 text-indigo-700" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">One-Time Voting Credential Issued</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your identity has been decoupled. The credential token below authorizes a single anonymous ballot.
                </p>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-lg text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">TOKEN AUTHORIZATION</span>
                <p className="text-base font-mono font-bold tracking-wider text-emerald-400">{credentialToken}</p>
                <span className="text-[10px] text-slate-400">Valid for 60 minutes · Single-use cryptographic key</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Separation of Identity Architecture</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  1. Your participation is recorded on the voter roll as <span className="font-semibold">Voted</span>.<br />
                  2. Your candidate choices are sealed with this anonymous token.<br />
                  3. Nobody—not even the Election Owner—can link your identity to your votes.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: BALLOT SELECTION */}
          {step === 'BALLOT' && (
            <div className="space-y-6">
              <div className="text-xs text-slate-500">
                <span>Please select one candidate for each contested position.</span>
              </div>

              {election.positions.map((pos) => {
                const posCandidates = candidates.filter((c) => c.positionId === pos.id);
                const selectedCandidateId = selections[pos.id];

                return (
                  <div key={pos.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{pos.title}</h4>
                      <span className="text-[11px] text-slate-500">Select 1</span>
                    </div>

                    <div className="space-y-2">
                      {posCandidates.length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded">No approved candidates for this position.</p>
                      ) : (
                        posCandidates.map((cand) => {
                          const isSelected = selectedCandidateId === cand.id;

                          return (
                            <div
                              key={cand.id}
                              onClick={() => handleSelectCandidate(pos.id, cand.id)}
                              className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="pt-0.5">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                                  }`}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-900">{cand.user.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{cand.user.department}</span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                  "{cand.manifesto}"
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 'CONFIRM' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <h3 className="text-sm font-bold text-slate-900">Review & Cast Your Secret Ballot</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your selections before committing to the digital ballot box.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
                {election.positions.map((pos) => {
                  const selectedCandId = selections[pos.id];
                  const cand = candidates.find((c) => c.id === selectedCandId);

                  return (
                    <div key={pos.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">{pos.title}</span>
                        <span className="font-bold text-slate-900">{cand?.user.name || 'Not Selected'}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{cand?.user.department}</span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Irreversible Submission:</strong> Once cast, your one-time credential will be consumed immediately. You will receive an official verifiable receipt ID.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: SUBMITTING */}
          {step === 'SUBMITTING' && (
            <div className="py-12 text-center space-y-3">
              <div className="animate-spin w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Recording Secret Ballot...</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Decoupling identity, hashing cryptographic proof, and committing to tamper-evident audit ledger.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          {step === 'VERIFY' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!verification?.verified || isIssuingCred}
                onClick={handleIssueCredential}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isIssuingCred ? 'Generating Token...' : 'Obtain One-Time Credential'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 'CREDENTIAL' && (
            <>
              <button
                type="button"
                onClick={() => setStep('VERIFY')}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('BALLOT')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Enter Ballot Booth</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 'BALLOT' && (
            <>
              <button
                type="button"
                onClick={() => setStep('CREDENTIAL')}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToConfirm}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Review Selections</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 'CONFIRM' && (
            <>
              <button
                type="button"
                onClick={() => setStep('BALLOT')}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Modify Selections
              </button>
              <button
                type="button"
                onClick={handleSubmitBallot}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Cast Ballot Now</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
