import React from 'react';
import {View} from 'react-native';
import {Button} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useOnboardingTheme} from '../theme/onboarding';
import {createSignedInStyles} from '../styles';
import signedInCopy from '../copy/signedIn';

const SignedInActionBar = ({
  onReceive,
  onSendOrConvert,
  receiveDisabled = false,
  sendOrConvertDisabled = false,
  includeBottomInset = false,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const styles = createSignedInStyles(theme);

  return (
    <View
      style={[
        styles.actionBar,
        {paddingBottom: includeBottomInset ? Math.max(insets.bottom, 12) : 12},
      ]}>
      <Button
        mode="outlined"
        icon="arrow-down"
        uppercase={false}
        accessibilityLabel={signedInCopy.actions.receive}
        disabled={receiveDisabled}
        style={styles.actionButton}
        contentStyle={{minHeight: 52}}
        onPress={onReceive}>
        {signedInCopy.actions.receive}
      </Button>
      <Button
        mode="contained"
        icon="arrow-top-right"
        uppercase={false}
        accessibilityLabel={signedInCopy.actions.sendOrConvert}
        disabled={sendOrConvertDisabled}
        style={styles.actionButton}
        contentStyle={{minHeight: 52}}
        onPress={onSendOrConvert}>
        {signedInCopy.actions.sendOrConvert}
      </Button>
    </View>
  );
};

export default SignedInActionBar;
