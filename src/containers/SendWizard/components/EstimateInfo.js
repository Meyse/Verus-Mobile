import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {Info} from 'lucide-react-native';
import InfoSheet from '../../../components/InfoSheet';
import {useOnboardingTheme} from '../../../theme/onboarding';

export const ESTIMATE_INFO_LABEL = 'About this amount';
export const ESTIMATE_SHEET_TITLE = 'Estimated amount';
export const ESTIMATE_SHEET_BODY =
  'The network sets the final amount when it processes your conversion. All conversions through the same basket in one block get the same price. Other conversions in that block can move your amount up or down.';

// R4 option B (owner Max, 2026-11-23): a 16-point `Info` glyph directly after
// "You receive" on Confirm and on Amount, next to an estimated amount only.
// The glyph adds 22 points of line width and no height; the 44-point touch
// target is hitSlop around it. The host row must be at least 44 points high.
export const EstimateInfoButton = ({onPress}) => {
  const {colors} = useOnboardingTheme();
  return (
    <Pressable
      accessibilityLabel={ESTIMATE_INFO_LABEL}
      accessibilityRole="button"
      hitSlop={14}
      onPress={onPress}
      style={styles.button}>
      <Info color={colors.textSubtle} size={16} strokeWidth={2} />
    </Pressable>
  );
};

// One sheet for both steps: the standard InfoSheet shell (title, text, Done).
export const EstimatedAmountSheet = ({onClose, visible}) => {
  const theme = useOnboardingTheme();
  return (
    <InfoSheet title={ESTIMATE_SHEET_TITLE} visible={visible} onClose={onClose}>
      <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>
        {ESTIMATE_SHEET_BODY}
      </Text>
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  button: {width: 16, height: 16, marginLeft: 6, alignItems: 'center', justifyContent: 'center'},
});
