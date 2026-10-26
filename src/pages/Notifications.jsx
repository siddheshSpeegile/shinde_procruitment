import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import { NOTIFICATIONS_CHANGED } from '../components/NotificationBell';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { fmtDateTime, timeAgo } from '../lib/format';

// Colour + short label per event type (var names come from src/index.css).
const KIND = {
  order_created: { label: 'New order', bg: 'var(--info-bg)', fg: 'var(--info-fg)' },
  order_delivered: { label: 'Delivered', bg: 'var(--ok-bg)', fg: 'var(--ok-fg)' },
  order_delayed: { label: 'Delayed', bg: 'var(--bad-bg)', fg: 'var(--bad-fg)' },
  order_status: { label: 'Status', bg: 'var(--info-bg)', fg: 'var(--info-fg)' },
  order_date: { label: 'Date', bg: 'var(--warn-bg)', fg: 'var(--warn-fg)' },
  order_payment: { label: 'Payment', bg: 'var(--ok-bg)', fg: 'var(--ok-fg)' },
};
const kindOf = (t) => KIND[t] || { label: 'Info', bg: 'var(--neutral-bg)', fg: 'var(--neutral-fg)' };
const changed = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export default function Notifications() {
  const nav = useNavigate();
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, error, reload } = useAsync(() => notificationsApi.list({ unreadOnly }), [unreadOnly]);

  // New notifications appear without a page refresh.
  useEffect(() => {
    const id = setInterval(reload, 60000);
    return () => clearInterval(id);
  }, [reload]);

  const items = data?.items || [];
  const unread = data?.unread_count ?? 0;

  async function open(n) {
    try { if (!n.is_read) { await notificationsApi.markRead([n.id]); changed(); } } catch { /* opening the order still works */ }
    if (n.po_id) nav(`/purchase-orders/${n.po_id}`); else reload();
  }
  async function markAll() {
    try { await notificationsApi.markAllRead(); changed(); toast.success('All notifications marked as read.'); reload(); }
    catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <PageHeader title="Notifications" sub={unread ? `${unread} unread` : 'You are all caught up.'}
        actions={<>
          <button className="btn" onClick={reload}>Refresh</button>
          <button className="btn btn-primary" onClick={markAll} disabled={!unread}>Mark all as read</button>
        </>} />

      <div className="flex gap-2 mb-3" role="group" aria-label="Filter">
        {[[false, 'All'], [true, 'Unread']].map(([v, label]) => (
          <button key={label} type="button" aria-pressed={unreadOnly === v} onClick={() => setUnreadOnly(v)}
            className="btn btn-sm" style={unreadOnly === v ? { background: 'var(--primary-bg)', color: 'var(--primary-fg)', borderColor: 'var(--primary)' } : {}}>{label}</button>
        ))}
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <div className="card"><EmptyState title={unreadOnly ? 'No unread notifications' : 'No notifications yet'} hint="Order activity, such as new orders, deliveries and delays, will show up here." /></div>
      ) : (
        <div className="card overflow-hidden">
          {items.map((n) => {
            const k = kindOf(n.type);
            return (
              <button key={n.id} type="button" onClick={() => open(n)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-surface2 cursor-pointer bg-transparent"
                style={n.is_read ? {} : { background: 'var(--primary-bg)' }}>
                <span className="mt-1.5 w-2 h-2 rounded-full flex-none" style={{ background: n.is_read ? 'transparent' : 'var(--primary)' }} aria-label={n.is_read ? 'Read' : 'Unread'} />
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={n.is_read ? 'font-medium' : 'font-semibold'}>{n.title}</span>
                    <span className="pill" style={{ background: k.bg, color: k.fg }}>{k.label}</span>
                  </span>
                  {n.message && <span className="block text-muted mt-0.5">{n.message}</span>}
                </span>
                <span className="text-xs text-muted flex-none whitespace-nowrap" title={fmtDateTime(n.created_at)}>{timeAgo(n.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
