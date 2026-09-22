import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { apiFetch } from "../api/config";
import NavBar from "../components/NavBar";
import RefreshButton from "../components/RefreshButton";

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vendors: "–",
    products: "–",
    orders: "–",
    amount: "–",
  });
  const [allOrders, setAllOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/dashboard");
      if (data.success) {
        const d = data.data;
        setStats({
          vendors: String(d.vendors_count ?? 0),
          products: String(d.products_count ?? 0),
          orders: String(d.orders_count ?? 0),
          amount: `₹${Number(d.pending_amount || 0).toLocaleString("en-IN")}`,
        });
        const fetched = d.recent_orders || [];
        setAllOrders(fetched);
        setOrders(fetched.slice(0, 3));
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const applyFilter = (key) => {
    setFilter(key);
    const filtered =
      key === "all"
        ? allOrders
        : allOrders.filter((o) => o.delivery.state === key);
    setOrders(filtered.slice(0, 3));
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={styles.header}>
          <Svg
            width={26}
            height={26}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1c1210"
            strokeWidth={2}
          >
            <Circle cx="12" cy="8" r="4" />
            <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </Svg>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <RefreshButton onPress={fetchDashboard} refreshing={loading} />
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
          </View>
        </View>

        {/* Stat cards */}
        <View style={styles.statGrid}>
          <StatCard
            bg="#cfe0f7"
            iconBg="#2f5fc4"
            value={stats.vendors}
            label="Vendors"
            icon={
              <>
                <Path d="M3 9l1-5h16l1 5" />
                <Path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
                <Path d="M9 21v-6h6v6" />
              </>
            }
          />
          <StatCard
            bg="#f2e2bd"
            iconBg="#d98c1f"
            value={stats.products}
            label="Products"
            icon={
              <>
                <Path d="M21 8l-9-5-9 5 9 5 9-5Z" />
                <Path d="M3 8v8l9 5 9-5V8" />
                <Path d="M12 13v8" />
              </>
            }
          />
          <StatCard
            bg="#ddc7ea"
            iconBg="#6a2c8f"
            value={stats.orders}
            label="Orders"
            icon={
              <>
                <Rect x="6" y="3" width="12" height="18" rx="2" />
                <Path d="M9 8h6M9 12h6M9 16h4" />
              </>
            }
          />
          <StatCard
            bg="#c9e4c8"
            iconBg="#278a3e"
            value={stats.amount}
            label="Due Payment"
            fontSize={19}
            icon={
              <>
                <Rect x="3" y="6" width="18" height="13" rx="2" />
                <Path d="M3 10h18" />
              </>
            }
          />
        </View>

        {/* Recent purchases header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Purchases Order</Text>
          <TouchableOpacity
            onPress={() => router.push("/orders")}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>
              View All ({allOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <FilterPill
            label="All"
            active={filter === "all"}
            colors={{ border: "#8a3230", bg: "#8a3230", text: "#fff" }}
            onPress={() => applyFilter("all")}
          />
          <FilterPill
            label="On Time"
            active={filter === "pending"}
            colors={{ border: "#1f8a3d", bg: "#e3f6e6", text: "#1f8a3d" }}
            onPress={() => applyFilter("pending")}
          />
          <FilterPill
            label="Delayed"
            active={filter === "delayed"}
            colors={{ border: "#c23b32", bg: "#fde3e1", text: "#c23b32" }}
            onPress={() => applyFilter("delayed")}
          />
        </View>

        {/* Order cards */}
        <View style={styles.pad}>
          {loading && <Text style={styles.emptyText}>Loading orders…</Text>}
          {!loading && orders.length === 0 && (
            <Text style={styles.emptyText}>No orders found.</Text>
          )}
          {!loading &&
            orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <Image source={{ uri: order.logo }} style={styles.orderLogo} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderPo}>{order.po}</Text>
                  <Text style={styles.orderBrand}>{order.brand}</Text>
                  <View style={styles.orderDateRow}>
                    <Svg
                      width={12}
                      height={12}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8a3230"
                      strokeWidth={2}
                    >
                      <Rect x="3" y="5" width="18" height="16" rx="2" />
                      <Path d="M3 10h18M8 3v4M16 3v4" />
                    </Svg>
                    <Text style={styles.orderDate}>Placed: {order.date}</Text>
                  </View>
                  {order.expected_delivery_date && (
                    <View style={styles.orderDateRow}>
                      <Svg
                        width={12}
                        height={12}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a9691f"
                        strokeWidth={2}
                      >
                        <Rect x="3" y="5" width="18" height="16" rx="2" />
                        <Path d="M3 10h18M8 3v4M16 3v4" />
                      </Svg>
                      <Text style={[styles.orderDate, { color: "#a9691f" }]}>
                        Due: {order.expected_delivery_date}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.orderPrice}>{order.price}</Text>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>

      <NavBar active="home" vendor={null} />
    </SafeAreaView>
  );
}

function StatCard({ bg, iconBg, value, label, icon, fontSize = 25 }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </Svg>
      </View>
      <Text style={[styles.statValue, { fontSize }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterPill({ label, active, colors, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderColor: active ? colors.border : "#ddd0cc",
          backgroundColor: active ? colors.bg : "#fff",
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.text : colors.border,
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f3f0" },
  pad: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 21, fontWeight: "800", color: "#1c1210" },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
    justifyContent: "space-between",
  },
  statCard: { width: "47%", borderRadius: 16, padding: 18, gap: 10 },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontWeight: "800", color: "#151515" },
  statLabel: { fontSize: 15, color: "#333" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1c1210" },
  viewAllBtn: {
    borderWidth: 1.5,
    borderColor: "#8a3230",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  viewAllText: { color: "#8a3230", fontSize: 12.5, fontWeight: "600" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  emptyText: {
    textAlign: "center",
    color: "#8a7c78",
    fontSize: 13,
    paddingVertical: 18,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 14,
  },
  orderLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
  },
  orderPo: { fontSize: 13.5, color: "#241210", fontWeight: "600" },
  orderBrand: { fontSize: 13.5, color: "#241210", marginTop: 2 },
  orderDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  orderDate: { color: "#8a3230", fontSize: 11.5 },
  orderPrice: {
    fontStyle: "italic",
    fontWeight: "700",
    fontSize: 15,
    color: "#1c1210",
  },
});
