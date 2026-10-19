import React from 'react';
import {Text, View} from 'react-native';
import {statusBadgeStyles as styles} from '../styles';
import {useAppTheme} from '../theme/app';
import {ONBOARDING_THEMES} from '../theme/onboarding/tokens';

export const STATUS_BADGE_TONE = {
  SUCCESS: 'success',
  WARNING: 'warning',
  NEUTRAL: 'neutral',
  DANGER: 'danger',
};

const DARK_COLORS = ONBOARDING_THEMES.dark.colors;
// The gift card material is dark in both appearances. Its neutral pair is a
// light tint of the material, as in the approved SV-1 mockup.
const CARD_NEUTRAL = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'rgba(244, 241, 233, 0.72)',
};

const getToneColors = (tone, colors) => {
  if (tone === STATUS_BADGE_TONE.SUCCESS) {
    return {backgroundColor: colors.successBackground, color: colors.success};
  }
  if (tone === STATUS_BADGE_TONE.WARNING) {
    return {backgroundColor: colors.warningBackground, color: colors.warning};
  }
  if (tone === STATUS_BADGE_TONE.DANGER) {
    return {backgroundColor: colors.dangerBackground, color: colors.danger};
  }
  return {backgroundColor: colors.surfaceMuted, color: colors.textSecondary};
};

// Tinted status pill: a semantic background with colored text and no dot.
// `variant="card"` is for the dark gift card material in both appearances.
const StatusBadge = ({
  label,
  style,
  tone = STATUS_BADGE_TONE.NEUTRAL,
  variant,
}) => {
  const theme = useAppTheme();
  const onCard = variant === 'card';
  const {backgroundColor, color} =
    onCard && tone === STATUS_BADGE_TONE.NEUTRAL
      ? CARD_NEUTRAL
      : getToneColors(tone, onCard ? DARK_COLORS : theme.colors);

  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={[styles.badge, {backgroundColor}, style]}>
      <Text numberOfLines={1} style={[styles.label, {color}]}>
        {label}
      </Text>
    </View>
  );
};

export default StatusBadge;
