import React, { useState } from 'react';
import { Election, Position } from '../types';
import { candidateService } from '../services/candidateService';
import { X, Award, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface NominationModalProps {
  election: Election;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNominationSubmitted: () => void;
}

export const NominationModal: React.FC<NominationModalProps> = ({
  election,
  userId,
  isOpen,
  onClose,
  onNominationSubmitted,
}) => {
  const [positionId, setPositionId] = useState<string>(election.positions[0]?.id || '');
  const [manifesto, setManifesto] = useState('');
  const [experience, setExperience] = useState('');
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationAgreed) {
      setError('You must affirm the official declaration to proceed.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await candidateService.submitNomination(election.id, userId, {
        positionId,
        manifesto,
        experience,
        declarationAgreed,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onNominationSubmitted();
          onClose();
        }, 1500);
      } else {
        setError(res.error || 'Failed to submit nomination');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">File Candidate Nomination</h2>
              <p className="text-[11px] text-slate-500">{election.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nomination Filed Successfully</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your candidacy application has been registered with status <strong className="text-amber-700">PENDING</strong>. The Election Owner or Officer will review your submission.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Position Contested</label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              >
                {election.positions.map((pos: Position) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Manifesto & Vision</label>
              <textarea
                required
                rows={3}
                value={manifesto}
                onChange={(e) => setManifesto(e.target.value)}
                placeholder="State your key priorities, commitments to members, and intended reforms..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relevant Experience & Qualifications</label>
              <textarea
                required
                rows={2}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Years in service, prior union or committee responsibilities..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationAgreed}
                  onChange={(e) => setDeclarationAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-600 leading-relaxed">
                  I solemnly declare that I am an eligible employee in good standing, hold no disqualifying disciplinary actions, and agree to abide by the statutory Election Code of Conduct.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !declarationAgreed}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {isLoading ? 'Submitting Nomination...' : 'File Nomination'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
