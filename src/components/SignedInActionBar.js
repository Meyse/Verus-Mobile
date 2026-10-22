import React from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useOnboardingTheme} from '../theme/onboarding';
import signedInCopy from '../copy/signedIn';
import AppButton from './AppButton';

const ACTION_ICON_SIZE = 20;
const ACTION_BUTTON_HEIGHT = 48;
const ACTION_ICONS = {
  receive: ({color}) => (
    <MaterialCommunityIcons
      color={color}
      name="arrow-down"
      size={ACTION_ICON_SIZE}
    />
  ),
  send: ({color}) => (
    <MaterialCommunityIcons
      color={color}
      name="arrow-up"
      size={ACTION_ICON_SIZE}
    />
  ),
  convert: ({color}) => (
    <MaterialCommunityIcons
      color={color}
      name="swap-horizontal"
      size={ACTION_ICON_SIZE}
    />
  ),
};

// Receive, Send and Convert as three equal secondary buttons with icons. The
// asset screen shows them in its bottom bar; the VerusID page shows them in
// the page under its card.
export const SignedInActionButtons = ({
  convertDisabled = false,
  onReceive,
  onConvert,
  onSend,
  receiveDisabled = false,
  sendDisabled = false,
  style,
}) => {
  const {fontScale} = useWindowDimensions();
  const stacked = fontScale >= 1.3;
  const buttonStyle = [styles.button, stacked && styles.stackedButton];
  const disabledHint = action =>
    `${action} is unavailable because there is no compatible Asset and Card.`;

  return (
    <View style={[styles.buttons, stacked && styles.stackedRow, style]}>
      <AppButton
        accessibilityHint={
          receiveDisabled ? disabledHint(signedInCopy.actions.receive) : undefined
        }
        accessibilityLabel={signedInCopy.actions.receive}
        compact
        height={ACTION_BUTTON_HEIGHT}
        disabled={receiveDisabled}
        icon={ACTION_ICONS.receive}
        labelStyle={styles.label}
        onPress={onReceive}
        style={buttonStyle}
        variant="secondary">
        {signedInCopy.actions.receive}
      </AppButton>
      <AppButton
        accessibilityHint={
          sendDisabled ? disabledHint(signedInCopy.actions.send) : undefined
        }
        accessibilityLabel={signedInCopy.actions.send}
        compact
        height={ACTION_BUTTON_HEIGHT}
        disabled={sendDisabled}
        icon={ACTION_ICONS.send}
        labelStyle={styles.label}
        onPress={onSend}
        style={buttonStyle}
        variant="secondary">
        {signedInCopy.actions.send}
      </AppButton>
      <AppButton
        accessibilityHint={
          convertDisabled
            ? disabledHint(signedInCopy.actions.convert)
            : undefined
        }
        accessibilityLabel={signedInCopy.actions.convert}
        compact
        height={ACTION_BUTTON_HEIGHT}
        disabled={convertDisabled}
        icon={ACTION_ICONS.convert}
        labelStyle={styles.label}
        onPress={onConvert}
        style={buttonStyle}
        variant="secondary">
        {signedInCopy.actions.convert}
      </AppButton>
    </View>
  );
};

const SignedInActionBar = ({
  includeBottomInset = true,
  showFade = false,
  ...actions
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
      <SignedInActionButtons
        {...actions}
        style={[styles.barPadding, {paddingBottom: bottomPadding}]}
      />
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
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[style, {width: '100%', height, opacity: visible ? 1 : 0}]}>
      {/* Guard native hit testing before it reaches the iOS SVG view. */}
      <Svg accessible={false} height={height} width="100%">
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
    </View>
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
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  barPadding: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  stackedRow: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    maxWidth: 176,
  },
  stackedButton: {
    flex: 0,
    maxWidth: '100%',
    width: '100%',
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    marginLeft: 10,
    marginRight: 12,
  },
});

export default SignedInActionBar;
