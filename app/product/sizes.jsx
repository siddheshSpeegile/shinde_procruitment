import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { apiFetch } from "../../api/config";
import NavBar from "../../components/NavBar";

// mode='order': only shows sizes already assigned to this variant, for
//   picking which of them go into THIS order (no DB write on save).
export default function AssignSizesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    variantJson,
    vendorJson,
    productJson,
    mode = "order",
    returnTo = "variants",
  } = useLocalSearchParams();
  const variant = variantJson ? JSON.parse(variantJson) : null;
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;

  const [sizes, setSizes] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCart, setSavingCart] = useState(false);

  useEffect(() => {
    if (variant?.variant_id) fetchSizes();
  }, [variant?.variant_id]);

  const fetchSizes = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(
        `/variant-sizes?variantId=${variant.variant_id}`,
      );
      if (data.success) {
        const fetched = data.data || [];
        const filtered =
          mode === "order" ? fetched.filter((s) => s.assigned) : fetched;
        const sorted = [...filtered].sort(
          (a, b) => parseInt(a.size_value, 10) - parseInt(b.size_value, 10),
        );
        setSizes(sorted);
        const initial = {};
        sorted.forEach((s) => {
          initial[s.size_id] = mode === "order" ? true : !!s.assigned;
        });
        setSelected(initial);
      }
    } catch (err) {
      console.error("Failed to load sizes", err);
    }
    setLoading(false);
  };

  const toggle = (sizeId) =>
    setSelected((prev) => ({ ...prev, [sizeId]: !prev[sizeId] }));

  const handleContinue = async () => {
    const selectedIds = Object.keys(selected)
      .filter((id) => selected[id])
      .map(Number);
    if (selectedIds.length === 0) return;
    const selectedSizeObjects = sizes
      .filter((s) => selectedIds.includes(s.size_id))
      .map((s) => ({ size_id: s.size_id, size_value: s.size_value }));

    if (mode === "declare") {
      // Persist which sizes this variant is available in.
      setSaving(true);
      try {
        const data = await apiFetch("/assign-sizes", {
          method: "POST",
          body: JSON.stringify({
            variant_id: variant.variant_id,
            size_ids: selectedIds,
          }),
        });
        if (data.success) {
          if (returnTo === "workspace") {
            // Came from Add Product -> Add Variant, not from an existing
            // product's Variant Catalog - go back to the Vendor Workspace.
            router.replace({
              pathname: "/vendor/workspace",
              params: { vendorJson },
            });
          } else {
            // Back to the Variant Catalog so it refetches and shows the
            // updated size count for this new variant.
            router.replace({
              pathname: "/product/variants",
              params: { productJson, vendorJson },
            });
          }
        }
      } catch (err) {
        console.error("Failed to assign sizes", err);
      }
      setSaving(false);
      return;
    }

    // mode === 'order': just carry the picked subset forward, no DB write.
    router.push({
      pathname: "/order/create",
      params: {
        variantJson,
        vendorJson,
        sizesJson: JSON.stringify(selectedSizeObjects),
      },
    });
  };

  const handleSaveToCart = async () => {
    const selectedIds = Object.keys(selected)
      .filter((id) => selected[id])
      .map(Number);
    if (selectedIds.length === 0) return;

    setSavingCart(true);
    try {
      const data = await apiFetch("/cart", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendor?.vendor_id,
          product_id: variant?.product_id,
          variant_id: variant?.variant_id,
          size_ids: selectedIds,
        }),
      });
      if (data.success) {
        router.replace({ pathname: "/vendor/cart", params: { vendorJson } });
      }
    } catch (err) {
      console.error("Failed to add to cart", err);
    }
    setSavingCart(false);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const numColumns = width >= 600 ? 6 : 4;
  const gap = 12;
  const sidePadding = 20;
  const tileSize =
    (width - sidePadding * 2 - gap * (numColumns - 1)) / numColumns;

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
          <View
            style={[
              styles.colorDot,
              { backgroundColor: variant?.hex_code || "#1c1210" },
            ]}
          />
          <Text style={styles.title}>
            {mode === "declare" ? "Select Sizes" : "Select Sizes for Order"}
          </Text>
        </View>
        <Text style={[styles.subtitle, { marginLeft: 50 }]}>
          {[variant?.category_name, variant?.pattern_name, variant?.color_name]
            .filter(Boolean)
            .join(" | ")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 20,
          flexGrow: 1,
        }}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color="#8a3230" />
        ) : sizes.length === 0 ? (
          <Text style={styles.emptyText}>
            {mode === "order" && allInCart
              ? "All available sizes for this variant are already in the cart."
              : "No sizes have been assigned to this variant yet."}
          </Text>
        ) : (
          <>
            <Text style={styles.assignedTitle}>
              Assigned Size ({selectedCount})
            </Text>
            <View style={[styles.grid, { gap }]}>
              {sizes.map((s) => {
                const on = selected[s.size_id];
                return (
                  <TouchableOpacity
                    key={s.size_id}
                    onPress={() => toggle(s.size_id)}
                    style={{ width: tileSize, height: tileSize }}
                  >
                    {on ? (
                      <LinearGradient
                        colors={["#7a2f2b", "#c98f86"]}
                        style={styles.sizeTile}
                      >
                        <Text style={styles.sizeTextOn}>{s.size_value}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.sizeTile, styles.sizeTileOff]}>
                        <Text style={styles.sizeTextOff}>{s.size_value}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={{ flex: 1 }} />

        {mode === "declare" ? (
          <TouchableOpacity
            onPress={handleContinue}
            disabled={selectedCount === 0 || saving}
            style={{
              opacity: selectedCount === 0 || saving ? 0.5 : 1,
              marginTop: 18,
            }}
          >
            <LinearGradient
              colors={["#3a1516", "#8a4844", "#c98f86"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              <Text style={styles.continueText}>
                {saving ? "Saving…" : "Assign Sizes"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={{ marginTop: 18, gap: 12 }}>
            <TouchableOpacity
              onPress={handleContinue}
              disabled={selectedCount === 0}
              style={{ opacity: selectedCount === 0 ? 0.5 : 1 }}
            >
              <LinearGradient
                colors={["#3a1516", "#8a4844", "#c98f86"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                <Text style={styles.continueText}>
                  Assign Size & Create Order
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveToCart}
              disabled={selectedCount === 0 || savingCart}
              style={{ opacity: selectedCount === 0 || savingCart ? 0.5 : 1 }}
            >
              <View style={styles.cartBtn}>
                <Text style={styles.cartBtnText}>
                  {savingCart ? "Saving…" : "Assign & Save In Cart"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    fontSize: 19,
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
  assignedTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1c1210",
    marginVertical: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sizeTile: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeTileOff: {
    backgroundColor: "#eceae7",
    borderWidth: 1.5,
    borderColor: "#dcd6d2",
  },
  sizeTextOn: { fontSize: 20, fontWeight: "800", color: "#fff" },
  sizeTextOff: { fontSize: 20, fontWeight: "800", color: "#1c1210" },
  continueBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  continueText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cartBtn: {
    borderWidth: 1.5,
    borderColor: "#8a3230",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cartBtnText: { color: "#8a3230", fontSize: 16, fontWeight: "800" },
});
