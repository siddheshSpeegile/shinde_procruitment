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

  useEffect(() => {
    apiFetch("/categories")
      .then((data) => {
        if (data.success)
          setCategoryOptions(
            (data.data || []).map((c) => c.category_name).filter(Boolean),
          );
      })
      .catch((err) => console.error("Failed to fetch categories", err));

    apiFetch("/colors")
      .then((data) => {
        if (data.success)
          setColorOptions(
            (data.data || []).map((c) => c.color_name).filter(Boolean),
          );
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
      const data = await apiFetch("/variants/quick", {
        method: "POST",
        body: JSON.stringify({
          product_id: product?.product_id,
          category: category.trim(),
          color: color.trim(),
          remarks: remarks.trim(),
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
          hex_code: null,
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
