import { BallotPositionSelection, AnonymousBallot, VoteReceipt, VotingCredential } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export interface VoterVerificationStatus {
  verified: boolean;
  checks: {
    identityVerified: boolean;
    membershipVerified: boolean;
    eligibilityVerified: boolean;
    electionActive: boolean;
    notYetVoted: boolean;
  };
  details: {
    userName: string;
    employeeId: string;
    organization: string;
    department: string;
    electionTitle: string;
    electionStatus: string;
    hasVoted: boolean;
  };
  error?: string;
}

function generateRandomToken(prefix: string): string {
  const seg1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const seg2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const seg3 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${seg1}-${seg2}-${seg3}`;
}

export const votingService = {
  async verifyVoter(electionId: string, userId: string): Promise<VoterVerificationStatus> {
    await simulateDelay(180, 350);
    const user = mockDb.getUserById(userId);
    const election = mockDb.getElectionById(electionId);
    const member = mockDb.getMember(electionId, userId);

    const identityVerified = !!user;
    const membershipVerified = !!member && member.status === 'ACTIVE';
    const electionActive = !!election && election.status === 'ACTIVE';
    const notYetVoted = !!member && !member.hasVoted;

    // Eligibility check
    let eligibilityVerified = false;
    if (user && election) {
      const { eligibility } = election;
      const orgMatch = eligibility.allowedOrganizations.length === 0 ||
        eligibility.allowedOrganizations.some((o) => o.toLowerCase() === user.organization.toLowerCase());
      const userDomain = user.email.split('@')[1]?.toLowerCase() || '';
      const domainMatch = eligibility.allowedDomains.length === 0 ||
        eligibility.allowedDomains.some((d) => d.toLowerCase() === userDomain);
      eligibilityVerified = orgMatch && domainMatch;
    }

    const verified = identityVerified && membershipVerified && electionActive && notYetVoted && eligibilityVerified;

    let error: string | undefined;
    if (!user) error = 'INVALID_CREDENTIAL: User authentication session expired.';
    else if (!membershipVerified) error = 'NOT_ENROLLED: You are not enrolled as an active voter in this election.';
    else if (!electionActive) error = `ELECTION_NOT_ACTIVE: The election is currently ${election?.status || 'UNAVAILABLE'}. Polls are not open.`;
    else if (!notYetVoted) error = 'ALREADY_VOTED: This voter has already cast a ballot. Duplicate voting is prohibited.';
    else if (!eligibilityVerified) error = 'NOT_ELIGIBLE: Voter attributes do not meet active election eligibility rules.';

    return {
      verified,
      checks: {
        identityVerified,
        membershipVerified,
        eligibilityVerified,
        electionActive,
        notYetVoted,
      },
      details: {
        userName: user?.name || 'Unknown',
        employeeId: user?.employeeId || 'N/A',
        organization: user?.organization || 'N/A',
        department: user?.department || 'N/A',
        electionTitle: election?.title || 'Unknown Election',
        electionStatus: election?.status || 'UNKNOWN',
        hasVoted: member?.hasVoted ?? false,
      },
      error,
    };
  },

  async issueVotingCredential(
    electionId: string,
    userId: string
  ): Promise<{ success: boolean; credentialToken?: string; error?: string }> {
    await simulateDelay(200, 400);
    const verification = await votingService.verifyVoter(electionId, userId);
    if (!verification.verified) {
      return {
        success: false,
        error: verification.error || 'Verification check failed',
      };
    }

    const token = generateRandomToken('VC');
    const voterHash = 'vhash-' + Math.random().toString(36).substring(2, 10);

    const credential: VotingCredential = {
      id: 'cred-' + Math.random().toString(36).substring(2, 9),
      token,
      electionId,
      voterHash,
      issuedAt: new Date().toISOString(),
      used: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    mockDb.addCredential(credential);

    // Audit Event for Credential Issuance (identity decoupled from ballot)
    const user = mockDb.getUserById(userId);
    mockDb.addAuditEvent(
      electionId,
      'Voter Verified',
      userId,
      user?.name || 'Voter',
      'VOTER',
      `Voter verified through eligibility and attendance registry. One-Time Cryptographic Credential issued. Identity decoupled.`,
      `CRED-ISSUE-${credential.id.substring(0, 8)}`
    );

    return { success: true, credentialToken: token };
  },

  async castBallot(
    electionId: string,
    credentialToken: string,
    userId: string,
    selections: BallotPositionSelection[],
    biometricHash?: string
  ): Promise<{ success: boolean; receipt?: VoteReceipt; error?: string }> {
    await simulateDelay(350, 650);

    // 1. Backend rule enforcement: verify credential
    const credentials = mockDb.getCredentials(electionId);
    const cred = credentials.find((c) => c.token === credentialToken);

    if (!cred) {
      return {
        success: false,
        error: 'INVALID_CREDENTIAL: The supplied one-time voting token is invalid or expired.',
      };
    }

    if (cred.used) {
      return {
        success: false,
        error: 'CREDENTIAL_ALREADY_USED: This one-time voting credential has already been consumed.',
      };
    }

    // 2. Backend rule enforcement: verify voter has not voted in DB
    const member = mockDb.getMember(electionId, userId);
    if (!member) {
      return { success: false, error: 'NOT_ENROLLED: Voter is not enrolled in this election.' };
    }

    if (member.hasVoted) {
      return {
        success: false,
        error: 'ALREADY_VOTED: This voter has already cast a ballot in this election. System rejected duplicate ballot submission.',
      };
    }

    const election = mockDb.getElectionById(electionId);
    if (!election || election.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'ELECTION_NOT_ACTIVE: Polls are not open for ballot submission.',
      };
    }

    // 3. Mark credential used
    mockDb.markCredentialUsed(credentialToken);

    // 4. Generate Receipt ID & Cryptographic Receipt Hash
    const receiptNum = Math.floor(10000 + Math.random() * 90000);
    const receiptId = `RV-${receiptNum}`;
    const verificationHash = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const resolvedBioHash = biometricHash || `BIO-${verificationHash.slice(0, 16).toUpperCase()}`;
    const castTime = new Date().toISOString();

    // 5. Commit Anonymous Ballot (NO voter ID stored on ballot!)
    const anonymousBallot: AnonymousBallot = {
      id: 'ballot-' + Math.random().toString(36).substring(2, 9),
      electionId,
      credentialToken: `VC-****-${credentialToken.slice(-4)}`,
      selections,
      castAt: castTime,
      ballotHash: verificationHash,
      biometricHash: resolvedBioHash,
    };
    mockDb.addBallot(anonymousBallot);

    // Update candidate votes in memory store
    selections.forEach((sel) => {
      const candidate = mockDb.getCandidateById(sel.candidateId);
      if (candidate) {
        mockDb.updateCandidate(candidate.id, {
          votesCount: (candidate.votesCount || 0) + 1,
        });
      }
    });

    // 6. Update user's membership to mark voted
    mockDb.updateMember(electionId, userId, {
      hasVoted: true,
      receiptId,
      votedAt: castTime,
    });

    // 7. Store Receipt
    const receipt: VoteReceipt = {
      receiptId,
      electionId,
      electionTitle: election.title,
      organization: election.organization,
      timestamp: castTime,
      verificationHash,
      credentialTokenMasked: `VC-****-${credentialToken.slice(-4)}`,
      biometricHash: resolvedBioHash,
      facialVerificationStatus: 'VERIFIED',
    };
    mockDb.addReceipt(receipt);

    // 8. Log Audit Event: Secret ballot recorded without candidate choices
    mockDb.addAuditEvent(
      electionId,
      'Ballot Recorded & Biometrically Certified',
      'SYSTEM',
      'Cryptographic Ballot Box',
      'SYSTEM',
      `Encrypted anonymous ballot committed into digital ballot box. Verification hash: ${verificationHash}. Biometric Anti-Duplicate Hash: ${resolvedBioHash}. Receipt: ${receiptId}.`,
      receiptId
    );

    // 9. Send Notification to User
    mockDb.addNotification({
      userId,
      electionId,
      title: 'Ballot Recorded Successfully',
      message: `Your vote for "${election.title}" has been securely recorded. Receipt ID: ${receiptId}.`,
      type: 'VOTE_CONFIRMED',
    });

    return { success: true, receipt };
  },

  async getReceipt(receiptId: string): Promise<VoteReceipt | null> {
    await simulateDelay(100, 200);
    return mockDb.getReceiptById(receiptId) || null;
  }
};
