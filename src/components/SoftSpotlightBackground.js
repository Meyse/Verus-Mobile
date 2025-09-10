/**
 * New file: SoftSpotlightBackground
 * - Full-screen SVG background with soft radial spotlights approximating
 *   the provided screenshot (cool teal top-left to warm cream bottom-right).
 * - Uses react-native-svg (already in dependencies). No runtime props required,
 *   but component accepts style/className to allow absolute fill placement.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect } from 'react-native-svg';

const SoftSpotlightBackground = (props) => {
  return (
    <View {...props}>
      <Svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100">
        <Defs>
          {/* Base very light mint to cream vertical gradient */}
          <LinearGradient id="base" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#E9F7F3" />
            <Stop offset="100%" stopColor="#FBF8E8" />
          </LinearGradient>

          {/* Cool spotlight in top-left */}
          <RadialGradient id="spotTL" cx="10%" cy="5%" r="55%">
            <Stop offset="0%" stopColor="#C6F2EE" stopOpacity="0.85" />
            <Stop offset="60%" stopColor="#C6F2EE" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#C6F2EE" stopOpacity="0" />
          </RadialGradient>

          {/* Warm spotlight in bottom-right */}
          <RadialGradient id="spotBR" cx="95%" cy="95%" r="65%">
            <Stop offset="0%" stopColor="#FFF4C9" stopOpacity="0.9" />
            <Stop offset="60%" stopColor="#FFF4C9" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FFF4C9" stopOpacity="0" />
          </RadialGradient>

          {/* Subtle vignette to soften edges */}
          <RadialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <Stop offset="70%" stopColor="#000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0.04" />
          </RadialGradient>
        </Defs>

        {/* Layers */}
        <Rect x="0" y="0" width="100" height="100" fill="url(#base)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#spotTL)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#spotBR)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#vignette)" />
      </Svg>
    </View>
  );
};

export default SoftSpotlightBackground;


