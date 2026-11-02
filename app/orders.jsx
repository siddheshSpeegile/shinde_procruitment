import DateTimePicker from "../components/DatePicker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { apiFetch, resolveImageUrl } from "../api/config";
import NavBar from "../components/NavBar";
import RefreshButton from "../components/RefreshButton";
import Alert from "../utils/alert";
import { buildOrdersReportHtml } from "../utils/ordersReport";
import { printHtml } from "../utils/printHtml";

// Formats a Date object as YYYY-MM-DD using its LOCAL calendar date -
// never use date.toISOString().slice(0, 10) for this. toISOString()
// converts to UTC first, so for any timezone ahead of UTC (e.g. India,
// UTC+5:30), a date picked at local midnight rolls back to the previous
// day once shifted to UTC. This reads the year/month/day the device
// actually shows, with no UTC conversion involved.
function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Serves BOTH the global bottom-nav Orders screen (no vendorJson param -
// unchanged from before) AND the vendor-scoped Orders entry inside a
// Vendor Workspace (vendorJson passed in) - one screen, not a duplicate.
const DELIVERY_FILTERS = ["all", "pending", "delayed", "delivered"];

export default function OrdersListScreen() {
  const router = useRouter();
  // filter: optional starting delivery filter, e.g. the Dashboard's
  // "View All" opens this screen already on "pending".
  const { vendorJson, filter: initialFilter } = useLocalSearchParams();
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState(
    DELIVERY_FILTERS.includes(initialFilter) ? initialFilter : "all",
  );
  const [dateFrom, setDateFrom] = useState(null); // Date object or null
  const [dateTo, setDateTo] = useState(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [printing, setPrinting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vendor?.vendor_id) params.set("vendorId", vendor.vendor_id);
      if (filter !== "all") params.set("deliveryStatus", filter);
      if (dateFrom) params.set("dateFrom", toLocalDateString(dateFrom));
      if (dateTo) params.set("dateTo", toLocalDateString(dateTo));

      const data = await apiFetch(`/orders/all?${params.toString()}`);
      if (data.success) setOrders(data.data || []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [vendor?.vendor_id, filter, dateFrom, dateTo]);

  const filteredOrders = orders;

  // Supplier Workspace -> Orders: print / save as PDF every order shown on
  // screen (current filters), with each order's products and size lines.
  const printOrders = async () => {
    if (orders.length === 0) {
      Alert.alert("Nothing to print", "There are no orders in this list.");
      return;
    }
    setPrinting(true);
    try {
      const results = await Promise.all(
        orders.map((o) => apiFetch(`/orders/${o.id}`).catch(() => null)),
      );
      const details = {};
      results.forEach((r, i) => {
        if (r?.success) details[orders[i].id] = r.data;
      });
      const html = buildOrdersReportHtml({
        supplierName: vendor?.vendor_name || "All Suppliers",
        filter,
        dateFrom: dateFrom ? toLocalDateString(dateFrom) : null,
        dateTo: dateTo ? toLocalDateString(dateTo) : null,
        orders,
        details,
      });
      await printHtml(html);
    } catch (err) {
      console.error("Failed to print orders", err);
      Alert.alert("Could not print", "Please try again.");
    }
    setPrinting(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <LinearGradient
              colors={["#7a2f2b", "#c98f86"]}
              style={styles.backBtn}
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth={2.6}
              >
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.title}>
            {vendor
              ? `${vendor.vendor_name} Orders (${orders.length})`
              : `All Orders (${orders.length})`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {vendor ? (
            <TouchableOpacity
              onPress={printOrders}
              disabled={printing || loading}
              style={[
                styles.printBtn,
                (printing || loading) && { opacity: 0.5 },
              ]}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#8a3230" />
              ) : (
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8a3230"
                  strokeWidth={2}
                >
                  <Path d="M12 3v12" />
                  <Path d="M7 10l5 5 5-5" />
                  <Path d="M5 21h14" />
                </Svg>
              )}
              <Text style={styles.printBtnText}>
                {printing ? "Preparing…" : "Download"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <RefreshButton onPress={fetchOrders} refreshing={loading} />
        </View>
      </View>

      <View style={styles.filterRow}>
        <FilterPill
          label="All"
          active={filter === "all"}
          colors={{ border: "#8a3230", bg: "#8a3230", text: "#fff" }}
          onPress={() => setFilter("all")}
        />
        <FilterPill
          label="Pending"
          active={filter === "pending"}
          colors={{ border: "#e0a530", bg: "#fbe6c4", text: "#a9691f" }}
          onPress={() => setFilter("pending")}
        />
        <FilterPill
          label="Delayed"
          active={filter === "delayed"}
          colors={{ border: "#c23b32", bg: "#fde3e1", text: "#c23b32" }}
          onPress={() => setFilter("delayed")}
        />
        <FilterPill
          label="Delivered"
          active={filter === "delivered"}
          colors={{ border: "#1f8a3d", bg: "#e3f6e6", text: "#1f8a3d" }}
          onPress={() => setFilter("delivered")}
        />
      </View>

      <View style={styles.dateFilterRow}>
        <TouchableOpacity
          onPress={() => setShowFromPicker(true)}
          style={styles.dateFilterBtn}
        >
          <Svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a3230"
            strokeWidth={2.2}
          >
            <Rect x="3" y="4" width="18" height="17" rx="2" />
            <Path d="M3 9h18M8 3v3M16 3v3" />
          </Svg>
          <Text style={styles.dateFilterText}>
            {dateFrom
              ? dateFrom.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "From"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.dateRangeSep}>–</Text>

        <TouchableOpacity
          onPress={() => setShowToPicker(true)}
          style={styles.dateFilterBtn}
        >
          <Svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a3230"
            strokeWidth={2.2}
          >
            <Rect x="3" y="4" width="18" height="17" rx="2" />
            <Path d="M3 9h18M8 3v3M16 3v3" />
          </Svg>
          <Text style={styles.dateFilterText}>
            {dateTo
              ? dateTo.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "To"}
          </Text>
        </TouchableOpacity>

        {(dateFrom || dateTo) && (
          <TouchableOpacity
            onPress={() => {
              setDateFrom(null);
              setDateTo(null);
            }}
          >
            <Text style={styles.clearDateText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      {showFromPicker && (
        <DateTimePicker
          value={dateFrom || new Date()}
          mode="date"
          maximumDate={dateTo || undefined}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowFromPicker(Platform.OS === "ios");
            if (selectedDate) setDateFrom(selectedDate);
          }}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={dateTo || new Date()}
          mode="date"
          minimumDate={dateFrom || undefined}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowToPicker(Platform.OS === "ios");
            if (selectedDate) setDateTo(selectedDate);
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#8a3230" />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 14,
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No orders found.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              {/* The order's first product photo (not the vendor logo) */}
              {item.image ? (
                <Image
                  source={{ uri: resolveImageUrl(item.image) }}
                  style={styles.orderLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.orderLogo, styles.orderImgFallback]}>
                  <Text style={styles.orderImgFallbackText}>
                    {(item.brand || "?").charAt(0)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.orderPo}>{item.po}</Text>
                <Text style={styles.orderBrand}>{item.brand}</Text>
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
                  <Text style={styles.orderDate}>Placed: {item.date}</Text>
                </View>
                {item.delivery.state !== "delivered" &&
                  item.expected_delivery_date && (
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
                        Due: {item.expected_delivery_date}
                      </Text>
                    </View>
                  )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.orderPrice}>{item.price}</Text>
              </View>
            </View>
          )}
        />
      )}

      <NavBar active="orders" vendor={vendor} />
    </SafeAreaView>
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
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#8a3230",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  printBtnText: { color: "#8a3230", fontSize: 12.5, fontWeight: "700" },
  screen: { flex: 1, backgroundColor: "#f5f3f0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1c1210" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  dateFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  dateRangeSep: { color: "#8a7c78", fontSize: 13 },
  dateFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#ddd0cc",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  dateFilterText: { fontSize: 12, fontWeight: "600", color: "#8a3230" },
  clearDateText: { fontSize: 12, fontWeight: "600", color: "#8a7c78" },
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
  },
  orderLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
  },
  orderImgFallback: {
    backgroundColor: "#f0e9e6",
    alignItems: "center",
    justifyContent: "center",
  },
  orderImgFallbackText: { fontSize: 18, fontWeight: "800", color: "#8a3230" },
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
