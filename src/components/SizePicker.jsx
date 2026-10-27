import { useState } from 'react';
import { SIZE_GROUPS, SIZE_SYSTEMS, sizeLabel } from '../lib/sizes';

const ON = { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' };
const OFF = { background: 'var(--surface)', borderColor: 'var(--line)' };
const TAB_ON = { background: 'var(--primary-bg)', color: 'var(--primary-fg)', borderColor: 'var(--primary)' };

/** Pick sizes from the template: tabs for UK / EUR, then Toddler / Adult. Ticks stay when you switch tabs. */
export default function SizePicker({ sizes: raw, selected, onToggle, onMany }) {
  // An older backend sends plain numbers without a system or category: those are UK Adult sizes.
  const sizes = raw.map((s) => (s.size_system ? s : { ...s, size_system: 'UK', size_group: 'Adult' }));
  const first = sizes.find((s) => selected.has(s.size_id));
  const [system, setSystem] = useState(first?.size_system || 'UK');
  const [group, setGroup] = useState(first?.size_group || 'Adult');

  const inList = (s, sys, grp) => s.size_system === sys && s.size_group === grp;
  const count = (test) => sizes.filter((s) => selected.has(s.size_id) && test(s)).length;
  const list = sizes.filter((s) => inList(s, system, group));
  const chosen = sizes.filter((s) => selected.has(s.size_id));
  const allOn = list.length > 0 && list.every((s) => selected.has(s.size_id));
  const anyOn = list.some((s) => selected.has(s.size_id));
  const badge = (n) => (n ? <span className="ml-1.5 text-[11px] px-1.5 rounded-full bg-primary text-white" style={{ background: 'var(--primary)' }}>{n}</span> : null);

  return (
    <div>
      <div className="flex gap-2 mb-2" role="tablist" aria-label="Size system">
        {SIZE_SYSTEMS.map((sys) => (
          <button key={sys} type="button" role="tab" aria-selected={system === sys} className="btn btn-sm" style={system === sys ? TAB_ON : {}} onClick={() => setSystem(sys)}>
            {sys}{badge(count((s) => s.size_system === sys))}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-3" role="tablist" aria-label="Size category">
        {SIZE_GROUPS.map((grp) => (
          <button key={grp} type="button" role="tab" aria-selected={group === grp} className="btn btn-sm" style={group === grp ? TAB_ON : {}} onClick={() => setGroup(grp)}>
            {grp}{badge(count((s) => inList(s, system, grp)))}
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          <button type="button" className="btn btn-sm" disabled={allOn} onClick={() => onMany(list.map((s) => s.size_id), true)}>Select all</button>
          <button type="button" className="btn btn-sm" disabled={!anyOn} onClick={() => onMany(list.map((s) => s.size_id), false)}>Clear</button>
        </span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={`${system} ${group} sizes`}>
        {list.map((s) => (
          <button key={s.size_id} type="button" aria-pressed={selected.has(s.size_id)} aria-label={sizeLabel(s)} onClick={() => onToggle(s.size_id)}
            className="min-w-[3.5rem] px-2 h-10 rounded-md border text-sm font-medium" style={selected.has(s.size_id) ? ON : OFF}>
            {s.size_value}
          </button>
        ))}
        {!list.length && <div className="text-muted">No sizes in this list.</div>}
      </div>

      <div className="mt-4 pt-3 border-t border-line text-xs">
        <div className="text-muted mb-1">Selected ({chosen.length})</div>
        {chosen.length ? chosen.map((s) => <span key={s.size_id} className="pill pill-neutral mr-1 mb-1 inline-block">{sizeLabel(s)}</span>) : <span className="text-muted">Nothing selected yet.</span>}
      </div>
    </div>
  );
}
