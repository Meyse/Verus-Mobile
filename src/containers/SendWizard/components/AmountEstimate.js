import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import SkeletonLoader, {SkeletonRow} from '../../../components/SkeletonLoader';
import StatusBadge from '../../../components/StatusBadge';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {
  formatEstimatedAmount,
  getImpactBadgeLabel,
  getImpactTone,
} from './impactFormat';

// Only the receive amount and a doorway to its details stay above Continue.
// The label group can wrap its chip while the amount stays on one line.
const AmountEstimate = ({
  estimateLoading,
  estimatedOutput,
  onOpenDetails,
  priceImpact,
  showDetails,
  target,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const chipLabel = priceImpact.impact == null
    ? 'Details'
    : getImpactBadgeLabel(priceImpact.impact);

  return (
    <View style={[styles.estimate, {borderTopColor: colors.border}]}>
      {estimateLoading ? (
        <SkeletonLoader
          accessibilityLabel="Estimating conversion"
          style={styles.skeleton}>
          <SkeletonRow labelWidth="28%" valueWidth="60%" />
        </SkeletonLoader>
      ) : (
        <View style={styles.receiveRow}>
          <View style={styles.receiveLabel}>
            {showDetails ? null : (
              <View style={styles.receiveLogo}>
                <AssetCoinLogo coinId={target.coinId || target.id} size={24} />
              </View>
            )}
            <Text
              numberOfLines={1}
              style={[
                theme.typography.bodySm,
                styles.receiveText,
                {color: colors.textSecondary},
              ]}>
              You receive
            </Text>
            {showDetails ? (
              <Pressable
                accessibilityLabel={priceImpact.impact == null
                  ? 'Details. Opens price and route'
                  : `Price impact ${chipLabel}. Opens price and route`}
                accessibilityRole="button"
                hitSlop={4}
                onPress={onOpenDetails}
                style={({pressed}) => [styles.chip, pressed && styles.pressed]}>
                <StatusBadge
                  label={chipLabel}
                  tone={getImpactTone(priceImpact.level)}
                />
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={14}
                  color={colors.textSubtle}
                />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.amountRow}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[styles.receiveAmount, {color: colors.textPrimary}]}>
              {estimatedOutput == null
                ? '—'
                : `≈ ${formatEstimatedAmount(estimatedOutput)}`}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                theme.typography.labelMd,
                styles.receiveTicker,
                {color: colors.textSecondary},
              ]}>
              {' '}
              {target.ticker}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  estimate: {
    paddingHorizontal: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  skeleton: {paddingVertical: 4},
  receiveRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiveLabel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flexShrink: 1,
  },
  receiveLogo: {marginRight: 10},
  receiveText: {marginRight: 8, flexShrink: 0},
  chip: {minHeight: 36, flexDirection: 'row', alignItems: 'center', flexShrink: 0},
  pressed: {opacity: 0.7},
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flexShrink: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  receiveAmount: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
    fontSize: 17,
    lineHeight: 22,
    ...fontStyle('bold'),
  },
  receiveTicker: {flexShrink: 0},
});

export default AmountEstimate;
