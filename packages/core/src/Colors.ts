import Animated from "react-native-reanimated";
import { processColor } from "react-native";

import { clamp, fract, mix } from "./Math";

const {
  add,
  multiply,
  abs,
  round,
  interpolate,
  sub,
  proc,
  color,
  Extrapolate,
} = Animated;

type Color = Animated.Adaptable<string> | Animated.Adaptable<number>;

export const opacity = (c: number) => ((c >> 24) & 255) / 255;
export const red = (c: number) => (c >> 16) & 255;
export const green = (c: number) => (c >> 8) & 255;
export const blue = (c: number) => c & 255;

export const hsv2rgb = proc(
  (
    h: Animated.Adaptable<number>,
    s: Animated.Adaptable<number>,
    v: Animated.Adaptable<number>
  ) => {
    // vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    const K = {
      x: 1,
      y: 2 / 3,
      z: 1 / 3,
      w: 3,
    };
    // vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    const p = {
      x: abs(sub(multiply(fract(add(h, K.x)), 6), K.w)),
      y: abs(sub(multiply(fract(add(h, K.y)), 6), K.w)),
      z: abs(sub(multiply(fract(add(h, K.z)), 6), K.w)),
    };
    // return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    const rgb = {
      x: multiply(v, mix(s, K.x, clamp(sub(p.x, K.x), 0, 1))),
      y: multiply(v, mix(s, K.x, clamp(sub(p.y, K.x), 0, 1))),
      z: multiply(v, mix(s, K.x, clamp(sub(p.z, K.x), 0, 1))),
    };
    const result = {
      x: round(multiply(rgb.x, 255)),
      y: round(multiply(rgb.y, 255)),
      z: round(multiply(rgb.z, 255)),
    };
    return color(result.x, result.y, result.z);
  }
);

const rgbToHsv = (c: number) => {
  const r = red(c) / 255;
  const g = green(c) / 255;
  const b = blue(c) / 255;

  const ma = Math.max(r, g, b);
  const mi = Math.min(r, g, b);
  let h = 0;
  const v = ma;

  const d = ma - mi;
  const s = ma === 0 ? 0 : d / ma;
  if (ma === mi) {
    h = 0; // achromatic
  } else {
    switch (ma) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default: // do nothing
    }
    h /= 6;
  }
  return { h, s, v };
};

const interpolateColorsHSV = (
  animationValue: Animated.Adaptable<number>,
  inputRange: readonly Animated.Adaptable<number>[],
  colors: number[]
): Animated.Node<number> => {
  const colorsAsHSV = colors.map((c) => rgbToHsv(c));
  const h = interpolate(animationValue, {
    inputRange,
    outputRange: colorsAsHSV.map((c) => c.h),
    extrapolate: Extrapolate.CLAMP,
  });
  const s = interpolate(animationValue, {
    inputRange,
    outputRange: colorsAsHSV.map((c) => c.s),
    extrapolate: Extrapolate.CLAMP,
  });
  const v = interpolate(animationValue, {
    inputRange,
    outputRange: colorsAsHSV.map((c) => c.v),
    extrapolate: Extrapolate.CLAMP,
  });
  return hsv2rgb(h, s, v);
};

const interpolateColorsRGB = (
  animationValue: Animated.Adaptable<number>,
  inputRange: readonly Animated.Adaptable<number>[],
  colors: number[]
) => {
  const r = round(
    interpolate(animationValue, {
      inputRange,
      outputRange: colors.map((c) => red(c)),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const g = round(
    interpolate(animationValue, {
      inputRange,
      outputRange: colors.map((c) => green(c)),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const b = round(
    interpolate(animationValue, {
      inputRange,
      outputRange: colors.map((c) => blue(c)),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const a = interpolate(animationValue, {
    inputRange,
    outputRange: colors.map((c) => opacity(c)),
    extrapolate: Extrapolate.CLAMP,
  });

  return color(r, g, b, a);
};

interface ColorInterpolationConfig {
  inputRange: readonly Animated.Adaptable<number>[];
  outputRange: Color[];
}

export const interpolateColor = (
  value: Animated.Adaptable<number>,
  config: ColorInterpolationConfig,
  colorSpace: "hsv" | "rgb" = "rgb"
): Animated.Node<number> => {
  const { inputRange } = config;
  const outputRange = config.outputRange.map((c) =>
    typeof c === "number" ? c : processColor(c)
  );
  if (colorSpace === "hsv") {
    return interpolateColorsHSV(value, inputRange, outputRange);
  }
  return interpolateColorsRGB(value, inputRange, outputRange);
};

export const bInterpolateColor = (
  value: Animated.Adaptable<number>,
  color1: Color,
  color2: Color,
  colorSpace: "hsv" | "rgb" = "rgb"
) =>
  interpolateColor(
    value,
    {
      inputRange: [0, 1],
      outputRange: [color1, color2],
    },
    colorSpace
  );