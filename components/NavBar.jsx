import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const ICONS = {
  home: (
    <>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  vendor: (
    <>
      <Path d="M3 9l1-5h16l1 5" />
      <Path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <Path d="M9 21v-6h6v6" />
    </>
  ),
  cart: (
    <>
      <Circle cx="9" cy="20" r="1.4" fill="#fff" />
      <Circle cx="18" cy="20" r="1.4" fill="#fff" />
      <Path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
    </>
  ),
  orders: (
    <>
      <Rect x="6" y="3" width="12" height="18" rx="2" />
      <Path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
};

function NavIcon({ name }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}

function NavButton({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.navButton, active && styles.navButtonActive]}
    >
      <NavIcon name={icon} />
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// active: 'home' | 'vendor' | 'cart' | 'orders'
// vendor: pass the currently selected vendor object (or null) so the Vendor
// tab knows whether to go to the workspace or the vendor picker
export default function NavBar({ active, vendor }) {
  const router = useRouter();

  const goHome = () => router.replace("/dashboard");
  // "Vendor" always goes to the full vendors list, regardless of which
  // vendor (if any) the current screen is scoped to.
  const goVendor = () => router.push("/vendor");

  // Cart button intentionally removed from bottom nav - the only entry
  // point to the Cart List screen is the "Cart" action card on the
  // Vendor Workspace screen.
  return (
    <LinearGradient colors={["#5c2422", "#3a1516"]} style={styles.bar}>
      <NavButton
        icon="home"
        label="Home"
        active={active === "home"}
        onPress={goHome}
      />
      <NavButton
        icon="vendor"
        label="Vendor"
        active={active === "vendor"}
        onPress={goVendor}
      />
      <NavButton
        icon="orders"
        label="Orders"
        active={active === "orders"}
        onPress={() => router.push("/orders")}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 4,
  },
  navButton: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  navButtonActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  navLabel: {
    color: "#fff",
    fontSize: 10.5,
  },
});
