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
import Svg, { Circle, Path } from "react-native-svg";
import { apiFetch, resolveImageUrl } from "../../api/config";
import AutocompleteInput from "../../components/AutocompleteInput";
import NavBar from "../../components/NavBar";

// Offered when a colour name can't be matched to a swatch automatically.
const PALETTE = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Grey", hex: "#808080" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Red", hex: "#D32F2F" },
  { name: "Maroon", hex: "#800000" },
  { name: "Pink", hex: "#F48FB1" },
  { name: "Orange", hex: "#F57C00" },
  { name: "Yellow", hex: "#FFD600" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Green", hex: "#2E7D32" },
  { name: "Olive", hex: "#808000" },
  { name: "Blue", hex: "#1E4FC2" },
  { name: "Navy", hex: "#000080" },
  { name: "Sky Blue", hex: "#87CEEB" },
  { name: "Purple", hex: "#7B1FA2" },
  { name: "Brown", hex: "#6D4C41" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Beige", hex: "#E8D9B5" },
  { name: "Cream", hex: "#FFFDD0" },
];

export default function AddVariantScreen() {
  const router = useRouter();
  const { productJson, vendorJson } = useLocalSearchParams();
  const product = productJson ? JSON.parse(productJson) : null;
  const vendor = vendorJson ? JSON.parse(vendorJson) : null;

  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  // Swatch colour for whatever is typed in Color: { name, hex, source } from
  // GET /colors/hex. hex is null when the name couldn't be recognised (e.g.
  // "ASST", "MULTI") - the user then has to pick one (pickedHex) to save.
  const [colorInfo, setColorInfo] = useState(null);
  const [pickedHex, setPickedHex] = useState(null);

  const lookupColorHex = async (name) => {
    const data = await apiFetch(`/colors/hex?name=${encodeURIComponent(name)}`);
    const info = {
      name,
      hex: data.success ? data.data.hex_code : null,
      source: data.success ? data.data.source : null,
    };
    setColorInfo(info);
    return info;
  };

  // Debounced so it runs once the user pauses typing, not on every key.
  useEffect(() => {
    const name = color.trim();
    const timer = setTimeout(() => {
      setPickedHex(null);
      if (!name) {
        setColorInfo(null);
        return;
      }
      lookupColorHex(name).catch((err) =>
        console.error("Failed to look up colour", err),
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [color]);

  const needsColorPick =
    !!colorInfo && colorInfo.name === color.trim() && !colorInfo.hex;

  useEffect(() => {
    // Suggestions come from the shinde_shoes master tables (DimCategory /
    // DimColour) - the endpoint returns a plain list of names.
    apiFetch("/suggestions/category")
      .then((data) => {
        if (data.success) setCategoryOptions(data.data || []);
      })
      .catch((err) => console.error("Failed to fetch categories", err));

    apiFetch("/suggestions/colour")
      .then((data) => {
        if (data.success) setColorOptions(data.data || []);
      })
      .catch((err) => console.error("Failed to fetch colors", err));
  }, []);

  const validate = () => {
    if (!category.trim() || !color.trim()) {
      setError("Category and Color are required.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // The debounced lookup may not have finished if Save was tapped
      // straight after typing - make sure we know the colour first.
      const name = color.trim();
      const info =
        colorInfo && colorInfo.name === name
          ? colorInfo
          : await lookupColorHex(name);
      if (!info.hex && !pickedHex) {
        setError(`Please pick the colour for "${name}" below.`);
        setSaving(false);
        return;
      }

      const data = await apiFetch("/variants/quick", {
        method: "POST",
        body: JSON.stringify({
          product_id: product?.product_id,
          category: category.trim(),
          color: name,
          remarks: remarks.trim(),
          // Only sent when the name couldn't be matched automatically
          ...(info.hex ? {} : { hex_code: pickedHex }),
        }),
      });
      if (data.success) {
        // Build a display-ready variant object right away using what the
        // user just typed, since the API only returns { variant_id }.
        const newVariant = {
          variant_id: data.data.variant_id,
          product_id: product?.product_id,
          category_name: category.trim(),
          color_name: color.trim(),
          pattern_name: "Standard",
          hex_code: data.data.hex_code || pickedHex || null,
          status: "active",
          code: product?.v_prod_id,
          name: product?.product_name || product?.v_prod_id,
          image: product?.photo_url,
        };
        router.replace({
          pathname: "/product/sizes",
          params: {
            variantJson: JSON.stringify(newVariant),
            productJson,
            vendorJson,
            mode: "declare",
          },
        });
      } else {
        setError(data.message || "Failed to save variant");
      }
    } catch (err) {
      console.error("Failed to save variant", err);
      setError("Failed to save variant");
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
        <View>
          <Text style={styles.title}>Add Variant</Text>
          <Text style={styles.subtitle}>{product?.v_prod_id}</Text>
        </View>
      </View>

      <ScrollView
        // Required for the Category/Color suggestion lists to be tappable
        // while the keyboard is open (see AutocompleteInput).
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          gap: 18,
        }}
      >
        <LinearGradient
          colors={["#3a1516", "#7a3530", "#8f4941"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerImgWrap}>
            {product?.photo_url && (
              <Image
                source={{ uri: resolveImageUrl(product.photo_url) }}
                style={styles.bannerImg}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.codeChip}>
              <Text style={styles.codeChipText}>{product?.v_prod_id}</Text>
            </View>
            <Text style={styles.bannerName} numberOfLines={1}>
              {product?.product_name || product?.v_prod_id}
            </Text>
          </View>
        </LinearGradient>

        <FormField
          label="Category"
          required
          value={category}
          onChange={setCategory}
          placeholder="Enter Category...."
          suggestions={categoryOptions}
          icon={
            <>
              <Path d="M3 3h8v8H3z" />
              <Path d="M13 3h8v8h-8z" />
              <Path d="M3 13h8v8H3z" />
              <Path d="M13 13h8v8h-8z" />
            </>
          }
        />
        <FormField
          label="Color"
          required
          value={color}
          onChange={setColor}
          placeholder="Enter Color...."
          suggestions={colorOptions}
          icon={<Circle cx="12" cy="12" r="9" />}
        />
        {colorInfo?.hex && colorInfo.name === color.trim() ? (
          <View style={styles.colorPreviewRow}>
            <View style={[styles.swatch, { backgroundColor: colorInfo.hex }]} />
            <Text style={styles.colorHint}>Swatch colour for this variant</Text>
          </View>
        ) : null}
        {needsColorPick ? (
          <View style={styles.pickBox}>
            <Text style={styles.colorHint}>
              {`We couldn't recognise "${color.trim()}". Pick the colour closest to it - it's saved for this colour name from now on.`}
            </Text>
            <View style={styles.paletteRow}>
              {PALETTE.map((p) => (
                <TouchableOpacity
                  key={p.hex}
                  onPress={() => {
                    setPickedHex(p.hex);
                    setError("");
                  }}
                  style={[
                    styles.paletteItem,
                    pickedHex === p.hex && styles.paletteItemActive,
                  ]}
                  accessibilityLabel={p.name}
                >
                  <View style={[styles.swatch, { backgroundColor: p.hex }]} />
                </TouchableOpacity>
              ))}
            </View>
            {pickedHex ? (
              <Text style={styles.colorHint}>
                Selected: {PALETTE.find((p) => p.hex === pickedHex)?.name}
              </Text>
            ) : null}
          </View>
        ) : null}
        <FormField
          label="Remarks"
          value={remarks}
          onChange={setRemarks}
          placeholder="Enter Remarks...."
          icon={
            <>
              <Path d="M4 19v-3.5L15 4.5a1.5 1.5 0 0 1 2 0l1.5 1.5a1.5 1.5 0 0 1 0 2L8 19H4Z" />
            </>
          }
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          <LinearGradient
            colors={["#3a1516", "#8a4844", "#c98f86"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveText}>
              {saving ? "Saving…" : "Save Variant"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

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
  subtitle: { fontSize: 13, color: "#3a2b28" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    padding: 16,
  },
  bannerImgWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f2eeea",
    overflow: "hidden",
  },
  bannerImg: { width: "100%", height: "100%" },
  codeChip: {
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  codeChipText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  bannerName: { fontSize: 16, fontWeight: "800", color: "#fff" },
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
  error: { color: "#b3261e", fontSize: 13 },
  colorPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -6,
  },
  colorHint: { fontSize: 12.5, color: "#8a7c78" },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#d8cfcb",
  },
  pickBox: {
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    backgroundColor: "#fff",
    marginTop: -6,
  },
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paletteItem: {
    padding: 3,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "transparent",
  },
  paletteItemActive: { borderColor: "#8a3230" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
