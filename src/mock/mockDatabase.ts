import {
  User,
  Election,
  ElectionMember,
  Candidate,
  VotingCredential,
  AnonymousBallot,
  VoteReceipt,
  AuditEvent,
  Notification
} from '../types';
import {
  SEED_USERS,
  SEED_ELECTIONS,
  SEED_MEMBERS,
  SEED_CANDIDATES,
  SEED_AUDIT_EVENTS,
  SEED_NOTIFICATIONS
} from './seedData';

const DB_PREFIX = 'votesphere_v1_';

function simpleHash(str: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  const h3 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  const h4 = (Math.abs(hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
  return `${h1}${h2}${h3}${h4}${h1.split('').reverse().join('')}${h2.split('').reverse().join('')}`;
}

export class MockDatabase {
  private static instance: MockDatabase;

  private memoryFallback: Record<string, string> = {};

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(DB_PREFIX + key);
        if (item) return JSON.parse(item);
      }
    } catch {
      // localStorage unavailable or restricted
    }
    const mem = this.memoryFallback[key];
    if (mem) {
      try {
        return JSON.parse(mem);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  private setItem<T>(key: string, value: T): void {
    const serialized = JSON.stringify(value);
    this.memoryFallback[key] = serialized;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(DB_PREFIX + key, serialized);
      }
    } catch {
      // Storage quota or iframe restriction fallback
    }
  }

  public initDatabase(): void {
    if (!this.getItem<User[] | null>('users', null)) {
      this.resetDemoData();
    }
  }

  public resetDemoData(): void {
    this.setItem('users', SEED_USERS);
    this.setItem('elections', SEED_ELECTIONS);
    this.setItem('members', SEED_MEMBERS);
    this.setItem('candidates', SEED_CANDIDATES);
    this.setItem('auditEvents', SEED_AUDIT_EVENTS);
    this.setItem('notifications', SEED_NOTIFICATIONS);
    this.setItem('credentials', []);
    this.setItem('ballots', []);
    this.setItem('receipts', [
      {
        receiptId: 'RV-84920',
        electionId: 'election-apea-2026',
        electionTitle: 'Executive Committee Election 2026',
        organization: 'Andhra Pradesh Employees Association',
        timestamp: '2026-02-21T09:15:00Z',
        verificationHash: '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
        credentialTokenMasked: 'VC-8492-****-X1',
      },
      {
        receiptId: 'RV-71041',
        electionId: 'election-apea-2026',
        electionTitle: 'Executive Committee Election 2026',
        organization: 'Andhra Pradesh Employees Association',
        timestamp: '2026-02-21T10:45:00Z',
        verificationHash: '9a31f28b5e67c8d9e0123456789abcde',
        credentialTokenMasked: 'VC-7104-****-Y2',
      }
    ]);
    // Default logged in user: Karthik
    this.setItem('currentUserId', 'user-karthik');
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.getItem<User[]>('users', []);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: User): User {
    const users = this.getUsers();
    users.push(user);
    this.setItem('users', users);
    return user;
  }

  // --- Session & Current User ---
  public getCurrentUserId(): string | null {
    return this.getItem<string | null>('currentUserId', 'user-karthik');
  }

  public setCurrentUserId(userId: string | null): void {
    this.setItem('currentUserId', userId);
  }

  // --- Elections ---
  public getElections(): Election[] {
    return this.getItem<Election[]>('elections', []);
  }

  public getElectionById(id: string): Election | undefined {
    return this.getElections().find((e) => e.id === id || e.code.toUpperCase() === id.toUpperCase());
  }

  public createElection(election: Election): Election {
    const elections = this.getElections();
    elections.unshift(election);
    this.setItem('elections', elections);
    return election;
  }

  public updateElection(id: string, updates: Partial<Election>): Election | null {
    const elections = this.getElections();
    const index = elections.findIndex((e) => e.id === id);
    if (index === -1) return null;
    elections[index] = { ...elections[index], ...updates, updatedAt: new Date().toISOString() };
    this.setItem('elections', elections);
    return elections[index];
  }

  // --- Members ---
  public getMembers(electionId?: string): ElectionMember[] {
    const members = this.getItem<ElectionMember[]>('members', []);
    if (electionId) {
      return members.filter((m) => m.electionId === electionId);
    }
    return members;
  }

  public getMember(electionId: string, userId: string): ElectionMember | undefined {
    return this.getMembers().find((m) => m.electionId === electionId && m.userId === userId);
  }

  public addMember(member: ElectionMember): ElectionMember {
    const members = this.getMembers();
    members.push(member);
    this.setItem('members', members);
    return member;
  }

  public updateMember(electionId: string, userId: string, updates: Partial<ElectionMember>): ElectionMember | null {
    const members = this.getMembers();
    const index = members.findIndex((m) => m.electionId === electionId && m.userId === userId);
    if (index === -1) return null;
    members[index] = { ...members[index], ...updates };
    this.setItem('members', members);
    return members[index];
  }

  // --- Candidates ---
  public getCandidates(electionId?: string): Candidate[] {
    const candidates = this.getItem<Candidate[]>('candidates', []);
    if (electionId) {
      return candidates.filter((c) => c.electionId === electionId);
    }
    return candidates;
  }

  public getCandidateById(id: string): Candidate | undefined {
    return this.getCandidates().find((c) => c.id === id);
  }

  public addCandidate(candidate: Candidate): Candidate {
    const candidates = this.getCandidates();
    candidates.push(candidate);
    this.setItem('candidates', candidates);
    return candidate;
  }

  public updateCandidate(id: string, updates: Partial<Candidate>): Candidate | null {
    const candidates = this.getCandidates();
    const index = candidates.findIndex((c) => c.id === id);
    if (index === -1) return null;
    candidates[index] = { ...candidates[index], ...updates };
    this.setItem('candidates', candidates);
    return candidates[index];
  }

  // --- Voting Credentials ---
  public getCredentials(electionId?: string): VotingCredential[] {
    const creds = this.getItem<VotingCredential[]>('credentials', []);
    if (electionId) {
      return creds.filter((c) => c.electionId === electionId);
    }
    return creds;
  }

  public addCredential(cred: VotingCredential): VotingCredential {
    const creds = this.getCredentials();
    creds.push(cred);
    this.setItem('credentials', creds);
    return cred;
  }

  public markCredentialUsed(token: string): boolean {
    const creds = this.getCredentials();
    const cred = creds.find((c) => c.token === token);
    if (!cred || cred.used) return false;
    cred.used = true;
    cred.usedAt = new Date().toISOString();
    this.setItem('credentials', creds);
    return true;
  }

  // --- Ballots ---
  public getBallots(electionId?: string): AnonymousBallot[] {
    const ballots = this.getItem<AnonymousBallot[]>('ballots', []);
    if (electionId) {
      return ballots.filter((b) => b.electionId === electionId);
    }
    return ballots;
  }

  public addBallot(ballot: AnonymousBallot): AnonymousBallot {
    const ballots = this.getBallots();
    ballots.push(ballot);
    this.setItem('ballots', ballots);
    return ballot;
  }

  // --- Receipts ---
  public getReceipts(): VoteReceipt[] {
    return this.getItem<VoteReceipt[]>('receipts', []);
  }

  public getReceiptById(receiptId: string): VoteReceipt | undefined {
    return this.getReceipts().find((r) => r.receiptId === receiptId);
  }

  public addReceipt(receipt: VoteReceipt): VoteReceipt {
    const receipts = this.getReceipts();
    receipts.push(receipt);
    this.setItem('receipts', receipts);
    return receipt;
  }

  // --- Audit Events ---
  public getAuditEvents(electionId?: string): AuditEvent[] {
    const events = this.getItem<AuditEvent[]>('auditEvents', []);
    if (electionId) {
      return events.filter((e) => e.electionId === electionId);
    }
    return events;
  }

  public addAuditEvent(
    electionId: string,
    event: string,
    actorId: string,
    actorName: string,
    actorRole: AuditEvent['actorRole'],
    details: string,
    referenceId?: string
  ): AuditEvent {
    const events = this.getAuditEvents(electionId);
    const prevHash = events.length > 0 ? events[events.length - 1].currentHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const payload = `${prevHash}|${electionId}|${event}|${actorId}|${timestamp}|${details}|${referenceId || ''}`;
    const currentHash = simpleHash(payload);

    const newEvent: AuditEvent = {
      id: 'audit-' + Math.random().toString(36).substring(2, 9),
      electionId,
      event,
      actorId,
      actorName,
      actorRole,
      timestamp,
      referenceId,
      details,
      prevHash,
      currentHash,
    };

    const allEvents = this.getItem<AuditEvent[]>('auditEvents', []);
    allEvents.push(newEvent);
    this.setItem('auditEvents', allEvents);
    return newEvent;
  }

  // --- Notifications ---
  public getNotifications(userId?: string): Notification[] {
    const notifs = this.getItem<Notification[]>('notifications', []);
    if (userId) {
      return notifs.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return notifs;
  }

  public addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const notifs = this.getItem<Notification[]>('notifications', []);
    const newNotif: Notification = {
      ...notification,
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifs.unshift(newNotif);
    this.setItem('notifications', notifs);
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const notifs = this.getItem<Notification[]>('notifications', []);
    const notif = notifs.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.setItem('notifications', notifs);
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    const notifs = this.getItem<Notification[]>('notifications', []);
    notifs.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    this.setItem('notifications', notifs);
  }
}

export const mockDb = MockDatabase.getInstance();

export const simulateDelay = async (min = 120, max = 280): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
};
