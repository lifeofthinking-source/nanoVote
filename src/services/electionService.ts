import { Election, ElectionMember, ElectionRole, ElectionStatus, Position, EligibilityRules } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export interface EnrichedElection extends Election {
  currentUserRole?: ElectionRole | null;
  currentUserHasVoted?: boolean;
  currentUserReceiptId?: string;
  totalMembersCount: number;
  totalCandidatesCount: number;
}

export const electionService = {
  async getElections(userId?: string): Promise<EnrichedElection[]> {
    await simulateDelay(150, 300);
    const elections = mockDb.getElections();
    const allMembers = mockDb.getMembers();
    const allCandidates = mockDb.getCandidates();

    return elections.map((e) => {
      const electionMembers = allMembers.filter((m) => m.electionId === e.id);
      const userMember = userId ? electionMembers.find((m) => m.userId === userId) : undefined;
      const candidates = allCandidates.filter((c) => c.electionId === e.id && c.status === 'APPROVED');

      return {
        ...e,
        currentUserRole: userMember?.role || (e.ownerId === userId ? 'OWNER' : null),
        currentUserHasVoted: userMember?.hasVoted || false,
        currentUserReceiptId: userMember?.receiptId,
        totalMembersCount: electionMembers.length,
        totalCandidatesCount: candidates.length,
      };
    });
  },

  async getElectionById(id: string, userId?: string): Promise<EnrichedElection | null> {
    await simulateDelay(150, 250);
    const election = mockDb.getElectionById(id);
    if (!election) return null;

    const electionMembers = mockDb.getMembers(election.id);
    const userMember = userId ? electionMembers.find((m) => m.userId === userId) : undefined;
    const candidates = mockDb.getCandidates(election.id).filter((c) => c.status === 'APPROVED');

    return {
      ...election,
      currentUserRole: userMember?.role || (election.ownerId === userId ? 'OWNER' : null),
      currentUserHasVoted: userMember?.hasVoted || false,
      currentUserReceiptId: userMember?.receiptId,
      totalMembersCount: electionMembers.length,
      totalCandidatesCount: candidates.length,
    };
  },

  async createElection(
    userId: string,
    data: {
      title: string;
      description: string;
      organization: string;
      type: Election['type'];
      positions: Position[];
      eligibility: EligibilityRules;
      nominationDeadline: string;
      votingStartDate: string;
      votingEndDate: string;
      isAnonymous?: boolean;
    }
  ): Promise<{ success: boolean; election?: Election; error?: string }> {
    await simulateDelay(300, 550);
    const creator = mockDb.getUserById(userId);
    if (!creator) {
      return { success: false, error: 'User not authenticated' };
    }

    const electionId = 'election-' + Math.random().toString(36).substring(2, 9);
    const code = (data.title.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'ELEC') + '-' + new Date().getFullYear();

    const newElection: Election = {
      id: electionId,
      code,
      title: data.title.trim(),
      description: data.description.trim(),
      organization: data.organization.trim(),
      type: data.type,
      ownerId: userId,
      status: 'DRAFT',
      positions: data.positions.map((p, idx) => ({ ...p, order: idx + 1 })),
      eligibility: data.eligibility,
      nominationDeadline: data.nominationDeadline,
      votingStartDate: data.votingStartDate,
      votingEndDate: data.votingEndDate,
      isAnonymous: data.isAnonymous ?? true,
      resultsVisible: false,
      livePollPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDb.createElection(newElection);

    // Creator automatically becomes Election OWNER
    const ownerMember: ElectionMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      electionId,
      userId,
      user: creator,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
      hasVoted: false,
      status: 'ACTIVE',
    };
    mockDb.addMember(ownerMember);

    // Audit Event
    mockDb.addAuditEvent(
      electionId,
      'Election Created',
      creator.id,
      creator.name,
      'OWNER',
      `Election "${newElection.title}" created with ${newElection.positions.length} positions. Creator designated as Election Owner.`,
      code
    );

    // Notification
    mockDb.addNotification({
      userId,
      electionId,
      title: 'Election Created',
      message: `You created "${newElection.title}". You have been assigned the OWNER role for this election.`,
      type: 'ROLE_ASSIGNED',
    });

    return { success: true, election: newElection };
  },

  async updateStatus(
    electionId: string,
    newStatus: ElectionStatus,
    actorId: string
  ): Promise<{ success: boolean; election?: Election; error?: string }> {
    await simulateDelay(250, 450);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const member = mockDb.getMember(electionId, actorId);
    const actor = mockDb.getUserById(actorId);
    if (!actor || (member?.role !== 'OWNER' && election.ownerId !== actorId)) {
      return { success: false, error: 'PERMISSION_DENIED: Only the Election Owner can change election lifecycle status.' };
    }

    const updates: Partial<Election> = { status: newStatus };
    if (newStatus === 'CLOSED') {
      updates.resultsVisible = true;
    }

    const updated = mockDb.updateElection(electionId, updates);

    let eventName = 'Election Status Changed';
    if (newStatus === 'ACTIVE') eventName = 'Election Started';
    else if (newStatus === 'CLOSED') eventName = 'Election Closed';
    else if (newStatus === 'NOMINATION') eventName = 'Nomination Window Opened';

    mockDb.addAuditEvent(
      electionId,
      eventName,
      actor.id,
      actor.name,
      'OWNER',
      `Election status transitioned from ${election.status} to ${newStatus}.`,
      election.code
    );

    // Notify all members
    const members = mockDb.getMembers(electionId);
    members.forEach((m) => {
      mockDb.addNotification({
        userId: m.userId,
        electionId,
        title: `Election Status: ${newStatus}`,
        message: `Election "${election.title}" is now ${newStatus}.`,
        type: 'ELECTION_STATUS',
      });
    });

    return { success: true, election: updated || undefined };
  },

  async toggleLivePollPublish(
    electionId: string,
    published: boolean,
    actorId: string
  ): Promise<{ success: boolean; election?: Election; error?: string }> {
    await simulateDelay(200, 350);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const member = mockDb.getMember(electionId, actorId);
    const actor = mockDb.getUserById(actorId);
    if (!actor || (member?.role !== 'OWNER' && election.ownerId !== actorId)) {
      return { success: false, error: 'PERMISSION_DENIED: Only the Election Owner can toggle public live poll broadcasting.' };
    }

    const updated = mockDb.updateElection(electionId, { livePollPublished: published });

    mockDb.addAuditEvent(
      electionId,
      published ? 'Live Poll Broadcast Published' : 'Live Poll Broadcast Sealed',
      actor.id,
      actor.name,
      'OWNER',
      `Election Head ${actor.name} ${published ? 'PUBLISHED real-time poll standings to all voters' : 'SEALED real-time poll standings (Admin-only)'}.`,
      election.code
    );

    // Notify all members
    const members = mockDb.getMembers(electionId);
    members.forEach((m) => {
      mockDb.addNotification({
        userId: m.userId,
        electionId,
        title: published ? 'Live Poll Standings Published' : 'Live Poll Standings Sealed',
        message: published
          ? `Election Owner has published real-time polling standings for "${election.title}". You can now view current leads in Election Overview.`
          : `Real-time polling standings for "${election.title}" have been sealed by the Election Owner.`,
        type: 'ELECTION_STATUS',
      });
    });

    return { success: true, election: updated || undefined };
  }
};
