import React from 'react';
import {FingerprintPattern, ScanFace} from 'lucide-react-native';

const FACE_BIOMETRY_TYPES = {
  FaceID: true,
  Face: true,
  Iris: true,
};

export const getBiometryIconComponent = supportedBiometryType => {
  if (!supportedBiometryType || !supportedBiometryType.biometry) {
    return null;
  }

  return FACE_BIOMETRY_TYPES[supportedBiometryType.type]
    ? ScanFace
    : FingerprintPattern;
};

const BiometricAffordanceIcon = ({
  supportedBiometryType,
  color,
  size = 22,
  strokeWidth = 1.9,
  style,
}) => {
  const Icon = getBiometryIconComponent(supportedBiometryType);

  if (Icon == null) {
    return null;
  }

  return (
    <Icon color={color} size={size} strokeWidth={strokeWidth} style={style} />
  );
};

export default BiometricAffordanceIcon;
