import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useOnboardingTheme} from '../../../theme/onboarding';

// "via <basket>" under the Est. slippage label on Amount and Confirm (R3
// option 1, owner 2026-11-22). One line: the name gives way with a middle
// ellipsis, so its ending stays. The row's own label reads it out.
const ViaLine = ({name}) => {
  const theme = useOnboardingTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.line}>
      <Text style={[theme.typography.caption, styles.prefix, {color: theme.colors.textSecondary}]}>
        via{' '}
      </Text>
      <Text
        ellipsizeMode="middle"
        numberOfLines={1}
        style={[theme.typography.labelSm, styles.name, {color: theme.colors.textPrimary}]}>
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  line: {flexDirection: 'row', alignItems: 'flex-start', minWidth: 0},
  prefix: {flexShrink: 0},
  name: {flexShrink: 1, minWidth: 0},
});

export default ViaLine;
