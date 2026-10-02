import React, { useState } from 'react';
import { VoteReceipt } from '../types';
import { CheckCircle2, ShieldCheck, Copy, Check, X, Printer, Lock } from 'lucide-react';

interface ReceiptModalProps {
  receipt: VoteReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !receipt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `VOTESPHERE BALLOT RECEIPT\nReceipt ID: ${receipt.receiptId}\nElection: ${receipt.electionTitle}\nTimestamp: ${receipt.timestamp}\nVerification Hash: ${receipt.verificationHash}\nCredential: ${receipt.credentialTokenMasked}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Receipt Header Banner */}
        <div className="bg-emerald-900 text-white p-6 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-emerald-200 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-full bg-emerald-800/80 border border-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-300" />
          </div>

          <h2 className="text-lg font-bold tracking-tight">BALLOT RECORDED</h2>
          <p className="text-xs text-emerald-200 mt-1">Official Cryptographic Vote Confirmation</p>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3 font-sans">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Election</span>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">{receipt.electionTitle}</p>
              <p className="text-[11px] text-slate-500">{receipt.organization}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Receipt ID</span>
                <span className="font-mono text-xs font-bold text-slate-900">{receipt.receiptId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Recorded At</span>
                <span className="font-mono text-xs text-slate-800">
                  {new Date(receipt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">One-Time Credential</span>
              <span className="font-mono text-xs text-slate-700">{receipt.credentialTokenMasked}</span>
            </div>

            <div className="pt-2 border-t border-slate-200/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Cryptographic Hash</span>
              <p className="font-mono text-[10px] text-slate-600 break-all bg-white p-1.5 rounded border border-slate-200 mt-0.5">
                {receipt.verificationHash}
              </p>
            </div>
          </div>

          {/* Privacy Notice Guarantee */}
          <div className="flex items-start gap-2.5 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Zero-Knowledge Ballot Guarantee:</strong> In accordance with statutory private balloting rules, this receipt certifies that your vote was cast into the digital ballot box without recording candidate selections against your identity.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Proof'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
