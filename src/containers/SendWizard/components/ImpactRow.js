import React from 'react';
import {StyleSheet, Text} from 'react-native';
import StatusBadge from '../../../components/StatusBadge';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {IMPACT_LEVEL} from '../priceImpact';
import {getImpactBadgeLabel, getImpactTone} from './impactFormat';
import {FlatRow} from './WizardUI';

// The Confirm row for price impact: what it costs in money when it matters,
// then the badge.
const ImpactRow = ({impact, level, lossText}) => {
  const theme = useOnboardingTheme();
  const showLoss =
    lossText != null &&
    (level === IMPACT_LEVEL.WARNING || level === IMPACT_LEVEL.DANGER);

  return (
    <FlatRow label="Price impact">
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
          −{lossText}
        </Text>
      ) : null}
      <StatusBadge label={getImpactBadgeLabel(impact)} tone={getImpactTone(level)} />
    </FlatRow>
  );
};

const styles = StyleSheet.create({
  loss: {marginRight: 8},
});

export default ImpactRow;
