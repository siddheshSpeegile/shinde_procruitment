import { useState } from 'react';
import { clearAudit, readAudit } from '../lib/audit';
import { Confirm, DataTable, Drawer, MockBanner, PageHeader, Pill } from '../components/ui';
import { fmtDateTime } from '../lib/format';

export default function Audit() {
  const [rows, setRows] = useState(readAudit);
  const [open, setOpen] = useState(null);
  const [ask, setAsk] = useState(false);
  return (
    <>
      <PageHeader title="Audit Logs" sub="Every successful write this browser sent to the API" actions={<button className="btn" onClick={() => setAsk(true)}>Clear log</button>} />
      <MockBanner>The backend keeps no audit trail yet. This list is recorded in this browser only, newest first, last 500 entries.</MockBanner>
      <DataTable rows={rows.map((r, i) => ({ ...r, __key: i }))} emptyTitle="Nothing recorded yet" emptyHint="Create or edit anything and it will appear here."
        searchText={(r) => `${r.user} ${r.method} ${r.path} ${r.message}`}
        columns={[
          { header: 'When', render: (r) => fmtDateTime(r.at) }, { header: 'User', key: 'user' },
          { header: 'Method', render: (r) => <Pill tone={r.method === 'POST' ? 'ok' : r.method === 'DELETE' ? 'bad' : 'info'}>{r.method}</Pill> },
          { header: 'Path', render: (r) => <span className="font-mono text-xs">{r.path}</span> }, { header: 'Result', key: 'message' },
          { header: '', render: (r) => <button className="btn btn-sm" onClick={() => setOpen(r)}>Details</button> },
        ]} />
      <Drawer open={!!open} title="Request details" onClose={() => setOpen(null)}>
        <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0">{open && JSON.stringify(open, null, 2)}</pre>
      </Drawer>
      <Confirm open={ask} danger title="Clear audit log" body="This removes the locally stored entries. It does not affect the database." confirmLabel="Clear" onConfirm={() => { clearAudit(); setRows([]); setAsk(false); }} onClose={() => setAsk(false)} />
    </>
  );
}
