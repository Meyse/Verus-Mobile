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
  secondaryRight = false,
  sendOrConvertLabel = signedInCopy.actions.sendOrConvert,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = includeBottomInset ? Math.max(insets.bottom, 20) : 20;

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
          variant={secondaryRight ? 'secondary' : 'primary'}>
          {sendOrConvertLabel}
        </AppButton>
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
    justifyContent: 'center',
    columnGap: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    maxWidth: 160,
  },
});

export default SignedInActionBar;
