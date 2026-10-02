import { ElectionMember, ElectionRole, User } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export interface EligibilityCheckResult {
  isEligible: boolean;
  reasons: string[];
  passedChecks: {
    organization: boolean;
    domain: boolean;
    employeeId: boolean;
    department: boolean;
  };
  details: {
    organization: string;
    domain: string;
    employeeId: string;
    department: string;
  };
}

export const memberService = {
  async getMembers(electionId: string): Promise<ElectionMember[]> {
    await simulateDelay(100, 200);
    return mockDb.getMembers(electionId);
  },

  async checkEligibility(electionId: string, user: User): Promise<EligibilityCheckResult> {
    await simulateDelay(200, 400);
    const election = mockDb.getElectionById(electionId);
    if (!election) {
      return {
        isEligible: false,
        reasons: ['Election not found.'],
        passedChecks: { organization: false, domain: false, employeeId: false, department: false },
        details: { organization: '', domain: '', employeeId: '', department: '' },
      };
    }

    const { eligibility } = election;
    const reasons: string[] = [];

    // 1. Organization Check
    const orgPassed = eligibility.allowedOrganizations.length === 0 ||
      eligibility.allowedOrganizations.some((org) => org.toLowerCase() === user.organization.toLowerCase());
    if (!orgPassed) {
      reasons.push(`Organization "${user.organization}" does not match eligible organizations: ${eligibility.allowedOrganizations.join(', ')}.`);
    }

    // 2. Email Domain Check
    const userDomain = user.email.split('@')[1]?.toLowerCase() || '';
    const domainPassed = eligibility.allowedDomains.length === 0 ||
      eligibility.allowedDomains.some((dom) => dom.toLowerCase() === userDomain);
    if (!domainPassed) {
      reasons.push(`Email domain "@${userDomain}" is not permitted. Eligible domains: ${eligibility.allowedDomains.map((d) => '@' + d).join(', ')}.`);
    }

    // 3. Employee ID Pattern Check
    let empIdPassed = true;
    if (eligibility.requiresEmployeeId) {
      if (!user.employeeId) {
        empIdPassed = false;
        reasons.push('A verified Government/Association Member ID is required.');
      } else if (eligibility.employeeIdPattern) {
        const regex = new RegExp(eligibility.employeeIdPattern);
        if (!regex.test(user.employeeId)) {
          empIdPassed = false;
          reasons.push(`Member ID "${user.employeeId}" does not conform to the pattern ${eligibility.employeeIdPattern}.`);
        }
      }
    }

    // 4. Department Check
    const deptPassed = eligibility.allowedDepartments.length === 0 ||
      eligibility.allowedDepartments.some((d) => d.toLowerCase() === user.department.toLowerCase());
    if (!deptPassed) {
      reasons.push(`Department "${user.department}" is not enrolled in this election scope.`);
    }

    const isEligible = orgPassed && domainPassed && empIdPassed && deptPassed;

    return {
      isEligible,
      reasons,
      passedChecks: {
        organization: orgPassed,
        domain: domainPassed,
        employeeId: empIdPassed,
        department: deptPassed,
      },
      details: {
        organization: user.organization,
        domain: userDomain,
        employeeId: user.employeeId,
        department: user.department,
      },
    };
  },

  async joinElection(
    electionIdOrCode: string,
    userId: string
  ): Promise<{ success: boolean; member?: ElectionMember; error?: string; reasons?: string[] }> {
    await simulateDelay(300, 600);
    const election = mockDb.getElectionById(electionIdOrCode);
    if (!election) {
      return { success: false, error: 'ELECTION_NOT_FOUND: No election found matching the specified code or identifier.' };
    }

    const user = mockDb.getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if already a member
    const existingMember = mockDb.getMember(election.id, userId);
    if (existingMember) {
      return {
        success: false,
        error: `ALREADY_MEMBER: You have already joined "${election.title}" with role: ${existingMember.role}.`,
      };
    }

    // Check Eligibility
    const eligibilityResult = await memberService.checkEligibility(election.id, user);
    if (!eligibilityResult.isEligible) {
      return {
        success: false,
        error: 'ACCESS_DENIED: You are not eligible for this election.',
        reasons: eligibilityResult.reasons,
      };
    }

    // Add as default VOTER
    const newMember: ElectionMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      electionId: election.id,
      userId,
      user,
      role: 'VOTER',
      joinedAt: new Date().toISOString(),
      hasVoted: false,
      status: 'ACTIVE',
    };

    mockDb.addMember(newMember);

    // Audit Event
    mockDb.addAuditEvent(
      election.id,
      'Member Joined',
      user.id,
      user.name,
      'VOTER',
      `Participant joined via verified eligibility credentials (CFMS/ID: ${user.employeeId}, Dept: ${user.department}). Assigned default role: VOTER.`,
      newMember.id
    );

    // Notification
    mockDb.addNotification({
      userId,
      electionId: election.id,
      title: 'Joined Election Successfully',
      message: `You have successfully joined "${election.title}" as a verified VOTER.`,
      type: 'ROLE_ASSIGNED',
    });

    return { success: true, member: newMember };
  },

  async assignRole(
    electionId: string,
    targetUserId: string,
    newRole: ElectionRole,
    actorId: string
  ): Promise<{ success: boolean; member?: ElectionMember; error?: string }> {
    await simulateDelay(250, 450);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const actor = mockDb.getUserById(actorId);
    const actorMember = mockDb.getMember(electionId, actorId);
    if (!actor || (actorMember?.role !== 'OWNER' && election.ownerId !== actorId)) {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only the Election Owner has authority to assign core team roles.',
      };
    }

    const targetUser = mockDb.getUserById(targetUserId);
    if (!targetUser) return { success: false, error: 'Target user not found' };

    const member = mockDb.getMember(electionId, targetUserId);
    if (!member) {
      return { success: false, error: 'Target user is not a member of this election.' };
    }

    const oldRole = member.role;
    const updated = mockDb.updateMember(electionId, targetUserId, { role: newRole });

    // Audit Event
    mockDb.addAuditEvent(
      electionId,
      'Role Assigned',
      actor.id,
      actor.name,
      'OWNER',
      `Member ${targetUser.name} (${targetUser.email}) reassigned from ${oldRole} to ${newRole}.`,
      `ROLE-${newRole}-${targetUser.id}`
    );

    // Notification
    mockDb.addNotification({
      userId: targetUserId,
      electionId,
      title: 'Election Role Updated',
      message: `Your role in "${election.title}" was updated to ${newRole} by Election Owner ${actor.name}.`,
      type: 'ROLE_ASSIGNED',
    });

    return { success: true, member: updated || undefined };
  },

  async revokeMember(
    electionId: string,
    targetUserId: string,
    actorId: string
  ): Promise<{ success: boolean; error?: string }> {
    await simulateDelay(200, 350);
    const election = mockDb.getElectionById(electionId);
    const actor = mockDb.getUserById(actorId);
    const actorMember = mockDb.getMember(electionId, actorId);

    if (!actor || (actorMember?.role !== 'OWNER' && election?.ownerId !== actorId)) {
      return { success: false, error: 'PERMISSION_DENIED: Only the Election Owner can revoke member participation.' };
    }

    const targetUser = mockDb.getUserById(targetUserId);
    mockDb.updateMember(electionId, targetUserId, { status: 'REVOKED' });

    mockDb.addAuditEvent(
      electionId,
      'Member Revoked',
      actor.id,
      actor.name,
      'OWNER',
      `Participation for ${targetUser?.name || targetUserId} has been REVOKED.`,
      targetUserId
    );

    return { success: true };
  },

  async inviteMember(
    electionId: string,
    data: {
      name: string;
      email: string;
      department?: string;
      employeeId?: string;
      role: ElectionRole;
    },
    actorId: string
  ): Promise<{ success: boolean; member?: ElectionMember; error?: string }> {
    await simulateDelay(250, 450);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const actor = mockDb.getUserById(actorId);
    const actorMember = mockDb.getMember(electionId, actorId);
    if (!actor || (actorMember?.role !== 'OWNER' && actorMember?.role !== 'OFFICER' && election.ownerId !== actorId)) {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only Election Owner or delegated Officers can invite participants.',
      };
    }

    const emailClean = data.email.trim().toLowerCase();
    let user = mockDb.getUserByEmail(emailClean);
    if (!user) {
      user = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        name: data.name.trim(),
        email: emailClean,
        employeeId: data.employeeId?.trim().toUpperCase() || 'AP-GOV-' + Math.floor(1000 + Math.random() * 9000),
        department: data.department?.trim() || 'General Administration',
        organization: election.organization,
        createdAt: new Date().toISOString(),
      };
      mockDb.createUser(user);
    }

    // Check if already in election
    const existing = mockDb.getMember(electionId, user.id);
    if (existing) {
      if (existing.status === 'ACTIVE') {
        return {
          success: false,
          error: `ALREADY_MEMBER: ${user.name} is already an active member of this election (${existing.role}).`,
        };
      } else if (existing.status === 'PENDING') {
        return {
          success: false,
          error: `INVITATION_PENDING: An invitation for ${user.name} is already pending.`,
        };
      }
    }

    const newMember: ElectionMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      electionId,
      userId: user.id,
      user,
      role: data.role,
      joinedAt: new Date().toISOString(),
      hasVoted: false,
      status: 'PENDING',
    };

    mockDb.addMember(newMember);

    // Audit Event
    mockDb.addAuditEvent(
      electionId,
      'Member Invited',
      actor.id,
      actor.name,
      actorMember?.role || 'OWNER',
      `Invitation dispatched to ${user.name} (${user.email}). Proposed Role: ${data.role}. Status: PENDING acceptance.`,
      newMember.id
    );

    // Notification
    mockDb.addNotification({
      userId: user.id,
      electionId,
      title: 'Election Invitation Received',
      message: `You have been invited to participate in "${election.title}" as ${data.role}. Status: PENDING acceptance.`,
      type: 'INVITATION',
    });

    return { success: true, member: newMember };
  },

  async activateMember(
    electionId: string,
    targetUserId: string,
    actorId: string
  ): Promise<{ success: boolean; member?: ElectionMember; error?: string }> {
    await simulateDelay(200, 350);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const actor = mockDb.getUserById(actorId);
    const actorMember = mockDb.getMember(electionId, actorId);
    if (!actor || (actorMember?.role !== 'OWNER' && actorMember?.role !== 'OFFICER' && election.ownerId !== actorId)) {
      return { success: false, error: 'PERMISSION_DENIED: Only Election Owner or Officers can activate member participation.' };
    }

    const updated = mockDb.updateMember(electionId, targetUserId, { status: 'ACTIVE' });
    const targetUser = mockDb.getUserById(targetUserId);

    mockDb.addAuditEvent(
      electionId,
      'Member Activated',
      actor.id,
      actor.name,
      actorMember?.role || 'OWNER',
      `Participant ${targetUser?.name || targetUserId} status updated from PENDING to ACTIVE. Verified for participation.`,
      targetUserId
    );

    return { success: true, member: updated || undefined };
  }
};
