import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { apiFetch } from "../api/config";
import { getSession } from "../api/session";

// Bell for the Dashboard header: shows how many notifications the logged-in
// user hasn't read yet and opens the Notifications screen. The count is
// refreshed whenever the screen comes into view and then once a minute
// while it stays open.
export default function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const user = await getSession();
      const query = user?.user_id ? `?userId=${user.user_id}` : "";
      const data = await apiFetch(`/notifications/unread-count${query}`);
      if (data?.success) setCount(data.data.unread_count || 0);
    } catch (err) {
      // Offline or server asleep: keep showing the last known number.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, 60000);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      style={styles.btn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={
        count ? `Notifications, ${count} unread` : "Notifications"
      }
    >
      <Svg
        width={23}
        height={23}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1c1210"
        strokeWidth={2}
      >
        <Path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <Path d="M10 20a2 2 0 0 0 4 0" />
      </Svg>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#c23b32",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
