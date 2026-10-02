import { ElectionRole, ElectionStatus, ElectionPermissions } from '../types';

export function getElectionPermissions(
  role: ElectionRole | null | undefined,
  status: ElectionStatus = 'ACTIVE'
): ElectionPermissions {
  if (!role) {
    return {
      canConfigureElection: false,
      canInviteMembers: false,
      canManageMembers: false,
      canAssignRoles: false,
      canSubmitNomination: false,
      canManageCandidates: false,
      canApproveCandidates: false,
      canStartElection: false,
      canCloseElection: false,
      canVote: false,
      canViewReceipt: false,
      canViewResults: status === 'CLOSED',
      canViewAudit: false,
    };
  }

  const isNominationPhase = status === 'DRAFT' || status === 'NOMINATION';
  const isActive = status === 'ACTIVE';
  const isClosed = status === 'CLOSED';

  switch (role) {
    case 'OWNER':
      return {
        canConfigureElection: !isClosed,
        canInviteMembers: !isClosed,
        canManageMembers: true,
        canAssignRoles: true,
        canSubmitNomination: false, // Owner manages rather than runs
        canManageCandidates: true,
        canApproveCandidates: true,
        canStartElection: status === 'DRAFT' || status === 'NOMINATION' || status === 'SCHEDULED',
        canCloseElection: isActive,
        canVote: isActive,
        canViewReceipt: true,
        canViewResults: true, // Owner can view monitoring/results
        canViewAudit: true,
      };

    case 'OFFICER':
      return {
        canConfigureElection: false,
        canInviteMembers: !isClosed,
        canManageMembers: true,
        canAssignRoles: false,
        canSubmitNomination: false,
        canManageCandidates: true,
        canApproveCandidates: true,
        canStartElection: false,
        canCloseElection: false,
        canVote: isActive,
        canViewReceipt: true,
        canViewResults: isClosed || isActive,
        canViewAudit: true,
      };

    case 'CANDIDATE':
      return {
        canConfigureElection: false,
        canInviteMembers: false,
        canManageMembers: false,
        canAssignRoles: false,
        canSubmitNomination: isNominationPhase,
        canManageCandidates: false,
        canApproveCandidates: false,
        canStartElection: false,
        canCloseElection: false,
        canVote: isActive,
        canViewReceipt: true,
        canViewResults: isClosed,
        canViewAudit: false,
      };

    case 'AUDITOR':
      return {
        canConfigureElection: false,
        canInviteMembers: false,
        canManageMembers: false,
        canAssignRoles: false,
        canSubmitNomination: false,
        canManageCandidates: false,
        canApproveCandidates: false,
        canStartElection: false,
        canCloseElection: false,
        canVote: isActive,
        canViewReceipt: true,
        canViewResults: true,
        canViewAudit: true, // Auditor primary role
      };

    case 'VOTER':
    default:
      return {
        canConfigureElection: false,
        canInviteMembers: false,
        canManageMembers: false,
        canAssignRoles: false,
        canSubmitNomination: isNominationPhase,
        canManageCandidates: false,
        canApproveCandidates: false,
        canStartElection: false,
        canCloseElection: false,
        canVote: isActive,
        canViewReceipt: true,
        canViewResults: isClosed,
        canViewAudit: false,
      };
  }
}
