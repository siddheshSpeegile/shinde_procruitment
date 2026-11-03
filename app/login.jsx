// import { LinearGradient } from "expo-linear-gradient";
// import { useRouter } from "expo-router";
// import React, { useState } from "react";
// import {
//     ActivityIndicator,
//     Image,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View,
// } from "react-native";
// import { apiFetch } from "../api/config";

// export default function LoginScreen() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const router = useRouter();

//   const handleLogin = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const data = await apiFetch("/auth/login", {
//         method: "POST",
//         body: JSON.stringify({ username, password }),
//       });
//       if (data.success) {
//         router.replace("/dashboard");
//       } else {
//         setError(data.message || "Login failed");
//       }
//     } catch (err) {
//       setError(
//         "Could not reach server. Check your backend is running and the LAN IP in api/config.ts is correct.",
//       );
//     }
//     setLoading(false);
//   };

//   return (
//     <View style={styles.container}>
//       <Image
//         source={require("../assets/images/logo.png")}
//         style={styles.logo}
//         resizeMode="contain"
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Username"
//         placeholderTextColor="#8a7c78"
//         value={username}
//         onChangeText={setUsername}
//         autoCapitalize="none"
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         placeholderTextColor="#8a7c78"
//         value={password}
//         onChangeText={setPassword}
//         secureTextEntry
//       />

//       {error ? <Text style={styles.error}>{error}</Text> : null}

//       <TouchableOpacity onPress={handleLogin} disabled={loading}>
//         <LinearGradient
//           colors={["#3a1516", "#8a4844", "#c98f86"]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 1 }}
//           style={styles.button}
//         >
//           {loading ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.buttonText}>Login</Text>
//           )}
//         </LinearGradient>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f5f3f0",
//     justifyContent: "center",
//     padding: 24,
//   },
//   logo: { width: "80%", height: 80, alignSelf: "center", marginBottom: 40 },
//   input: {
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderRadius: 10,
//     padding: 14,
//     fontSize: 15,
//     backgroundColor: "#fff",
//     marginBottom: 14,
//   },
//   button: { borderRadius: 14, padding: 16, alignItems: "center" },
//   buttonText: { color: "#fff", fontWeight: "800", fontSize: 17 },
//   error: { color: "#b3261e", fontSize: 13, marginBottom: 10 },
// });

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiFetch } from "../api/config";
import { saveSession } from "../api/session";
import FlippingLogo from "../components/FlippingLogo";
import { FootPrint, Sneaker } from "../components/ShoeArt";
import WelcomeTransition from "../components/WelcomeTransition";
import useKeyboardVisible from "../hooks/useKeyboardVisible";

const useNativeDriver = Platform.OS !== "web";
// Rotating line under the logo
const TAGLINES = ["Step into Style", "Walk in Comfort", "Built on Quality"];
const TAGLINE_MS = 2600;
// Faint sneakers floating in the red header: position + size + timing
const FLOATERS = [
  { top: "12%", left: "6%", width: 54, delay: 0, rotate: "-14deg" },
  { top: "22%", right: "7%", width: 44, delay: 700, rotate: "12deg" },
  { top: "62%", left: "10%", width: 38, delay: 1300, rotate: "8deg" },
  { top: "70%", right: "12%", width: 50, delay: 400, rotate: "-10deg" },
];
const TRAIL = 6;

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // set after a successful login: shows the welcome animation, then Dashboard
  const [welcomeName, setWelcomeName] = useState(null);
  const router = useRouter();
  const keyboardVisible = useKeyboardVisible();

  // Animation values (created once)
  const [card] = useState(() => new Animated.Value(0)); // form card slides up
  const [float] = useState(() => new Animated.Value(0)); // sneakers drift
  const [trail] = useState(() =>
    [...Array(TRAIL)].map(() => new Animated.Value(0)),
  );
  const [taglineFade] = useState(() => new Animated.Value(1));
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    Animated.timing(card, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start();

    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );
    drift.start();

    // footsteps walk across the bottom of the header, then fade, repeat
    const walk = Animated.loop(
      Animated.sequence([
        Animated.stagger(
          260,
          trail.map((v) =>
            Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver }),
          ),
        ),
        Animated.delay(500),
        Animated.parallel(
          trail.map((v) =>
            Animated.timing(v, { toValue: 0, duration: 500, useNativeDriver }),
          ),
        ),
        Animated.delay(300),
      ]),
    );
    walk.start();

    // tagline: fade out, swap, fade in
    const words = setInterval(() => {
      Animated.timing(taglineFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver,
      }).start();
      setTimeout(() => {
        setTaglineIndex((i) => (i + 1) % TAGLINES.length);
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver,
        }).start();
      }, 260);
    }, TAGLINE_MS);

    return () => {
      drift.stop();
      walk.stop();
      clearInterval(words);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    // Blocked here, before any request - an empty username used to reach
    // the backend and come back as the misleading "User not found".
    const missingUsername = !username.trim();
    const missingPassword = !password;
    if (missingUsername || missingPassword) {
      setError(
        missingUsername && missingPassword
          ? "Please enter your username and password to log in."
          : missingUsername
            ? "Please enter your username to log in."
            : "Please enter your password to log in.",
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (data.success) {
        await saveSession(data.data);
        // Welcome animation first; it opens the Dashboard when it finishes
        setWelcomeName(data.data?.username || username.trim());
        return;
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(
        "Could not reach server. Check your backend is running and the LAN IP in api/config.js is correct.",
      );
    }
    setLoading(false);
  };

  const floatY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
      >
        {/* Red header: logo, rotating tagline, shoe animations */}
        <LinearGradient
          colors={["#E0262D", "#D61F26", "#9E141A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.hero, keyboardVisible && styles.heroCompact]}
        >
          {!keyboardVisible &&
            FLOATERS.map((f, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.floater,
                  {
                    top: f.top,
                    left: f.left,
                    right: f.right,
                    transform: [
                      {
                        translateY:
                          i % 2 ? Animated.multiply(floatY, -1) : floatY,
                      },
                      { rotate: f.rotate },
                    ],
                  },
                ]}
              >
                <Sneaker
                  width={f.width}
                  color="rgba(255,255,255,0.16)"
                  accent="rgba(255,255,255,0.10)"
                  detail="rgba(214,31,38,0)"
                />
              </Animated.View>
            ))}

          <FlippingLogo
            variant="white"
            width={keyboardVisible ? "52%" : "72%"}
          />

          <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
            {TAGLINES[taglineIndex]}
          </Animated.Text>

          {!keyboardVisible ? (
            <View style={styles.trail} pointerEvents="none">
              {trail.map((v, i) => (
                <Animated.View
                  key={i}
                  style={{
                    opacity: v,
                    marginTop: i % 2 ? 14 : 0,
                    transform: [{ rotate: "90deg" }],
                  }}
                >
                  <FootPrint size={11} mirrored={i % 2 === 1} opacity={0.5} />
                </Animated.View>
              ))}
            </View>
          ) : null}
        </LinearGradient>

        {/* White card with the form, slides up on open */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: card,
              transform: [
                {
                  translateY: card.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to manage suppliers and purchase orders
          </Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#8a7c78"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#8a7c78"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading || !!welcomeName}
            style={{ marginTop: 6 }}
          >
            <LinearGradient
              colors={["#D61F26", "#9E141A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footer}>STYLE · COMFORT · QUALITY</Text>
        </Animated.View>
      </ScrollView>

      {welcomeName ? (
        <WelcomeTransition
          name={welcomeName}
          onDone={() => router.replace("/dashboard")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  hero: {
    minHeight: 330,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 60,
    overflow: "hidden",
  },
  heroCompact: {
    minHeight: 170,
    flexGrow: 0,
    paddingTop: 36,
    paddingBottom: 46,
  },
  floater: { position: "absolute" },
  tagline: {
    marginTop: 18,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  trail: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  card: {
    marginTop: -28,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#1c1210" },
  subtitle: {
    fontSize: 13.5,
    color: "#8a7c78",
    marginTop: 4,
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: "700", color: "#3a2b28", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1c1210",
    backgroundColor: "#faf8f6",
    marginBottom: 14,
  },
  button: { borderRadius: 14, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  error: { color: "#b3261e", fontSize: 13, marginBottom: 10 },
  footer: {
    marginTop: 22,
    textAlign: "center",
    color: "#b9aaa6",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
