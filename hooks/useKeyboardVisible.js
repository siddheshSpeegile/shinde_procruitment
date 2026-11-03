import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

// Phone (Android/iOS): true while the on-screen keyboard is open. Used to hide
// the bottom nav bar, which Android otherwise pushes up to sit on top of the
// keyboard. The web build uses useKeyboardVisible.web.js.
export default function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
