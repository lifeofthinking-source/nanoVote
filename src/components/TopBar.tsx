import React from 'react';
import { useAuth } from '../context/AuthContext';
import { QuickPersonaSwitcher } from './QuickPersonaSwitcher';
import { Bell, LogIn, LogOut } from 'lucide-react';

interface TopBarProps {
  currentView: string;
  onNavigate: (view: string, electionId?: string) => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  onRefreshData?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onNavigate,
  onOpenNotifications,
  onOpenAuth,
  onRefreshData,
}) => {
  const { currentUser, unreadNotifsCount, logout } = useAuth();

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'elections', label: 'Elections' },
    { id: 'create-election', label: 'Create' },
    { id: 'join-election', label: 'Join' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Zone 1: Brand Zone (Single text element wordmark) */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
        >
          VoteSphere
        </button>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          {navLinks.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                className={`transition-colors cursor-pointer relative py-1 ${
                  isActive
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <QuickPersonaSwitcher onPersonaSwitched={onRefreshData} />

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
