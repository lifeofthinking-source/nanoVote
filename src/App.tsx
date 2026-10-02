import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopBar } from './components/TopBar';
import { NotificationModal } from './components/NotificationModal';
import { AuthModal } from './components/AuthModal';
import { ReceiptModal } from './components/ReceiptModal';
import { BallotBoothModal } from './components/BallotBoothModal';
import { NominationModal } from './components/NominationModal';
import { DashboardPage } from './pages/DashboardPage';
import { ElectionsListPage } from './pages/ElectionsListPage';
import { CreateElectionPage } from './pages/CreateElectionPage';
import { JoinElectionPage } from './pages/JoinElectionPage';
import { ElectionDetailPage } from './pages/ElectionDetailPage';
import { EnrichedElection } from './services/electionService';
import { VoteReceipt } from './types';
import { ShieldCheck, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();

  // Navigation states: 'dashboard' | 'elections' | 'create-election' | 'join-election' | 'election-detail'
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeElectionId, setActiveElectionId] = useState<string>('election-apea-2026');
  const [joinTargetId, setJoinTargetId] = useState<string | undefined>(undefined);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBallotOpen, setIsBallotOpen] = useState(false);
  const [ballotElection, setBallotElection] = useState<EnrichedElection | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<VoteReceipt | null>(null);
  const [isNominationOpen, setIsNominationOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNavigate = (view: string, electionId?: string) => {
    setCurrentView(view);
    if (electionId) {
      setActiveElectionId(electionId);
      if (view === 'join-election') {
        setJoinTargetId(electionId);
      }
    } else if (view === 'join-election') {
      setJoinTargetId(undefined);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenBallot = (election: EnrichedElection) => {
    setBallotElection(election);
    setIsBallotOpen(true);
  };

  const handleVoteSuccess = (receipt: VoteReceipt) => {
    setIsBallotOpen(false);
    setActiveReceipt(receipt);
    setIsReceiptOpen(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-800 selection:text-white">
      {/* 3-Zone Top Navigation Contract */}
      <TopBar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenNotifications={() => setIsNotifOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onRefreshData={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'dashboard' && (
          <DashboardPage
            key={refreshTrigger}
            onNavigate={handleNavigate}
            onOpenBallotModal={handleOpenBallot}
          />
        )}

        {currentView === 'elections' && (
          <ElectionsListPage
            key={refreshTrigger}
            onNavigate={handleNavigate}
            onOpenBallotModal={handleOpenBallot}
          />
        )}

        {currentView === 'create-election' && (
          <CreateElectionPage onNavigate={handleNavigate} />
        )}

        {currentView === 'join-election' && (
          <JoinElectionPage
            initialElectionId={joinTargetId}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'election-detail' && (
          <ElectionDetailPage
            key={`${activeElectionId}-${refreshTrigger}`}
            electionId={activeElectionId}
            onNavigate={handleNavigate}
            onOpenBallotModal={handleOpenBallot}
            onOpenNominationModal={() => setIsNominationOpen(true)}
            onViewReceipt={(receipt) => {
              setActiveReceipt(receipt);
              setIsReceiptOpen(true);
            }}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white text-xs text-slate-500 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">VoteSphere</span>
            <span aria-hidden="true">·</span>
            <span>Organizational Election Management Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Decoupled Anonymous Ballot Protocol</span>
            <span aria-hidden="true">·</span>
            <span>Chained Cryptographic Audit Trail</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onNavigateToElection={(id) => handleNavigate('election-detail', id)}
      />

      {ballotElection && currentUser && (
        <BallotBoothModal
          election={ballotElection}
          userId={currentUser.id}
          isOpen={isBallotOpen}
          onClose={() => setIsBallotOpen(false)}
          onVoteSuccess={handleVoteSuccess}
        />
      )}

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      {ballotElection && currentUser && (
        <NominationModal
          election={ballotElection}
          userId={currentUser.id}
          isOpen={isNominationOpen}
          onClose={() => setIsNominationOpen(false)}
          onNominationSubmitted={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
