import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InfoSheet from '../../../components/InfoSheet';
import InfoSheetSection, {InfoSheetRow} from '../../../components/InfoSheetSection';
import {SelectionRow} from '../../../components/SelectionSheet';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import StatusBadge, {STATUS_BADGE_TONE} from '../../../components/StatusBadge';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {
  createSelectionSheetStyles,
  deepLinkRequestReviewStyles,
} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {truncateDecimal} from '../../../utils/math';
import {
  compareRoutes,
  formatLessPercent,
  getTargetShortfall,
  getUnitPrice,
  IMPACT_LEVEL,
} from '../priceImpact';
import {getRouteName} from '../wizardUtils';
import {
  formatEstimatedAmount,
  formatUnitPrice,
  getImpactBadgeLabel,
  getImpactLossText,
} from './impactFormat';

const PriceRouteSheet = ({
  cryptoAmount,
  displayCurrency,
  estimates = {},
  estimatedOutput,
  ethereumExport,
  exportFeeDisplay,
  exportFeeLoading,
  hasExportFee,
  onClose,
  onClosed,
  onSelect,
  onUseSuggestion,
  priceImpact,
  rate,
  route,
  sourceCoin,
  target,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const infoStyles = useMemo(() => deepLinkRequestReviewStyles(theme), [theme]);
  const selectionStyles = useMemo(
    () => createSelectionSheetStyles(theme),
    [theme],
  );
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
  const entries = compareRoutes(target.routes || [], estimates);
  const {impact, level, loss, marketPrice, suggestion} = priceImpact;
  const unitPrice = target.isConversion
    ? getUnitPrice(cryptoAmount, estimatedOutput)
    : null;
  const lossText = impact == null ? null : getImpactLossText({
    displayCurrency,
    loss,
    rate,
    targetLoss: getTargetShortfall({
      amount: cryptoAmount,
      output: estimatedOutput,
      marketPrice,
    }),
    targetTicker: target.ticker,
  });
  const difference = impact == null ? null : getImpactBadgeLabel(impact);
  const differenceColor = level === IMPACT_LEVEL.DANGER
    ? theme.colors.danger
    : level === IMPACT_LEVEL.WARNING
    ? theme.colors.textPrimary
    : theme.colors.textSecondary;
  const showSuggestion = suggestion &&
    (level === IMPACT_LEVEL.WARNING || level === IMPACT_LEVEL.DANGER);
  const sourceTicker = sourceCoin.display_ticker;

  return (
    // InfoSheet supplies one SheetScrollView with its measured overflow cue,
    // a fixed 56-point Done action, and the shared 78% BottomSheetModal shell.
    <InfoSheet
      title="Price and route"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      <InfoSheetSection
        title="Price"
        rows={[
          {
            label: 'Market price',
            value: marketPrice
              ? `1 ${sourceTicker} = ${formatUnitPrice(marketPrice)} ${target.ticker}`
              : null,
          },
          {
            label: 'Your price',
            value: unitPrice
              ? `1 ${sourceTicker} = ${formatUnitPrice(unitPrice)} ${target.ticker}`
              : null,
          },
          {
            label: 'Difference',
            value: difference ? (
              <Text style={{color: differenceColor}}>
                {lossText && level !== IMPACT_LEVEL.NONE
                  ? `${lossText} (${difference})`
                  : difference}
              </Text>
            ) : null,
          },
        ]}
      />
      {entries.length > 1 ? (
        <View style={infoStyles.requestInfoSection}>
          <Text style={infoStyles.requestInfoSectionTitle}>Route</Text>
          <Text
            style={[
              theme.typography.bodySm,
              styles.routeSubtitle,
              {color: theme.colors.textSecondary},
            ]}>
            We pick the best price. You can choose another basket.
          </Text>
          {entries.map(({route: item, output, isBest, lessPercent}) => (
            <SelectionRow
              key={item.key}
              title={getRouteName(item)}
              subtitle={output
                ? `≈ ${formatEstimatedAmount(output)} ${target.ticker}`
                : Object.prototype.hasOwnProperty.call(estimates, item.key)
                ? 'Estimate unavailable.'
                : undefined}
              accessibilityLabel={[
                getRouteName(item),
                output ? `about ${formatEstimatedAmount(output)} ${target.ticker}` : null,
                isBest ? 'Best price' : lessPercent ? `${formatLessPercent(lessPercent)}% less` : null,
                item.key === route.key ? 'selected' : null,
              ].filter(Boolean).join(', ')}
              badge={isBest ? (
                <StatusBadge label="Best price" tone={STATUS_BADGE_TONE.SUCCESS} />
              ) : lessPercent ? (
                <StatusBadge label={`${formatLessPercent(lessPercent)}% less`} />
              ) : null}
              selected={item.key === route.key}
              onPress={() => dismissal.dismiss(() => onSelect(item))}
            />
          ))}
        </View>
      ) : route.via ? (
        <InfoSheetSection
          title="Route"
          rows={[{label: 'Via', value: getRouteName(route)}]}
        />
      ) : null}
      {ethereumExport ? (
        <View style={infoStyles.requestInfoSection}>
          {exportFeeLoading ? (
            <View style={infoStyles.requestInfoRow}>
              <Text style={infoStyles.requestInfoLabel}>Network fee</Text>
              <SkeletonLoader accessibilityLabel="Estimating Ethereum network fee">
                <SkeletonBlock width="60%" height={21} />
              </SkeletonLoader>
            </View>
          ) : (
            <InfoSheetRow
              label="Network fee"
              value={hasExportFee ? `≈ ${exportFeeDisplay}` : 'Fee unavailable.'}
            />
          )}
        </View>
      ) : null}
      {showSuggestion ? (
        <Pressable
          accessibilityLabel={`Use ${truncateDecimal(suggestion.amount, 8)} ${sourceTicker} instead, ${getImpactBadgeLabel(suggestion.impact)}`}
          accessibilityRole="button"
          onPress={() => dismissal.dismiss(() => onUseSuggestion(suggestion.amount))}
          style={({pressed}) => [
            selectionStyles.action,
            styles.suggestion,
            {borderColor: theme.colors.border},
            pressed && styles.pressed,
          ]}>
          <Text style={[selectionStyles.actionText, styles.suggestionLabel]}>
            Use {truncateDecimal(suggestion.amount, 8)} {sourceTicker} instead
          </Text>
          <Text
            style={[theme.typography.caption, {color: theme.colors.textSecondary}]}>
            {getImpactBadgeLabel(suggestion.impact)}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={theme.colors.textSubtle}
          />
        </Pressable>
      ) : null}
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  routeSubtitle: {marginBottom: 8},
  suggestion: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionLabel: {flex: 1, marginRight: 8},
  pressed: {opacity: 0.7},
});

export default PriceRouteSheet;
