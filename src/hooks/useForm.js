import { useState } from 'react';

export function useForm(initial, validate) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }));
  const bind = (k) => ({ value: values[k] ?? '', onChange: (e) => set(k, e.target.value) });
  const submit = (fn) => async (e) => {
    e?.preventDefault();
    const er = validate ? validate(values) : {};
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await fn(values); } finally { setBusy(false); }
  };
  return { values, set, bind, errors, busy, submit };
}
