import { useEffect, useState } from "react";

// Web (PWA): browsers have no keyboard events, but the visible area shrinks
// when the phone keyboard opens. Treat it as open when the visible height is
// well below the tallest height seen (rotating the phone resets that).
export default function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    let fullHeight = Math.max(window.innerHeight, vv.height);
    let width = window.innerWidth;

    const check = () => {
      if (window.innerWidth !== width) {
        // rotated / resized window: start over
        width = window.innerWidth;
        fullHeight = vv.height;
      }
      fullHeight = Math.max(fullHeight, vv.height);
      setVisible(fullHeight - vv.height > 150);
    };

    vv.addEventListener("resize", check);
    window.addEventListener("resize", check);
    return () => {
      vv.removeEventListener("resize", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return visible;
}
