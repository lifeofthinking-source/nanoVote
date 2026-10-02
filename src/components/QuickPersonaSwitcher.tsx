import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, RefreshCw, ChevronDown, Check, ShieldCheck } from 'lucide-react';

interface QuickPersonaSwitcherProps {
  onPersonaSwitched?: () => void;
}

export const QuickPersonaSwitcher: React.FC<QuickPersonaSwitcherProps> = ({ onPersonaSwitched }) => {
  const { currentUser, allUsers, switchUser, resetDemoData, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const personas = [
    {
      id: 'user-karthik',
      roleNote: 'Owner (APEA Election)',
      subNote: 'Voter in Uni Council',
    },
    {
      id: 'user-yamini',
      roleNote: 'Officer (APEA Election)',
      subNote: 'Owner in Uni Council',
    },
    {
      id: 'user-shashank',
      roleNote: 'Auditor (APEA Election)',
      subNote: 'Vigilance oversight',
    },
    {
      id: 'user-madasa',
      roleNote: 'Candidate (APEA Election)',
      subNote: 'Owner in Welfare Committee',
    },
    {
      id: 'user-yashoda',
      roleNote: 'Voter (APEA Election)',
      subNote: 'Ready to cast ballot',
    },
  ];

  const handleSelect = async (userId: string) => {
    setIsOpen(false);
    await switchUser(userId);
    onPersonaSwitched?.();
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetDemoData();
      onPersonaSwitched?.();
    } finally {
      setIsResetting(false);
      setIsOpen(false);
    }
  };

  const currentPersona = personas.find((p) => p.id === currentUser?.id);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          title="Switch Demo Persona"
        >
          <UserCheck className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-semibold">{currentUser?.name.split(' ')[0] || 'Select User'}</span>
          <span className="text-slate-500 font-normal hidden sm:inline">
            · {currentPersona?.roleNote || 'Demo User'}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting || isLoading}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          title="Reset Demo Data to Initial Seed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-slate-700' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-40 p-2 text-xs">
            <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Switch Demo Persona</span>
                <span className="text-[10px] text-slate-500 font-mono">ROLE SIMULATOR</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Observe how UI controls & permissions adapt to election roles.
              </p>
            </div>

            <div className="space-y-1">
              {personas.map((persona) => {
                const user = allUsers.find((u) => u.id === persona.id);
                if (!user) return null;
                const isSelected = currentUser?.id === user.id;

                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleSelect(user.id)}
                    className={`w-full text-left p-2 rounded-lg transition-colors flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{user.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-indigo-700 font-medium">{persona.roleNote}</div>
                      <div className="text-[10px] text-slate-400">{user.department} · {persona.subNote}</div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{user.employeeId}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between px-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Simulated Backend</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-medium px-2 py-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
              >
                {isResetting ? 'Resetting...' : 'Reset Demo State'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
