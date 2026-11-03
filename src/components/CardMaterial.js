import React, {useId} from 'react';
import {StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

// One flat, two-stop material for cards and picker swatches in both themes.
const CardMaterial = ({colors, radius = 0}) => {
  const id = `card${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg
      accessible={false}
      pointerEvents="none"
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={radius} fill={`url(#${id})`} />
    </Svg>
  );
};

export default CardMaterial;
