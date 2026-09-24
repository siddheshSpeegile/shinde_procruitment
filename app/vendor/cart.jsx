// import { LinearGradient } from "expo-linear-gradient";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//     ActivityIndicator,
//     FlatList,
//     Image,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import Svg, { Circle, Path } from "react-native-svg";
// import { apiFetch } from "../../api/config";
// import NavBar from "../../components/NavBar";

// export default function CartListScreen() {
//   const router = useRouter();
//   const { vendorJson } = useLocalSearchParams();
//   const vendor = vendorJson ? JSON.parse(vendorJson) : null;

//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [query, setQuery] = useState("");
//   const [checked, setChecked] = useState({});

//   useEffect(() => {
//     if (vendor?.vendor_id) fetchCart();
//   }, [vendor?.vendor_id]);

//   const fetchCart = async () => {
//     setLoading(true);
//     try {
//       const data = await apiFetch(`/cart?vendorId=${vendor.vendor_id}`);
//       if (data.success) setItems(data.data || []);
//     } catch (err) {
//       console.error("Failed to fetch cart", err);
//     }
//     setLoading(false);
//   };

//   const toggle = (cartId) =>
//     setChecked((prev) => ({ ...prev, [cartId]: !prev[cartId] }));

//   const filtered = items.filter((i) =>
//     (i.v_prod_id || "").toLowerCase().includes(query.toLowerCase()),
//   );

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
//         <Text style={styles.title}>Cart List</Text>
//       </View>

//       <View style={styles.searchRow}>
//         <View style={styles.searchWrap}>
//           <Svg
//             width={18}
//             height={18}
//             viewBox="0 0 24 24"
//             fill="none"
//             stroke="#1c1210"
//             strokeWidth={2.2}
//           >
//             <Circle cx="11" cy="11" r="7" />
//             <Path d="M21 21l-4.3-4.3" />
//           </Svg>
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search...."
//             placeholderTextColor="#8a7c78"
//             value={query}
//             onChangeText={setQuery}
//           />
//         </View>
//         <TouchableOpacity>
//           <LinearGradient
//             colors={["#7a2f2b", "#c98f86"]}
//             style={styles.filterBtn}
//           >
//             <Svg
//               width={18}
//               height={18}
//               viewBox="0 0 24 24"
//               fill="#fff"
//               stroke="none"
//             >
//               <Path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
//             </Svg>
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>

//       {loading ? (
//         <ActivityIndicator style={{ marginTop: 40 }} color="#8a3230" />
//       ) : (
//         <FlatList
//           data={filtered}
//           keyExtractor={(i) => String(i.cart_id)}
//           contentContainerStyle={{
//             paddingHorizontal: 20,
//             paddingBottom: 20,
//             gap: 14,
//           }}
//           ListEmptyComponent={
//             <Text style={styles.emptyText}>
//               {query ? `No products match "${query}"` : "Cart is empty"}
//             </Text>
//           }
//           renderItem={({ item }) => (
//             <View style={styles.card}>
//               <TouchableOpacity
//                 onPress={() => toggle(item.cart_id)}
//                 style={[
//                   styles.checkbox,
//                   checked[item.cart_id] && styles.checkboxOn,
//                 ]}
//               >
//                 {checked[item.cart_id] && (
//                   <Svg
//                     width={14}
//                     height={14}
//                     viewBox="0 0 24 24"
//                     fill="none"
//                     stroke="#fff"
//                     strokeWidth={3}
//                   >
//                     <Path d="M20 6 9 17l-5-5" />
//                   </Svg>
//                 )}
//               </TouchableOpacity>
//               <View style={styles.imgWrap}>
//                 {item.photo_url && (
//                   <Image source={{ uri: item.photo_url }} style={styles.img} />
//                 )}
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Text style={styles.code}>{item.v_prod_id}</Text>
//                 <Text style={styles.name} numberOfLines={1}>
//                   {item.product_name || item.v_prod_id}
//                 </Text>
//                 <View style={styles.variantRow}>
//                   <View style={styles.variantIconWrap}>
//                     <Svg
//                       width={13}
//                       height={13}
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="#fff"
//                       strokeWidth={2.2}
//                     >
//                       <Path d="M3 8l9-4 9 4-9 4-9-4Z" />
//                       <Path d="M3 12l9 4 9-4" />
//                     </Svg>
//                   </View>
//                   <Text style={styles.variantLabel}>Variants</Text>
//                   <Text style={styles.variantCount}>
//                     {item.variant_count ?? 0}
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           )}
//         />
//       )}

//       <View style={styles.totalBar}>
//         <Text style={styles.totalText}>Total Products : {items.length}</Text>
//       </View>

//       <TouchableOpacity
//         onPress={() => {
//           // Full multi-product checkout (turning several cart items into a
//           // single purchase order) isn't built yet - flagging honestly
//           // rather than pretending this works.
//         }}
//         style={{ marginHorizontal: 20, marginBottom: 12 }}
//       >
//         <LinearGradient
//           colors={["#3a1516", "#8a4844", "#c98f86"]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 0 }}
//           style={styles.createOrderBtn}
//         >
//           <Text style={styles.createOrderText}>Create Order</Text>
//         </LinearGradient>
//       </TouchableOpacity>

//       <NavBar active="cart" vendor={vendor} />
//     </SafeAreaView>
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
//     paddingBottom: 14,
//   },
//   backBtn: {
//     width: 38,
//     height: 38,
//     borderRadius: 12,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: "800",
//     fontStyle: "italic",
//     color: "#1c1210",
//   },
//   searchRow: {
//     flexDirection: "row",
//     gap: 10,
//     paddingHorizontal: 20,
//     paddingBottom: 14,
//   },
//   searchWrap: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderRadius: 14,
//     backgroundColor: "#fff",
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//   },
//   searchInput: { flex: 1, fontSize: 15, color: "#1c1210" },
//   filterBtn: {
//     width: 48,
//     height: 48,
//     borderRadius: 14,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   emptyText: {
//     textAlign: "center",
//     color: "#8a7c78",
//     fontSize: 13.5,
//     paddingVertical: 36,
//   },
//   card: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderLeftWidth: 6,
//     borderLeftColor: "#b96a63",
//     borderRadius: 14,
//     backgroundColor: "#fff",
//     padding: 14,
//   },
//   checkbox: {
//     width: 22,
//     height: 22,
//     borderRadius: 5,
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   checkboxOn: { backgroundColor: "#8a3230", borderColor: "#8a3230" },
//   imgWrap: {
//     width: 64,
//     height: 64,
//     borderRadius: 12,
//     backgroundColor: "#eee",
//     overflow: "hidden",
//   },
//   img: { width: "100%", height: "100%" },
//   code: { fontSize: 18, fontWeight: "800", color: "#1c1210" },
//   name: { fontSize: 15, fontWeight: "700", color: "#1c1210", marginTop: 2 },
//   variantRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     marginTop: 8,
//   },
//   variantIconWrap: {
//     width: 26,
//     height: 26,
//     borderRadius: 7,
//     backgroundColor: "#8a3230",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   variantLabel: { fontSize: 14, color: "#3a2b28" },
//   variantCount: { fontSize: 14, fontWeight: "700", color: "#1c1210" },
//   totalBar: {
//     marginHorizontal: 20,
//     marginBottom: 12,
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: "center",
//     backgroundColor: "#fff",
//   },
//   totalText: { fontSize: 18, fontWeight: "800", color: "#1c1210" },
//   createOrderBtn: {
//     borderRadius: 16,
//     paddingVertical: 16,
//     alignItems: "center",
//   },
//   createOrderText: { color: "#fff", fontSize: 18, fontWeight: "800" },
// });

import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
import { apiFetch, resolveImageUrl } from "../../api/config";
import NavBar from "../../components/NavBar";

export default function CartListScreen() {
  const router = useRouter();
  const { vendorJson } = useLocalSearchParams();
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [preparingOrder, setPreparingOrder] = useState(false);

  // Refetches every time this screen comes into focus - covers both the
  // first mount and coming back from "Select More Products" after adding
  // something new, without needing a manual pull-to-refresh.
  useFocusEffect(
    React.useCallback(() => {
      if (vendor?.vendor_id) fetchCart();
    }, [vendor?.vendor_id]),
  );

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/cart?vendorId=${vendor.vendor_id}`);
      if (data.success) setItems(data.data || []);
    } catch (err) {
      console.error("Failed to fetch cart", err);
    }
    setLoading(false);
  };

  const handleRemove = (item) => {
    Alert.alert("Remove item", `Remove ${item.v_prod_id} from the cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRemovingId(item.cart_id);
          try {
            const data = await apiFetch("/cart", {
              method: "DELETE",
              body: JSON.stringify({
                vendor_id: vendor.vendor_id,
                product_id: item.product_id,
              }),
            });
            if (data.success) {
              setItems((prev) =>
                prev.filter((i) => i.cart_id !== item.cart_id),
              );
            }
          } catch (err) {
            console.error("Failed to remove from cart", err);
          }
          setRemovingId(null);
        },
      },
    ]);
  };

  const goSelectMoreProducts = () => {
    router.push({ pathname: "/product/catalogue", params: { vendorJson } });
  };

  // "Create Order" hands the cart's full contents to the EXISTING Create
  // Purchase Order -> Product Details screens (same ones the direct
  // single-variant flow uses) instead of submitting anything itself.
  const handleCreateOrder = async () => {
    if (items.length === 0) return;
    setPreparingOrder(true);
    try {
      const data = await apiFetch(`/cart/details?vendorId=${vendor.vendor_id}`);
      if (!data.success || !data.data || data.data.length === 0) {
        Alert.alert(
          "Cart is empty",
          "Add at least one product before creating an order.",
        );
        setPreparingOrder(false);
        return;
      }

      // Group flat rows into the { product_id, variants: [{ variant_id, sizes }] }
      // shape the order screens expect.
      const productMap = {};
      data.data.forEach((row) => {
        if (!productMap[row.product_id]) {
          productMap[row.product_id] = {
            product_id: row.product_id,
            code: row.v_prod_id,
            name: row.product_name || row.v_prod_id,
            image: row.photo_url,
            price: row.price,
            variants: {},
          };
        }
        const p = productMap[row.product_id];
        if (!p.variants[row.variant_id]) {
          p.variants[row.variant_id] = {
            variant_id: row.variant_id,
            category_name: row.category_name,
            pattern_name: row.pattern_name,
            color_name: row.color_name,
            hex_code: row.hex_code,
            sizes: [],
          };
        }
        p.variants[row.variant_id].sizes.push({
          size_id: row.size_id,
          size_value: row.size_value,
        });
      });

      const productsArray = Object.values(productMap).map((p) => ({
        ...p,
        variants: Object.values(p.variants),
      }));

      router.push({
        pathname: "/order/create",
        params: {
          productsJson: JSON.stringify(productsArray),
          vendorJson,
          returnTo: "workspace",
        },
      });
    } catch (err) {
      console.error("Failed to prepare order from cart", err);
    }
    setPreparingOrder(false);
  };

  const filtered = items.filter((i) =>
    (i.v_prod_id || "").toLowerCase().includes(query.toLowerCase()),
  );

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
        <Text style={styles.title}>Cart List</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1c1210"
            strokeWidth={2.2}
          >
            <Circle cx="11" cy="11" r="7" />
            <Path d="M21 21l-4.3-4.3" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Search...."
            placeholderTextColor="#8a7c78"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Select More Products - clearly visible, above the list */}
      <TouchableOpacity
        onPress={goSelectMoreProducts}
        style={{ marginHorizontal: 20, marginBottom: 14 }}
      >
        <View style={styles.selectMoreBtn}>
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a3230"
            strokeWidth={2.4}
          >
            <Path d="M12 5v14M5 12h14" />
          </Svg>
          <Text style={styles.selectMoreText}>Select More Products</Text>
        </View>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#8a3230" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.cart_id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 14,
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {query
                ? `No products match "${query}"`
                : 'Cart is empty. Tap "Select More Products" to add something.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.imgWrap}>
                {item.photo_url && (
                  <Image
                    source={{ uri: resolveImageUrl(item.photo_url) }}
                    style={styles.img}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.v_prod_id}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {item.product_name || item.v_prod_id}
                </Text>
                <View style={styles.variantRow}>
                  <View style={styles.variantIconWrap}>
                    <Svg
                      width={13}
                      height={13}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth={2.2}
                    >
                      <Path d="M3 8l9-4 9 4-9 4-9-4Z" />
                      <Path d="M3 12l9 4 9-4" />
                    </Svg>
                  </View>
                  <Text style={styles.variantLabel}>Variants</Text>
                  <Text style={styles.variantCount}>
                    {item.variant_count ?? 0}
                  </Text>
                </View>
                {item.selected_sizes && item.selected_sizes.length > 0 && (
                  <View style={styles.sizesRow}>
                    <Text style={styles.sizesLabel}>Sizes:</Text>
                    <Text style={styles.sizesValue} numberOfLines={1}>
                      {item.selected_sizes.join(", ")}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(item)}
                disabled={removingId === item.cart_id}
                style={styles.removeBtn}
              >
                {removingId === item.cart_id ? (
                  <ActivityIndicator size="small" color="#b3261e" />
                ) : (
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b3261e"
                    strokeWidth={2.2}
                  >
                    <Path d="M3 6h18" />
                    <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </Svg>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={styles.totalBar}>
        <Text style={styles.totalText}>Total Products : {items.length}</Text>
      </View>

      <TouchableOpacity
        onPress={handleCreateOrder}
        disabled={items.length === 0 || preparingOrder}
        style={{
          marginHorizontal: 20,
          marginBottom: 12,
          opacity: items.length === 0 || preparingOrder ? 0.5 : 1,
        }}
      >
        <LinearGradient
          colors={["#3a1516", "#8a4844", "#c98f86"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.createOrderBtn}
        >
          <Text style={styles.createOrderText}>
            {preparingOrder ? "Preparing…" : "Create Order"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

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
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  searchWrap: {
    flex: 1,
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
  selectMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#8a3230",
    borderRadius: 14,
    backgroundColor: "#fbe3df",
    paddingVertical: 12,
  },
  selectMoreText: { color: "#8a3230", fontSize: 15, fontWeight: "800" },
  emptyText: {
    textAlign: "center",
    color: "#8a7c78",
    fontSize: 13.5,
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  card: {
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
  },
  imgWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#eee",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  code: { fontSize: 18, fontWeight: "800", color: "#1c1210" },
  name: { fontSize: 15, fontWeight: "700", color: "#1c1210", marginTop: 2 },
  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  variantIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#8a3230",
    alignItems: "center",
    justifyContent: "center",
  },
  variantLabel: { fontSize: 14, color: "#3a2b28" },
  variantCount: { fontSize: 14, fontWeight: "700", color: "#1c1210" },
  sizesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  sizesLabel: { fontSize: 12.5, color: "#8a3230", fontWeight: "700" },
  sizesValue: { flex: 1, fontSize: 12.5, color: "#3a2b28" },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#f3c9c4",
    backgroundColor: "#fdeceb",
    alignItems: "center",
    justifyContent: "center",
  },
  totalBar: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  totalText: { fontSize: 18, fontWeight: "800", color: "#1c1210" },
  createOrderBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  createOrderText: { color: "#fff", fontSize: 18, fontWeight: "800" },
});
