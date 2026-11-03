import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { FootPrint, Sneaker } from "./ShoeArt";

const useNativeDriver = Platform.OS !== "web";
const PRINTS = 4;

// Shown for ~1.6 s right after a successful login, on top of the Login
// screen: a sneaker walks in leaving footprints, "Welcome, <name>" appears,
// then the whole thing fades and onDone() opens the Dashboard.
export default function WelcomeTransition({ name, onDone }) {
  const [shoe] = useState(() => new Animated.Value(0)); // walk in: 0 -> 1
  const [bob] = useState(() => new Animated.Value(0)); // step bounce
  const [prints] = useState(() =>
    [...Array(PRINTS)].map(() => new Animated.Value(0)),
  );
  const [text] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1)); // whole overlay

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 140, useNativeDriver }),
        Animated.timing(bob, { toValue: 0, duration: 140, useNativeDriver }),
      ]),
    );
    bounce.start();
    Animated.parallel([
      Animated.timing(shoe, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.stagger(
        170,
        prints.map((p) =>
          Animated.timing(p, { toValue: 1, duration: 200, useNativeDriver }),
        ),
      ),
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(text, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      bounce.stop();
      Animated.timing(fade, {
        toValue: 0,
        duration: 280,
        useNativeDriver,
      }).start();
      onDone?.();
    }, 1600);
    return () => {
      clearTimeout(timer);
      bounce.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <LinearGradient
        colors={["#E0262D", "#D61F26", "#9E141A"]}
        style={styles.fill}
      >
        <View style={styles.walk}>
          {/* footprints left behind, pointing the way the shoe walks */}
          <View style={styles.printsRow}>
            {prints.map((p, i) => (
              <Animated.View
                key={i}
                style={{
                  opacity: p,
                  marginTop: i % 2 ? 18 : 0,
                  transform: [{ rotate: "90deg" }],
                }}
              >
                <FootPrint size={12} mirrored={i % 2 === 1} opacity={0.55} />
              </Animated.View>
            ))}
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  translateX: shoe.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-160, 0],
                  }),
                },
                {
                  translateY: bob.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -6],
                  }),
                },
                {
                  rotate: bob.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "-6deg"],
                  }),
                },
              ],
            }}
          >
            <Sneaker width={110} />
          </Animated.View>
        </View>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: text,
              transform: [
                {
                  translateY: text.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Welcome, {name || "back"}!
        </Animated.Text>
        <Animated.Text style={[styles.sub, { opacity: text }]}>
          Opening your dashboard…
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  walk: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  printsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 4,
  },
  title: {
    marginTop: 28,
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  sub: { marginTop: 6, color: "rgba(255,255,255,0.85)", fontSize: 14 },
});
