import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { apiFetch } from "../../api/config";
import NavBar from "../../components/NavBar";
import RefreshButton from "../../components/RefreshButton";

export default function SelectVendorScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/vendors");
      if (data.success) setVendors(data.data || []);
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const filtered = vendors
    .filter((v) => (statusFilter === "all" ? true : v.status === statusFilter))
    .filter((v) =>
      (v.vendor_name || "").toLowerCase().includes(search.toLowerCase()),
    );

  const openVendor = (vendor) => {
    if (vendor.status === "inactive") {
      Alert.alert(
        "Inactive Vendor",
        "This vendor is inactive. Please contact your admin.",
      );
      return;
    }
    router.push({
      pathname: "/vendor/workspace",
      params: { vendorJson: JSON.stringify(vendor) },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <TouchableOpacity onPress={() => router.replace("/dashboard")}>
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
          <Text style={styles.title}>Select Vendor</Text>
        </View>
        <RefreshButton onPress={fetchVendors} refreshing={loading} />
      </View>

      <View style={styles.searchWrap}>
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8a7c78"
          strokeWidth={2}
        >
          <Circle cx="11" cy="11" r="7" />
          <Path d="M21 21l-4.35-4.35" />
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Vendor..."
          placeholderTextColor="#8a7c78"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          onPress={() => setShowStatusFilter((v) => !v)}
          style={styles.filterIconBtn}
        >
          <Svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            fill="none"
            stroke={statusFilter !== "all" ? "#8a3230" : "#8a7c78"}
            strokeWidth={2.2}
          >
            <Path d="M4 5h16M7 12h10M10 19h4" />
          </Svg>
        </TouchableOpacity>
      </View>

      {showStatusFilter && (
        <View style={styles.statusFilterRow}>
          <StatusPill
            label="All"
            active={statusFilter === "all"}
            colors={{ border: "#8a3230", bg: "#8a3230", text: "#fff" }}
            onPress={() => setStatusFilter("all")}
          />
          <StatusPill
            label="Active"
            active={statusFilter === "active"}
            colors={{ border: "#1f8a3d", bg: "#e3f6e6", text: "#1f8a3d" }}
            onPress={() => setStatusFilter("active")}
          />
          <StatusPill
            label="Inactive"
            active={statusFilter === "inactive"}
            colors={{ border: "#c23b32", bg: "#fde3e1", text: "#c23b32" }}
            onPress={() => setStatusFilter("inactive")}
          />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#8a3230" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => String(v.vendor_id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 12,
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No vendors found</Text>
          }
          renderItem={({ item }) => {
            const isActive = item.status === "active";
            return (
              <TouchableOpacity onPress={() => openVendor(item)}>
                <LinearGradient
                  colors={["#4a1a18", "#6e2b26"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.vendorCard}
                >
                  <View style={styles.vendorLogoWrap}>
                    {item.logo_url ? (
                      <Image
                        source={{ uri: item.logo_url }}
                        style={styles.vendorLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.vendorInitial}>
                        {(item.vendor_name || "?").charAt(0)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.vendorName}>{item.vendor_name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { borderColor: isActive ? "#1f8a3d" : "#c23b32" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isActive ? "#1f8a3d" : "#c23b32" },
                      ]}
                    />
                    <Text
                      style={{
                        color: isActive ? "#1f8a3d" : "#c23b32",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <NavBar active="vendor" vendor={null} />
    </SafeAreaView>
  );
}

function StatusPill({ label, active, colors, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.statusPill,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1c1210" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterIconBtn: { padding: 2 },
  statusFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 20,
    marginTop: -6,
    marginBottom: 14,
  },
  statusPill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1c1210" },
  emptyText: {
    textAlign: "center",
    color: "#8a7c78",
    fontSize: 13,
    paddingVertical: 40,
  },
  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 14,
  },
  vendorLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  vendorLogo: { width: "68%", height: "68%" },
  vendorInitial: { fontSize: 16, fontWeight: "800", color: "#4a1a18" },
  vendorName: { flex: 1, fontSize: 16, fontWeight: "700", color: "#fff" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
});
