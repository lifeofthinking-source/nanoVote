import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, X, Shield, Award, Vote } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToElection?: (electionId: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onNavigateToElection,
}) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAuth();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'ROLE_ASSIGNED':
        return <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />;
      case 'NOMINATION_UPDATE':
        return <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'VOTE_CONFIRMED':
        return <Vote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
            <span className="text-xs text-slate-500 font-mono">({notifications.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 p-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <p>No notifications yet</p>
              <p className="text-xs text-slate-400 mt-1">Actions and election updates will appear here.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationAsRead(notif.id);
                  if (notif.electionId && onNavigateToElection) {
                    onNavigateToElection(notif.electionId);
                    onClose();
                  }
                }}
                className={`p-3 rounded-lg transition-colors cursor-pointer flex items-start gap-3 ${
                  notif.read ? 'hover:bg-slate-50 opacity-80' : 'bg-slate-50/70 hover:bg-slate-100/80 font-medium'
                }`}
              >
                {getIcon(notif.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 truncate">{notif.title}</h3>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                    {!notif.read && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-indigo-600 font-semibold">New</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Simulation Mode · In-app delivery</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
