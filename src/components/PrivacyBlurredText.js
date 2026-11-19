import React, {useEffect, useState} from 'react';
import {
  Animated,
  PixelRatio,
  requireNativeComponent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const NativePrivacyBlurredText = requireNativeComponent('PrivacyBlurredText');

// Longer than the slowest reveal (220 ms), so the blur fades out completely
// before its native layer goes.
const BLUR_LAYER_LINGER_MS = 400;

// The native blur draws a new bitmap each time its text changes; on Android
// that work runs on the UI thread. Keep the layer only while the text is
// hidden or while the reveal fades it out.
const useBlurLayerMounted = hidden => {
  const [lingering, setLingering] = useState(false);
  const [wasHidden, setWasHidden] = useState(hidden);

  if (wasHidden !== hidden) {
    setWasHidden(hidden);
    setLingering(!hidden);
  }

  useEffect(() => {
    if (!lingering) return undefined;
    const timer = setTimeout(() => setLingering(false), BLUR_LAYER_LINGER_MS);
    return () => clearTimeout(timer);
  }, [lingering]);

  return hidden || lingering;
};

const PrivacyBlurredText = ({
  blurRadius,
  children,
  color,
  containerStyle,
  hidden,
  revealProgress,
  style,
  ...textProps
}) => {
  const blurLayerMounted = useBlurLayerMounted(hidden);
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fontScale = textProps.allowFontScaling === false ? 1 : PixelRatio.getFontScale();
  const baseFontSize = flattenedStyle.fontSize || 14;
  const fontSize = baseFontSize * fontScale;
  const lineHeight = (flattenedStyle.lineHeight || baseFontSize) * fontScale;
  let blurredOpacity = hidden ? 1 : 0;
  let clearOpacity = hidden ? 0 : 1;

  if (revealProgress) {
    blurredOpacity = revealProgress.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [1, 0.3, 0],
    });
    clearOpacity = revealProgress.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [0, 0.08, 1],
    });
  }

  return (
    <View
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={containerStyle}>
      <Text
        {...textProps}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[style, styles.spacer]}>
        {children}
      </Text>
      {blurLayerMounted && (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, {opacity: blurredOpacity}]}>
          <NativePrivacyBlurredText
            blurRadius={blurRadius}
            color={color}
            fontFamily={flattenedStyle.fontFamily}
            fontSize={fontSize}
            fontWeight={`${flattenedStyle.fontWeight || 'normal'}`}
            letterSpacing={flattenedStyle.letterSpacing || 0}
            lineHeight={lineHeight}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            text={`${children}`}
            textAlign={flattenedStyle.textAlign || 'left'}
          />
        </Animated.View>
      )}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {opacity: clearOpacity}]}>
        <Text {...textProps} style={[style, {color}]}>
          {children}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  spacer: {color: 'transparent'},
});

export default PrivacyBlurredText;
