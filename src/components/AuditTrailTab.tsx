import React, { useState, useEffect } from 'react';
import { AuditEvent } from '../types';
import { auditService, ChainVerificationReport } from '../services/auditService';
import { ShieldCheck, CheckCircle2, AlertTriangle, Link2, Clock, Hash } from 'lucide-react';

interface AuditTrailTabProps {
  electionId: string;
}

export const AuditTrailTab: React.FC<AuditTrailTabProps> = ({ electionId }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [verification, setVerification] = useState<ChainVerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuditEvents();
  }, [electionId]);

  const loadAuditEvents = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditEvents(electionId);
      setEvents(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const report = await auditService.verifyChainIntegrity(electionId);
      setVerification(report);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500">
        <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mb-2" />
        Loading immutable audit ledger...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Verification Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">Tamper-Evident Audit Trail — Prototype</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Sequential cryptographic hash chain linking state transitions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          {isVerifying ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verifying Hash Linkages...
            </span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify Cryptographic Integrity</span>
            </>
          )}
        </button>
      </div>

      {/* Verification Certificate Banner */}
      {verification && (
        <div
          className={`p-4 rounded-xl border text-xs animate-in fade-in duration-200 ${
            verification.isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {verification.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <span className="font-bold block text-sm">
                {verification.isValid ? 'Ledger Integrity Certificate Valid' : 'Ledger Integrity Mismatch'}
              </span>
              <p className="text-xs">{verification.statusMessage}</p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-slate-700">
                <div>
                  <span className="text-slate-500">Total Validated Blocks:</span> {verification.totalEvents}
                </div>
                <div>
                  <span className="text-slate-500">Chain Head Hash:</span> {verification.chainHeadHash.substring(0, 16)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events Timeline */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
            No audit records created yet.
          </div>
        ) : (
          events.map((event, idx) => (
            <div
              key={event.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-colors relative space-y-2 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                  <span className="font-bold text-slate-900 text-sm">{event.event}</span>
                  {event.referenceId && (
                    <span className="font-mono text-[11px] text-slate-500">[{event.referenceId}]</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-semibold text-slate-900">{event.actorName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] text-indigo-700 uppercase">{event.actorRole}</span>
              </div>

              <p className="text-slate-700 leading-relaxed font-sans">{event.details}</p>

              {/* Cryptographic Hashes */}
              <div className="pt-2 border-t border-slate-100 font-mono text-[10px] space-y-1 text-slate-500 bg-slate-50/60 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-slate-400 shrink-0">Prev Hash:</span>
                  <span className="truncate">{event.prevHash}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="text-slate-400 shrink-0">Current Hash:</span>
                  <span className="truncate font-semibold text-slate-700">{event.currentHash}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
