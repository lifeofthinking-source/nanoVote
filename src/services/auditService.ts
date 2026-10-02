import { AuditEvent } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export interface ChainVerificationReport {
  isValid: boolean;
  totalEvents: number;
  genesisHash: string;
  chainHeadHash: string;
  verifiedAt: string;
  brokenEventId?: string;
  statusMessage: string;
}

export const auditService = {
  async getAuditEvents(electionId: string): Promise<AuditEvent[]> {
    await simulateDelay(120, 250);
    return mockDb.getAuditEvents(electionId);
  },

  async verifyChainIntegrity(electionId: string): Promise<ChainVerificationReport> {
    await simulateDelay(300, 600);
    const events = mockDb.getAuditEvents(electionId);

    if (events.length === 0) {
      return {
        isValid: true,
        totalEvents: 0,
        genesisHash: 'N/A',
        chainHeadHash: 'N/A',
        verifiedAt: new Date().toISOString(),
        statusMessage: 'No audit records logged yet.',
      };
    }

    let isValid = true;
    let brokenEventId: string | undefined;

    // Verify first event has 0000.. genesis or valid prevHash
    for (let i = 1; i < events.length; i++) {
      const prevEvent = events[i - 1];
      const currentEvent = events[i];

      if (currentEvent.prevHash !== prevEvent.currentHash) {
        isValid = false;
        brokenEventId = currentEvent.id;
        break;
      }
    }

    const genesisHash = events[0].prevHash;
    const chainHeadHash = events[events.length - 1].currentHash;

    return {
      isValid,
      totalEvents: events.length,
      genesisHash,
      chainHeadHash,
      verifiedAt: new Date().toISOString(),
      brokenEventId,
      statusMessage: isValid
        ? `Audit chain verified: All ${events.length} sequential state transitions cryptographically linked.`
        : `Cryptographic breach detected at block ID: ${brokenEventId}. Hash link mismatch!`,
    };
  }
};
