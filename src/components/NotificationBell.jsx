import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export const NOTIFICATIONS_CHANGED = 'notifications:changed';
const POLL_MS = 60000;

/** Bell in the top bar with the unread count. Checks every minute, when the tab regains focus, and after the list changes. */
export default function NotificationBell() {
  const { can } = useAuth();
  const allowed = can('notification.view');
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    notificationsApi.unreadCount().then((d) => setCount(d?.unread_count ?? 0)).catch(() => { /* keep the last number */ });
  }, []);

  useEffect(() => {
    if (!allowed) return undefined;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => { clearInterval(id); window.removeEventListener('focus', refresh); window.removeEventListener(NOTIFICATIONS_CHANGED, refresh); };
  }, [allowed, refresh]);

  if (!allowed) return null;
  return (
    <Link to="/notifications" className="relative btn btn-sm !h-9 !w-9 !px-0 no-underline" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] font-semibold text-white text-center" style={{ background: 'var(--bad)' }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
