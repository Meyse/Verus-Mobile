import React from 'react';
import {StyleSheet, Text} from 'react-native';
import StatusBadge from '../../../components/StatusBadge';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {formatImpact, IMPACT_LEVEL} from '../priceImpact';
import {
  getImpactBadgeLabel,
  getImpactTone,
  SLIPPAGE_LABEL,
  SLIPPAGE_LABEL_SHORT,
} from './impactFormat';
import {FlatRow} from './WizardUI';

// The Confirm row for the estimated slippage: what it costs in money when it matters,
// then the badge. "Details" stands in for an unknown impact, as on Amount.
// `onPress` opens "Price and route", where the route shows.
const ImpactRow = ({impact, level, lossText, onPress, pay = false}) => {
  const theme = useOnboardingTheme();
  const showLoss =
    lossText != null &&
    (level === IMPACT_LEVEL.WARNING || level === IMPACT_LEVEL.DANGER);

  return (
    <FlatRow
      accessibilityLabel={`${SLIPPAGE_LABEL} ${impact == null ? 'Details' : getImpactBadgeLabel(impact)}. Opens price and route`}
      copyValue={impact == null ? undefined : formatImpact(impact)}
      label={SLIPPAGE_LABEL_SHORT}
      onPress={onPress}>
      {showLoss ? (
        <Text
          style={[
            theme.typography.labelMd,
            styles.loss,
            {
              color:
                level === IMPACT_LEVEL.DANGER
                  ? theme.colors.danger
                  : theme.colors.textPrimary,
            },
          ]}>
          {lossText}
        </Text>
      ) : null}
      <StatusBadge
        label={impact == null ? 'Details' : getImpactBadgeLabel(impact, pay)}
        tone={getImpactTone(level)}
      />
    </FlatRow>
  );
};

const styles = StyleSheet.create({
  loss: {marginRight: 8},
});

export default ImpactRow;
