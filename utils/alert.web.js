// Web (PWA) version of React Native's Alert, which is a no-op in browsers.
// Same Alert.alert(title, message, buttons) signature, so screens don't
// change. Maps to the browser's own popups:
//  - no buttons / one button     -> window.alert, then that button's onPress
//  - a Cancel + an action button -> window.confirm: OK runs the action,
//                                   Cancel runs the cancel button (if any)
const Alert = {
  alert(title, message, buttons) {
    const text = [title, message].filter(Boolean).join("\n\n");
    const list = buttons && buttons.length ? buttons : [{ text: "OK" }];
    const cancel = list.find((b) => b.style === "cancel");
    const actions = list.filter((b) => b !== cancel);

    if (!cancel || actions.length === 0) {
      window.alert(text);
      (actions[0] || cancel)?.onPress?.();
      return;
    }
    // Browsers only offer OK/Cancel: OK means the (first) action button
    if (window.confirm(text)) {
      actions[0].onPress?.();
    } else {
      cancel.onPress?.();
    }
  },
};

export default Alert;
