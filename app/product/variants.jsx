import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { apiFetch } from "../../api/config";
import NavBar from "../../components/NavBar";

function statusStyle(status) {
  if (status === "active" || status === "Active")
    return { bg: "#e3f6e6", text: "#1f8a3d", dot: "#1f8a3d", label: "Active" };
  return {
    bg: "#fde3e1",
    text: "#c23b32",
    dot: "#c23b32",
    label: status === "inactive" ? "Inactive" : status || "Inactive",
  };
}

export default function VariantCatalogScreen() {
  const router = useRouter();
  const { productJson, vendorJson } = useLocalSearchParams();
  const product = productJson ? JSON.parse(productJson) : null;
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (product?.product_id) fetchVariants();
  }, [product?.product_id]);

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/variants?productId=${product.product_id}`);
      if (data.success) setVariants(data.data || []);
    } catch (err) {
      console.error("Failed to fetch variants", err);
    }
    setLoading(false);
  };

  const openSizes = (variant) => {
    const enriched = {
      ...variant,
      code: product?.v_prod_id,
      name: product?.product_name || product?.v_prod_id,
      image: product?.photo_url,
      product_id: product?.product_id,
      price: product?.price,
    };
    router.push({
      pathname: "/product/sizes",
      params: {
        variantJson: JSON.stringify(enriched),
        vendorJson,
        mode: "order",
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
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
          <Text style={styles.title}>Variant Catalog</Text>
        </View>
        <Text style={[styles.subtitle, { marginLeft: 50 }]}>
          {product?.v_prod_id}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#8a3230" />
      ) : (
        <FlatList
          data={variants}
          keyExtractor={(v) => String(v.variant_id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 14,
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No variants yet for this product.
            </Text>
          }
          ListFooterComponent={
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/product/add-variant",
                  params: { productJson: JSON.stringify(product), vendorJson },
                })
              }
              style={{ marginTop: 6 }}
            >
              <LinearGradient
                colors={["#3a1516", "#8a4844", "#c98f86"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addVariantBtn}
              >
                <Svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                >
                  <Path d="M12 5v14M5 12h14" />
                </Svg>
                <Text style={styles.addVariantText}>Add Variant</Text>
              </LinearGradient>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const st = statusStyle(item.status);
            const label = [
              item.category_name,
              item.pattern_name,
              item.color_name,
            ]
              .filter(Boolean)
              .join(" | ");
            return (
              <TouchableOpacity
                onPress={() => openSizes(item)}
                style={styles.variantCard}
              >
                <View
                  style={[
                    styles.colorCircle,
                    { backgroundColor: item.hex_code || "#ccc" },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.variantLabel}>
                    {label || "Unnamed variant"}
                  </Text>
                  <Text style={styles.sizesText}>
                    Sizes : {item.size_count ?? 0}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: st.bg, borderColor: st.dot },
                  ]}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: st.dot }]}
                  />
                  <Text
                    style={{ color: st.text, fontSize: 12, fontWeight: "700" }}
                  >
                    {st.label}
                  </Text>
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
  headerWrap: {
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  subtitle: { fontSize: 14, color: "#3a2b28" },
  emptyText: {
    textAlign: "center",
    color: "#8a7c78",
    fontSize: 13.5,
    paddingVertical: 36,
  },
  variantCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 14,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#00000022",
  },
  variantLabel: { fontSize: 16, fontWeight: "700", color: "#1c1210" },
  sizesText: { fontSize: 14, color: "#3a2b28", marginTop: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  addVariantBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  addVariantText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
