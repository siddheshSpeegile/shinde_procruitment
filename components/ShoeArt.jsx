import Svg, { Ellipse, Path } from "react-native-svg";

// Small shoe drawings shared by the splash, Login and the welcome animation.

// One shoe print (sole + heel), pointing up. mirrored = the other foot.
export function FootPrint({
  mirrored,
  size = 26,
  color = "#fff",
  opacity = 0.9,
}) {
  return (
    <Svg
      width={size}
      height={size * 2}
      viewBox="0 0 26 52"
      style={mirrored ? { transform: [{ scaleX: -1 }] } : null}
    >
      <Path
        d="M13 1C6 1 2 8 2 16c0 7 3 12 5 15 1.5 2.3 3.7 3 6 3s4.8-1.4 6.3-4C21.5 26 24 21 24 14 24 6 20 1 13 1Z"
        fill={color}
        opacity={opacity}
      />
      <Ellipse cx={14} cy={44} rx={7.5} ry={7} fill={color} opacity={opacity} />
    </Svg>
  );
}

// A sneaker seen from the side, toe pointing right. detail = colour of the
// laces / collar / side stripe (the background colour shows "through").
export function Sneaker({
  width = 64,
  color = "#fff",
  accent = "#FFC24A",
  detail = "#D61F26",
}) {
  return (
    <Svg width={width} height={width / 2} viewBox="0 0 64 32">
      {/* sole */}
      <Path
        d="M3 25.5h56.5c1.6 0 2.5 1 2.5 2.2 0 1.3-1 2.3-2.6 2.3H6.5C4.5 30 3 28.6 3 26.8z"
        fill={accent}
      />
      {/* upper */}
      <Path
        d="M4.5 25.5V17c0-5.5 2.6-10 7-11.2l5.6-1.3c1.6 3.4 4.4 6 8.8 7 7 1.6 15.7 2.6 23 5.4 5.2 2 9.6 4.6 10.6 8.6z"
        fill={color}
      />
      {/* collar opening */}
      <Path
        d="M10.5 9.5c2.2-.6 4.6-1.4 6.3-2.6"
        stroke={detail}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
      {/* laces */}
      <Path
        d="M23.5 11.5l3 2.6M27.5 12.6l2.6 2.8M31.4 13.4l2.2 3"
        stroke={detail}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* side stripe */}
      <Path
        d="M12 21c8 0 18-1.5 27-1.2 4 .2 7.5 1 10.5 2.2"
        stroke={detail}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
