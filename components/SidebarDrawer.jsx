import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

// Slides in from the Dashboard's top-left user icon. Shows who's logged
// in (photo from the DB if set, otherwise a colored initial circle -
// same fallback pattern already used for vendor logos elsewhere in the
// app), plus Help and Log Out. Deliberately does NOT include a location
// row, even though the reference design had one.
export default function SidebarDrawer({
  visible,
  onClose,
  user,
  onHelp,
  onLogout,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth={2.4}
              >
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
            <Text style={styles.title}>Settings</Text>
          </View>

          <View style={styles.userRow}>
            {user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {(user?.username || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.userName} numberOfLines={1}>
              {user?.username || "User"}
            </Text>
          </View>

          <TouchableOpacity style={styles.row} onPress={onHelp}>
            <View style={styles.rowIconWrap}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth={2.2}
              >
                <Path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 2-2 3.5" />
                <Path d="M12 17h.01" />
                <Path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
              </Svg>
            </View>
            <Text style={styles.rowText}>Help</Text>
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8a7c78"
              strokeWidth={2}
              style={{ marginLeft: "auto" }}
            >
              <Path d="M9 18l6-6-6-6" />
            </Svg>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={onLogout}>
            <View style={[styles.rowIconWrap, { backgroundColor: "#c23b32" }]}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth={2.2}
              >
                <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <Path d="M16 17l5-5-5-5" />
                <Path d="M21 12H9" />
              </Svg>
            </View>
            <Text style={styles.rowText}>Log out</Text>
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8a7c78"
              strokeWidth={2}
              style={{ marginLeft: "auto" }}
            >
              <Path d="M9 18l6-6-6-6" />
            </Svg>
          </TouchableOpacity>

          <Text style={styles.version}>Version 1.0</Text>
        </View>

        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  panel: {
    width: "78%",
    maxWidth: 320,
    backgroundColor: "#f5f3f0",
    paddingTop: 54,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#7a2f2b",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#1c1210",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    padding: 12,
    marginBottom: 18,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#ddd" },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#7a2f2b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  userName: { fontSize: 16, fontWeight: "700", color: "#1c1210", flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    padding: 12,
    marginBottom: 12,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#7a2f2b",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { fontSize: 15, fontWeight: "700", color: "#1c1210" },
  version: {
    position: "absolute",
    bottom: 24,
    left: 18,
    fontSize: 12,
    color: "#8a7c78",
  },
});
