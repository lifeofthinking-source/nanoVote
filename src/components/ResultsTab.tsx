import React, { useState, useEffect } from 'react';
import { Election, ElectionRole, TurnoutStats } from '../types';
import { resultService } from '../services/resultService';
import { Trophy, Lock, Users, Vote, CheckCircle2, TrendingUp } from 'lucide-react';

interface ResultsTabProps {
  election: Election;
  currentUserRole?: ElectionRole | null;
  onCloseElection?: () => void;
  canCloseElection?: boolean;
}

export const ResultsTab: React.FC<ResultsTabProps> = ({
  election,
  currentUserRole,
  onCloseElection,
  canCloseElection,
}) => {
  const [stats, setStats] = useState<TurnoutStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [election.id, currentUserRole, election.status]);

  const loadResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await resultService.getResults(election.id, currentUserRole);
      if (res.success && res.stats) {
        setStats(res.stats);
      } else {
        setError(res.error || 'Results are currently sealed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isClosed = election.status === 'CLOSED';

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500">
        <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mb-2" />
        Tabulating verified anonymous ballots...
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="border border-slate-200 rounded-xl p-8 bg-white text-center max-w-lg mx-auto my-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Election Results Sealed</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Ballots remain cryptographically encrypted in the digital ballot box while polls remain active. Live tallies will be revealed automatically once the election is concluded.
          </p>
        </div>

        {canCloseElection && onCloseElection && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onCloseElection}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Conclude Election & Unseal Results
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Turnout Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Eligible Voters</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats?.totalEligible || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Department baseline</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Voters</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-900 tabular-nums">
            {stats?.totalJoined || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Joined participants</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Ballots Cast</span>
            <Vote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900 tabular-nums">
            {stats?.totalVoted || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Cryptographic submissions</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Turnout</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats?.turnoutPercentage || 0}%
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {isClosed ? 'Final participation' : 'In-progress turnout'}
          </span>
        </div>
      </div>

      {/* Position Results Cards */}
      <div className="space-y-6">
        {stats?.positionStats.map((pos) => {
          return (
            <div key={pos.positionId} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{pos.positionTitle}</h4>
                  <span className="text-[11px] text-slate-500">
                    Total Valid Votes: <strong className="font-mono text-slate-800 tabular-nums">{pos.totalVotes}</strong>
                  </span>
                </div>
                {isClosed && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CERTIFIED RESULT</span>
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4">
                {pos.candidates.map((cand, idx) => (
                  <div key={cand.candidateId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{cand.candidateName}</span>
                        {cand.isWinner && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                            <Trophy className="w-3.5 h-3.5 text-amber-600" />
                            <span>WINNER ELECT</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 font-mono text-slate-600 tabular-nums">
                        <span>{cand.votes} votes</span>
                        <span className="font-semibold text-slate-900 w-12 text-right">{cand.percentage}%</span>
                      </div>
                    </div>

                    {/* Clean Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cand.isWinner
                            ? 'bg-amber-500'
                            : idx === 0
                            ? 'bg-slate-900'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${cand.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
