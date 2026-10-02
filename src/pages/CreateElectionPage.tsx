import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { electionService } from '../services/electionService';
import { Position, EligibilityRules, ElectionType } from '../types';
import {
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Building2,
  ShieldCheck,
  Award
} from 'lucide-react';

interface CreateElectionPageProps {
  onNavigate: (view: string, electionId?: string) => void;
}

export const CreateElectionPage: React.FC<CreateElectionPageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();

  // Wizard Step: 1 -> 2 -> 3 -> 4 -> 5
  const [step, setStep] = useState<number>(1);

  // Form State: Step 1 Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organization, setOrganization] = useState(currentUser?.organization || 'Andhra Pradesh Employees Association');
  const [type, setType] = useState<ElectionType>('ASSOCIATION');

  // Step 2 Positions
  const [positions, setPositions] = useState<Position[]>([
    {
      id: 'pos-1',
      title: 'President',
      description: 'Presides over executive council and represents association.',
      maxSelections: 1,
      order: 1,
    },
    {
      id: 'pos-2',
      title: 'General Secretary',
      description: 'Manages administrative operations and member grievance resolutions.',
      maxSelections: 1,
      order: 2,
    },
  ]);
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosDesc, setNewPosDesc] = useState('');

  // Step 3 Eligibility
  const [allowedDomains, setAllowedDomains] = useState('apea.gov.in');
  const [allowedDepartments, setAllowedDepartments] = useState('Finance & Accounts, Revenue Administration, Education Directorate, Public Works Department');
  const [requiresEmployeeId, setRequiresEmployeeId] = useState(true);
  const [employeeIdPattern, setEmployeeIdPattern] = useState('^AP-GOV-\\d{4}$');

  // Step 4 Voting Rules & Schedule
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [votingStartDate, setVotingStartDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [votingEndDate, setVotingEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [nominationDeadline, setNominationDeadline] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPosition = () => {
    if (!newPosTitle.trim()) return;
    const newPos: Position = {
      id: 'pos-' + Math.random().toString(36).substring(2, 7),
      title: newPosTitle.trim(),
      description: newPosDesc.trim() || 'Contested committee responsibility',
      maxSelections: 1,
      order: positions.length + 1,
    };
    setPositions([...positions, newPos]);
    setNewPosTitle('');
    setNewPosDesc('');
  };

  const handleRemovePosition = (id: string) => {
    if (positions.length <= 1) {
      setError('An election must contain at least one contested position.');
      return;
    }
    setPositions(positions.filter((p) => p.id !== id));
  };

  const handleCreateElection = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);

    const eligibilityRules: EligibilityRules = {
      allowedOrganizations: [organization.trim()],
      allowedDomains: allowedDomains
        .split(',')
        .map((d) => d.trim().replace(/^@/, ''))
        .filter(Boolean),
      allowedDepartments: allowedDepartments
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean),
      requiresEmployeeId,
      employeeIdPattern: employeeIdPattern.trim() || undefined,
      autoApproveEligible: true,
    };

    try {
      const res = await electionService.createElection(currentUser.id, {
        title,
        description,
        organization,
        type,
        positions,
        eligibility: eligibilityRules,
        nominationDeadline: new Date(nominationDeadline).toISOString(),
        votingStartDate: new Date(votingStartDate).toISOString(),
        votingEndDate: new Date(votingEndDate).toISOString(),
        isAnonymous,
      });

      if (res.success && res.election) {
        onNavigate('election-detail', res.election.id);
      } else {
        setError(res.error || 'Failed to create election');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Create New Election</h1>
        <p className="text-xs text-slate-500 mt-1">
          Guided setup wizard. As the creator, you will automatically become the <strong className="text-indigo-800">Election Owner</strong>.
        </p>
      </div>

      {/* Stepper Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          {[
            { num: 1, label: 'Basic Info' },
            { num: 2, label: 'Positions' },
            { num: 3, label: 'Eligibility' },
            { num: 4, label: 'Schedule' },
            { num: 5, label: 'Review' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    step === s.num
                      ? 'bg-slate-900 text-white'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`hidden sm:inline font-medium ${step === s.num ? 'text-slate-900' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
              {idx < 4 && <div className="h-0.5 flex-1 bg-slate-200 mx-2" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        {/* STEP 1: BASIC INFORMATION */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Election Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. State Executive Committee General Election 2026"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Organization / Institution Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Andhra Pradesh Employees Association"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Election Classification
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ElectionType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="ASSOCIATION">Government / Employee Association</option>
                  <option value="UNIVERSITY">Academic / University Council</option>
                  <option value="CORPORATE">Corporate / Board Election</option>
                  <option value="NGO">Society / Non-Profit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designated Creator Role
                </label>
                <input
                  type="text"
                  disabled
                  value="ELECTION OWNER / HEAD (Automatic)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-indigo-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Election Charter / Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="State the objective, resolution mandate, and governance scope of this election..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 2: POSITIONS */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Contested Executive Positions
              </h3>
              <p className="text-xs text-slate-500">
                Define the roles that candidates will file nominations for and voters will cast ballots on.
              </p>
            </div>

            <div className="space-y-3">
              {positions.map((pos, idx) => (
                <div
                  key={pos.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">
                      #{idx + 1}. {pos.title}
                    </div>
                    <p className="text-slate-600 text-[11px]">{pos.description}</p>
                    <span className="text-[10px] text-slate-400 font-mono">Single Choice Voting (1 seat)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePosition(pos.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remove Position"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add position inline form */}
            <div className="p-4 border border-dashed border-slate-300 rounded-xl space-y-3 bg-white">
              <span className="text-xs font-semibold text-slate-700 block">Add Additional Position</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newPosTitle}
                  onChange={(e) => setNewPosTitle(e.target.value)}
                  placeholder="e.g. Treasurer / Joint Secretary"
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
                <input
                  type="text"
                  value={newPosDesc}
                  onChange={(e) => setNewPosDesc(e.target.value)}
                  placeholder="Responsibilities description..."
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPosition}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ELIGIBILITY RULES */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Voter Eligibility Engine
              </h3>
              <p className="text-xs text-slate-500">
                Incoming participants who use an election join code will be evaluated against these constraints.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Official Email Domains (Comma-separated)
              </label>
              <input
                type="text"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="apea.gov.in, ap.gov.in"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Leave empty to allow any registered domain.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Eligible Departments / Cadres
              </label>
              <textarea
                rows={2}
                value={allowedDepartments}
                onChange={(e) => setAllowedDepartments(e.target.value)}
                placeholder="Finance & Accounts, Revenue Administration..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={requiresEmployeeId}
                  onChange={(e) => setRequiresEmployeeId(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>Mandate Verified Member / CFMS Employee ID</span>
              </label>

              {requiresEmployeeId && (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Employee ID Regular Expression Pattern
                  </label>
                  <input
                    type="text"
                    value={employeeIdPattern}
                    onChange={(e) => setEmployeeIdPattern(e.target.value)}
                    placeholder="^AP-GOV-\\d{4}$"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Validates that IDs follow association standard format (e.g. AP-GOV-8492)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: VOTING RULES & SCHEDULE */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Voting Rules & Lifecycle Timeline
              </h3>
              <p className="text-xs text-slate-500">
                Schedule nomination deadlines and polling hours.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomination Deadline
                </label>
                <input
                  type="datetime-local"
                  value={nominationDeadline}
                  onChange={(e) => setNominationDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Voting Start Time
                </label>
                <input
                  type="datetime-local"
                  value={votingStartDate}
                  onChange={(e) => setVotingStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Voting End Time
                </label>
                <input
                  type="datetime-local"
                  value={votingEndDate}
                  onChange={(e) => setVotingEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="font-bold">Cryptographic Anonymous Secret Ballot (Mandatory for GovTech)</span>
              </label>
              <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                Separates voter check-in from ballot choice via one-time single-use credentials. Individual choices will never be tied to names or employee IDs.
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & LAUNCH */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block">Configuration Ready for Launch</span>
                <p className="text-[11px] text-indigo-800 leading-relaxed mt-0.5">
                  Confirming this form will initialize an immutable genesis block in the audit trail and designate you as the <strong className="font-bold">Election Owner</strong>.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500">Title & Organization:</span>
                <span className="font-bold text-slate-900 text-right">
                  {title} · {organization}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500">Contested Positions:</span>
                <span className="font-mono text-slate-900 font-bold">
                  {positions.length} ({positions.map((p) => p.title).join(', ')})
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500">Domain & CFMS Constraint:</span>
                <span className="font-mono text-slate-700">
                  @{allowedDomains || 'any'} · {employeeIdPattern}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500">Polling Window:</span>
                <span className="font-mono text-slate-700">
                  {new Date(votingStartDate).toLocaleDateString()} — {new Date(votingEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !title.trim()) {
                  setError('Please provide an election title.');
                  return;
                }
                setError(null);
                setStep(step + 1);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleCreateElection}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isLoading ? 'Creating Election Ledger...' : 'Initialize & Become Owner'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
