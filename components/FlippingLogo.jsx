import { useEffect, useState } from "react";
import { Animated, Easing, Image, Platform, StyleSheet } from "react-native";

// The two versions of the Shinde Shoes logo (red block, white lettering),
// cropped from the brand PDF. Same size, so swapping them doesn't jump.
const LOGOS = {
  // red block with white lettering
  red: {
    images: [
      require("../assets/images/shinde-logo-en.png"),
      require("../assets/images/shinde-logo-mr.png"),
    ],
    aspectRatio: 1233 / 583,
  },
  // white lettering only, for red backgrounds (Login)
  white: {
    images: [
      require("../assets/images/logo-white-en.png"),
      require("../assets/images/logo-white-mr.png"),
    ],
    aspectRatio: 1200 / 439,
  },
};
const FLIP_EVERY_MS = 5000;
const HALF_FLIP_MS = 280;
// The native driver isn't available on the web
const useNativeDriver = Platform.OS !== "web";

// Shows the English logo, and every 5 seconds turns over like a card to show
// the Marathi one, then back again. width: number or percentage string.
// flip={false} shows the English logo only (no animation).
// variant: "red" (red block) or "white" (white lettering for red backgrounds).
export default function FlippingLogo({
  width = "80%",
  flip = true,
  variant = "red",
  style,
}) {
  const logos = LOGOS[variant] || LOGOS.red;
  const [index, setIndex] = useState(0);
  // 0 = flat, 1 = edge-on (created once)
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!flip) return undefined;
    let swapTimer;
    const timer = setInterval(() => {
      // turn to edge-on, swap the logo while it's invisible, turn back. The
      // swap runs on its own timer (not the animation's end callback), so the
      // logo still changes even if an animation is interrupted.
      Animated.timing(turn, {
        toValue: 1,
        duration: HALF_FLIP_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      }).start();
      swapTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % 2);
        Animated.timing(turn, {
          toValue: 0,
          duration: HALF_FLIP_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }).start();
      }, HALF_FLIP_MS);
    }, FLIP_EVERY_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(swapTimer);
    };
  }, [flip, turn]);

  const rotateY = turn.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        variant === "white" && styles.wrapPlain,
        {
          width,
          aspectRatio: logos.aspectRatio,
          transform: [{ perspective: 800 }, { rotateY }],
        },
        style,
      ]}
    >
      <Image
        source={logos.images[index]}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="Shinde Shoes"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  wrapPlain: { borderRadius: 0, overflow: "visible" },
  image: { width: "100%", height: "100%" },
});
