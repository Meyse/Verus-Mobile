import React, {useEffect, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {FingerprintPattern, ScanFace} from 'lucide-react-native';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import Colors from '../../../../globals/colors';
import {signedOutFlowStyles} from '../../../../styles';

const CONTENT_ANIMATION_DURATION = 320;

const BIOMETRY_PRESENTATION = {
  TouchID: {
    title: 'Use Touch ID',
    body: 'Unlock this wallet with Touch ID. You can change this later in settings.',
    action: 'Enable Touch ID',
    icon: FingerprintPattern,
  },
  FaceID: {
    title: 'Use Face ID',
    body: 'Unlock this wallet with Face ID. You can change this later in settings.',
    action: 'Enable Face ID',
    icon: ScanFace,
  },
  Fingerprint: {
    title: 'Use fingerprint unlock',
    body: 'Unlock this wallet with your fingerprint. You can change this later in settings.',
    action: 'Enable fingerprint unlock',
    icon: FingerprintPattern,
  },
  Face: {
    title: 'Use face unlock',
    body: 'Unlock this wallet with facial recognition. You can change this later in settings.',
    action: 'Enable face unlock',
    icon: ScanFace,
  },
  Iris: {
    title: 'Use biometrics',
    body: 'Unlock this wallet with iris recognition. You can change this later in settings.',
    action: 'Enable biometrics',
    icon: ScanFace,
  },
};

const DEFAULT_PRESENTATION = {
  title: 'Use biometrics',
  body: 'Unlock this wallet with your device biometrics. You can change this later in settings.',
  action: 'Enable biometrics',
  icon: FingerprintPattern,
};

export default function UseBiometrics({
  supportedBiometryType,
  setUseBiometrics,
  onNext,
}) {
  const presentation =
    BIOMETRY_PRESENTATION[supportedBiometryType?.type] || DEFAULT_PRESENTATION;
  const BiometryIcon = presentation.icon;
  const contentProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

        contentProgress.stopAnimation();

        if (reduceMotionEnabled) {
          contentProgress.setValue(1);
          return;
        }

        contentProgress.setValue(0);
        animation = Animated.timing(contentProgress, {
          toValue: 1,
          duration: CONTENT_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          contentProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      contentProgress.stopAnimation();
    };
  }, [contentProgress]);

  const continueToWalletSetup = useBiometrics => {
    setUseBiometrics(useBiometrics);
    if (onNext) {
      onNext();
    }
  };

  const contentAnimatedStyle = {
    opacity: contentProgress,
    transform: [
      {
        translateY: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  return (
    <View style={signedOutFlowStyles.container}>
      <View style={signedOutFlowStyles.content}>
        <Animated.View
          style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
          <BiometryIcon
            color={Colors.quinaryColor}
            size={72}
            strokeWidth={1.8}
            style={styles.icon}
          />
          <Text style={[signedOutFlowStyles.title, styles.title]}>
            {presentation.title}
          </Text>
          <Text style={signedOutFlowStyles.body}>{presentation.body}</Text>
        </Animated.View>
      </View>
      <SafeBottomActionStack gap={10}>
        <AppButton
          height={56}
          onPress={() => continueToWalletSetup(true)}
          variant="primary">
          {presentation.action}
        </AppButton>
        <AppButton
          height={56}
          onPress={() => continueToWalletSetup(false)}
          variant="secondary">
          {'Skip for now'}
        </AppButton>
      </SafeBottomActionStack>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 14,
  },
});
