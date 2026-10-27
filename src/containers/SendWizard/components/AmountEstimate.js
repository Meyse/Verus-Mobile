import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import ImpactChip from './ImpactChip';
import {formatEstimatedAmount, getImpactBadgeLabel} from './impactFormat';

// Only the receive amount and a doorway to its details stay above Continue.
// The label group can wrap its chip while the amount stays on one line.
// A pre-conversion (`atLaunch`) has no amount yet: everyone gets the price
// that the launch sets.
const AmountEstimate = ({
  atLaunch = false,
  estimateLoading,
  estimatedOutput,
  onOpenDetails,
  priceImpact,
  showDetails,
  target,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const chipLabel =
    priceImpact.impact == null || priceImpact.impact.isLessThanOrEqualTo(0)
      ? 'Details'
      : getImpactBadgeLabel(priceImpact.impact);

  return (
    <View style={[styles.estimate, {borderTopColor: colors.border}]}>
      {atLaunch ? (
        <View style={styles.receiveRow}>
          <View style={styles.receiveLabel}>
            <View style={styles.receiveLogo}>
              <AssetCoinLogo coinId={target.coinId || target.id} size={24} />
            </View>
            <Text
              numberOfLines={1}
              style={[
                theme.typography.bodySm,
                styles.receiveText,
                {color: colors.textSecondary},
              ]}>
              You receive
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[theme.typography.titleRow, {color: colors.textPrimary}]}>
            Price set at launch
          </Text>
        </View>
      ) : estimateLoading ? (
        <SkeletonLoader
          accessibilityLabel="Estimating conversion"
          style={styles.skeleton}>
          <View style={styles.skeletonRow}>
            <SkeletonBlock height={14} radius={4} width={96} />
            <SkeletonBlock height={20} radius={6} width={132} />
          </View>
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
              <ImpactChip
                accessibilityLabel={priceImpact.impact == null
                  ? 'Details. Opens price and route'
                  : `Price impact ${chipLabel}. Opens price and route`}
                label={chipLabel}
                level={priceImpact.level}
                onPress={onOpenDetails}
              />
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
                : `≈\u00A0${formatEstimatedAmount(estimatedOutput)}`}
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
  skeleton: {minHeight: 44, justifyContent: 'center'},
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flexShrink: 0,
    maxWidth: '72%',
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
