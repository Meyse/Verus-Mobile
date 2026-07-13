import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useOnboardingTheme} from '../theme/onboarding';
import {fontStyle} from '../globals/fonts';
import signedInCopy from '../copy/signedIn';

const SignedInActionBar = ({
  onReceive,
  onSendOrConvert,
  receiveDisabled = false,
  sendOrConvertDisabled = false,
  includeBottomInset = true,
  secondaryRight = false,
  sendOrConvertLabel = signedInCopy.actions.sendOrConvert,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = includeBottomInset ? Math.max(insets.bottom, 20) : 20;
  const secondaryColor = theme.isDark ? theme.colors.surfaceMuted : '#EBF6FF';

  const Action = ({children, disabled, onPress, primary = false}) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {
          backgroundColor: primary ? theme.colors.primary : secondaryColor,
          opacity: disabled ? 0.42 : pressed ? 0.76 : 1,
        },
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[
          styles.buttonLabel,
          {color: primary ? theme.colors.onPrimary : theme.colors.primary},
        ]}>
        {children}
      </Text>
    </Pressable>
  );

  return (
    <View style={{backgroundColor: theme.colors.background}}>
      <Svg height={48} width="100%" style={styles.fade}>
        <Defs>
          <LinearGradient id="signedInActionFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.background} stopOpacity="0" />
            <Stop offset="0.3" stopColor={theme.colors.background} stopOpacity="0.1" />
            <Stop offset="1" stopColor={theme.colors.background} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="48" fill="url(#signedInActionFade)" />
      </Svg>
      <View style={[styles.row, {paddingBottom: bottomPadding}]}>
        <Action disabled={receiveDisabled} onPress={onReceive}>
          {signedInCopy.actions.receive}
        </Action>
        <Action
          primary={!secondaryRight}
          disabled={sendOrConvertDisabled}
          onPress={onSendOrConvert}>
          {sendOrConvertLabel}
        </Action>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fade: {
    marginBottom: -1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    maxWidth: 160,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...fontStyle('bold'),
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
    textAlign: 'center',
  },
});

export default SignedInActionBar;
