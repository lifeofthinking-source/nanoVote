import React, { useState } from 'react';
import { Election, ElectionMember, ElectionRole } from '../types';
import { memberService } from '../services/memberService';
import { RoleIndicator } from './RoleIndicator';
import { UserPlus, ShieldAlert, Check, X, Shield, Lock, Clock, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react';

interface MemberManagementTabProps {
  election: Election;
  members: ElectionMember[];
  currentUserRole?: ElectionRole | null;
  currentUserId: string;
  onRefresh: () => void;
}

export const MemberManagementTab: React.FC<MemberManagementTabProps> = ({
  election,
  members,
  currentUserRole,
  currentUserId,
  onRefresh,
}) => {
  const isOwner = currentUserRole === 'OWNER';
  const isOfficer = currentUserRole === 'OFFICER';
  const canManage = isOwner || isOfficer;

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('Revenue Administration');
  const [inviteRole, setInviteRole] = useState<ElectionRole>('VOTER');
  const [isInviting, setIsInviting] = useState(false);

  // Role change state
  const [selectedMember, setSelectedMember] = useState<ElectionMember | null>(null);
  const [newRole, setNewRole] = useState<ElectionRole>('VOTER');
  const [isUpdating, setIsUpdating] = useState(false);

  // Status messages
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActivatingId, setIsActivatingId] = useState<string | null>(null);

  const handleRoleChangeSubmit = async () => {
    if (!selectedMember) return;
    setIsUpdating(true);
    setError(null);
    try {
      const res = await memberService.assignRole(
        election.id,
        selectedMember.userId,
        newRole,
        currentUserId
      );

      if (res.success) {
        setSuccessMessage(`Role for ${selectedMember.user.name} successfully updated to ${newRole}.`);
        setSelectedMember(null);
        onRefresh();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error || 'Failed to update role');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setError('Please provide the participant full name and official email address.');
      return;
    }

    setIsInviting(true);
    setError(null);
    try {
      const res = await memberService.inviteMember(
        election.id,
        {
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          department: inviteDepartment.trim(),
          role: inviteRole,
        },
        currentUserId
      );

      if (res.success) {
        setSuccessMessage(
          `Invitation dispatched to ${inviteName.trim()} (${inviteEmail.trim()}). Participant added to roster with Status: PENDING.`
        );
        setShowInviteModal(false);
        setInviteName('');
        setInviteEmail('');
        onRefresh();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(res.error || 'Failed to invite participant.');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleActivateMember = async (targetUserId: string, memberName: string) => {
    setIsActivatingId(targetUserId);
    setError(null);
    try {
      const res = await memberService.activateMember(election.id, targetUserId, currentUserId);
      if (res.success) {
        setSuccessMessage(`Participant ${memberName} status updated from PENDING to ACTIVE.`);
        onRefresh();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error || 'Failed to activate member.');
      }
    } finally {
      setIsActivatingId(null);
    }
  };

  const handlePrefillDemo = () => {
    const demoNames = [
      { name: 'B. Srikanth Naidu', email: 'srikanth.n@apea.gov.in', dept: 'Commercial Taxes' },
      { name: 'Dr. Ch. Lakshmi', email: 'c.lakshmi@apea.gov.in', dept: 'Health Services' },
      { name: 'M. Anand Kumar', email: 'anand.k@apea.gov.in', dept: 'Public Works Department' },
      { name: 'V. Rajeshwari', email: 'v.rajeshwari@apea.gov.in', dept: 'Education Directorate' }
    ];
    const picked = demoNames[Math.floor(Math.random() * demoNames.length)];
    setInviteName(picked.name);
    setInviteEmail(picked.email);
    setInviteDepartment(picked.dept);
    setInviteRole('VOTER');
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Election Members & Core Team</h3>
          <p className="text-xs text-slate-500">
            {members.length} participant{members.length !== 1 ? 's' : ''} on record ({members.filter(m => m.status === 'ACTIVE').length} Active · {members.filter(m => m.status === 'PENDING').length} Pending Invitation).
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowInviteModal(true);
                setError(null);
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Participant</span>
            </button>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isOwner && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Permission Scope:</strong> Core team delegation (assigning Election Officers, Auditors) is restricted to the <strong className="text-slate-900">Election Owner</strong>. Non-owners have view-only access to member rosters.
          </p>
        </div>
      )}

      {/* Members Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-4">Member Name</th>
                <th className="py-2.5 px-4">Member / Employee ID</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Election Role</th>
                <th className="py-2.5 px-4 text-center">Enrollment Status</th>
                <th className="py-2.5 px-4 text-center">Voting Status</th>
                {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const isPending = member.status === 'PENDING';
                const isRevoked = member.status === 'REVOKED';

                return (
                  <tr
                    key={member.id}
                    className={`transition-colors ${
                      isPending ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{member.user.name}</span>
                        {isPending && (
                          <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            INVITED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{member.user.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {member.user.employeeId}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {member.user.department}
                    </td>
                    <td className="py-3 px-4">
                      <RoleIndicator role={member.role} size="sm" />
                    </td>

                    {/* Enrollment Status */}
                    <td className="py-3 px-4 text-center">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending Acceptance</span>
                        </span>
                      ) : isRevoked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          <span>Revoked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Voting Status */}
                    <td className="py-3 px-4 text-center">
                      {isPending ? (
                        <span className="text-[11px] text-slate-400 font-mono">—</span>
                      ) : member.hasVoted ? (
                        <span className="text-[11px] font-mono text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>VOTED</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Not Voted</span>
                      )}
                    </td>

                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              type="button"
                              disabled={isActivatingId === member.userId}
                              onClick={() => handleActivateMember(member.userId, member.user.name)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                              title="Verify & mark status as ACTIVE"
                            >
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              <span>{isActivatingId === member.userId ? 'Activating...' : 'Activate'}</span>
                            </button>
                          )}

                          {isOwner && !isPending && !isSelf && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMember(member);
                                setNewRole(member.role);
                                setError(null);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                            >
                              Assign Role
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Assign Election Role</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Select an election-scoped responsibility for <strong className="text-slate-900">{selectedMember.user.name}</strong>:
            </p>

            <div className="space-y-2 mb-5">
              {[
                {
                  role: 'OFFICER' as ElectionRole,
                  title: 'Election Officer',
                  desc: 'Operational management, candidate review, voter supervision.',
                },
                {
                  role: 'AUDITOR' as ElectionRole,
                  title: 'Independent Auditor',
                  desc: 'Read-only audit inspection, verification of cryptographic chain.',
                },
                {
                  role: 'VOTER' as ElectionRole,
                  title: 'Verified Voter',
                  desc: 'Default participant with ballot casting privileges.',
                },
              ].map((opt) => (
                <div
                  key={opt.role}
                  onClick={() => setNewRole(opt.role)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    newRole === opt.role
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{opt.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleRoleChangeSubmit}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {isUpdating ? 'Updating Role...' : 'Save Role Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900">Invite Participant to Election</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                <span className="text-[11px] text-slate-600 font-medium">Evaluation Demo Helper:</span>
                <button
                  type="button"
                  onClick={handlePrefillDemo}
                  className="text-[11px] text-indigo-700 font-semibold hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Pre-Fill Sample Participant</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. B. Srikanth Naidu"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. srikanth.n@apea.gov.in"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    placeholder="e.g. Revenue Administration"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as ElectionRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="VOTER">Voter</option>
                    <option value="OFFICER">Election Officer</option>
                    <option value="AUDITOR">Auditor</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/70">
                <strong>Simulated Dispatch:</strong> The participant will immediately be added to the Election Members roster with <strong className="text-amber-800">Status: PENDING</strong>. An audit event is logged in the cryptographic ledger.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isInviting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{isInviting ? 'Dispatching Invitation...' : 'Send Invitation & Add'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
