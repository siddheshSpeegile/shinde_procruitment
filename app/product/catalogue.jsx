import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

function statusStyle(status) {
  if (status === "active" || status === "Active")
    return { bg: "#e3f6e6", text: "#1f8a3d", dot: "#1f8a3d", label: "Active" };
  return {
    bg: "#fde3e1",
    text: "#c23b32",
    dot: "#c23b32",
    label: status || "Inactive",
  };
}

export default function ProductCatalogueScreen() {
  const router = useRouter();
  const { vendorJson } = useLocalSearchParams();
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (vendor?.vendor_id) fetchProducts();
  }, [vendor?.vendor_id]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/products?vendorId=${vendor.vendor_id}`);
      if (data.success) setProducts(data.data || []);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
    setLoading(false);
  };

  const filtered = products.filter((p) =>
    (p.v_prod_id || "").toLowerCase().includes(query.toLowerCase()),
  );

  const openVariants = (product) => {
    router.push({
      pathname: "/product/variants",
      params: { productJson: JSON.stringify(product), vendorJson },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
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
          Product Catalogue - {vendor?.vendor_name}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a7c78"
            strokeWidth={2.2}
          >
            <Circle cx="11" cy="11" r="7" />
            <Path d="M21 21l-4.3-4.3" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Product...."
            placeholderTextColor="#8a7c78"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#8a3230" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.product_id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 14,
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {query ? `No products match "${query}"` : "No products found"}
            </Text>
          }
          renderItem={({ item }) => {
            const st = statusStyle(item.status);
            return (
              <TouchableOpacity
                onPress={() => openVariants(item)}
                style={styles.productCard}
              >
                <View style={styles.productImgWrap}>
                  {item.photo_url && (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={styles.productImg}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.productTopRow}>
                    <Text
                      style={styles.productCode}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.v_prod_id}
                    </Text>
                    <View
                      style={[styles.statusBadge, { backgroundColor: st.bg }]}
                    >
                      <View
                        style={[styles.statusDot, { backgroundColor: st.dot }]}
                      />
                      <Text
                        style={{
                          color: st.text,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {st.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.variantRow}>
                    <LinearGradient
                      colors={["#7a2f2b", "#c98f86"]}
                      style={styles.variantIconWrap}
                    >
                      <Svg
                        width={12}
                        height={12}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth={2.2}
                      >
                        <Path d="M3 8l9-4 9 4-9 4-9-4Z" />
                        <Path d="M3 12l9 4 9-4" />
                      </Svg>
                    </LinearGradient>
                    <Text style={styles.variantText}>
                      Variants {item.variant_count ?? 0}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <NavBar active="vendor" vendor={vendor} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f3f0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  searchRow: { paddingHorizontal: 20, paddingBottom: 14 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1c1210" },
  emptyText: {
    textAlign: "center",
    color: "#8a7c78",
    fontSize: 13.5,
    paddingVertical: 36,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderLeftWidth: 6,
    borderLeftColor: "#b96a63",
    borderRadius: 14,
    backgroundColor: "#fff",
    padding: 14,
    width: "100%",
  },
  productImgWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#eee",
    overflow: "hidden",
    flexShrink: 0,
  },
  productImg: { width: "100%", height: "100%" },
  productTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  productCode: { flex: 1, fontSize: 17, fontWeight: "800", color: "#1c1210" },
  statusBadge: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  variantIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  variantText: { fontSize: 13, color: "#3a2b28" },
});
