import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";

// Small icon button that re-runs whatever fetch function the screen passes
// in. Shows a spinner in place of the icon while that fetch is in flight
// (screens already track this via their existing `loading` state - no new
// state needed) and is disabled during that time so a second tap can't
// fire an overlapping request.
export default function RefreshButton({ onPress, refreshing }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={refreshing}
      style={styles.btn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color="#1c1210" />
      ) : (
        <Svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1c1210"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M21 12a9 9 0 1 1-3-6.7" />
          <Path d="M21 3v6h-6" />
        </Svg>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
