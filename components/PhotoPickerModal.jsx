import { LinearGradient } from "expo-linear-gradient";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export default function PhotoPickerModal({
  visible,
  onClose,
  onPickCamera,
  onPickGallery,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add Product Photo</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to add a photo
          </Text>

          <View style={styles.optionsRow}>
            <TouchableOpacity onPress={onPickCamera} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#5c2422", "#8f4941"]}
                style={styles.optionCard}
              >
                <View style={styles.iconWrap}>
                  <Svg
                    width={30}
                    height={30}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    <Path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                    <Circle cx="12" cy="13" r="3.5" />
                  </Svg>
                </View>
                <Text style={styles.optionLabel}>Camera</Text>
                <Text style={styles.optionSub}>Take a new photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onPickGallery} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#7a3530", "#c98f86"]}
                style={styles.optionCard}
              >
                <View style={styles.iconWrap}>
                  <Svg
                    width={30}
                    height={30}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    <Path d="M4 5h16v14H4z" />
                    <Circle cx="9" cy="10" r="1.5" />
                    <Path d="M4 16l5-5 3 3 4-4 4 4" />
                  </Svg>
                </View>
                <Text style={styles.optionLabel}>Gallery</Text>
                <Text style={styles.optionSub}>Pick from photos</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,10,8,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#f5f3f0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ddd0cc",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1c1210",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#8a7c78",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  optionsRow: { flexDirection: "row", gap: 14 },
  optionCard: { borderRadius: 18, padding: 20, alignItems: "center", gap: 6 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  optionLabel: { color: "#fff", fontSize: 16, fontWeight: "800" },
  optionSub: { color: "rgba(255,255,255,0.85)", fontSize: 11.5 },
  cancelBtn: { marginTop: 18, paddingVertical: 12, alignItems: "center" },
  cancelText: { color: "#8a3230", fontSize: 15, fontWeight: "700" },
});
