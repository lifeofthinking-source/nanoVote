import React from 'react';
import { ElectionRole } from '../types';

interface RoleIndicatorProps {
  role?: ElectionRole | null;
  size?: 'sm' | 'md';
}

export const RoleIndicator: React.FC<RoleIndicatorProps> = ({ role, size = 'md' }) => {
  if (!role) {
    return <span className={`text-slate-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>Non-member</span>;
  }

  const roleConfigs: Record<ElectionRole, { label: string; textClass: string; badgeLabel: string }> = {
    OWNER: {
      label: 'Election Owner',
      badgeLabel: 'OWNER',
      textClass: 'text-indigo-900 font-semibold',
    },
    OFFICER: {
      label: 'Election Officer',
      badgeLabel: 'OFFICER',
      textClass: 'text-sky-800 font-semibold',
    },
    CANDIDATE: {
      label: 'Approved Candidate',
      badgeLabel: 'CANDIDATE',
      textClass: 'text-amber-800 font-semibold',
    },
    AUDITOR: {
      label: 'Independent Auditor',
      badgeLabel: 'AUDITOR',
      textClass: 'text-purple-800 font-semibold',
    },
    VOTER: {
      label: 'Verified Voter',
      badgeLabel: 'VOTER',
      textClass: 'text-slate-700 font-medium',
    },
  };

  const config = roleConfigs[role] || roleConfigs.VOTER;

  return (
    <span className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'} ${config.textClass}`}>
      <span className="font-mono text-[11px] tracking-wide text-slate-500 uppercase">[{config.badgeLabel}]</span>
      <span>{config.label}</span>
    </span>
  );
};
