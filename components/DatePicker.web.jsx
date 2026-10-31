import { useEffect, useRef } from "react";

// Web (PWA) stand-in for @react-native-community/datetimepicker, which has no
// web support. Same props the screens already pass (value, minimumDate,
// onChange(event, date)), so call sites don't change: the screens render it
// when the user taps a date field, it opens the browser's date chooser, and
// reports the picked date - or a dismiss - the same way the phone picker does.

function toInputValue(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DatePicker({
  value,
  minimumDate,
  maximumDate,
  onChange,
}) {
  const inputRef = useRef(null);
  const reported = useRef(false);

  const report = (event, date) => {
    if (reported.current) return;
    reported.current = true;
    onChange?.(event, date);
  };

  useEffect(() => {
    // Open the browser's calendar right away, like the phone picker does.
    // showPicker() needs a recent tap; if the browser refuses, the visible
    // date box is still there to tap.
    try {
      inputRef.current?.showPicker?.();
    } catch {
      inputRef.current?.focus();
    }
  }, []);

  return (
    <input
      ref={inputRef}
      type="date"
      defaultValue={toInputValue(value)}
      min={toInputValue(minimumDate)}
      max={toInputValue(maximumDate)}
      onChange={(e) => {
        if (!e.target.value) return;
        const [y, m, d] = e.target.value.split("-").map(Number);
        // Local calendar date (not UTC), same as the phone picker returns
        report({ type: "set" }, new Date(y, m - 1, d));
      }}
      onBlur={() => report({ type: "dismissed" }, undefined)}
      style={{
        marginTop: 8,
        padding: 10,
        fontSize: 15,
        borderRadius: 10,
        border: "1.5px solid #e5ddd8",
        color: "#1c1210",
        backgroundColor: "#fff",
      }}
    />
  );
}
