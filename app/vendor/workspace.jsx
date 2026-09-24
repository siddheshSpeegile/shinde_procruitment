import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { API_BASE_URL, apiFetch, resolveImageUrl } from "../../api/config";
import NavBar from "../../components/NavBar";
import PhotoPickerModal from "../../components/PhotoPickerModal";
import RefreshButton from "../../components/RefreshButton";

export default function VendorWorkspaceScreen() {
  const router = useRouter();
  const { vendorJson } = useLocalSearchParams();
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0,
    variants: 0,
    orders: 0,
    cart: 0,
  });
  // Kept in state (not read from vendorJson) so a newly uploaded logo shows
  // immediately. logoFailed falls back to the initial if the image can't load.
  const [logoUrl, setLogoUrl] = useState(vendor?.logo_url || null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoPickerVisible, setLogoPickerVisible] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const uploadLogo = async (asset) => {
    setUploadingLogo(true);
    try {
      // Same SDK 57 FormData requirement as Add Product: wrap the picked
      // file's local URI in expo-file-system's File, and let fetch set the
      // multipart Content-Type (with boundary) itself.
      const formData = new FormData();
      formData.append("logo", new File(asset.uri));
      const res = await fetch(
        `${API_BASE_URL}/vendors/${vendor.vendor_id}/logo`,
        { method: "PUT", body: formData },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setLogoUrl(data.data.logo_url);
      setLogoFailed(false);
    } catch (err) {
      console.error("Failed to upload vendor logo", err);
      Alert.alert(
        "Logo not updated",
        err.message || "Could not upload the logo. Please try again.",
      );
    }
    setUploadingLogo(false);
  };

  // Backing out of the camera/gallery without picking leaves the current
  // logo (or initial) exactly as it was - nothing is uploaded.
  const pickLogoFromCamera = async () => {
    setLogoPickerVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) uploadLogo(result.assets[0]);
  };

  const pickLogoFromGallery = async () => {
    setLogoPickerVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) uploadLogo(result.assets[0]);
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      // Fetched one at a time, not with Promise.all: the backend's DB
      // layer uses a single shared connection (not a pool), so firing
      // these concurrently causes "cursor already closed" crashes when
      // two requests hit the DB at the same instant. Sequential is
      // slightly slower but avoids that entirely.
      const productsRes = await apiFetch(
        `/products?vendorId=${vendor.vendor_id}`,
      );
      const ordersRes = await apiFetch(
        `/orders/all?vendorId=${vendor.vendor_id}`,
      );
      const cartRes = await apiFetch(`/cart?vendorId=${vendor.vendor_id}`);

      const products = productsRes.success ? productsRes.data || [] : [];
      const totalVariants = products.reduce(
        (sum, p) => sum + Number(p.variant_count || 0),
        0,
      );

      // "current orders" = not yet delivered - the moment an order is
      // marked delivered it drops out of this count on the next load,
      // same live-computed pattern as the dashboard KPIs.
      const orders = ordersRes.success ? ordersRes.data || [] : [];
      const pendingOrdersCount = orders.filter(
        (o) => o.delivery.state !== "delivered",
      ).length;

      // Cart count = how many products this vendor currently has sitting
      // in cart. Placing an order clears the vendor's cart server-side,
      // so this naturally drops to 0 the moment an order is placed from it.
      const cartItems = cartRes.success ? cartRes.data || [] : [];

      setStats({
        products: products.length,
        variants: totalVariants,
        orders: pendingOrdersCount,
        cart: cartItems.length,
      });
    } catch (err) {
      console.error("Failed to load vendor stats", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (vendor?.vendor_id) loadStats();
  }, [vendor?.vendor_id]);

  const goCatalogue = () =>
    router.push({ pathname: "/product/catalogue", params: { vendorJson } });
  const goAddProduct = () =>
    router.push({ pathname: "/product/add-product", params: { vendorJson } });
  const goToCart = () =>
    router.push({ pathname: "/vendor/cart", params: { vendorJson } });

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
          <Text style={styles.title}>Vendor Workspace</Text>
        </View>
        <RefreshButton onPress={loadStats} refreshing={loading} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      >
        <LinearGradient
          colors={["#3a1516", "#7a3530", "#8f4941"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerRow}>
            <TouchableOpacity
              onPress={() => setLogoPickerVisible(true)}
              disabled={uploadingLogo}
              style={styles.vendorLogoTouch}
            >
              <View style={styles.vendorLogoWrap}>
                {uploadingLogo ? (
                  <ActivityIndicator color="#8a3230" />
                ) : logoUrl && !logoFailed ? (
                  <Image
                    source={{ uri: resolveImageUrl(logoUrl) }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <Text style={styles.vendorInitial}>
                    {(vendor?.vendor_name || "?").charAt(0)}
                  </Text>
                )}
              </View>
              <View style={styles.logoEditBadge}>
                <Svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.6}
                >
                  <Path d="M12 20h9" />
                  <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </Svg>
              </View>
            </TouchableOpacity>
            <Text style={styles.vendorName}>{vendor?.vendor_name}</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statsGridItem}>
              <View style={styles.statsIconWrap}>
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Path d="M21 8l-9-5-9 5 9 5 9-5Z" />
                  <Path d="M3 8v8l9 5 9-5V8" />
                  <Path d="M12 13v8" />
                </Svg>
              </View>
              <View>
                <Text style={styles.statsLabel}>Total Products</Text>
                <Text style={styles.statsValue}>
                  {loading ? "–" : stats.products}
                </Text>
              </View>
            </View>
            <View style={styles.statsGridItem}>
              <View style={styles.statsIconWrap}>
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Path d="M3 8l9-4 9 4-9 4-9-4Z" />
                  <Path d="M3 12l9 4 9-4" />
                  <Path d="M3 16l9 4 9-4" />
                </Svg>
              </View>
              <View>
                <Text style={styles.statsLabel}>Total Variants</Text>
                <Text style={styles.statsValue}>
                  {loading ? "–" : stats.variants}
                </Text>
              </View>
            </View>
            <View style={styles.statsGridItem}>
              <View style={styles.statsIconWrap}>
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Path d="M6 3h12v18H6z" />
                  <Path d="M9 8h6M9 12h6M9 16h4" />
                </Svg>
              </View>
              <View>
                <Text style={styles.statsLabel}>Current Orders</Text>
                <Text style={styles.statsValue}>
                  {loading ? "–" : stats.orders}
                </Text>
              </View>
            </View>
            <View style={styles.statsGridItem}>
              <View style={styles.statsIconWrap}>
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
                </Svg>
              </View>
              <View>
                <Text style={styles.statsLabel}>In Cart</Text>
                <Text style={styles.statsValue}>
                  {loading ? "–" : stats.cart}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ gap: 16, marginTop: 22 }}>
          <ActionCard
            accent="#2e9e44"
            title="Add Product"
            subtitle="Add New Product"
            onPress={goAddProduct}
            icon={
              <>
                <Path d="M12 8v8M8 12h8" />
                <Path d="M3 3h18v18H3z" />
              </>
            }
          />
          <ActionCard
            accent="#d0342c"
            title="Product Catalogue"
            subtitle="View and manage product"
            onPress={goCatalogue}
            icon={
              <>
                <Path d="M21 8l-9-5-9 5 9 5 9-5Z" />
                <Path d="M3 8v8l9 5 9-5V8" />
                <Path d="M12 13v8" />
              </>
            }
          />
          <ActionCard
            accent="#e0a530"
            title="Cart"
            subtitle="Products selected for order"
            onPress={goToCart}
            icon={
              <Path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
            }
          />
          <ActionCard
            accent="#2f5fc4"
            title="Orders"
            subtitle="View Order"
            onPress={() =>
              router.push({ pathname: "/orders", params: { vendorJson } })
            }
            icon={
              <>
                <Path d="M6 3h12v18H6z" />
                <Path d="M9 8h6M9 12h6M9 16h4" />
              </>
            }
          />
        </View>
      </ScrollView>

      <PhotoPickerModal
        visible={logoPickerVisible}
        onClose={() => setLogoPickerVisible(false)}
        onPickCamera={pickLogoFromCamera}
        onPickGallery={pickLogoFromGallery}
        title="Update Vendor Logo"
        subtitle="Choose how you'd like to add the logo"
      />

      <NavBar active="vendor" vendor={vendor} />
    </SafeAreaView>
  );
}

function ActionCard({ accent, title, subtitle, onPress, icon }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.actionCard, { borderLeftColor: accent }]}
    >
      <LinearGradient
        colors={["#7a2f2b", "#c98f86"]}
        style={styles.actionIconWrap}
      >
        <Svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2}
        >
          {icon}
        </Svg>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <LinearGradient
        colors={["#7a2f2b", "#c98f86"]}
        style={styles.actionChevron}
      >
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2.4}
        >
          <Path d="M9 6l6 6-6 6" />
        </Svg>
      </LinearGradient>
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
  title: {
    fontSize: 19,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  banner: { borderRadius: 16, padding: 16, overflow: "hidden" },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 22,
  },
  vendorLogoWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  vendorLogoTouch: { position: "relative" },
  logoEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8a3230",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  vendorInitial: { fontSize: 20, fontWeight: "800", color: "#4a1a18" },
  vendorName: { fontSize: 22, fontWeight: "800", color: "#fff" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    padding: 14,
    rowGap: 14,
  },
  statsGridItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsLabel: { fontSize: 13, color: "#fff" },
  statsValue: { fontSize: 18, fontWeight: "800", color: "#fff" },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderLeftWidth: 6,
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 16,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 17, fontWeight: "800", color: "#1c1210" },
  actionSubtitle: { fontSize: 13, color: "#6b5f5c", marginTop: 2 },
  actionChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
