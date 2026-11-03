import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getSession } from "../api/session";
import { FootPrint } from "../components/ShoeArt";

// Animated splash (5 s), shown right after the phone's own still splash (red
// with the white logo - same colours, so it flows straight into this):
//   0.0 s  footsteps walk up the screen, left / right
//   1.6 s  the footsteps fade and the Shinde Shoes logo springs in
//   2.5 s  "STYLE | COMFORT | QUALITY" slides up
//   0-5 s  a loading bar fills along the bottom
// Then Dashboard (saved login) or Login, as before.
const SPLASH_MS = 5000;
const STEPS = 6;
const STEP_MS = 220;
const BAR_WIDTH = 180;
const useNativeDriver = Platform.OS !== "web";

export default function SplashScreen() {
  const router = useRouter();

  // One value per footstep, plus logo / tagline / footsteps-fade / bar
  const [steps] = useState(() =>
    [...Array(STEPS)].map(() => new Animated.Value(0)),
  );
  const [stepsFade] = useState(() => new Animated.Value(1));
  const [logo] = useState(() => new Animated.Value(0));
  const [tagline] = useState(() => new Animated.Value(0));
  const [bar] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      // footsteps appear one after another
      Animated.stagger(
        STEP_MS,
        steps.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver,
          }),
        ),
      ),
      Animated.sequence([
        Animated.delay(STEPS * STEP_MS + 250),
        Animated.parallel([
          Animated.timing(stepsFade, {
            toValue: 0,
            duration: 450,
            useNativeDriver,
          }),
          Animated.spring(logo, {
            toValue: 1,
            friction: 5,
            tension: 60,
            useNativeDriver,
          }),
        ]),
        Animated.timing(tagline, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]),
      Animated.timing(bar, {
        toValue: 1,
        duration: SPLASH_MS - 300,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      // If there's already a saved login session, skip straight to the
      // Dashboard instead of asking to log in again - only Log Out
      // clears this, so closing/reopening the app no longer requires
      // signing back in every time.
      const session = await getSession();
      router.replace(session ? "/dashboard" : "/login");
    }, SPLASH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layout uses percentages / centring only (no measured screen size): on the
  // web the screen size reads as 0 when the pre-built page first loads.

  return (
    <LinearGradient
      colors={["#E0262D", "#D61F26", "#9E141A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: stepsFade }]}
      >
        {steps.map((v, i) => {
          const left = i % 2 === 0;
          return (
            <Animated.View
              key={i}
              style={{
                // walk up from near the bottom, alternating left / right foot
                position: "absolute",
                bottom: `${12 + i * 7.5}%`,
                left: "50%",
                marginLeft: left ? -40 : 6,
                opacity: v,
                transform: [
                  { rotate: left ? "-8deg" : "8deg" },
                  {
                    scale: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.4, 1],
                    }),
                  },
                ],
              }}
            >
              <FootPrint mirrored={!left} />
            </Animated.View>
          );
        })}
      </Animated.View>

      <Animated.View
        style={{
          width: "100%",
          alignItems: "center",
          opacity: logo,
          transform: [
            {
              scale: logo.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
          ],
        }}
      >
        <Image
          source={require("../assets/images/shinde-logo-white.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Shinde Shoes"
        />
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: tagline,
            transform: [
              {
                translateY: tagline.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        STYLE <Text style={styles.sep}>|</Text> COMFORT{" "}
        <Text style={styles.sep}>|</Text> QUALITY
      </Animated.Text>

      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              transform: [
                {
                  translateX: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-BAR_WIDTH, 0],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "80%",
    maxWidth: 380,
    aspectRatio: 1883 / 576,
    alignSelf: "center",
  },
  tagline: {
    marginTop: 26,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 4,
  },
  sep: { color: "#FFC24A" },
  barTrack: {
    position: "absolute",
    bottom: 70,
    width: BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  barFill: {
    width: BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
});
