import { MockBanner, PageHeader } from '../components/ui';
import { MOCK_HOLD_LIST } from '../config';

export default function HoldList() {
  return (
    <>
      <PageHeader title="Hold List" sub="Items buyers set aside in the mobile app" />
      <MockBanner>The backend has no hold list endpoint (only /api/cart). {MOCK_HOLD_LIST ? 'Nothing is shown until one exists.' : ''}</MockBanner>
      <div className="card p-10 text-center text-muted">Waiting on a backend endpoint such as GET /api/hold-list.</div>
    </>
  );
}
