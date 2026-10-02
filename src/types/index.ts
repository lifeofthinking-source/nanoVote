export type ElectionRole = 'OWNER' | 'OFFICER' | 'CANDIDATE' | 'AUDITOR' | 'VOTER';

export type ElectionStatus = 'DRAFT' | 'NOMINATION' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED';

export type ElectionType = 'ASSOCIATION' | 'UNIVERSITY' | 'CORPORATE' | 'NGO' | 'SOCIETY';

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  organization: string;
  avatar?: string;
  phone?: string;
  createdAt: string;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  maxSelections: number; // usually 1 for single choice
  order: number;
}

export interface EligibilityRules {
  allowedOrganizations: string[];
  allowedDomains: string[];
  allowedDepartments: string[];
  requiresEmployeeId: boolean;
  employeeIdPattern?: string;
  autoApproveEligible: boolean;
}

export interface Election {
  id: string;
  code: string; // e.g. "APEA-2026"
  title: string;
  description: string;
  organization: string;
  type: ElectionType;
  ownerId: string; // User ID who created it
  status: ElectionStatus;
  positions: Position[];
  eligibility: EligibilityRules;
  nominationDeadline: string;
  votingStartDate: string;
  votingEndDate: string;
  isAnonymous: boolean;
  resultsVisible: boolean; // Only visible after closed or by authorized roles
  livePollPublished: boolean; // Controlled by Election Owner to publish real-time poll to public/voters
  createdAt: string;
  updatedAt: string;
}

export interface ElectionMember {
  id: string;
  electionId: string;
  userId: string;
  user: User;
  role: ElectionRole;
  joinedAt: string;
  hasVoted: boolean;
  receiptId?: string;
  votedAt?: string;
  customPermissions?: string[];
  status: 'ACTIVE' | 'REVOKED' | 'PENDING';
}

export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  userId: string;
  user: User;
  manifesto: string;
  experience: string;
  declarationAgreed: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  nominatedAt: string;
  votesCount?: number; // Only exposed when results are open
}

export interface VotingCredential {
  id: string;
  token: string;
  electionId: string;
  voterHash: string; // pseudonymized hash of voter, not stored with ballot
  issuedAt: string;
  used: boolean;
  usedAt?: string;
  expiresAt: string;
}

export interface BallotPositionSelection {
  positionId: string;
  candidateId: string;
}

export interface AnonymousBallot {
  id: string;
  electionId: string;
  credentialToken: string;
  selections: BallotPositionSelection[];
  castAt: string;
  ballotHash: string;
}

export interface VoteReceipt {
  receiptId: string;
  electionId: string;
  electionTitle: string;
  organization: string;
  timestamp: string;
  verificationHash: string;
  credentialTokenMasked: string;
}

export interface AuditEvent {
  id: string;
  electionId: string;
  event: string;
  actorId: string;
  actorName: string;
  actorRole: ElectionRole | 'SYSTEM';
  timestamp: string;
  referenceId?: string;
  details: string;
  prevHash: string;
  currentHash: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  electionId?: string;
  type: 'INVITATION' | 'ROLE_ASSIGNED' | 'NOMINATION_UPDATE' | 'ELECTION_STATUS' | 'VOTE_CONFIRMED' | 'AUDIT';
  read: boolean;
  createdAt: string;
}

export interface ElectionPermissions {
  canConfigureElection: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canAssignRoles: boolean;
  canSubmitNomination: boolean;
  canManageCandidates: boolean;
  canApproveCandidates: boolean;
  canStartElection: boolean;
  canCloseElection: boolean;
  canVote: boolean;
  canViewReceipt: boolean;
  canViewResults: boolean;
  canViewAudit: boolean;
}

export interface TurnoutStats {
  totalEligible: number;
  totalJoined: number;
  totalVoted: number;
  turnoutPercentage: number;
  isLivePollPublished: boolean;
  positionStats: {
    positionId: string;
    positionTitle: string;
    totalVotes: number;
    leaderName?: string;
    candidates: {
      candidateId: string;
      candidateName: string;
      department?: string;
      votes: number;
      percentage: number;
      isWinner: boolean;
      isLeader: boolean;
      leadMargin: number;
      winProbability: number;
      projectionStatus: 'Dominant Lead' | 'Narrow Lead' | 'Competitive' | 'Trailing';
    }[];
  }[];
  recentVoters: {
    id: string;
    voterName: string;
    department: string;
    employeeIdMasked: string;
    votedAt: string;
    receiptId?: string;
  }[];
}
