import { TurnoutStats, ElectionRole } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export const resultService = {
  async getResults(
    electionId: string,
    requesterRole?: ElectionRole | null
  ): Promise<{ success: boolean; stats?: TurnoutStats; error?: string }> {
    await simulateDelay(150, 300);
    const election = mockDb.getElectionById(electionId);
    if (!election) return { success: false, error: 'Election not found' };

    const isLivePollPublished = election.livePollPublished || false;
    const isAuthorized =
      election.status === 'CLOSED' ||
      election.resultsVisible ||
      isLivePollPublished ||
      requesterRole === 'OWNER' ||
      requesterRole === 'OFFICER' ||
      requesterRole === 'AUDITOR';

    if (!isAuthorized) {
      return {
        success: false,
        error:
          'LIVE_POLL_SEALED: The Election Head has kept real-time polling data private. Standings will reveal if published by the Election Owner or upon election conclusion.',
      };
    }

    const members = mockDb.getMembers(electionId);
    const totalJoined = members.length;
    const totalVoted = members.filter((m) => m.hasVoted).length;
    // Estimated eligible population based on department baseline
    const totalEligible = Math.max(totalJoined + 4, 15);
    const turnoutPercentage =
      totalJoined > 0 ? Math.round((totalVoted / totalJoined) * 1000) / 10 : 0;

    const candidates = mockDb
      .getCandidates(electionId)
      .filter((c) => c.status === 'APPROVED');

    const positionStats = election.positions.map((pos) => {
      const posCandidates = candidates.filter((c) => c.positionId === pos.id);
      const totalPosVotes = posCandidates.reduce(
        (acc, c) => acc + (c.votesCount || 0),
        0
      );

      // Sort by votes descending
      const sortedCandidates = [...posCandidates].sort(
        (a, b) => (b.votesCount || 0) - (a.votesCount || 0)
      );

      const maxVotes = sortedCandidates[0]?.votesCount || 0;
      const runnerUpVotes = sortedCandidates[1]?.votesCount || 0;
      const topMargin = maxVotes - runnerUpVotes;

      const candidateResults = sortedCandidates.map((c, idx) => {
        const votes = c.votesCount || 0;
        const percentage =
          totalPosVotes > 0 ? Math.round((votes / totalPosVotes) * 1000) / 10 : 0;
        const isWinner =
          election.status === 'CLOSED' && votes === maxVotes && maxVotes > 0;
        const isLeader = idx === 0 && votes > 0;
        const leadMargin = isLeader ? topMargin : votes - maxVotes;

        // Realistic estimated win probability
        let winProbability = 50;
        let projectionStatus: 'Dominant Lead' | 'Narrow Lead' | 'Competitive' | 'Trailing' = 'Competitive';

        if (totalPosVotes > 0) {
          if (isLeader) {
            if (topMargin >= 3) {
              winProbability = Math.min(94, 75 + topMargin * 5);
              projectionStatus = 'Dominant Lead';
            } else if (topMargin >= 1) {
              winProbability = Math.min(74, 55 + topMargin * 8);
              projectionStatus = 'Narrow Lead';
            } else {
              winProbability = 50;
              projectionStatus = 'Competitive';
            }
          } else {
            winProbability = Math.max(8, Math.round(100 - (70 + Math.abs(leadMargin) * 7)));
            projectionStatus = Math.abs(leadMargin) <= 1 ? 'Competitive' : 'Trailing';
          }
        }

        return {
          candidateId: c.id,
          candidateName: c.user.name,
          department: c.user.department,
          votes,
          percentage,
          isWinner,
          isLeader,
          leadMargin,
          winProbability,
          projectionStatus,
        };
      });

      return {
        positionId: pos.id,
        positionTitle: pos.title,
        totalVotes: totalPosVotes,
        leaderName: sortedCandidates[0]?.votesCount && sortedCandidates[0]?.votesCount > 0
          ? sortedCandidates[0].user.name
          : undefined,
        candidates: candidateResults,
      };
    });

    // Recent voters list for administrative tracking (strictly restricted to Election Head & Officers; NEVER exposed to public/voter accounts)
    const isAdmin = requesterRole === 'OWNER' || requesterRole === 'OFFICER' || requesterRole === 'AUDITOR';
    const recentVoters = isAdmin
      ? members
          .filter((m) => m.hasVoted)
          .sort((a, b) => new Date(b.votedAt || 0).getTime() - new Date(a.votedAt || 0).getTime())
          .map((m) => ({
            id: m.id,
            voterName: m.user.name,
            department: m.user.department,
            employeeIdMasked: m.user.employeeId
              ? m.user.employeeId.slice(0, 6) + '****'
              : 'ID-****',
            votedAt: m.votedAt || m.joinedAt,
            receiptId: m.receiptId,
          }))
      : [];

    return {
      success: true,
      stats: {
        totalEligible,
        totalJoined,
        totalVoted,
        turnoutPercentage,
        isLivePollPublished,
        positionStats,
        recentVoters,
      },
    };
  },
};
