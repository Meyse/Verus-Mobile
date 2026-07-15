import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useOnboardingTheme} from '../theme/onboarding';
import signedInCopy from '../copy/signedIn';
import AppButton from './AppButton';

const SignedInActionBar = ({
  onReceive,
  onSendOrConvert,
  receiveDisabled = false,
  sendOrConvertDisabled = false,
  includeBottomInset = true,
  showFade = false,
  sendOrConvertLabel = signedInCopy.actions.sendOrConvert,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = includeBottomInset ? Math.max(insets.bottom, 20) : 20;

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <SignedInEdgeFade
        edge="bottom"
        height={40}
        style={styles.bottomFade}
        visible={showFade}
      />
      <View style={[styles.row, {paddingBottom: bottomPadding}]}>
        <AppButton
          accessibilityLabel={signedInCopy.actions.receive}
          compact
          disabled={receiveDisabled}
          onPress={onReceive}
          style={styles.button}
          variant="secondary">
          {signedInCopy.actions.receive}
        </AppButton>
        <AppButton
          compact
          disabled={sendOrConvertDisabled}
          onPress={onSendOrConvert}
          style={styles.button}
          variant="secondary">
          {sendOrConvertLabel}
        </AppButton>
      </View>
    </View>
  );
};

export const SignedInEdgeFade = ({
  edge = 'bottom',
  height = 32,
  style,
  visible = true,
}) => {
  const theme = useOnboardingTheme();
  const fadesFromTop = edge === 'top';
  const gradientId = `signedIn${fadesFromTop ? 'Top' : 'Bottom'}Fade`;

  return (
    <Svg
      height={height}
      pointerEvents="none"
      width="100%"
      style={[style, {height, opacity: visible ? 1 : 0}]}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop
            offset="0"
            stopColor={theme.colors.background}
            stopOpacity={fadesFromTop ? 1 : 0}
          />
          <Stop
            offset="0.45"
            stopColor={theme.colors.background}
            stopOpacity={0.45}
          />
          <Stop
            offset="1"
            stopColor={theme.colors.background}
            stopOpacity={fadesFromTop ? 0 : 1}
          />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width="100%"
        height={height}
        fill={`url(#${gradientId})`}
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 2,
  },
  bottomFade: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    maxWidth: 176,
  },
});

export default SignedInActionBar;
