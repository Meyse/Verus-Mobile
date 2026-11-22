import React, {useMemo} from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {RotateCw} from 'lucide-react-native';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {SelectionRow} from '../../../components/SelectionSheet';
import SheetScrollView from '../../../components/SheetScrollView';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import StatusBadge, {STATUS_BADGE_TONE} from '../../../components/StatusBadge';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {useButtonHeight} from '../../../hooks/useButtonHeight';
import {createInfoSheetStyles, createSelectionSheetStyles} from '../../../styles';
import {COMPACT_INFO_SHEET_METRICS} from '../../../styles/components/infoSheet.styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {truncateDecimal} from '../../../utils/math';
import {
  compareRoutes,
  getTargetShortfall,
  getUnitPrice,
  IMPACT_LEVEL,
} from '../priceImpact';
import {getRouteCheckState, getRouteName} from '../wizardUtils';
import {
  formatEstimatedAmount,
  formatUnitPrice,
  getImpactBadgeLabel,
  getImpactLossText,
  SLIPPAGE_LABEL,
} from './impactFormat';

const FACT_ROW_HEIGHT = 32;
// Android's fit-to-width shrinks text that already fits, so fact values keep
// full size there and wrap to a second line (right-aligned) instead. iOS keeps
// the one-line shrink.
const FACT_VALUE_FIT_PROPS = Platform.OS === 'android'
  ? {}
  : {adjustsFontSizeToFit: true, minimumFontScale: 0.8, numberOfLines: 1};
const SUGGESTION_ROW_HEIGHT = 48;
const FACT_LIST_GAP = 8;
const SHEET_HEIGHT_SHARE = 0.78;

// Send's Amount step opens it with the routes it checked and the estimate for
// each: routes not checked yet are not listed. When more remain, the list ends
// in "Check 30 more routes" over "30 of 100 routes checked", and the best
// row says "Best so far" (R2 option A, owner 2026-11-22). Confirm
// opens it with no baskets: then it shows the price facts and the route. With
// `pay` (a VerusPay invoice), the amount received is fixed: `baskets` comes
// prepared with what each basket costs.
const PriceRouteSheet = ({
  baskets,
  checkingMore = false,
  cryptoAmount,
  displayCurrency,
  estimates = {},
  estimatedOutput,
  ethereumExport,
  exportFeeDisplay,
  exportFeeLoading,
  hasExportFee,
  onClose,
  onCheckMore,
  onClosed,
  onSelect,
  onUseSuggestion,
  pay = false,
  priceImpact,
  rate,
  route,
  sourceCoin,
  target,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const {height: windowHeight} = useWindowDimensions();
  const buttonHeight = useButtonHeight('secondary');
  const sheetStyles = useMemo(
    () => createInfoSheetStyles(theme, {compact: true}),
    [theme],
  );
  const selectionStyles = useMemo(
    () => createSelectionSheetStyles(theme),
    [theme],
  );
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
  // A checked route has an entry in `estimates`: its estimate, or null when
  // the estimate failed, which the row then says.
  // In the order Amount checked them, so on equal estimates the badge goes to
  // the route Amount chose (the one checked first).
  const allRoutes = target.routes || [];
  const routesByKey = Object.fromEntries(allRoutes.map(item => [item.key, item]));
  const checkedRoutes = Object.keys(estimates)
    .map(key => routesByKey[key])
    .filter(Boolean);
  const checkState = getRouteCheckState(
    baskets ? 0 : allRoutes.length,
    checkedRoutes.length,
  );
  const rows = baskets || compareRoutes(checkedRoutes, estimates).map(
    ({route: item, output, isBest}) => ({
      route: item,
      subtitle: output
        ? `≈ ${formatEstimatedAmount(output)} ${target.ticker}`
        : 'Estimate unavailable.',
      badgeLabel: isBest ? checkState.bestLabel : null,
      isBest,
    }),
  );
  const showCheckMore = !baskets && Boolean(onCheckMore) &&
    checkedRoutes.length > 0 && checkState.remaining > 0;
  const hasChoice = rows.length > 1 || showCheckMore;
  const {impact, level, loss, marketPrice, suggestion} = priceImpact;
  const unitPrice = target.isConversion
    ? getUnitPrice(cryptoAmount, estimatedOutput)
    : null;
  const sourceTicker = sourceCoin.display_ticker;
  const lossText = impact == null || impact.isLessThanOrEqualTo(0) ? null : getImpactLossText({
    displayCurrency,
    loss,
    rate,
    targetLoss: pay ? loss : getTargetShortfall({
      amount: cryptoAmount,
      output: estimatedOutput,
      marketPrice,
    }),
    targetTicker: pay ? sourceTicker : target.ticker,
  });
  const difference = impact == null ? null : getImpactBadgeLabel(impact, pay);
  const differenceColor = level === IMPACT_LEVEL.DANGER
    ? theme.colors.danger
    : level === IMPACT_LEVEL.WARNING
    ? theme.colors.textPrimary
    : theme.colors.textSecondary;
  const showSuggestion = suggestion &&
    (level === IMPACT_LEVEL.WARNING || level === IMPACT_LEVEL.DANGER);
  const facts = [
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
      label: SLIPPAGE_LABEL,
      value: difference
        ? lossText && level !== IMPACT_LEVEL.NONE
          ? `${lossText} (${difference})`
          : difference
        : null,
      color: differenceColor,
      emphasis: true,
    },
    {
      label: 'Route',
      value: !hasChoice && route.via ? getRouteName(route) : null,
    },
    {
      label: 'Network fee',
      loading: ethereumExport && exportFeeLoading,
      value: ethereumExport
        ? hasExportFee ? `≈ ${exportFeeDisplay}` : 'Fee unavailable.'
        : null,
    },
  ].filter(fact => fact.value != null || fact.loading);

  // Reserve every fixed row before capping the only scrollable region. Match
  // BottomSheetModal's Android window/status-bar calculation. A long basket
  // list cannot push the facts, suggestion, or Done beyond the 78% shell.
  const metrics = COMPACT_INFO_SHEET_METRICS;
  const availableHeight = windowHeight -
    (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0);
  const factsGap = hasChoice && facts.length
    ? FACT_LIST_GAP + StyleSheet.hairlineWidth : 0;
  const fixedHeight = metrics.paddingTop + metrics.headerHeight +
    metrics.headerGap + factsGap + facts.length * FACT_ROW_HEIGHT +
    (showSuggestion ? SUGGESTION_ROW_HEIGHT : 0) + metrics.actionGap +
    buttonHeight + metrics.paddingBottom;
  const listMaxHeight = Math.max(
    0,
    Math.floor(availableHeight * SHEET_HEIGHT_SHARE) - fixedHeight -
      4 - (theme.isDark ? 2 * StyleSheet.hairlineWidth : 0),
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      maxHeight="78%"
      contentContainerStyle={styles.shell}>
      <View
        style={sheetStyles.requestSheetBody}
        onAccessibilityEscape={dismissal.close}>
        <View style={[sheetStyles.requestSheetHeader, styles.fixed]}>
          <Text accessibilityRole="header" style={sheetStyles.requestSheetTitle}>
            Price and route
          </Text>
        </View>
        {hasChoice ? (
          <SheetScrollView
            style={{maxHeight: listMaxHeight}}
            contentContainerStyle={styles.baskets}>
            {rows.map(({route: item, subtitle, badgeLabel, isBest}) => {
              const name = getRouteName(item);
              return (
                <SelectionRow
                  compact
                  dense
                  key={item.key}
                  title={name}
                  subtitle={subtitle}
                  accessibilityLabel={[
                    name,
                    subtitle,
                    badgeLabel,
                    item.key === route.key ? 'selected' : null,
                  ].filter(Boolean).join(', ')}
                  badge={isBest ? (
                    <StatusBadge
                      label={badgeLabel}
                      labelStyle={theme.typography.labelDense}
                      style={styles.badge}
                      tone={STATUS_BADGE_TONE.SUCCESS}
                    />
                  ) : null}
                  selected={item.key === route.key}
                  onPress={() => dismissal.dismiss(() => onSelect(item))}
                />
              );
            })}
            {showCheckMore ? (
              <CheckMoreRow
                checked={checkedRoutes.length}
                checking={checkingMore}
                next={checkState.next}
                onPress={onCheckMore}
                total={allRoutes.length}
              />
            ) : null}
          </SheetScrollView>
        ) : null}
        <View style={styles.fixed}>
          {facts.length ? (
            <View style={[
              hasChoice && styles.factsAfterBaskets,
              {borderColor: theme.colors.border},
            ]}>
              {facts.map((fact, index) => (
                <View
                  key={fact.label}
                  style={[
                    styles.fact,
                    index < facts.length - 1 && styles.factDivider,
                    {borderColor: theme.colors.border},
                  ]}>
                  <Text style={[
                    theme.typography.caption,
                    styles.factLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                    {fact.label}
                  </Text>
                  {fact.loading ? (
                    <SkeletonLoader
                      accessibilityLabel="Estimating Ethereum network fee"
                      style={styles.feeSkeleton}>
                      <SkeletonBlock width={136} height={19} />
                    </SkeletonLoader>
                  ) : (
                    <Text
                      {...FACT_VALUE_FIT_PROPS}
                      style={[
                        fact.emphasis ? theme.typography.labelSm : theme.typography.caption,
                        styles.factValue,
                        {color: fact.color || theme.colors.textPrimary},
                      ]}>
                      {fact.value}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : null}
          {showSuggestion ? (
            <Pressable
              accessibilityLabel={`Use ${truncateDecimal(suggestion.amount, 8)} ${sourceTicker} instead. ${SLIPPAGE_LABEL} ${getImpactBadgeLabel(suggestion.impact)}`}
              accessibilityRole="button"
              onPress={() => dismissal.dismiss(() => onUseSuggestion(suggestion.amount))}
              style={({pressed}) => [
                selectionStyles.action,
                styles.suggestion,
                {borderColor: theme.colors.border},
                pressed && styles.pressed,
              ]}>
              <View style={styles.suggestionCopy}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  numberOfLines={1}
                  style={[theme.typography.labelSm, {color: theme.colors.textPrimary}]}>
                  Use {truncateDecimal(suggestion.amount, 8)} {sourceTicker} instead
                </Text>
                <Text style={[
                  theme.typography.captionDense,
                  styles.suggestionImpact,
                  {color: theme.colors.textSecondary},
                ]}>
                  {SLIPPAGE_LABEL} {getImpactBadgeLabel(suggestion.impact)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textSubtle}
              />
            </Pressable>
          ) : null}
          <AppButton
            accessibilityLabel="Done"
            labelStyle={theme.typography.titleRow}
            onPress={dismissal.close}
            style={sheetStyles.requestSheetActionButton}
            variant="secondary">
            Done
          </AppButton>
        </View>
      </View>
    </BottomSheetModal>
  );
};

// The end of the list while routes remain unchecked. It looks like a route
// row (SelectionRow compact dense) without fill, with a full outline and the
// action in `link`; while it checks, the title says so and the list keeps its
// rows. A tap checks the next 30 oldest routes.
const CheckMoreRow = ({checked, checking, next, onPress, total}) => {
  const theme = useOnboardingTheme();
  const rowStyles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const title = checking
    ? `Checking ${next} ${next === 1 ? 'route' : 'routes'}…`
    : `Check ${next} more ${next === 1 ? 'route' : 'routes'}`;
  const count = `${checked} of ${total} routes checked`;
  return (
    <Pressable
      accessibilityLabel={`${title}. ${count}`}
      accessibilityRole="button"
      accessibilityState={{busy: checking, disabled: checking}}
      disabled={checking}
      hitSlop={{top: 2, bottom: 2}}
      onPress={onPress}
      style={({pressed}) => [
        rowStyles.row,
        rowStyles.compactRow,
        rowStyles.denseRow,
        styles.checkMore,
        {borderColor: theme.colors.border},
        pressed && styles.pressed,
      ]}>
      <View style={rowStyles.copy}>
        <Text
          numberOfLines={1}
          style={[
            rowStyles.denseTitle,
            {color: checking ? theme.colors.textSecondary : theme.colors.link},
          ]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[rowStyles.rowSubtitle, rowStyles.compactSubtitle, rowStyles.denseSubtitle]}>
          {count}
        </Text>
      </View>
      <View style={[rowStyles.indicator, rowStyles.compactIndicator]}>
        {checking ? null : (
          <RotateCw color={theme.colors.link} size={18} strokeWidth={2.2} />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // SemiModal supplies 10 points by default. This sheet owns its 12-point top inset.
  shell: {paddingTop: 0},
  fixed: {flexShrink: 0},
  baskets: {paddingVertical: 2, gap: 4},
  badge: {paddingHorizontal: 6, paddingVertical: 2},
  factsAfterBaskets: {marginTop: FACT_LIST_GAP, borderTopWidth: StyleSheet.hairlineWidth},
  fact: {
    minHeight: FACT_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  factDivider: {borderBottomWidth: StyleSheet.hairlineWidth},
  factLabel: {flexShrink: 0, marginRight: 8},
  factValue: {flex: 1, minWidth: 0, textAlign: 'right'},
  feeSkeleton: {flex: 1, alignItems: 'flex-end'},
  suggestion: {minHeight: SUGGESTION_ROW_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth},
  suggestionCopy: {flex: 1, marginRight: 8},
  suggestionImpact: {marginRight: 6},
  pressed: {opacity: 0.7},
  // No fill and a full 1-point outline. The padding gives up that point, so
  // the text lines up with the route rows.
  checkMore: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingLeft: 11,
    paddingRight: 7,
    paddingVertical: 4,
  },
});

export default PriceRouteSheet;
