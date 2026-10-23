import { useLocation } from 'react-router-dom';
import { MockBanner, PageHeader } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export default function Placeholder() {
  const settings = useLocation().pathname === '/settings';
  const { theme, toggle } = useTheme();
  return (
    <>
      <PageHeader title={settings ? 'Settings' : 'Notifications'} />
      <MockBanner>The backend has no {settings ? 'settings' : 'notification'} endpoints yet.</MockBanner>
      {settings ? (
        <div className="card p-4 flex items-center gap-3">Theme: <b className="capitalize">{theme}</b><button className="btn btn-sm" onClick={toggle}>Switch</button></div>
      ) : <div className="card p-10 text-center text-muted">Nothing to show.</div>}
    </>
  );
}
