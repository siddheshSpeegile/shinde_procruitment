import { useState } from 'react';
import { auditApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { DataTable, Drawer, PageHeader, Pill } from '../components/ui';
import { fmtDateTime } from '../lib/format';

const SOURCES = { mobile: { label: 'Mobile app', tone: 'info' }, panel: { label: 'Admin panel', tone: 'neutral' }, unknown: { label: 'Unknown', tone: 'neutral' } };
const FILTERS = [['', 'All'], ['mobile', 'Mobile app'], ['panel', 'Admin panel']];

export default function Audit() {
  const [source, setSource] = useState('');
  const { data, loading, error, reload } = useAsync(() => auditApi.list({ source }), [source]);
  const [updated, setUpdated] = useState(null);
  const [open, setOpen] = useState(null);

  const refresh = async () => { await reload(); setUpdated(new Date()); };
  const rows = (data || []).map((r) => ({ ...r, __key: r.id }));

  return (
    <>
      <PageHeader title="Audit Logs" sub="Every change made in the mobile app and the admin panel, newest first. Viewing data is not logged."
        actions={<>
          {updated && <span className="self-center text-xs text-muted">Updated {updated.toLocaleTimeString('en-GB')}</span>}
          <button className="btn" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </>} />

      <DataTable rows={rows} loading={loading && !data} error={error} onRetry={reload}
        emptyTitle="Nothing recorded yet" emptyHint="Create or edit anything in the app or the panel and it will appear here."
        searchText={(r) => `${r.username || ''} ${r.role || ''} ${r.action || ''} ${r.message || ''} ${r.path} ${SOURCES[r.source]?.label || ''}`}
        toolbar={<div className="flex gap-1.5" role="group" aria-label="Source">
          {FILTERS.map(([v, label]) => (
            <button key={label} type="button" aria-pressed={source === v} onClick={() => setSource(v)} className="btn btn-sm"
              style={source === v ? { background: 'var(--primary-bg)', color: 'var(--primary-fg)', borderColor: 'var(--primary)' } : {}}>{label}</button>
          ))}
        </div>}
        columns={[
          { header: 'When', render: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.at)}</span> },
          { header: 'Source', render: (r) => <Pill tone={(SOURCES[r.source] || SOURCES.unknown).tone}>{(SOURCES[r.source] || SOURCES.unknown).label}</Pill> },
          { header: 'User', render: (r) => (r.username
            ? <div><div className="font-medium">{r.username}</div>{r.role && <div className="text-xs text-muted">{r.role}</div>}</div>
            : <span className="text-muted" title="Older app versions do not tell the server who is signed in">Unknown</span>) },
          { header: 'Action', render: (r) => <span className="font-medium">{r.action}</span> },
          { header: 'Result', key: 'message' },
          { header: '', render: (r) => <button className="btn btn-sm" onClick={() => setOpen(r)}>Details</button> },
        ]} />

      <Drawer open={!!open} title="Details" onClose={() => setOpen(null)}>
        {open && (
          <>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 m-0 mb-4">
              {[['When', fmtDateTime(open.at)], ['Source', (SOURCES[open.source] || SOURCES.unknown).label], ['User', open.username ? `${open.username}${open.role ? ` (${open.role})` : ''}` : 'Unknown'],
                ['Action', open.action], ['Request', `${open.method} ${open.path}`], ['Result', `${open.status} ${open.message || ''}`]].map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="m-0 break-words">{v}</dd></div>
              ))}
            </dl>
            <div className="label">What was sent</div>
            <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0">{JSON.stringify(open.details?.body ?? null, null, 2)}</pre>
            <p className="text-xs text-muted">Passwords are never stored.</p>
          </>
        )}
      </Drawer>
    </>
  );
}
