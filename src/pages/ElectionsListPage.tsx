import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { electionService, EnrichedElection } from '../services/electionService';
import { StatusIndicator } from '../components/StatusIndicator';
import { RoleIndicator } from '../components/RoleIndicator';
import {
  Vote,
  Search,
  PlusCircle,
  LogIn,
  CheckCircle2,
  Calendar,
  Building2,
  ArrowRight
} from 'lucide-react';

interface ElectionsListPageProps {
  onNavigate: (view: string, electionId?: string) => void;
  onOpenBallotModal: (election: EnrichedElection) => void;
}

export const ElectionsListPage: React.FC<ElectionsListPageProps> = ({
  onNavigate,
  onOpenBallotModal,
}) => {
  const { currentUser } = useAuth();
  const [elections, setElections] = useState<EnrichedElection[]>([]);
  const [filter, setFilter] = useState<'all' | 'owned' | 'participating' | 'active' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadElections();
  }, [currentUser]);

  const loadElections = async () => {
    setIsLoading(true);
    try {
      const data = await electionService.getElections(currentUser?.id);
      setElections(data);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredElections = elections.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase()) ||
      e.organization.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'owned') return e.currentUserRole === 'OWNER';
    if (filter === 'participating') return !!e.currentUserRole;
    if (filter === 'active') return e.status === 'ACTIVE';
    if (filter === 'closed') return e.status === 'CLOSED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Election Directory & My Elections</h1>
          <p className="text-xs text-slate-500 mt-1">
            Universal identity across all organizations. Your role is dynamically determined per election.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('create-election')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Election</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('join-election')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
        {/* Interactive Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {[
            { id: 'all', label: 'All Elections' },
            { id: 'participating', label: 'My Enrolled' },
            { id: 'owned', label: 'Elections Owned' },
            { id: 'active', label: 'Polls Open' },
            { id: 'closed', label: 'Concluded' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, code, org..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
          />
        </div>
      </div>

      {/* Elections List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mb-2" />
          Retrieving election registry...
        </div>
      ) : filteredElections.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
          <p className="text-sm font-semibold text-slate-800">No elections found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or filter selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredElections.map((election) => {
            const isOwner = election.currentUserRole === 'OWNER';
            const canVote = election.status === 'ACTIVE' && election.currentUserRole && !election.currentUserHasVoted;

            return (
              <div
                key={election.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-500 text-[11px]">
                      {election.code}
                    </span>
                    <StatusIndicator status={election.status} size="sm" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {election.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{election.organization}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {election.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Your Role</span>
                      <RoleIndicator role={election.currentUserRole} size="sm" />
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Positions</span>
                      <span className="font-mono font-bold text-slate-700">{election.positions.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{new Date(election.votingEndDate).toLocaleDateString()}</span>
                    </span>
                    <span>{election.totalMembersCount} Enrolled</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {election.currentUserHasVoted && (
                    <span className="text-[11px] font-mono text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Voted</span>
                    </span>
                  )}

                  {canVote && (
                    <button
                      type="button"
                      onClick={() => onOpenBallotModal(election)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>Vote Now</span>
                    </button>
                  )}

                  {!canVote && !election.currentUserHasVoted && !election.currentUserRole && (
                    <button
                      type="button"
                      onClick={() => onNavigate('join-election', election.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      Enroll to Vote
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigate('election-detail', election.id)}
                    className="ml-auto text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer py-1.5"
                  >
                    <span>{isOwner ? 'Manage Election' : 'View Details'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
