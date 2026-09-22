import Constants from "expo-constants";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { API_BASE_URL, apiFetch } from "../../api/config";
import AutocompleteInput from "../../components/AutocompleteInput";
import NavBar from "../../components/NavBar";
import PhotoPickerModal from "../../components/PhotoPickerModal";

export default function AddProductScreen() {
  const router = useRouter();
  const { vendorJson } = useLocalSearchParams();
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;

  const [vendorProductId, setVendorProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [customerProductId, setCustomerProductId] = useState("");
  const [price, setPrice] = useState("");
  const [remark, setRemark] = useState("");
  const [photos, setPhotos] = useState([]); // up to 4: {uri, mimeType, fileName}
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const MAX_PHOTOS = 4;

  const [customerIdOptions, setCustomerIdOptions] = useState([]);
  const [remarkOptions, setRemarkOptions] = useState([]);

  useEffect(() => {
    apiFetch("/suggestions/customer_product_id")
      .then((data) => {
        if (data.success) setCustomerIdOptions(data.data || []);
      })
      .catch((err) =>
        console.error("Failed to fetch customer ID suggestions", err),
      );

    apiFetch("/suggestions/product_remarks")
      .then((data) => {
        if (data.success) setRemarkOptions(data.data || []);
      })
      .catch((err) => console.error("Failed to fetch remark suggestions", err));
  }, []);

  const validate = () => {
    if (!vendorProductId.trim() || !productName.trim() || photos.length === 0) {
      setError(
        "Vendor Product ID, Product Name and at least 1 Product Photo are required.",
      );
      return false;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) < 0) {
      setError("Please enter a valid Product Price.");
      return false;
    }
    setError("");
    return true;
  };

  const addPhoto = (asset) => {
    setPhotos((prev) => {
      if (prev.length >= MAX_PHOTOS) return prev; // picker is hidden at 4 anyway
      return [
        ...prev,
        {
          uri: asset.uri,
          mimeType: asset.mimeType || "image/jpeg",
          fileName: asset.fileName || "photo.jpg",
        },
      ];
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const openCamera = async () => {
    setPickerVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera permission is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const asset = result.assets[0];
      addPhoto(asset);
      setError("");

      // Also save the captured photo to the device's gallery, same as a
      // normal camera app would. Skipped entirely inside Expo Go - not
      // just because of Expo Go's Android permission limitations, but
      // because SDK 57's expo-media-library relies on a native module
      // ('ExpoMediaLibraryNext') that Expo Go itself doesn't currently
      // ship at all, which throws immediately if the module is even
      // loaded. A dynamic import() here (instead of a static import at
      // the top of the file) means this module is never touched at all
      // while running in Expo Go, since this whole branch never executes
      // there - a static import would get evaluated on every app start
      // regardless of this check, crashing before the app even loads.
      // This only runs in a real standalone/dev build, where it works
      // normally. Non-blocking either way - if permission is denied, the
      // photo is still usable in the form, it just won't be saved.
      if (Constants.appOwnership !== "expo") {
        try {
          const MediaLibrary = await import("expo-media-library");
          const mediaPerm = await MediaLibrary.requestPermissionsAsync();
          if (mediaPerm.granted) {
            await MediaLibrary.saveToLibraryAsync(asset.uri);
          }
        } catch (err) {
          console.warn("Could not save photo to gallery:", err);
        }
      }
    }
  };

  const openGallery = async () => {
    setPickerVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library permission is required to pick a photo.");
      return;
    }
    const remainingSlots = MAX_PHOTOS - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
    });
    if (!result.canceled) {
      // Respect the remaining slots even if the device's picker UI
      // doesn't enforce selectionLimit itself (some Android pickers don't).
      result.assets.slice(0, remainingSlots).forEach(addPhoto);
      setError("");
    }
  };

  const uploadPhoto = async (photo) => {
    // SDK 57 replaced the global fetch with Expo's own WinterCG-compliant
    // expo/fetch, whose FormData encoder only accepts strings, real Blob
    // objects, or objects exposing bytes() - it throws "Unsupported
    // FormDataPart implementation" on the classic RN { uri, type, name }
    // literal every older tutorial (and our own earlier code) used.
    // expo-file-system's File wraps the picked photo's existing local URI
    // and implements that Blob-like interface, which the new fetch does
    // understand - this is Expo's own documented fix for SDK 57.
    const file = new File(photo.uri);
    const formData = new FormData();
    formData.append("photo", file);
    // IMPORTANT: do not set a Content-Type header manually here - fetch
    // needs to generate it itself (including the required "boundary"
    // parameter) for FormData uploads to parse correctly on the backend.
    const res = await fetch(`${API_BASE_URL}/products/upload-photo`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Photo upload failed");
    return data.data.photo_url;
  };

  // Uploads every picked photo (1-4) and returns their URLs in the same
  // order they were picked in - the first one becomes the product's
  // cover photo, same as before, everywhere else in the app still shows
  // just that one.
  const resolvePhotoUrls = async () => {
    const urls = [];
    for (const photo of photos) {
      urls.push(await uploadPhoto(photo));
    }
    return urls;
  };

  const createProduct = async (photo_urls) => {
    const data = await apiFetch("/products", {
      method: "POST",
      body: JSON.stringify({
        vendor_id: vendor?.vendor_id,
        v_prod_id: vendorProductId.trim(),
        product_name: productName.trim(),
        customer_product_id: customerProductId.trim(),
        photo_url: photo_urls[0],
        photo_urls,
        price: Number(price),
        remarks: remark.trim(),
        status: "active",
      }),
    });
    if (!data.success)
      throw new Error(data.message || "Failed to save product");
    return data.data.product_id;
  };

  const handleSaveAndAddVariant = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const photo_urls = await resolvePhotoUrls();
      const product_id = await createProduct(photo_urls);

      const product = {
        product_id,
        v_prod_id: vendorProductId.trim(),
        product_name: productName.trim(),
        photo_url: photo_urls[0], // cover photo - same as everywhere else in the app
      };
      // returnTo=workspace tells the downstream Add Variant -> Assign Sizes
      // chain to land back on the Vendor Workspace once sizes are saved.
      router.push({
        pathname: "/product/add-variant",
        params: {
          productJson: JSON.stringify(product),
          vendorJson,
          returnTo: "workspace",
        },
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
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
        <Text style={styles.title}>Add Product</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          gap: 18,
        }}
      >
        <FormField
          label="Vendor Product ID"
          required
          value={vendorProductId}
          onChange={setVendorProductId}
          placeholder="Enter Vendor Product ID...."
          icon={
            <>
              <Rect x="3" y="4" width="18" height="16" rx="3" />
              <Path d="M7 9h4M7 13h6" />
            </>
          }
        />
        <FormField
          label="Product Name"
          required
          value={productName}
          onChange={setProductName}
          placeholder="Enter Product Name...."
          icon={
            <>
              <Path d="M20.6 12 12 20.6a2 2 0 0 1-2.8 0L3.4 14.8a2 2 0 0 1 0-2.8L12 3.4l8.6 8.6Z" />
              <Circle cx="14" cy="9" r="1.4" fill="#fff" stroke="none" />
            </>
          }
        />
        <FormField
          label="Customer Product ID"
          value={customerProductId}
          onChange={setCustomerProductId}
          placeholder="Enter Customer Product ID...."
          suggestions={customerIdOptions}
          icon={
            <>
              <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <Circle cx="12" cy="7" r="4" />
            </>
          }
        />
        <FormField
          label="Product Price"
          required
          keyboardType="numeric"
          value={price}
          onChange={setPrice}
          placeholder="Enter Product Price...."
          icon={
            <>
              <Rect x="3" y="6" width="18" height="13" rx="2" />
              <Path d="M16 12h2" />
            </>
          }
        />

        <View style={{ gap: 10 }}>
          <View style={styles.fieldLabelRow}>
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
                <Path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                <Circle cx="12" cy="13" r="3.5" />
              </Svg>
            </LinearGradient>
            <Text style={styles.fieldLabelText}>
              Product Photos <Text style={{ color: "#d0342c" }}>*</Text>
            </Text>
          </View>
          <Text style={styles.photoHint}>
            Add {photos.length}/{MAX_PHOTOS} — at least 1 required
          </Text>
          <View style={styles.photoRow}>
            {photos.map((p, index) => (
              <View key={p.uri} style={styles.photoThumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  onPress={() => removePhoto(index)}
                  style={styles.photoRemoveBtn}
                >
                  <Svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={3}
                  >
                    <Path d="M6 6l12 12M18 6L6 18" />
                  </Svg>
                </TouchableOpacity>
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity onPress={() => setPickerVisible(true)}>
                <LinearGradient
                  colors={["#5c2422", "#8f4941", "#c98f86"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.photoAddTile}
                >
                  <Svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    <Path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                    <Circle cx="12" cy="13" r="3.5" />
                  </Svg>
                  <Text style={styles.photoAddText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FormField
          label="Remark"
          value={remark}
          onChange={setRemark}
          placeholder="Enter Remark...."
          suggestions={remarkOptions}
          icon={
            <Path d="M4 19v-3.5L15 4.5a1.5 1.5 0 0 1 2 0l1.5 1.5a1.5 1.5 0 0 1 0 2L8 19H4Z" />
          }
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleSaveAndAddVariant}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          <LinearGradient
            colors={["#7a3530", "#c98f86"]}
            style={styles.actionBtn}
          >
            <Text style={styles.actionBtnText}>
              {saving ? "Saving…" : "Save & Add Variant"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <PhotoPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onPickCamera={openCamera}
        onPickGallery={openGallery}
      />

      <NavBar active="vendor" vendor={vendor} />
    </SafeAreaView>
  );
}

function FormField({
  label,
  required,
  value,
  onChange,
  placeholder,
  icon,
  keyboardType,
  suggestions,
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.fieldLabelRow}>
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
      {suggestions ? (
        <AutocompleteInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          suggestions={suggestions}
        />
      ) : (
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#8a7c78"
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
        />
      )}
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
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabelText: { fontSize: 16, fontWeight: "800", color: "#1c1210" },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#241210",
    backgroundColor: "#fff",
  },
  photoHint: { fontSize: 12, color: "#8a7c78" },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoThumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  photoThumb: { width: "100%", height: "100%" },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(122,47,43,0.85)",
    paddingVertical: 3,
    alignItems: "center",
  },
  coverBadgeText: { color: "#fff", fontSize: 9.5, fontWeight: "700" },
  photoAddTile: {
    width: 84,
    height: 84,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoAddText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  error: { color: "#b3261e", fontSize: 13 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
