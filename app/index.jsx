import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { getSession } from "../api/session";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      // If there's already a saved login session, skip straight to the
      // Dashboard instead of asking to log in again - only Log Out
      // clears this, so closing/reopening the app no longer requires
      // signing back in every time.
      const session = await getSession();
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/loading-screen.png")}
        style={styles.image}
        resizeMode="contain"
      />
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
  image: { width: "100%", height: "100%" },
});
