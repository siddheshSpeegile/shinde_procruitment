import { MockBanner, PageHeader } from '../components/ui';

export default function HoldList() {
  return (
    <>
      <PageHeader title="Hold List" sub="Items buyers set aside in the mobile app" />
      <MockBanner>This screen is not available yet.</MockBanner>
      <div className="card p-10 text-center text-muted">Nothing to show.</div>
    </>
  );
}
