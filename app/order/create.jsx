// import DateTimePicker from "@react-native-community/datetimepicker";
// import { LinearGradient } from "expo-linear-gradient";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { useState } from "react";
// import {
//   Image,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import Svg, { Path, Rect } from "react-native-svg";
// import NavBar from "../../components/NavBar";

// export default function CreatePurchaseOrderScreen() {
//   const router = useRouter();
//   const { variantJson, vendorJson, sizesJson } = useLocalSearchParams();
//   const variant = variantJson ? JSON.parse(variantJson) : null;
//   const vendor = vendorJson ? JSON.parse(vendorJson) : null;
//   const selectedSizes = sizesJson ? JSON.parse(sizesJson) : [];

//   const [poDate, setPoDate] = useState(new Date());
//   const [showPicker, setShowPicker] = useState(false);
//   const [remarks, setRemarks] = useState("");
//   const [error, setError] = useState("");

//   const brand = variant?.name || variant?.code || "";
//   const products = selectedSizes.map((s, i) => ({
//     id: `${variant?.variant_id || "v"}-${s.size_id}-${i}`,
//     code: variant?.code,
//     name: variant?.name,
//     image: variant?.image,
//     size: s.size_value,
//   }));

//   const formattedDate = poDate.toISOString().slice(0, 10);

//   const handleOrderProduct = () => {
//     setError("");
//     router.push({
//       pathname: "/order/details",
//       params: {
//         variantJson,
//         vendorJson,
//         sizesJson,
//         poDate: formattedDate,
//         remarks,
//       },
//     });
//   };

//   return (
//     <SafeAreaView style={styles.screen} edges={["top"]}>
//       <View style={styles.headerWrap}>
//         <View style={styles.headerRow}>
//           <TouchableOpacity onPress={() => router.back()}>
//             <LinearGradient
//               colors={["#7a2f2b", "#c98f86"]}
//               style={styles.backBtn}
//             >
//               <Svg
//                 width={18}
//                 height={18}
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="#fff"
//                 strokeWidth={2.6}
//               >
//                 <Path d="M15 18l-6-6 6-6" />
//               </Svg>
//             </LinearGradient>
//           </TouchableOpacity>
//           <Text style={styles.title}>Create Purchase Order</Text>
//         </View>
//         <Text style={[styles.subtitle, { marginLeft: 50 }]}>{brand}</Text>
//       </View>

//       <ScrollView
//         contentContainerStyle={{
//           paddingHorizontal: 20,
//           paddingBottom: 20,
//           gap: 18,
//         }}
//       >
//         <FieldLabel
//           icon={
//             <>
//               <Rect x="3" y="4" width="18" height="17" rx="2" />
//               <Path d="M3 9h18M8 3v3M16 3v3" />
//             </>
//           }
//           label="PO Date"
//           required
//         />
//         <TouchableOpacity
//           onPress={() => setShowPicker(true)}
//           style={styles.dateInputRow}
//         >
//           <Text style={{ fontSize: 15, color: "#241210" }}>
//             {formattedDate}
//           </Text>
//           <Svg
//             width={18}
//             height={18}
//             viewBox="0 0 24 24"
//             fill="none"
//             stroke="#8a3230"
//             strokeWidth={2.2}
//           >
//             <Rect x="3" y="4" width="18" height="17" rx="2" />
//             <Path d="M3 9h18M8 3v3M16 3v3" />
//           </Svg>
//         </TouchableOpacity>
//         {showPicker && (
//           <DateTimePicker
//             value={poDate}
//             mode="date"
//             minimumDate={new Date()}
//             display={Platform.OS === "ios" ? "inline" : "default"}
//             onChange={(event, selectedDate) => {
//               setShowPicker(Platform.OS === "ios");
//               if (selectedDate) setPoDate(selectedDate);
//             }}
//           />
//         )}

//         <FieldLabel
//           icon={
//             <>
//               <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
//             </>
//           }
//           label="Remarks"
//         />
//         <TextInput
//           style={styles.textInput}
//           placeholder="Enter Remarks...."
//           placeholderTextColor="#8a7c78"
//           value={remarks}
//           onChangeText={setRemarks}
//         />

//         <View style={styles.productsHeaderRow}>
//           <FieldLabel
//             icon={
//               <>
//                 <Path d="M21 8 12 3 3 8l9 5 9-5Z" />
//                 <Path d="M3 8v8l9 5 9-5V8" />
//                 <Path d="M12 13v8" />
//               </>
//             }
//             label={`Products (${products.length})`}
//             inline
//           />
//         </View>

//         {products.map((p) => (
//           <LinearGradient
//             key={p.id}
//             colors={["#3a1516", "#7a3530", "#8f4941"]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={styles.productCard}
//           >
//             <View style={styles.productImgWrap}>
//               {p.image && (
//                 <Image source={{ uri: p.image }} style={styles.productImg} />
//               )}
//             </View>
//             <View style={{ gap: 8, flex: 1 }}>
//               <View style={styles.codeChip}>
//                 <Text style={styles.codeChipText}>{p.code}</Text>
//               </View>
//               <Text style={styles.productName}>{p.name}</Text>
//               <View style={styles.sizeChip}>
//                 <Svg
//                   width={13}
//                   height={13}
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="#fff"
//                   strokeWidth={2}
//                 >
//                   <Path d="M3 7l9-4 9 4-9 4-9-4Z" />
//                   <Path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
//                 </Svg>
//                 <Text style={styles.sizeChipText}>Size - {p.size}</Text>
//               </View>
//             </View>
//           </LinearGradient>
//         ))}

//         {error ? <Text style={styles.error}>{error}</Text> : null}

//         <TouchableOpacity onPress={handleOrderProduct}>
//           <LinearGradient
//             colors={["#3a1516", "#8a4844", "#c98f86"]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 0 }}
//             style={styles.submitBtn}
//           >
//             <Text style={styles.submitText}>Order Product</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       </ScrollView>

//       <NavBar active="vendor" vendor={vendor} />
//     </SafeAreaView>
//   );
// }

// function FieldLabel({ icon, label, required, inline }) {
//   return (
//     <View style={[styles.fieldLabelRow, inline && { marginBottom: 0 }]}>
//       <LinearGradient
//         colors={["#7a2f2b", "#c98f86"]}
//         style={styles.fieldIconWrap}
//       >
//         <Svg
//           width={16}
//           height={16}
//           viewBox="0 0 24 24"
//           fill="none"
//           stroke="#fff"
//           strokeWidth={2.2}
//         >
//           {icon}
//         </Svg>
//       </LinearGradient>
//       <Text style={styles.fieldLabelText}>
//         {label} {required && <Text style={{ color: "#d0342c" }}>*</Text>}
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: "#f5f3f0" },
//   headerWrap: {
//     gap: 4,
//     paddingHorizontal: 20,
//     paddingTop: 18,
//     paddingBottom: 10,
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//     width: "100%",
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
//   subtitle: { fontSize: 14, color: "#3a2b28" },
//   fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
//   fieldIconWrap: {
//     width: 34,
//     height: 34,
//     borderRadius: 9,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   fieldLabelText: { fontSize: 16, fontWeight: "800", color: "#1c1210" },
//   dateInputRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderRadius: 10,
//     padding: 14,
//     backgroundColor: "#fff",
//   },
//   textInput: {
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderRadius: 10,
//     padding: 14,
//     fontSize: 15,
//     color: "#241210",
//     backgroundColor: "#fff",
//   },
//   productsHeaderRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   productCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 16,
//     borderRadius: 16,
//     padding: 16,
//   },
//   productImgWrap: {
//     width: 80,
//     height: 80,
//     borderRadius: 14,
//     backgroundColor: "#f2eeea",
//     overflow: "hidden",
//   },
//   productImg: { width: "100%", height: "100%" },
//   codeChip: {
//     borderWidth: 1.5,
//     borderColor: "#fff",
//     borderRadius: 20,
//     paddingVertical: 4,
//     paddingHorizontal: 14,
//     alignSelf: "flex-start",
//   },
//   codeChipText: { color: "#fff", fontSize: 12, fontWeight: "800" },
//   productName: { fontSize: 19, fontWeight: "800", color: "#fff" },
//   sizeChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     borderWidth: 1.5,
//     borderColor: "#fff",
//     borderRadius: 8,
//     paddingVertical: 3,
//     paddingHorizontal: 9,
//     alignSelf: "flex-start",
//   },
//   sizeChipText: { color: "#fff", fontSize: 13, fontWeight: "700" },
//   error: { color: "#b3261e", fontSize: 13 },
//   submitBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
//   submitText: { color: "#fff", fontSize: 17, fontWeight: "800" },
// });

import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { apiFetch } from "../../api/config";
import AutocompleteInput from "../../components/AutocompleteInput";
import NavBar from "../../components/NavBar";

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

// This screen now accepts EITHER shape, so the same screen serves both the
// single-variant flow (Variant Catalog -> Assign Sizes) and the cart flow
// (Cart List -> Create Order) without duplicating it:
//
//   Legacy single-item:  variantJson + sizesJson
//   Cart (multi-item):   productsJson  (array of { product_id, code, name,
//                         image, price, variants: [{ variant_id, category_name,
//                         pattern_name, color_name, hex_code, sizes: [...] }] })
export default function CreatePurchaseOrderScreen() {
  const router = useRouter();
  const {
    variantJson,
    vendorJson,
    sizesJson,
    productsJson,
    returnTo = "dashboard",
  } = useLocalSearchParams();
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;

  // Normalize both input shapes into one flat list of display rows.
  let displayRows = [];
  let products = [];

  if (productsJson) {
    products = JSON.parse(productsJson);
    products.forEach((p) => {
      p.variants.forEach((v) => {
        v.sizes.forEach((s) => {
          displayRows.push({
            id: `${p.product_id}-${v.variant_id}-${s.size_id}`,
            code: p.code || p.v_prod_id,
            name: p.name || p.product_name,
            image: p.image || p.photo_url,
            size: s.size_value,
          });
        });
      });
    });
  } else {
    const variant = variantJson ? JSON.parse(variantJson) : null;
    const selectedSizes = sizesJson ? JSON.parse(sizesJson) : [];
    products = [
      {
        product_id: variant?.product_id,
        code: variant?.code,
        name: variant?.name,
        image: variant?.image,
        price: variant?.price,
        variants: [
          {
            variant_id: variant?.variant_id,
            category_name: variant?.category_name,
            pattern_name: variant?.pattern_name,
            color_name: variant?.color_name,
            hex_code: variant?.hex_code,
            sizes: selectedSizes,
          },
        ],
      },
    ];
    displayRows = selectedSizes.map((s, i) => ({
      id: `${variant?.variant_id || "v"}-${s.size_id}-${i}`,
      code: variant?.code,
      name: variant?.name,
      image: variant?.image,
      size: s.size_value,
    }));
  }

  const distinctProductCount = products.length;
  const brand =
    distinctProductCount === 1
      ? products[0].name || products[0].code
      : `${distinctProductCount} Products`;

  const [poDate, setPoDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7); // sensible default: a week out
      return d;
    })(),
  );
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [remarkOptions, setRemarkOptions] = useState([]);

  useEffect(() => {
    apiFetch("/suggestions/order_remarks")
      .then((data) => {
        if (data.success) setRemarkOptions(data.data || []);
      })
      .catch((err) => console.error("Failed to fetch remark suggestions", err));
  }, []);

  const formattedDate = toLocalDateString(poDate);
  const formattedDeliveryDate = toLocalDateString(expectedDeliveryDate);

  const handleOrderProduct = () => {
    setError("");
    if (expectedDeliveryDate < poDate) {
      setError("Expected Delivery Date cannot be before the PO Date.");
      return;
    }
    router.push({
      pathname: "/order/details",
      params: {
        productsJson: JSON.stringify(products),
        vendorJson,
        poDate: formattedDate,
        expectedDeliveryDate: formattedDeliveryDate,
        remarks,
        returnTo,
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
          <Text style={styles.title}>Create Purchase Order</Text>
        </View>
        <Text style={[styles.subtitle, { marginLeft: 50 }]}>{brand}</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 20,
          gap: 18,
        }}
      >
        <FieldLabel
          icon={
            <>
              <Rect x="3" y="4" width="18" height="17" rx="2" />
              <Path d="M3 9h18M8 3v3M16 3v3" />
            </>
          }
          label="PO Date"
          required
        />
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={styles.dateInputRow}
        >
          <Text style={{ fontSize: 15, color: "#241210" }}>
            {formattedDate}
          </Text>
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a3230"
            strokeWidth={2.2}
          >
            <Rect x="3" y="4" width="18" height="17" rx="2" />
            <Path d="M3 9h18M8 3v3M16 3v3" />
          </Svg>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={poDate}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(event, selectedDate) => {
              setShowPicker(Platform.OS === "ios");
              if (selectedDate) setPoDate(selectedDate);
            }}
          />
        )}

        <FieldLabel
          icon={
            <>
              <Rect x="3" y="4" width="18" height="17" rx="2" />
              <Path d="M3 9h18M8 3v3M16 3v3" />
              <Path d="M8 14l2.5 2.5L16 11" />
            </>
          }
          label="Expected Delivery Date"
          required
        />
        <TouchableOpacity
          onPress={() => setShowDeliveryPicker(true)}
          style={styles.dateInputRow}
        >
          <Text style={{ fontSize: 15, color: "#241210" }}>
            {formattedDeliveryDate}
          </Text>
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a3230"
            strokeWidth={2.2}
          >
            <Rect x="3" y="4" width="18" height="17" rx="2" />
            <Path d="M3 9h18M8 3v3M16 3v3" />
          </Svg>
        </TouchableOpacity>
        {showDeliveryPicker && (
          <DateTimePicker
            value={expectedDeliveryDate}
            mode="date"
            minimumDate={poDate}
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(event, selectedDate) => {
              setShowDeliveryPicker(Platform.OS === "ios");
              if (selectedDate) setExpectedDeliveryDate(selectedDate);
            }}
          />
        )}

        <FieldLabel
          icon={
            <>
              <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </>
          }
          label="Remarks"
        />
        <AutocompleteInput
          value={remarks}
          onChange={setRemarks}
          placeholder="Enter Remarks...."
          suggestions={remarkOptions}
        />

        <View style={styles.productsHeaderRow}>
          <FieldLabel
            icon={
              <>
                <Path d="M21 8 12 3 3 8l9 5 9-5Z" />
                <Path d="M3 8v8l9 5 9-5V8" />
                <Path d="M12 13v8" />
              </>
            }
            label={`Products (${displayRows.length})`}
            inline
          />
        </View>

        {displayRows.map((p) => (
          <LinearGradient
            key={p.id}
            colors={["#3a1516", "#7a3530", "#8f4941"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.productCard}
          >
            <View style={styles.productImgWrap}>
              {p.image && (
                <Image source={{ uri: p.image }} style={styles.productImg} />
              )}
            </View>
            <View style={{ gap: 8, flex: 1 }}>
              <View style={styles.codeChip}>
                <Text style={styles.codeChipText}>{p.code}</Text>
              </View>
              <Text style={styles.productName} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={styles.sizeChip}>
                <Svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Path d="M3 7l9-4 9 4-9 4-9-4Z" />
                  <Path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
                </Svg>
                <Text style={styles.sizeChipText}>Size - {p.size}</Text>
              </View>
            </View>
          </LinearGradient>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={handleOrderProduct}>
          <LinearGradient
            colors={["#3a1516", "#8a4844", "#c98f86"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtn}
          >
            <Text style={styles.submitText}>Order Product</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <NavBar active="vendor" vendor={vendor} />
    </SafeAreaView>
  );
}

function FieldLabel({ icon, label, required, inline }) {
  return (
    <View style={[styles.fieldLabelRow, inline && { marginBottom: 0 }]}>
      <LinearGradient
        colors={["#7a2f2b", "#c98f86"]}
        style={styles.fieldIconWrap}
      >
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2.2}
        >
          {icon}
        </Svg>
      </LinearGradient>
      <Text style={styles.fieldLabelText}>
        {label} {required && <Text style={{ color: "#d0342c" }}>*</Text>}
      </Text>
    </View>
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
    fontSize: 19,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  subtitle: { fontSize: 14, color: "#3a2b28" },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabelText: { fontSize: 16, fontWeight: "800", color: "#1c1210" },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fff",
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#241210",
    backgroundColor: "#fff",
  },
  productsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    padding: 16,
  },
  productImgWrap: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#f2eeea",
    overflow: "hidden",
  },
  productImg: { width: "100%", height: "100%" },
  codeChip: {
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  codeChipText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  productName: { fontSize: 19, fontWeight: "800", color: "#fff" },
  sizeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
    alignSelf: "flex-start",
  },
  sizeChipText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  error: { color: "#b3261e", fontSize: 13 },
  submitBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
