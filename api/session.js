import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "shinde_procurement_session";

// Called once, right after a successful login - stores everything the
// app needs to know who's logged in (user_id, username, email, role,
// photo_url) so the app doesn't need to log in again every time it's
// closed and reopened. Only clearing this (see clearSession, called on
// Log Out) forces a fresh login.
export async function saveSession(user) {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to save session", err);
  }
}

// Called on app startup (see app/index.jsx) to check whether someone's
// already logged in. Returns the same user object saved at login time,
// or null if there's no stored session (or it's corrupted somehow).
export async function getSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to read session", err);
    return null;
  }
}

// Called only from Log Out - this is the one and only action that should
// ever force the user back to the login screen.
export async function clearSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error("Failed to clear session", err);
  }
}
