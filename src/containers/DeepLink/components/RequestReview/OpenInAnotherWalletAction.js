import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const OpenInAnotherWalletAction = ({onPress, disabled = false, compact = false, style}) => {
  const theme = useOnboardingTheme();
  return (
    <TouchableOpacity
      accessibilityLabel="Open in another wallet"
      accessibilityRole="button"
      accessibilityState={{disabled}}
      activeOpacity={0.72}
      disabled={disabled}
      // Pay with keeps a 32-point row. Extend its target into the top padding.
      hitSlop={compact ? {top: 12, bottom: 0, left: 0, right: 0} : undefined}
      onPress={onPress}
      style={[styles.action, compact && styles.compact, style, disabled && styles.disabled]}>
      <Text style={[
        theme.typography.caption,
        {color: theme.isDark ? theme.colors.textPrimary : theme.colors.primary},
      ]}>
        Open in another wallet
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  action: {minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end'},
  compact: {minHeight: 32},
  disabled: {opacity: 0.4},
});

export default OpenInAnotherWalletAction;
