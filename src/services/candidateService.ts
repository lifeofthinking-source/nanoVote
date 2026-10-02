import { Candidate } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export const candidateService = {
  async getCandidates(electionId: string): Promise<Candidate[]> {
    await simulateDelay(100, 200);
    return mockDb.getCandidates(electionId);
  },

  async submitNomination(
    electionId: string,
    userId: string,
    data: {
      positionId: string;
      manifesto: string;
      experience: string;
      declarationAgreed: boolean;
    }
  ): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
    await simulateDelay(250, 500);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    if (election.status !== 'NOMINATION' && election.status !== 'DRAFT') {
      return {
        success: false,
        error: 'NOMINATION_CLOSED: Nominations are currently closed for this election.',
      };
    }

    const member = mockDb.getMember(electionId, userId);
    if (!member) {
      return { success: false, error: 'You must first be an enrolled member to submit a nomination.' };
    }

    const user = mockDb.getUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    // Check if already nominated for this position
    const existing = mockDb.getCandidates(electionId).find(
      (c) => c.positionId === data.positionId && c.userId === userId && c.status !== 'REJECTED'
    );
    if (existing) {
      return {
        success: false,
        error: 'You have already filed an active nomination for this position.',
      };
    }

    const position = election.positions.find((p) => p.id === data.positionId);

    const newCandidate: Candidate = {
      id: 'cand-' + Math.random().toString(36).substring(2, 9),
      electionId,
      positionId: data.positionId,
      userId,
      user,
      manifesto: data.manifesto.trim(),
      experience: data.experience.trim(),
      declarationAgreed: data.declarationAgreed,
      status: 'PENDING',
      nominatedAt: new Date().toISOString(),
      votesCount: 0,
    };

    mockDb.addCandidate(newCandidate);

    // Audit Event
    mockDb.addAuditEvent(
      electionId,
      'Candidate Nominated',
      user.id,
      user.name,
      member.role,
      `Nomination filed by ${user.name} for position "${position?.title || data.positionId}". Status: PENDING review.`,
      newCandidate.id
    );

    // Notify Owner
    mockDb.addNotification({
      userId: election.ownerId,
      electionId,
      title: 'New Candidate Nomination Filed',
      message: `${user.name} filed a nomination for "${position?.title || 'a position'}". Requires review.`,
      type: 'NOMINATION_UPDATE',
    });

    return { success: true, candidate: newCandidate };
  },

  async reviewCandidate(
    candidateId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes: string,
    actorId: string
  ): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
    await simulateDelay(250, 450);
    const candidate = mockDb.getCandidateById(candidateId);
    if (!candidate) return { success: false, error: 'Candidate not found' };

    const election = mockDb.getElectionById(candidate.electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const actor = mockDb.getUserById(actorId);
    const actorMember = mockDb.getMember(election.id, actorId);

    if (!actor || (actorMember?.role !== 'OWNER' && actorMember?.role !== 'OFFICER' && election.ownerId !== actorId)) {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only an Election Owner or delegated Election Officer can approve/reject nominations.',
      };
    }

    const updated = mockDb.updateCandidate(candidateId, {
      status: decision,
      reviewNotes: notes.trim(),
      reviewedBy: actorId,
      reviewedAt: new Date().toISOString(),
    });

    // If approved, update member's role to CANDIDATE
    if (decision === 'APPROVED') {
      mockDb.updateMember(election.id, candidate.userId, { role: 'CANDIDATE' });
    }

    const position = election.positions.find((p) => p.id === candidate.positionId);

    // Audit Event
    mockDb.addAuditEvent(
      election.id,
      decision === 'APPROVED' ? 'Candidate Approved' : 'Candidate Rejected',
      actor.id,
      actor.name,
      actorMember?.role || 'OWNER',
      `Candidate nomination for ${candidate.user.name} (${position?.title}) marked as ${decision}. Notes: "${notes.trim() || 'Criteria verified'}".`,
      candidate.id
    );

    // Notify Candidate
    mockDb.addNotification({
      userId: candidate.userId,
      electionId: election.id,
      title: `Nomination ${decision === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      message: `Your candidacy for ${position?.title} was ${decision.toLowerCase()} by ${actor.name}.`,
      type: 'NOMINATION_UPDATE',
    });

    return { success: true, candidate: updated || undefined };
  },

  async inviteCandidate(
    electionId: string,
    data: {
      name: string;
      email: string;
      department?: string;
      positionId: string;
      manifesto: string;
      experience?: string;
      initialStatus?: 'PENDING' | 'APPROVED';
    },
    actorId: string
  ): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
    await simulateDelay(250, 450);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const actor = mockDb.getUserById(actorId);
    const actorMember = mockDb.getMember(election.id, actorId);
    if (!actor || (actorMember?.role !== 'OWNER' && actorMember?.role !== 'OFFICER' && election.ownerId !== actorId)) {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only an Election Owner or Officer can invite candidates.',
      };
    }

    const emailClean = data.email.trim().toLowerCase();
    let user = mockDb.getUserByEmail(emailClean);
    if (!user) {
      user = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        name: data.name.trim(),
        email: emailClean,
        employeeId: 'AP-GOV-' + Math.floor(1000 + Math.random() * 9000),
        department: data.department?.trim() || 'General Administration',
        organization: election.organization,
        createdAt: new Date().toISOString(),
      };
      mockDb.createUser(user);
    }

    // Ensure user is an election member
    let member = mockDb.getMember(electionId, user.id);
    const status = data.initialStatus || 'PENDING';

    if (!member) {
      member = {
        id: 'mem-' + Math.random().toString(36).substring(2, 9),
        electionId,
        userId: user.id,
        user,
        role: status === 'APPROVED' ? 'CANDIDATE' : 'VOTER',
        joinedAt: new Date().toISOString(),
        hasVoted: false,
        status: 'ACTIVE',
      };
      mockDb.addMember(member);
    } else if (status === 'APPROVED') {
      mockDb.updateMember(electionId, user.id, { role: 'CANDIDATE' });
    }

    // Check if already in candidate list for this position
    const existingCand = mockDb.getCandidates(electionId).find(
      (c) => c.positionId === data.positionId && c.userId === user.id
    );
    if (existingCand) {
      return {
        success: false,
        error: `${user.name} is already filed as a candidate for this position.`,
      };
    }

    const position = election.positions.find((p) => p.id === data.positionId);

    const newCandidate: Candidate = {
      id: 'cand-' + Math.random().toString(36).substring(2, 9),
      electionId,
      positionId: data.positionId,
      userId: user.id,
      user,
      manifesto: data.manifesto.trim() || 'Committed to representing departmental staff and members with transparency.',
      experience: data.experience?.trim() || 'Experienced association cadre representative.',
      declarationAgreed: true,
      status,
      reviewedBy: actorId,
      reviewedAt: new Date().toISOString(),
      nominatedAt: new Date().toISOString(),
      votesCount: 0,
    };

    mockDb.addCandidate(newCandidate);

    // Audit Event
    mockDb.addAuditEvent(
      election.id,
      status === 'APPROVED' ? 'Candidate Appointed' : 'Candidate Invited to Pool',
      actor.id,
      actor.name,
      actorMember?.role || 'OWNER',
      `Candidate ${user.name} (${position?.title}) added to candidate pool by ${actor.name}. Status: ${status}.`,
      newCandidate.id
    );

    // Notification
    mockDb.addNotification({
      userId: user.id,
      electionId: election.id,
      title: 'Nomination to Election Pool',
      message: `You were nominated for ${position?.title} in "${election.title}". Status: ${status}.`,
      type: 'NOMINATION_UPDATE',
    });

    return { success: true, candidate: newCandidate };
  },

  async updateCandidateStatus(
    candidateId: string,
    newStatus: 'PENDING' | 'APPROVED' | 'REJECTED',
    notes: string,
    actorId: string
  ): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
    await simulateDelay(200, 400);
    const candidate = mockDb.getCandidateById(candidateId);
    if (!candidate) return { success: false, error: 'Candidate not found' };

    const election = mockDb.getElectionById(candidate.electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const actor = mockDb.getUserById(actorId);
    const actorMember = mockDb.getMember(election.id, actorId);

    if (!actor || (actorMember?.role !== 'OWNER' && actorMember?.role !== 'OFFICER' && election.ownerId !== actorId)) {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only Election Owner or Officer can change candidate status.',
      };
    }

    const updated = mockDb.updateCandidate(candidateId, {
      status: newStatus,
      reviewNotes: notes.trim() || (newStatus === 'APPROVED' ? 'Approved as active candidate' : 'Status updated by administrator'),
      reviewedBy: actorId,
      reviewedAt: new Date().toISOString(),
    });

    // Update election member role accordingly
    if (newStatus === 'APPROVED') {
      mockDb.updateMember(election.id, candidate.userId, { role: 'CANDIDATE' });
    } else {
      // Revert back to VOTER if not candidate
      const otherApproved = mockDb.getCandidates(election.id).some(
        (c) => c.userId === candidate.userId && c.id !== candidateId && c.status === 'APPROVED'
      );
      if (!otherApproved) {
        mockDb.updateMember(election.id, candidate.userId, { role: 'VOTER' });
      }
    }

    const position = election.positions.find((p) => p.id === candidate.positionId);

    // Audit Event
    mockDb.addAuditEvent(
      election.id,
      `Candidate Status: ${newStatus}`,
      actor.id,
      actor.name,
      actorMember?.role || 'OWNER',
      `Candidate status for ${candidate.user.name} (${position?.title}) transitioned to ${newStatus}.`,
      candidate.id
    );

    // Notification
    mockDb.addNotification({
      userId: candidate.userId,
      electionId: election.id,
      title: `Candidacy Status: ${newStatus}`,
      message: `Your candidacy status for ${position?.title} was updated to ${newStatus} by ${actor.name}.`,
      type: 'NOMINATION_UPDATE',
    });

    return { success: true, candidate: updated || undefined };
  }
};
