import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import StatusBadge from '../../../components/StatusBadge';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {IMPACT_LEVEL} from '../priceImpact';
import ViaLine from './ViaLine';
import {FlatRow} from './WizardUI';
import {
  formatEstimatedAmount,
  getImpactChipLabel,
  getImpactTone,
  getSlippageRowLabel,
  SLIPPAGE_LABEL_SHORT,
} from './impactFormat';

// The receive block stays above Continue. Only the name gives way to the
// amount. A single-line middle ellipsis preserves the suffix on Android too.
// `via` names the basket of the route chosen after the estimates arrived; it
// shows under "Est. slippage" (R3 option 1, owner 2026-11-22). While the
// estimate loads, `viaRoutes` (the target has basket routes) gives the
// skeleton that row's 52-point height. `estimateFailed`: the estimate failed
// and the target has a choice of routes, so the row stays as "Details" and
// still opens "Price and route" (orchestrator 2026-11-22).
const AmountEstimate = ({
  atLaunch = false,
  estimateFailed = false,
  estimateLoading,
  estimatedOutput,
  moneyValue,
  onOpenDetails,
  priceImpact,
  showDetails,
  target,
  via = null,
  viaRoutes = false,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const quiet = estimateFailed || priceImpact.impact == null ||
    priceImpact.level === IMPACT_LEVEL.NONE;
  const chipLabel = getImpactChipLabel(estimateFailed ? null : priceImpact.impact);

  return (
    <View style={[styles.estimate, {borderTopColor: colors.border}]}>
      {estimateLoading && !atLaunch ? (
        <SkeletonLoader accessibilityLabel="Estimating conversion">
          <View style={styles.receiveRow}>
            <SkeletonBlock height={32} radius={16} width={32} />
            <View style={styles.skeletonName}>
              <SkeletonBlock height={18} radius={4} width={80} />
              <SkeletonBlock height={14} radius={4} width={68} />
            </View>
            <View style={styles.amountColumn}>
              <SkeletonBlock height={22} radius={4} width={132} />
              <SkeletonBlock height={14} radius={4} width={80} />
            </View>
          </View>
          <View style={[
            styles.skeletonImpact,
            viaRoutes && styles.skeletonImpactVia,
            {borderTopColor: colors.border},
          ]}>
            {viaRoutes ? (
              <View style={styles.skeletonLabel}>
                <SkeletonBlock height={14} radius={4} width={104} />
                <SkeletonBlock height={12} radius={4} width={150} />
              </View>
            ) : (
              <SkeletonBlock height={18} radius={4} width={88} />
            )}
            <SkeletonBlock height={24} radius={12} width={54} />
          </View>
        </SkeletonLoader>
      ) : (
        <>
          <View style={styles.receiveRow}>
            <View style={styles.receiveLogo}>
              <AssetCoinLogo coinId={target.coinId || target.id} size={32} />
            </View>
            <View style={styles.nameColumn}>
              <Text
                accessibilityLabel={target.name || target.ticker}
                ellipsizeMode="middle"
                numberOfLines={1}
                style={[theme.typography.titleRow, {color: colors.textPrimary}]}>
                {target.name || target.ticker}
              </Text>
              <Text style={[theme.typography.caption, {color: colors.textSecondary}]}>
                You receive
              </Text>
            </View>
            <View style={styles.amountColumn}>
              <Text style={[
                atLaunch ? theme.typography.titleRow : styles.receiveAmount,
                {color: colors.textPrimary},
              ]}>
                {atLaunch ? 'Price set at launch' : estimatedOutput == null
                  ? '—' : `≈\u00A0${formatEstimatedAmount(estimatedOutput)}`}
              </Text>
              {!atLaunch && estimatedOutput != null && moneyValue != null ? (
                <Text style={[theme.typography.caption, {color: colors.textSecondary}]}>
                  {moneyValue}
                </Text>
              ) : null}
            </View>
          </View>
          {!atLaunch && (estimatedOutput != null || estimateFailed) && showDetails ? (
            <View style={{borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth}}>
              <FlatRow
                accessibilityLabel={getSlippageRowLabel(chipLabel, via)}
                detail={via ? <ViaLine name={via} /> : null}
                label={SLIPPAGE_LABEL_SHORT}
                onPress={onOpenDetails}>
                <StatusBadge
                  label={chipLabel}
                  tone={getImpactTone(quiet ? IMPACT_LEVEL.NONE : priceImpact.level)}
                />
              </FlatRow>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  estimate: {paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth},
  receiveRow: {minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center'},
  receiveLogo: {marginRight: 10, flexShrink: 0},
  nameColumn: {flex: 1, minWidth: 0, marginRight: 8},
  amountColumn: {flexShrink: 0, alignItems: 'flex-end', gap: 2},
  receiveAmount: {fontSize: 17, lineHeight: 22, ...fontStyle('bold'), textAlign: 'right'},
  skeletonName: {flex: 1, marginHorizontal: 10, gap: 4},
  skeletonImpact: {
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonImpactVia: {minHeight: 52},
  skeletonLabel: {gap: 5},
});

export default AmountEstimate;
