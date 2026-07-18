import React from 'react';
import {FingerprintPattern, ScanFace} from 'lucide-react-native';
import {useOnboardingTheme} from '../theme/onboarding';

const BIOMETRY_PRESENTATIONS = {
  TouchID: {
    settingsTitle: 'Touch ID',
    settingsSetupTitle: 'Set up Touch ID',
    onboardingTitle: 'Use Touch ID',
    onboardingBody:
      'Unlock this wallet with Touch ID. You can change this later in settings.',
    onboardingAction: 'Enable Touch ID',
    icon: FingerprintPattern,
  },
  FaceID: {
    settingsTitle: 'Face ID',
    settingsSetupTitle: 'Set up Face ID',
    onboardingTitle: 'Use Face ID',
    onboardingBody:
      'Unlock this wallet with Face ID. You can change this later in settings.',
    onboardingAction: 'Enable Face ID',
    icon: ScanFace,
  },
  Fingerprint: {
    settingsTitle: 'Fingerprint unlock',
    settingsSetupTitle: 'Set up fingerprint unlock',
    onboardingTitle: 'Use fingerprint unlock',
    onboardingBody:
      'Unlock this wallet with your fingerprint. You can change this later in settings.',
    onboardingAction: 'Enable fingerprint unlock',
    icon: FingerprintPattern,
  },
  Face: {
    settingsTitle: 'Face unlock',
    settingsSetupTitle: 'Set up face unlock',
    onboardingTitle: 'Use face unlock',
    onboardingBody:
      'Unlock this wallet with facial recognition. You can change this later in settings.',
    onboardingAction: 'Enable face unlock',
    icon: ScanFace,
  },
  Iris: {
    settingsTitle: 'Iris recognition',
    settingsSetupTitle: 'Set up iris recognition',
    onboardingTitle: 'Use biometrics',
    onboardingBody:
      'Unlock this wallet with iris recognition. You can change this later in settings.',
    onboardingAction: 'Enable biometrics',
    icon: ScanFace,
  },
};

const DEFAULT_PRESENTATION = {
  settingsTitle: 'Biometric unlock',
  settingsSetupTitle: 'Set up biometric unlock',
  onboardingTitle: 'Use biometrics',
  onboardingBody:
    'Unlock this wallet with your device biometrics. You can change this later in settings.',
  onboardingAction: 'Enable biometrics',
  icon: FingerprintPattern,
};

export const getBiometryPresentation = supportedBiometryType =>
  BIOMETRY_PRESENTATIONS[supportedBiometryType?.type] || DEFAULT_PRESENTATION;

export const getBiometryIconComponent = (
  supportedBiometryType,
  showFallback = false,
) => {
  if (
    !showFallback &&
    (!supportedBiometryType || !supportedBiometryType.biometry)
  ) {
    return null;
  }

  return getBiometryPresentation(supportedBiometryType).icon;
};

const BiometricAffordanceIcon = ({
  supportedBiometryType,
  color,
  showFallback = false,
  size = 22,
  strokeWidth = 1.9,
  style,
}) => {
  const theme = useOnboardingTheme();
  const Icon = getBiometryIconComponent(
    supportedBiometryType,
    showFallback,
  );

  if (Icon == null) {
    return null;
  }

  return (
    <Icon
      color={color || theme.colors.textSubtle}
      size={size}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
};

export default BiometricAffordanceIcon;
