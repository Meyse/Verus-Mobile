import React, {useState} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import Colors from '../../../globals/colors';
import {fontStyle} from '../../../globals/fonts';
import {VerusLogo} from '../../../images/customIcons';
import WelcomeBackgroundVideo from '../../../components/WelcomeBackgroundVideo';
import OnboardingStartSheet from './OnboardingStartSheet';
import SignedOutNetworkSelector from '../../../components/SignedOutNetworkSelector';
import {normalizeSetupSelection} from '../onboardingSetupFlow';

const LOGO_ASPECT_RATIO = 2084 / 7305;
const LOGO_TOP_MARGIN = 22;

export default function LandingScreen(props) {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [startSheetVisible, setStartSheetVisible] = useState(false);
  const logoWidth = width * 0.3;

  const handleSetupSelection = selection =>
    props.navigation.navigate(
      'CreateProfile',
      normalizeSetupSelection(selection),
    );

  return (
    <View style={styles.container}>
      <WelcomeBackgroundVideo />
      <SignedOutNetworkSelector
        testProfile={props.testProfile}
        setTestProfile={props.setTestProfile}
      />
      <View
        style={[
          styles.logoContainer,
          {
            paddingTop: insets.top + LOGO_TOP_MARGIN,
          },
        ]}>
        <VerusLogo width={logoWidth} height={logoWidth * LOGO_ASPECT_RATIO} />
      </View>
      <View style={styles.content}>
        <Text style={styles.headline}>
          {'With Verus you own your identity, data, and money'}
        </Text>
      </View>
      <SafeBottomActionStack>
        <AppButton
          onPress={() => setStartSheetVisible(true)}
          variant="primary"
          height={56}>
          {'Get started'}
        </AppButton>
      </SafeBottomActionStack>
      <OnboardingStartSheet
        visible={startSheetVisible}
        onClose={() => setStartSheetVisible(false)}
        onSelectSetup={handleSetupSelection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  logoContainer: {
    paddingHorizontal: 32,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingRight: 48,
  },
  headline: {
    textAlign: 'left',
    color: Colors.quinaryColor,
    fontSize: 28,
    ...fontStyle('semiBold'),
    lineHeight: 36,
  },
});
