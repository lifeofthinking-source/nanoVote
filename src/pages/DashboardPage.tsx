import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { electionService, EnrichedElection } from '../services/electionService';
import { auditService } from '../services/auditService';
import { AuditEvent } from '../types';
import { StatusIndicator } from '../components/StatusIndicator';
import { RoleIndicator } from '../components/RoleIndicator';
import {
  Vote,
  ShieldCheck,
  TrendingUp,
  PlusCircle,
  LogIn,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (view: string, electionId?: string) => void;
  onOpenBallotModal: (election: EnrichedElection) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenBallotModal,
}) => {
  const { currentUser } = useAuth();
  const [elections, setElections] = useState<EnrichedElection[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const allElections = await electionService.getElections(currentUser?.id);
      setElections(allElections);

      // Grab recent audits from primary election
      if (allElections.length > 0) {
        const audits = await auditService.getAuditEvents(allElections[0].id);
        setRecentAudits(audits.slice(-5).reverse());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activeElections = elections.filter((e) => e.status === 'ACTIVE');
  const ownedElections = elections.filter((e) => e.ownerId === currentUser?.id);
  const enrolledElections = elections.filter((e) => e.currentUserRole);
  const totalVotesRecorded = elections.reduce(
    (acc, e) => acc + (e.currentUserHasVoted ? 1 : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Organizational Election Management
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs text-indigo-700 font-semibold font-mono">LIVE PROTOTYPE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {currentUser?.name || 'Participant'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            {currentUser?.organization || 'Andhra Pradesh Employees Association'} ·{' '}
            <span className="font-mono text-slate-500">{currentUser?.department}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('create-election')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Election</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('join-election')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Elections</span>
            <Vote className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {elections.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">In enterprise directory</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Polls</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
            {activeElections.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Voting currently open</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Elections Owned</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-900 tabular-nums">
            {ownedElections.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Owner responsibility</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Participating In</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {enrolledElections.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {totalVotesRecorded} ballots cast
          </span>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bento Column 1 & 2: Active Elections Spotlight & Contested Races */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Your Enrolled Elections</h2>
                <p className="text-xs text-slate-500">
                  Role is dynamically scoped per election (Owner, Officer, Candidate, Auditor, Voter)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('elections')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({elections.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading elections...</div>
              ) : elections.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No elections found.</div>
              ) : (
                elections.map((election) => (
                  <div
                    key={election.id}
                    className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-500 font-semibold uppercase">
                          [{election.code}]
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {election.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <StatusIndicator status={election.status} size="sm" />
                        <span aria-hidden="true">·</span>
                        <RoleIndicator role={election.currentUserRole} size="sm" />
                        <span aria-hidden="true">·</span>
                        <span>{election.positions.length} Positions</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{election.totalMembersCount} Members</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      {election.status === 'ACTIVE' && election.currentUserRole && !election.currentUserHasVoted && (
                        <button
                          type="button"
                          onClick={() => onOpenBallotModal(election)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Vote className="w-3.5 h-3.5" />
                          <span>Cast Ballot</span>
                        </button>
                      )}

                      {election.currentUserHasVoted && (
                        <span className="px-2.5 py-1 text-emerald-800 font-mono text-[11px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>VOTED</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onNavigate('election-detail', election.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        Manage / Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Guide Bento Card */}
          <div className="border border-slate-200 rounded-xl bg-slate-900 text-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                PROTOTYPE ARCHITECTURE
              </span>
              <span className="text-xs text-slate-400 font-mono">GOVTECH STANDARD</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">
              End-to-End Cryptographic Secret Balloting
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              VoteSphere enforces strict separation between identity verification and ballot choice. Once verified via organizational rules, a single-use anonymous token is issued to submit the ballot. No voter identity is ever linked to recorded votes.
            </p>
          </div>
        </div>

        {/* Bento Column 3: Audit Ledger Stream & Quick Persona Context */}
        <div className="space-y-6">
          {/* Persona Card */}
          <div className="border border-slate-200 rounded-xl bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Session
              </span>
              <span className="text-[10px] text-indigo-700 font-mono font-bold">DEFAULT VOTER</span>
            </div>

            <div>
              <div className="font-bold text-slate-900 text-sm">{currentUser?.name}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{currentUser?.employeeId}</div>
              <div className="text-xs text-slate-600 mt-1">{currentUser?.department}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Election Role Breakdown:</div>
              <div>• APEA 2026: <strong className="text-indigo-800">OWNER</strong></div>
              <div>• University Council: <strong className="text-slate-700">VOTER</strong></div>
              <div>• Welfare Committee: <strong className="text-amber-800">CANDIDATE</strong></div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Use the Switch Persona dropdown in the top bar to instantly switch personas.
            </p>
          </div>

          {/* Recent Immutable Audit Stream */}
          <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tamper-Evident Ledger
                </h3>
                <span className="text-[11px] text-slate-500">Latest cryptographic events</span>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="divide-y divide-slate-100 p-2">
              {recentAudits.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No events logged yet.</div>
              ) : (
                recentAudits.map((event) => (
                  <div key={event.id} className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{event.event}</span>
                      <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] line-clamp-1">{event.details}</p>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 truncate">
                      <span>Hash:</span>
                      <span className="text-slate-500">{event.currentHash.substring(0, 16)}...</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
