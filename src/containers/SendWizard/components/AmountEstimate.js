import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import SkeletonLoader, {SkeletonRow} from '../../../components/SkeletonLoader';
import StatusBadge, {STATUS_BADGE_TONE} from '../../../components/StatusBadge';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {truncateDecimal} from '../../../utils/math';
import {
  formatImpact,
  formatLessPercent,
  getTargetShortfall,
  getUnitPrice,
  IMPACT_LEVEL,
} from '../priceImpact';
import {
  formatEstimatedAmount,
  formatUnitPrice,
  getImpactBadgeLabel,
  getImpactLossText,
  getImpactTone,
} from './impactFormat';

const Row = ({children, label, onPress, theme}) => {
  const content = (
    <>
      <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>
        {label}
      </Text>
      {children}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
};

// The conversion estimate under the amount. It says what the user receives,
// the price, and, when the amount is large for the route, what that costs in
// money. It stays flat: hairline rows, no card.
const AmountEstimate = ({
  cryptoAmount,
  displayCurrency,
  estimateLoading,
  estimatedOutput,
  ethereumExport,
  exportFeeDisplay,
  exportFeeLoading,
  hasExportFee,
  onOpenRoute,
  onUseSuggestion,
  priceImpact,
  rate,
  routeChoice,
  sourceCoin,
  target,
  validAmount,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const {impact, level, loss, marketPrice, suggestion} = priceImpact;
  const sourceTicker = sourceCoin.display_ticker;
  const hairline = [styles.hairline, {backgroundColor: colors.border}];

  const unitPrice =
    estimatedOutput != null && cryptoAmount.isFinite()
      ? getUnitPrice(cryptoAmount, estimatedOutput)
      : null;
  const lossValue = getImpactLossText({
    displayCurrency,
    loss,
    rate,
    targetLoss:
      estimatedOutput != null && cryptoAmount.isFinite() && marketPrice
        ? getTargetShortfall({
            amount: cryptoAmount,
            output: estimatedOutput,
            marketPrice,
          })
        : null,
    targetTicker: target.ticker,
  });
  const lossIsVisible = lossValue != null;
  const emphasis =
    level === IMPACT_LEVEL.DANGER || level === IMPACT_LEVEL.WARNING;

  return (
    <View style={styles.estimate}>
      {target.isConversion && estimateLoading ? (
        <SkeletonLoader
          accessibilityLabel="Estimating conversion"
          style={styles.skeleton}>
          <SkeletonRow labelWidth="28%" valueWidth="60%" />
          <SkeletonRow labelWidth="28%" valueWidth="45%" />
        </SkeletonLoader>
      ) : null}

      {target.isConversion && !estimateLoading && estimatedOutput != null ? (
        <>
          <View style={styles.receiveRow}>
            <View style={styles.receiveLabel}>
              <AssetCoinLogo coinId={target.coinId || target.id} size={24} />
              <Text
                style={[
                  theme.typography.bodySm,
                  styles.receiveText,
                  {color: colors.textSecondary},
                ]}>
                You receive
              </Text>
            </View>
            <View style={styles.receiveValue}>
              <Text style={[styles.receiveAmount, {color: colors.textPrimary}]}>
                ≈ {formatEstimatedAmount(estimatedOutput)}
                <Text style={[styles.receiveTicker, {color: colors.textSecondary}]}>
                  {' '}
                  {target.ticker}
                </Text>
              </Text>
              {unitPrice ? (
                <Text
                  style={[
                    theme.typography.caption,
                    {color: colors.textSecondary},
                  ]}>
                  1 {sourceTicker} = {formatUnitPrice(unitPrice)} {target.ticker}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={hairline} />
          {emphasis ? (
            <>
              <View style={styles.impactRow}>
                <Text
                  style={[
                    theme.typography.labelMd,
                    styles.impactText,
                    {
                      color:
                        level === IMPACT_LEVEL.DANGER
                          ? colors.danger
                          : colors.textPrimary,
                    },
                  ]}>
                  {lossValue
                    ? `${lossValue} less than the market price`
                    : 'Less than the market price'}
                </Text>
                <StatusBadge
                  label={getImpactBadgeLabel(impact)}
                  tone={getImpactTone(level)}
                />
              </View>
              {suggestion ? (
                <Pressable
                  accessibilityLabel={`Use ${truncateDecimal(
                    suggestion.amount,
                    8,
                  )} ${sourceTicker} instead, ${formatImpact(
                    suggestion.impact,
                  )}% less`}
                  accessibilityRole="button"
                  onPress={() => onUseSuggestion(suggestion.amount)}
                  style={({pressed}) => [
                    styles.suggestion,
                    {
                      backgroundColor: theme.isDark
                        ? colors.surfaceMuted
                        : colors.primaryBackground,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      theme.typography.labelMd,
                      styles.suggestionLabel,
                      {color: theme.isDark ? colors.textPrimary : colors.primary},
                    ]}>
                    Use {truncateDecimal(suggestion.amount, 8)} {sourceTicker} instead
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      theme.typography.caption,
                      {color: theme.isDark ? colors.textSecondary : colors.primary},
                    ]}>
                    {formatImpact(suggestion.impact)}% less
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : level === IMPACT_LEVEL.QUIET && lossIsVisible ? (
            <Text
              style={[
                theme.typography.caption,
                styles.quietLine,
                {color: colors.textSecondary},
              ]}>
              {lossValue} less than the market price
            </Text>
          ) : null}
          {routeChoice ? (
            <Row label="Via" onPress={onOpenRoute} theme={theme}>
              <View style={styles.routeValue}>
                <Text
                  numberOfLines={1}
                  style={[
                    theme.typography.labelMd,
                    styles.routeName,
                    {color: colors.textPrimary},
                  ]}>
                  {routeChoice.name}
                </Text>
                {routeChoice.isBest ? (
                  <StatusBadge
                    label="Best price"
                    tone={STATUS_BADGE_TONE.SUCCESS}
                  />
                ) : routeChoice.lessPercent ? (
                  <StatusBadge
                    label={`${formatLessPercent(routeChoice.lessPercent)}% less`}
                  />
                ) : null}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.textSubtle}
                />
              </View>
            </Row>
          ) : null}
        </>
      ) : null}

      {target.isConversion && !validAmount && marketPrice ? (
        <>
          <View style={hairline} />
          <Row label="Market price" theme={theme}>
            <Text style={[theme.typography.bodySm, {color: colors.textSecondary}]}>
              1 {sourceTicker} = {formatUnitPrice(marketPrice)} {target.ticker}
            </Text>
          </Row>
        </>
      ) : null}

      {ethereumExport ? (
        <>
          <View style={hairline} />
          {exportFeeLoading ? (
            <SkeletonLoader
              accessibilityLabel="Estimating Ethereum network fee"
              style={styles.skeleton}>
              <SkeletonRow labelWidth="50%" valueWidth="42%" />
            </SkeletonLoader>
          ) : (
            <Row label="Ethereum network fee" theme={theme}>
              <Text style={[theme.typography.labelMd, {color: colors.textPrimary}]}>
                {hasExportFee ? `≈ ${exportFeeDisplay}` : 'Fee unavailable.'}
              </Text>
            </Row>
          )}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  estimate: {paddingHorizontal: 4, marginTop: 6, marginBottom: 10},
  skeleton: {paddingVertical: 4},
  hairline: {height: StyleSheet.hairlineWidth, marginTop: 2},
  receiveRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiveLabel: {flexDirection: 'row', alignItems: 'center'},
  receiveText: {marginLeft: 10},
  receiveValue: {alignItems: 'flex-end', flexShrink: 1, marginLeft: 12},
  receiveAmount: {fontSize: 17, lineHeight: 22, ...fontStyle('bold')},
  receiveTicker: {fontSize: 14, ...fontStyle('semiBold')},
  impactRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impactText: {flexShrink: 1, marginRight: 8},
  suggestion: {
    minHeight: 40,
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionLabel: {flexShrink: 1, marginRight: 8},
  pressed: {opacity: 0.7},
  quietLine: {marginTop: 12},
  row: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeValue: {flexDirection: 'row', alignItems: 'center', flexShrink: 1},
  routeName: {flexShrink: 1, marginRight: 8},
});

export default AmountEstimate;
