// import { LinearGradient } from "expo-linear-gradient";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { useState } from "react";
// import {
//   Alert,
//   Image,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   useWindowDimensions,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import Svg, { Path } from "react-native-svg";
// import { apiFetch } from "../../api/config";
// import NavBar from "../../components/NavBar";

// export default function ProductDetailsScreen() {
//   const router = useRouter();
//   const { width } = useWindowDimensions();
//   const { variantJson, vendorJson, sizesJson, poDate, remarks } =
//     useLocalSearchParams();
//   const variant = variantJson ? JSON.parse(variantJson) : null;
//   const vendor = vendorJson ? JSON.parse(vendorJson) : null;
//   const selectedSizes = sizesJson ? JSON.parse(sizesJson) : [];

//   const [rows, setRows] = useState(
//     selectedSizes.map((s) => ({
//       size_id: s.size_id,
//       size_value: s.size_value,
//       qty: 1,
//       gst: 0,
//       cost: variant?.price ?? 0,
//       mrp: 0,
//     })),
//   );
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   const isTablet = width >= 600;

//   const changeQty = (sizeId, delta) => {
//     setRows((prev) =>
//       prev.map((r) =>
//         r.size_id === sizeId ? { ...r, qty: Math.max(0, r.qty + delta) } : r,
//       ),
//     );
//   };

//   const rowAmount = (r) => {
//     const base = Number(r.qty || 0) * Number(r.cost || 0);
//     return base + (base * Number(r.gst || 0)) / 100;
//   };

//   const totalItems = rows.length;
//   const totalQty = rows.reduce((sum, r) => sum + Number(r.qty || 0), 0);
//   const totalAmount = rows.reduce((sum, r) => sum + rowAmount(r), 0);

//   const handleOrderProduct = async () => {
//     setError("");
//     setSaving(true);
//     try {
//       const payload = {
//         vendor_id: vendor?.vendor_id,
//         order_date: poDate,
//         remarks,
//         products: [
//           {
//             product_id: variant?.product_id,
//             variants: [
//               {
//                 variant_id: variant?.variant_id,
//                 sizes: rows.map((r) => ({
//                   size_id: r.size_id,
//                   cost: Number(r.cost || 0),
//                   mrp: Number(r.mrp || 0),
//                   qty: Number(r.qty || 0),
//                   gst: Number(r.gst || 0),
//                 })),
//               },
//             ],
//           },
//         ],
//       };
//       const data = await apiFetch("/purchase-order", {
//         method: "POST",
//         body: JSON.stringify(payload),
//       });
//       if (data.success) {
//         Alert.alert("Order done", "Your purchase order has been placed.", [
//           { text: "OK", onPress: () => router.replace("/dashboard") },
//         ]);
//       } else {
//         setError(data.message || "Failed to place order");
//       }
//     } catch (err) {
//       console.error("Failed to place order", err);
//       setError("Failed to place order");
//     }
//     setSaving(false);
//   };

//   return (
//     <SafeAreaView style={styles.screen} edges={["top"]}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()}>
//           <LinearGradient
//             colors={["#7a2f2b", "#c98f86"]}
//             style={styles.backBtn}
//           >
//             <Svg
//               width={18}
//               height={18}
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="#fff"
//               strokeWidth={2.6}
//             >
//               <Path d="M15 18l-6-6 6-6" />
//             </Svg>
//           </LinearGradient>
//         </TouchableOpacity>
//         <Text style={styles.title}>Product Details</Text>
//       </View>

//       <ScrollView
//         contentContainerStyle={[
//           styles.content,
//           isTablet && { maxWidth: 700, alignSelf: "center", width: "100%" },
//         ]}
//       >
//         <LinearGradient
//           colors={["#3a1516", "#7a3530", "#8f4941"]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 1 }}
//           style={styles.banner}
//         >
//           <View style={styles.activeBadge}>
//             <Text style={styles.activeBadgeText}>Active</Text>
//           </View>
//           <View style={styles.bannerImgWrap}>
//             {variant?.image && (
//               <Image source={{ uri: variant.image }} style={styles.bannerImg} />
//             )}
//           </View>
//           <View style={{ gap: 8, marginTop: 20 }}>
//             <View style={styles.codeChip}>
//               <Text style={styles.codeChipText}>{variant?.code}</Text>
//             </View>
//             <Text style={styles.bannerName}>{variant?.name}</Text>
//             <View style={styles.variantsChip}>
//               <Svg
//                 width={14}
//                 height={14}
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="#fff"
//                 strokeWidth={2}
//               >
//                 <Path d="M3 7l9-4 9 4-9 4-9-4Z" />
//                 <Path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
//               </Svg>
//               <Text style={styles.variantsChipText}>
//                 Variants : {rows.length}
//               </Text>
//             </View>
//           </View>
//         </LinearGradient>

//         <View style={styles.infoGrid}>
//           <InfoCell
//             label="Vendor Name"
//             value={vendor?.vendor_name || "—"}
//             border
//           />
//           <InfoCell label="Order No" value="New" border />
//           <InfoCell label="Company Code" value="—" border />
//           <InfoCell
//             label="Variant"
//             value={
//               [
//                 variant?.category_name,
//                 variant?.pattern_name,
//                 variant?.color_name,
//               ]
//                 .filter(Boolean)
//                 .join(" | ") || "—"
//             }
//           />
//         </View>

//         <Text style={styles.sectionTitle}>Assigned Size</Text>

//         <View style={styles.table}>
//           <View style={styles.tableHeader}>
//             {["Size", "Qty", "Gst %", "Cost ₹", "MRP ₹", "Amount ₹"].map(
//               (h) => (
//                 <Text key={h} style={styles.tableHeaderText}>
//                   {h}
//                 </Text>
//               ),
//             )}
//           </View>
//           {rows.map((r) => (
//             <View key={r.size_id} style={styles.tableRow}>
//               <Text style={styles.tableCellSize}>{r.size_value}</Text>
//               <View style={styles.qtyCell}>
//                 <TouchableOpacity
//                   onPress={() => changeQty(r.size_id, -1)}
//                   style={styles.qtyBtn}
//                 >
//                   <Text style={styles.qtyBtnText}>−</Text>
//                 </TouchableOpacity>
//                 <Text style={styles.qtyValue}>{r.qty}</Text>
//                 <TouchableOpacity
//                   onPress={() => changeQty(r.size_id, 1)}
//                   style={styles.qtyBtn}
//                 >
//                   <Text style={styles.qtyBtnText}>+</Text>
//                 </TouchableOpacity>
//               </View>
//               <Text style={styles.tableCellStatic}>{r.gst}</Text>
//               <Text style={styles.tableCellStatic}>{r.cost}</Text>
//               <Text style={styles.tableCellStatic}>{r.mrp}</Text>
//               <Text style={styles.tableCellAmount}>
//                 {rowAmount(r).toLocaleString("en-IN")}
//               </Text>
//             </View>
//           ))}
//         </View>

//         <Text style={styles.sectionTitle}>Variant Summary</Text>
//         <View style={styles.summaryRow}>
//           <SummaryCard
//             bg="#fbe3df"
//             iconBg="#8a3230"
//             label="Total Items"
//             value={totalItems}
//             color="#8a3230"
//           />
//           <SummaryCard
//             bg="#f6e9d2"
//             iconBg="#c9832f"
//             label="Total Qty"
//             value={totalQty}
//             color="#c9832f"
//           />
//           <SummaryCard
//             bg="#d9ecd6"
//             iconBg="#2f8a3d"
//             label="Total Amount"
//             value={`₹${totalAmount.toLocaleString("en-IN")}`}
//             color="#2f8a3d"
//           />
//         </View>

//         {error ? <Text style={styles.error}>{error}</Text> : null}

//         <View style={styles.actionsRow}>
//           <TouchableOpacity
//             onPress={() => router.back()}
//             style={styles.cancelBtn}
//           >
//             <Text style={styles.cancelText}>Cancel</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={handleOrderProduct}
//             disabled={saving}
//             style={{ flex: 1, opacity: saving ? 0.7 : 1 }}
//           >
//             <LinearGradient
//               colors={["#3a1516", "#8a4844", "#c98f86"]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 0 }}
//               style={styles.orderBtn}
//             >
//               <Text style={styles.orderBtnText}>
//                 {saving ? "Placing…" : "Order Product"}
//               </Text>
//             </LinearGradient>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>

//       <NavBar active="vendor" vendor={vendor} />
//     </SafeAreaView>
//   );
// }

// function InfoCell({ label, value, border }) {
//   return (
//     <View
//       style={[
//         styles.infoCell,
//         border && { borderRightWidth: 1, borderColor: "#f0e2df" },
//       ]}
//     >
//       <View style={styles.infoIconWrap}>
//         <Svg
//           width={16}
//           height={16}
//           viewBox="0 0 24 24"
//           fill="none"
//           stroke="#8a3230"
//           strokeWidth={2}
//         >
//           <Path d="M4 4h16v16H4z" />
//         </Svg>
//       </View>
//       <View style={{ flex: 1 }}>
//         <Text style={styles.infoLabel}>{label}</Text>
//         <Text style={styles.infoValue} numberOfLines={1}>
//           {value}
//         </Text>
//       </View>
//     </View>
//   );
// }

// function SummaryCard({ bg, iconBg, label, value, color }) {
//   return (
//     <View style={[styles.summaryCard, { backgroundColor: bg }]}>
//       <View style={[styles.summaryIconWrap, { backgroundColor: iconBg }]} />
//       <View>
//         <Text style={styles.summaryLabel}>{label}</Text>
//         <Text style={[styles.summaryValue, { color }]}>{value}</Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: "#f5f3f0" },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//     paddingHorizontal: 20,
//     paddingTop: 18,
//     paddingBottom: 12,
//   },
//   backBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   title: {
//     fontSize: 19,
//     fontWeight: "800",
//     fontStyle: "italic",
//     color: "#1c1210",
//   },
//   content: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
//   banner: { borderRadius: 16, padding: 20, overflow: "hidden" },
//   activeBadge: {
//     position: "absolute",
//     top: 16,
//     right: 16,
//     backgroundColor: "#e3f6e6",
//     borderRadius: 20,
//     paddingVertical: 6,
//     paddingHorizontal: 14,
//     zIndex: 2,
//   },
//   activeBadgeText: { color: "#1f8a3d", fontSize: 13, fontWeight: "800" },
//   bannerImgWrap: {
//     width: 96,
//     height: 96,
//     borderRadius: 14,
//     backgroundColor: "#f2eeea",
//     overflow: "hidden",
//   },
//   bannerImg: { width: "100%", height: "100%" },
//   codeChip: {
//     borderWidth: 1.5,
//     borderColor: "#fff",
//     borderRadius: 20,
//     paddingVertical: 5,
//     paddingHorizontal: 16,
//     alignSelf: "flex-start",
//   },
//   codeChipText: { color: "#fff", fontSize: 13, fontWeight: "800" },
//   bannerName: { fontSize: 22, fontWeight: "800", color: "#fff" },
//   variantsChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     borderWidth: 1.5,
//     borderColor: "#fff",
//     borderRadius: 8,
//     paddingVertical: 4,
//     paddingHorizontal: 10,
//     alignSelf: "flex-start",
//   },
//   variantsChipText: { color: "#fff", fontSize: 14, fontWeight: "700" },
//   infoGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     borderWidth: 1.5,
//     borderColor: "#e2c3bd",
//     borderRadius: 16,
//     backgroundColor: "#fff",
//     overflow: "hidden",
//   },
//   infoCell: {
//     width: "50%",
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     padding: 16,
//   },
//   infoIconWrap: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: "#f3d9d5",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   infoLabel: { fontSize: 12, color: "#8a3230", fontWeight: "600" },
//   infoValue: { fontSize: 15, fontWeight: "800", color: "#1c1210" },
//   sectionTitle: { fontSize: 17, fontWeight: "800", color: "#1c1210" },
//   table: {
//     borderRadius: 12,
//     overflow: "hidden",
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//   },
//   tableHeader: {
//     flexDirection: "row",
//     backgroundColor: "#3a1516",
//     paddingVertical: 10,
//   },
//   tableHeaderText: {
//     flex: 1,
//     color: "#fff",
//     fontSize: 11.5,
//     fontWeight: "800",
//     textAlign: "center",
//   },
//   tableRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderTopWidth: 1,
//     borderColor: "#ddd0cc",
//     paddingVertical: 10,
//   },
//   tableCellSize: {
//     flex: 1,
//     fontSize: 15,
//     fontWeight: "800",
//     color: "#1c1210",
//     textAlign: "center",
//   },
//   tableCellStatic: {
//     flex: 1,
//     fontSize: 13,
//     fontWeight: "700",
//     color: "#1c1210",
//     textAlign: "center",
//   },
//   tableCellAmount: {
//     flex: 1,
//     fontSize: 14,
//     fontWeight: "800",
//     color: "#8a3230",
//     textAlign: "center",
//   },
//   qtyCell: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 4,
//   },
//   qtyBtn: {
//     width: 24,
//     height: 24,
//     borderRadius: 6,
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     backgroundColor: "#eceae7",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   qtyBtnText: { fontSize: 14, fontWeight: "800", color: "#1c1210" },
//   qtyValue: {
//     fontSize: 13,
//     fontWeight: "800",
//     color: "#1c1210",
//     minWidth: 16,
//     textAlign: "center",
//   },
//   summaryRow: { flexDirection: "row", gap: 10 },
//   summaryCard: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     borderRadius: 14,
//     padding: 12,
//   },
//   summaryIconWrap: { width: 30, height: 30, borderRadius: 15 },
//   summaryLabel: { fontSize: 11, color: "#5c4a48" },
//   summaryValue: {
//     fontSize: 14,
//     fontWeight: "800",
//     textDecorationLine: "underline",
//   },
//   error: { color: "#b3261e", fontSize: 13 },
//   actionsRow: { flexDirection: "row", gap: 12 },
//   cancelBtn: {
//     flex: 1,
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderRadius: 16,
//     paddingVertical: 14,
//     alignItems: "center",
//     backgroundColor: "#fff",
//   },
//   cancelText: { fontSize: 16, fontWeight: "800", color: "#1c1210" },
//   orderBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
//   orderBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
// });

import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { apiFetch } from "../../api/config";
import NavBar from "../../components/NavBar";

// Fixed widths (not flex) for the Cart Items table, matching column
// order [Size, Qty, Gst %, Cost, MRP, Amount] - lets the table be wider
// than the screen and scroll horizontally instead of squeezing every
// column (especially Qty's two +/- buttons) into an equal flex share
// that's too narrow to fit its own content.
const COLUMN_WIDTHS = [56, 96, 64, 84, 72, 96];

// Same generalization as order/create.jsx: accepts productsJson (one or
// many products, each with one or many variants/sizes) so this single
// screen serves both the direct single-variant flow and the cart flow.
export default function ProductDetailsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    vendorJson,
    productsJson,
    poDate,
    expectedDeliveryDate,
    remarks,
    returnTo = "dashboard",
  } = useLocalSearchParams();
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;
  const products = productsJson ? JSON.parse(productsJson) : [];

  const isTablet = width >= 600;
  const isMultiProduct = products.length > 1;

  // Flatten into one row per product+variant+size for the pricing table.
  const [rows, setRows] = useState(() => {
    const out = [];
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        (v.sizes || []).forEach((s) => {
          out.push({
            product_id: p.product_id,
            variant_id: v.variant_id,
            category_name: v.category_name,
            pattern_name: v.pattern_name,
            color_name: v.color_name,
            size_id: s.size_id,
            size_value: s.size_value,
            code: p.code || p.v_prod_id,
            name: p.name || p.product_name,
            image: p.image || p.photo_url,
            qty: 1,
            gst: "0",
            cost: String(p.price ?? 0),
            mrp: "0",
          });
        });
      });
    });
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hiddenVariantIds, setHiddenVariantIds] = useState(() => new Set());

  // Prefill cost/mrp/gst from the most recent order that used each exact
  // variant+size combination, if any - saves retyping known pricing every
  // time. Runs once on mount; anything the person then edits by hand
  // takes precedence since this never re-fires after that.
  useEffect(() => {
    const items = rows.map((r) => ({
      variant_id: r.variant_id,
      size_id: r.size_id,
      product_id: r.product_id,
    }));
    if (items.length === 0) return;
    apiFetch("/pricing/last-batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    })
      .then((data) => {
        if (!data.success) return;
        setRows((prev) =>
          prev.map((r) => {
            const match = data.data.find(
              (p) => p.variant_id === r.variant_id && p.size_id === r.size_id,
            );
            if (!match) return r;
            return {
              ...r,
              cost: match.cost != null ? String(match.cost) : r.cost,
              mrp: match.mrp != null ? String(match.mrp) : r.mrp,
              gst: match.gst != null ? String(match.gst) : r.gst,
            };
          }),
        );
      })
      .catch((err) => console.error("Failed to fetch pricing history", err));
    // Deliberately runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowKey = (r) => `${r.product_id}-${r.variant_id}-${r.size_id}`;

  const changeQty = (key, delta) => {
    setRows((prev) =>
      prev.map((r) =>
        rowKey(r) === key ? { ...r, qty: Math.max(0, r.qty + delta) } : r,
      ),
    );
  };

  const updateField = (key, field, text) => {
    setRows((prev) =>
      prev.map((r) => (rowKey(r) === key ? { ...r, [field]: text } : r)),
    );
  };

  const toggleVariantVisible = (variantId) => {
    setHiddenVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  // Distinct variants across every product in this order, for the
  // show/hide toggle list - built from rows so it always matches what's
  // actually in the order, never a separate/out-of-sync list.
  const variantList = [];
  const seenVariantIds = new Set();
  rows.forEach((r) => {
    if (!seenVariantIds.has(r.variant_id)) {
      seenVariantIds.add(r.variant_id);
      variantList.push({
        variant_id: r.variant_id,
        code: r.code,
        label:
          [r.category_name, r.pattern_name, r.color_name]
            .filter(Boolean)
            .join(" | ") || `Variant ${r.variant_id}`,
      });
    }
  });

  // The toggle list only earns its place on screen once there's actually
  // more than one variant to distinguish between.
  const showVariantToggles = variantList.length > 1;
  const visibleRows = showVariantToggles
    ? rows.filter((r) => !hiddenVariantIds.has(r.variant_id))
    : rows;

  const rowAmount = (r) => {
    const base = Number(r.qty || 0) * Number(r.cost || 0);
    return base + (base * Number(r.gst || 0)) / 100;
  };

  const totalItems = rows.length;
  const totalQty = rows.reduce((sum, r) => sum + Number(r.qty || 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + rowAmount(r), 0);

  const singleProduct = !isMultiProduct ? products[0] : null;
  const singleVariant = singleProduct
    ? (singleProduct.variants || [])[0]
    : null;

  const handleOrderProduct = async () => {
    setError("");
    setSaving(true);
    try {
      // Rebuild the nested products -> variants -> sizes structure the
      // existing /api/purchase-order endpoint already expects - same
      // endpoint used by the original single-item flow, no new backend
      // route needed for the cart's multi-product case either.
      const productMap = {};
      rows.forEach((r) => {
        if (!productMap[r.product_id]) productMap[r.product_id] = {};
        if (!productMap[r.product_id][r.variant_id])
          productMap[r.product_id][r.variant_id] = [];
        productMap[r.product_id][r.variant_id].push({
          size_id: r.size_id,
          cost: Number(r.cost || 0),
          mrp: Number(r.mrp || 0),
          qty: Number(r.qty || 0),
          gst: Number(r.gst || 0),
        });
      });
      const payloadProducts = Object.entries(productMap).map(
        ([product_id, variantsMap]) => ({
          product_id: Number(product_id),
          variants: Object.entries(variantsMap).map(([variant_id, sizes]) => ({
            variant_id: Number(variant_id),
            sizes,
          })),
        }),
      );

      const data = await apiFetch("/purchase-order", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendor?.vendor_id,
          order_date: poDate,
          expected_delivery_date: expectedDeliveryDate,
          remarks,
          products: payloadProducts,
        }),
      });

      if (data.success) {
        const destination =
          returnTo === "workspace" ? "/vendor/workspace" : "/dashboard";
        const destinationParams =
          returnTo === "workspace" ? { vendorJson } : {};
        Alert.alert("Order done", "Your purchase order has been placed.", [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: destination,
                params: destinationParams,
              }),
          },
        ]);
      } else {
        setError(data.message || "Failed to place order");
      }
    } catch (err) {
      console.error("Failed to place order", err);
      setError("Failed to place order");
    }
    setSaving(false);
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
        <Text style={styles.title}>Product Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTablet && { maxWidth: 700, alignSelf: "center", width: "100%" },
        ]}
      >
        <LinearGradient
          colors={["#3a1516", "#7a3530", "#8f4941"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
          {singleProduct ? (
            <>
              <View style={styles.bannerImgWrap}>
                {(singleProduct.image || singleProduct.photo_url) && (
                  <Image
                    source={{
                      uri: singleProduct.image || singleProduct.photo_url,
                    }}
                    style={styles.bannerImg}
                  />
                )}
              </View>
              <View style={{ gap: 8, marginTop: 20 }}>
                <View style={styles.codeChip}>
                  <Text style={styles.codeChipText}>
                    {singleProduct.code || singleProduct.v_prod_id}
                  </Text>
                </View>
                <Text style={styles.bannerName}>
                  {singleProduct.name || singleProduct.product_name}
                </Text>
                <View style={styles.variantsChip}>
                  <Svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    <Path d="M3 7l9-4 9 4-9 4-9-4Z" />
                    <Path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
                  </Svg>
                  <Text style={styles.variantsChipText}>
                    Variants : {rows.length}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={{ gap: 8, marginTop: 20 }}>
              <Text style={styles.bannerName}>{products.length} Products</Text>
              <View style={styles.variantsChip}>
                <Svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Path d="M3 7l9-4 9 4-9 4-9-4Z" />
                  <Path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
                </Svg>
                <Text style={styles.variantsChipText}>
                  {totalItems} Total Lines
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>

        <View style={styles.infoGrid}>
          <InfoCell
            label="Vendor Name"
            value={vendor?.vendor_name || "—"}
            border
          />
          <InfoCell label="Order No" value="New" border />
          <InfoCell label="Company Code" value="—" border />
          <InfoCell
            label="Variant"
            value={
              singleVariant
                ? [
                    singleVariant.category_name,
                    singleVariant.pattern_name,
                    singleVariant.color_name,
                  ]
                    .filter(Boolean)
                    .join(" | ") || "—"
                : "Multiple"
            }
          />
        </View>

        {showVariantToggles && (
          <>
            <Text style={styles.sectionTitle}>Variants in this order</Text>
            <View style={styles.variantToggleList}>
              {variantList.map((v) => (
                <View key={v.variant_id} style={styles.variantToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.variantToggleCode} numberOfLines={1}>
                      {v.code}
                    </Text>
                    <Text style={styles.variantToggleLabel} numberOfLines={1}>
                      {v.label}
                    </Text>
                  </View>
                  <Switch
                    value={!hiddenVariantIds.has(v.variant_id)}
                    onValueChange={() => toggleVariantVisible(v.variant_id)}
                    trackColor={{ false: "#e5ddd8", true: "#c98f86" }}
                    thumbColor={
                      hiddenVariantIds.has(v.variant_id) ? "#fff" : "#7a2f2b"
                    }
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>
          {isMultiProduct ? "Cart Items" : "Assigned Size"}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {["Size", "Qty", "Gst %", "Cost ₹", "MRP ₹", "Total Cost ₹"].map(
                (h, i) => (
                  <Text
                    key={h}
                    style={[
                      styles.tableHeaderText,
                      { width: COLUMN_WIDTHS[i] },
                    ]}
                  >
                    {h}
                  </Text>
                ),
              )}
            </View>
            {visibleRows.map((r) => {
              const key = rowKey(r);
              return (
                <View key={key} style={styles.tableRow}>
                  <Text
                    style={[styles.tableCellSize, { width: COLUMN_WIDTHS[0] }]}
                  >
                    {r.size_value}
                  </Text>
                  <View style={[styles.qtyCell, { width: COLUMN_WIDTHS[1] }]}>
                    <TouchableOpacity
                      onPress={() => changeQty(key, -1)}
                      style={styles.qtyBtn}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{r.qty}</Text>
                    <TouchableOpacity
                      onPress={() => changeQty(key, 1)}
                      style={styles.qtyBtn}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.tableCellInput, { width: COLUMN_WIDTHS[2] }]}
                    keyboardType="decimal-pad"
                    value={String(r.gst)}
                    onChangeText={(t) => updateField(key, "gst", t)}
                  />
                  <TextInput
                    style={[styles.tableCellInput, { width: COLUMN_WIDTHS[3] }]}
                    keyboardType="decimal-pad"
                    value={String(r.cost)}
                    onChangeText={(t) => updateField(key, "cost", t)}
                  />
                  <TextInput
                    style={[styles.tableCellInput, { width: COLUMN_WIDTHS[4] }]}
                    keyboardType="decimal-pad"
                    value={String(r.mrp)}
                    onChangeText={(t) => updateField(key, "mrp", t)}
                  />
                  <Text
                    style={[
                      styles.tableCellAmount,
                      { width: COLUMN_WIDTHS[5] },
                    ]}
                  >
                    {rowAmount(r).toLocaleString("en-IN")}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>
          {isMultiProduct ? "Order Summary" : "Variant Summary"}
        </Text>
        <View style={styles.summaryRow}>
          <SummaryCard
            bg="#fbe3df"
            label="Total Items"
            value={totalItems}
            color="#8a3230"
          />
          <SummaryCard
            bg="#f6e9d2"
            label="Total Qty"
            value={totalQty}
            color="#c9832f"
          />
          <SummaryCard
            bg="#d9ecd6"
            label="Total Amount"
            value={`₹${totalAmount.toLocaleString("en-IN")}`}
            color="#2f8a3d"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOrderProduct}
            disabled={saving}
            style={{ flex: 1, opacity: saving ? 0.7 : 1 }}
          >
            <LinearGradient
              colors={["#3a1516", "#8a4844", "#c98f86"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.orderBtn}
            >
              <Text style={styles.orderBtnText}>
                {saving ? "Placing…" : "Order Product"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <NavBar active="vendor" vendor={vendor} />
    </SafeAreaView>
  );
}

function InfoCell({ label, value, border }) {
  return (
    <View
      style={[
        styles.infoCell,
        border && { borderRightWidth: 1, borderColor: "#f0e2df" },
      ]}
    >
      <View style={styles.infoIconWrap}>
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8a3230"
          strokeWidth={2}
        >
          <Path d="M4 4h16v16H4z" />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function SummaryCard({ bg, label, value, color }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <View style={styles.summaryTextWrap}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      </View>
    </View>
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
    fontSize: 19,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  banner: { borderRadius: 16, padding: 20, overflow: "hidden" },
  activeBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#e3f6e6",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    zIndex: 2,
  },
  activeBadgeText: { color: "#1f8a3d", fontSize: 13, fontWeight: "800" },
  bannerImgWrap: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: "#f2eeea",
    overflow: "hidden",
  },
  bannerImg: { width: "100%", height: "100%" },
  codeChip: {
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  codeChipText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  bannerName: { fontSize: 22, fontWeight: "800", color: "#fff" },
  variantsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  variantsChipText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1.5,
    borderColor: "#e2c3bd",
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  infoCell: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3d9d5",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 12, color: "#8a3230", fontWeight: "600" },
  infoValue: { fontSize: 15, fontWeight: "800", color: "#1c1210" },
  variantToggleList: {
    borderWidth: 1.5,
    borderColor: "#e2c3bd",
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  variantToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "#f0e2df",
  },
  variantToggleCode: { fontSize: 12, color: "#8a3230", fontWeight: "700" },
  variantToggleLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1c1210",
    marginTop: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#1c1210" },
  table: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#3a1516",
    paddingVertical: 10,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "800",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd0cc",
    paddingVertical: 10,
  },
  tableCellSize: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1c1210",
    textAlign: "center",
  },
  tableCellStatic: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1c1210",
    textAlign: "center",
  },
  tableCellInput: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1c1210",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#ddd0cc",
    borderRadius: 8,
    marginHorizontal: 2,
    paddingVertical: 4,
    backgroundColor: "#faf7f5",
  },
  tableCellAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8a3230",
    textAlign: "center",
  },
  qtyCell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    backgroundColor: "#eceae7",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 14, fontWeight: "800", color: "#1c1210" },
  qtyValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1c1210",
    minWidth: 16,
    textAlign: "center",
  },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    padding: 12,
  },
  summaryTextWrap: { flex: 1, minWidth: 0, alignItems: "center" },
  summaryLabel: { fontSize: 11.5, color: "#5c4a48", textAlign: "center" },
  summaryValue: {
    fontSize: 15,
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 2,
  },
  error: { color: "#b3261e", fontSize: 13 },
  actionsRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cancelText: { fontSize: 16, fontWeight: "800", color: "#1c1210" },
  orderBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  orderBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
