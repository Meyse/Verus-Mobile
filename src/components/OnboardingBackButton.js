import React from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useOnboardingTheme} from '../theme/onboarding';

const OnboardingBackButton = ({onPress, style}) => {
  const theme = useOnboardingTheme();

  return (
    <TouchableOpacity
      accessibilityLabel="Go back"
      accessibilityRole="button"
      activeOpacity={0.74}
      onPress={onPress}
      style={[styles.button, style]}>
      <MaterialCommunityIcons
        color={theme.colors.textPrimary}
        name="arrow-left"
        size={24}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OnboardingBackButton;
