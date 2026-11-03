import React from "react";
import { StyleSheet, View } from "react-native";
import FlippingLogo from "./FlippingLogo";

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <FlippingLogo width="78%" flip={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5f2",
    alignItems: "center",
    justifyContent: "center",
  },
});
