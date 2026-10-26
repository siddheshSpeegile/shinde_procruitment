import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { apiFetch } from "../api/config";
import { getSession } from "../api/session";
import NavBar from "../components/NavBar";
import RefreshButton from "../components/RefreshButton";

// Label + colours per event type (types come from the backend).
const KINDS = {
  order_created: { label: "New order", bg: "#dfe9f7", fg: "#2c4a75" },
  order_delivered: { label: "Delivered", bg: "#e3f6e6", fg: "#1f8a3d" },
  order_delayed: { label: "Delayed", bg: "#fde3e1", fg: "#c23b32" },
  order_status: { label: "Status", bg: "#dfe9f7", fg: "#2c4a75" },
  order_date: { label: "Date", bg: "#faedcc", fg: "#6e4b00" },
  order_payment: { label: "Payment", bg: "#e3f6e6", fg: "#1f8a3d" },
};
const kindOf = (type) =>
  KINDS[type] || { label: "Info", bg: "#ece8e4", fg: "#5a524f" };

// "Just now", "5 min ago", "3 h ago", "2 days ago", then the date.
function timeAgo(iso) {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return "";
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) {
    const n = Math.floor(s / 86400);
    return `${n} day${n === 1 ? "" : "s"} ago`;
  }
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = await getSession();
      const params = new URLSearchParams({ limit: "100" });
      if (user?.user_id) params.set("userId", String(user.user_id));
      const data = await apiFetch(`/notifications?${params.toString()}`);
      if (data?.success) {
        setItems(data.data.items || []);
        setUnread(data.data.unread_count || 0);
      } else {
        setError(data?.message || "Could not load notifications.");
      }
    } catch (err) {
      setError("Cannot reach the server. Please try again.");
    }
    setLoading(false);
  }, []);

  // Reload each time the screen is opened, so new alerts show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const postRead = async (body) => {
    const user = await getSession();
    if (!user?.user_id) return;
    try {
      await apiFetch("/notifications/read", {
        method: "POST",
        body: JSON.stringify({ user_id: user.user_id, ...body }),
      });
    } catch (err) {
      console.error("Mark as read failed", err);
    }
  };

  const markOne = (item) => {
    if (item.is_read) return;
    // Update the screen straight away, then tell the server.
    setItems((list) =>
      list.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
    );
    setUnread((c) => Math.max(0, c - 1));
    postRead({ ids: [item.id] });
  };

  const markAll = () => {
    if (!unread) return;
    setItems((list) => list.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    postRead({ all: true });
  };

  const shown = filter === "unread" ? items.filter((n) => !n.is_read) : items;

  const renderItem = ({ item }) => {
    const kind = kindOf(item.type);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => markOne(item)}
        style={[styles.card, !item.is_read && styles.cardUnread]}
      >
        <View
          style={[styles.dot, { backgroundColor: item.is_read ? "transparent" : "#8a3230" }]}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, !item.is_read && { fontWeight: "800" }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: kind.bg }]}>
            <Text style={[styles.tagText, { color: kind.fg }]}>{kind.label}</Text>
          </View>
          {!!item.message && <Text style={styles.message}>{item.message}</Text>}
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <Svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2.4}
          >
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>
            {unread ? `${unread} unread` : "You are all caught up"}
          </Text>
        </View>
        <RefreshButton onPress={load} refreshing={loading} />
      </View>

      <View style={styles.filterRow}>
        {[
          ["all", "All"],
          ["unread", "Unread"],
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.pill, filter === key && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === key && { color: "#fff" }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={markAll}
          disabled={!unread}
          style={{ marginLeft: "auto", opacity: unread ? 1 : 0.4 }}
        >
          <Text style={styles.markAll}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(n) => String(n.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.emptyText}>
              {error ||
                (filter === "unread"
                  ? "No unread notifications."
                  : "No notifications yet.")}
            </Text>
          )
        }
      />

      <NavBar active="home" vendor={null} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f3f0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#7a2f2b",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 21, fontWeight: "800", color: "#1c1210" },
  headerSub: { fontSize: 12.5, color: "#8a7c78", marginTop: 1 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pill: {
    borderWidth: 1.5,
    borderColor: "#8a3230",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: "#8a3230" },
  pillText: { color: "#8a3230", fontSize: 12.5, fontWeight: "600" },
  markAll: { color: "#8a3230", fontSize: 12.5, fontWeight: "700" },
  card: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
  },
  cardUnread: { backgroundColor: "#f8ecea", borderColor: "#e4c4c0" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, fontSize: 14.5, fontWeight: "600", color: "#1c1210" },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 5,
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  message: { fontSize: 13, color: "#4a3f3b", marginTop: 6 },
  time: { fontSize: 11.5, color: "#8a7c78", marginTop: 6 },
  emptyText: {
    textAlign: "center",
    color: "#8a7c78",
    fontSize: 13,
    paddingVertical: 30,
  },
});
