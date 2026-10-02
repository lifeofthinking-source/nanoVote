import React from 'react';
import { ElectionStatus } from '../types';

interface StatusIndicatorProps {
  status: ElectionStatus;
  size?: 'sm' | 'md';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, size = 'md' }) => {
  const configs: Record<ElectionStatus, { label: string; dotClass: string; textClass: string }> = {
    DRAFT: {
      label: 'Draft Setup',
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-600',
    },
    NOMINATION: {
      label: 'Nomination Open',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700',
    },
    SCHEDULED: {
      label: 'Scheduled',
      dotClass: 'bg-blue-500',
      textClass: 'text-blue-700',
    },
    ACTIVE: {
      label: 'Polls Active',
      dotClass: 'bg-emerald-500 animate-pulse',
      textClass: 'text-emerald-700 font-medium',
    },
    CLOSED: {
      label: 'Election Concluded',
      dotClass: 'bg-slate-600',
      textClass: 'text-slate-700',
    },
  };

  const current = configs[status] || configs.DRAFT;

  return (
    <span className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'} ${current.textClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dotClass}`} aria-hidden="true" />
      <span>{current.label}</span>
    </span>
  );
};
