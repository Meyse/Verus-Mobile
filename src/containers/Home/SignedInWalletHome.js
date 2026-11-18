/* eslint no-use-before-define: ["error", {"functions": true, "classes": true, "variables": false}] -- Home keeps its shared styles below the component. */
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {FlatList, RefreshControl} from 'react-native-gesture-handler';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {SafeAreaView} from 'react-native-safe-area-context';
import {homeValueChartStyles as chartStyles} from '../../styles';
import {change, label, percentNumber, pillText, spanText} from '../../utils/portfolioHistory/chartMath';
import useHomeChartPreference from '../../utils/portfolioHistory/useHomeChartPreference';
import HomeValueChart, {homeValueChartHistoryPropType} from './components/HomeValueChart';
import PrivacyBlurredText from '../../components/PrivacyBlurredText';
import SignedInActionBar from '../../components/SignedInActionBar';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {getAssetPresentation} from '../../utils/assets/assetPresentation';
import {DisplayCurrencySheet} from './components/SignedInWalletSheets';
import NotificationWidget from './HomeWidgets/NotificationWidget';
import HomeNotice, {HOME_NOTICE_SYNC} from './HomeWidgets/HomeNotice';
import SkeletonLoader, {SkeletonBlock} from '../../components/SkeletonLoader';
import WalletSetupLogoSlot from '../../components/WalletSetup/WalletSetupLogoSlot';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useLatestCallback} from '../../hooks/useLatestCallback';

const HEADER_DIVIDER_THRESHOLD = 1;
const ICON_HIT_SLOP = {top: 10, bottom: 10, left: 10, right: 10};
const REVEAL_BALANCE_DURATION = 220;
const CONCEAL_BALANCE_DURATION = 160;

const getCurrencyParts = (amount, currency) => {
  const rounded = BigNumber(amount || 0).decimalPlaces(2, BigNumber.ROUND_HALF_UP);
  const [, valueWithoutSymbol, symbol] = formatCurrency({
    amount: rounded.toFixed(2),
    code: currency,
  });

  return {
    symbol: symbol || currency,
    value: valueWithoutSymbol.trim(),
  };
};

const formatFiat = (amount, currency) => {
  const rounded = BigNumber(amount || 0).decimalPlaces(2, BigNumber.ROUND_HALF_UP);
  return formatCurrency({amount: rounded.toFixed(2), code: currency})[0];
};

const useBalanceRevealProgress = showBalance => {
  const progress = useRef(new Animated.Value(showBalance ? 1 : 0)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduceMotionEnabled => {
        reduceMotionRef.current = reduceMotionEnabled;
      },
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (active) {
          reduceMotionRef.current = reduceMotionEnabled;
        }
      })
      .catch(() => {
        if (active) {
          reduceMotionRef.current = false;
        }
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    progress.stopAnimation();
    const nextValue = showBalance ? 1 : 0;

    if (reduceMotionRef.current) {
      progress.setValue(nextValue);
      return undefined;
    }

    const animation = Animated.timing(progress, {
      toValue: nextValue,
      duration: showBalance
        ? REVEAL_BALANCE_DURATION
        : CONCEAL_BALANCE_DURATION,
      easing: showBalance
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [progress, showBalance]);

  return progress;
};

const PortfolioBalance = React.memo(React.forwardRef(({
  amount,
  currency,
  revealProgress,
  showBalance,
  theme,
  history,
  chartExpanded,
  onSelectCurrency,
}, ref) => {
  const [scrub, setScrub] = useState(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [amountWidth, setAmountWidth] = useState(0);
  const [symbolWidth, setSymbolWidth] = useState(0);
  const [pillWidth, setPillWidth] = useState(0);
  useImperativeHandle(ref, () => ({setScrub: point => setScrub(point)}), []);
  const value = (scrub?.v ?? amount) == null ? {symbol: '', value: '—'} : getCurrencyParts(scrub?.v ?? amount, currency);
  const restValue = amount == null ? {symbol: '', value: '—'} : getCurrencyParts(amount, currency);
  const compactHeader = history?.state !== 'none';
  const chart = history?.state === 'chart';
  const stripScrub = scrub != null && !chartExpanded;
  const percent = history?.series ? change(history.series.points) : null;
  const hasPill = chart && (history.loading || percent != null);
  const hasAccessory = hasPill || stripScrub;
  const wrapped = hasAccessory && availableWidth > 0
    && amountWidth + symbolWidth + 4 + pillWidth + 8 > availableWidth;
  const span = chart ? spanText(history.range, history.series.partial, history.record.start, history.now) : '';

  return (
    <View
      onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}
      style={[styles.heroValueRow, compactHeader && chartStyles.compactAmountRow, wrapped && chartStyles.wrap]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change display currency"
        onPress={onSelectCurrency}
        style={[styles.balanceTouchable, hasAccessory && chartStyles.amountWithPill,
          wrapped && chartStyles.amountFullRow]}>
        <View style={chartStyles.amountGroup}>
          <PrivacyBlurredText
            blurRadius={6}
            color={theme.colors.textPrimary}
            containerStyle={styles.heroSymbolFrame}
            hidden={!showBalance}
            revealProgress={revealProgress}
            style={styles.heroSymbol}>
            {value.symbol}
          </PrivacyBlurredText>
          <PrivacyBlurredText
            adjustsFontSizeToFit
            blurRadius={11}
            color={theme.colors.textPrimary}
            containerStyle={styles.heroAmountFrame}
            hidden={!showBalance}
            minimumFontScale={0.35}
            numberOfLines={1}
            revealProgress={revealProgress}
            style={styles.heroAmount}
          >
            {value.value}
          </PrivacyBlurredText>
        </View>
      </Pressable>
      {hasAccessory && (
        <View
          onLayout={(event) => setPillWidth(event.nativeEvent.layout.width)}
          accessibilityElementsHidden={scrub != null && !stripScrub}
          importantForAccessibility={scrub != null && !stripScrub ? 'no-hide-descendants' : 'auto'}
          style={[chartStyles.pillSlot, wrapped && chartStyles.pillBelow,
            scrub != null && !stripScrub && chartStyles.hidden]}
        >
          {stripScrub && (
            <Text style={[theme.typography.labelSm, chartStyles.tabular, chartStyles.scrubDate,
              { color: theme.colors.textSecondary }]}>
              {label(scrub, history.now)}
            </Text>
          )}
          {!stripScrub && (history.loading ? (
            <SkeletonLoader accessibilityLabel="Loading value change">
              <SkeletonBlock width={64} height={24} radius={12} />
            </SkeletonLoader>
          ) : (
            <StatusBadge
              label={pillText(percent)}
              tone={percent >= 0 ? 'success' : 'danger'}
              accessibilityLabel={`${percent >= 0 ? 'Up' : 'Down'} ${percentNumber(percent)} percent ${span}`}
              style={chartStyles.pill}
              labelStyle={[theme.typography.labelSm, chartStyles.tabular]}
            />
          ))}
        </View>
      )}
      {hasAccessory && (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text
            numberOfLines={1}
            style={[styles.heroAmount, chartStyles.measure]}
            onTextLayout={(event) => setAmountWidth(event.nativeEvent.lines[0]?.width || 0)}
          >
            {restValue.value}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.heroSymbol, chartStyles.measure]}
            onTextLayout={(event) => setSymbolWidth(event.nativeEvent.lines[0]?.width || 0)}
          >
            {restValue.symbol}
          </Text>
        </View>
      )}
    </View>
  );
}));

PortfolioBalance.displayName = 'PortfolioBalance';
PortfolioBalance.propTypes = {
  theme: PropTypes.shape({
    colors: PropTypes.shape({textPrimary: PropTypes.string, textSecondary: PropTypes.string}),
    typography: PropTypes.shape({labelSm: PropTypes.shape({})}),
  }).isRequired,
  history: homeValueChartHistoryPropType.isRequired,
  chartExpanded: PropTypes.bool.isRequired,
  onSelectCurrency: PropTypes.func.isRequired,
};

// While the saved chart record loads, the header keeps its loaded layout with
// skeletons in place of the amount and the value badge.
const PortfolioBalanceSkeleton = ({compactHeader}) => (
  <SkeletonLoader
    accessibilityLabel="Loading your balance"
    style={[styles.heroValueRow, compactHeader && chartStyles.compactAmountRow]}>
    <View style={styles.skeletonRow}>
      <SkeletonBlock width={148} height={32} style={styles.heroAmountSkeleton} />
      {compactHeader && (
        <View style={chartStyles.pillSlot}>
          <SkeletonBlock width={64} height={24} radius={12} />
        </View>
      )}
    </View>
  </SkeletonLoader>
);

// The chart's space while its saved record loads: the same heights and plot
// inset as the chart's own loading state, without its controls.
const ChartStripSkeleton = ({expanded}) => {
  const {height: windowHeight} = useWindowDimensions();
  const compact = windowHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  const stripHeight = compact ? 44 : 48;
  const openHeight = compact ? 108 : 124;
  const rangeHeight = compact ? 40 : 44;
  const height = expanded ? openHeight : stripHeight;
  const top = expanded ? 28 : 8;

  return (
    <View style={chartStyles.block}>
      <View style={[chartStyles.plot, expanded ? null : styles.closedStripPlot]}>
        <SkeletonLoader
          accessibilityLabel="Loading value history"
          style={[chartStyles.skeleton, {height, paddingTop: top}]}>
          <SkeletonBlock height={height - top - 8} />
        </SkeletonLoader>
        {expanded && <View style={{height: rangeHeight}} />}
      </View>
    </View>
  );
};

// One asset row. It takes only display values, so a balance result draws
// again only the row whose values changed.
const HomeAssetRow = React.memo(({
  coinId,
  logoId,
  badgeTicker,
  name,
  ticker,
  accessibilityLabel,
  cryptoAmountText,
  fiatText,
  rateText,
  prelaunchBadge,
  preconvertedText,
  showBalance,
  revealProgress,
  theme,
  onOpen,
}) => {
  const fiatUnavailable = fiatText === 'N/A';

  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => onOpen(coinId)}
      style={styles.assetRow}>
      <WalletSetupLogoSlot coinId={coinId} style={styles.logoWrap}>
        <AssetCoinLogo coinId={logoId} badgeTicker={badgeTicker} size={38} />
      </WalletSetupLogoSlot>
      <View style={styles.assetCopy}>
        <View style={styles.assetLine}>
          <Text
            numberOfLines={2}
            style={[
              theme.typography.titleRow,
              styles.assetName,
              {color: theme.colors.textPrimary},
            ]}>
            {name}
          </Text>
          {prelaunchBadge ? (
            <StatusBadge label={prelaunchBadge} style={styles.prelaunchBadge} />
          ) : fiatUnavailable ? (
            <Text
              numberOfLines={1}
              style={[styles.fiatUnavailable, {color: theme.colors.textSubtle}]}>
              {fiatText}
            </Text>
          ) : (
            <PrivacyBlurredText
              blurRadius={5}
              color={theme.colors.textPrimary}
              hidden={!showBalance}
              numberOfLines={1}
              revealProgress={revealProgress}
              style={styles.fiatValue}>
              {fiatText}
            </PrivacyBlurredText>
          )}
        </View>
        {preconvertedText ? (
          <View style={[styles.assetLine, styles.assetSecondaryLine]}>
            <PrivacyBlurredText
              blurRadius={5}
              color={theme.colors.textSecondary}
              hidden={!showBalance}
              numberOfLines={1}
              revealProgress={revealProgress}
              style={theme.typography.bodySm}>
              {preconvertedText}
            </PrivacyBlurredText>
          </View>
        ) : (
          <View style={[styles.assetLine, styles.assetSecondaryLine]}>
            <View style={styles.cryptoValue}>
              <PrivacyBlurredText
                blurRadius={5}
                color={theme.colors.textSecondary}
                hidden={!showBalance}
                revealProgress={revealProgress}
                style={theme.typography.bodySm}>
                {cryptoAmountText}
              </PrivacyBlurredText>
              <Text
                numberOfLines={1}
                style={[
                  theme.typography.bodySm,
                  styles.cryptoTicker,
                  {color: theme.colors.textSecondary},
                ]}>
                {ticker}
              </Text>
            </View>
            {rateText ? (
              <Text
                numberOfLines={1}
                style={[
                  theme.typography.bodySm,
                  styles.fiatRate,
                  {color: theme.colors.textSubtle},
                ]}>
                {rateText}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// The balance, its actions and the notices. It draws again only when one of
// its own values changes, not on each asset balance result.
const HomeHeader = React.memo(({
  amountRef,
  compactHeader,
  displayCurrency,
  dividerOpacity,
  history,
  homeNotice,
  hydrated,
  loading,
  chartExpanded,
  revealProgress,
  actionsOpacity,
  showBalance,
  stripScrubbing,
  theme,
  totalFiatBalance,
  onDismissFoundAssets,
  onDismissSyncNotice,
  onManageAssets,
  onReceive,
  onRefresh,
  onReviewFoundAssets,
  onSelectCurrency,
  onToggleBalance,
}) => {
  const [noticeHeight, setNoticeHeight] = useState(0);

  return (
    <View style={[styles.header, {backgroundColor: theme.colors.background}]}>
      <View style={[styles.balanceRow, compactHeader && chartStyles.compactBalanceRow]}>
        <View style={styles.balanceTouchable}>
          {hydrated ? (
            <PortfolioBalance
              ref={amountRef}
              amount={totalFiatBalance}
              currency={displayCurrency}
              revealProgress={revealProgress}
              showBalance={showBalance}
              theme={theme}
              history={history}
              chartExpanded={chartExpanded}
              onSelectCurrency={onSelectCurrency}
            />
          ) : (
            <PortfolioBalanceSkeleton compactHeader={compactHeader} />
          )}
        </View>
        <Animated.View
          pointerEvents={stripScrubbing ? 'none' : 'auto'}
          accessibilityElementsHidden={stripScrubbing}
          importantForAccessibility={stripScrubbing ? 'no-hide-descendants' : 'auto'}
          style={[styles.balanceActions, { opacity: actionsOpacity }]}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={showBalance ? 'Hide balances' : 'Show balances'}
            hitSlop={ICON_HIT_SLOP}
            onPress={onToggleBalance}
            style={[styles.iconButton, styles.balanceToggle]}>
            <MaterialCommunityIcons
              name={showBalance ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Manage assets"
            hitSlop={ICON_HIT_SLOP}
            onPress={onManageAssets}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </Animated.View>
      </View>
      <View
        onLayout={(event) => setNoticeHeight(event.nativeEvent.layout.height)}
        // A Home notice takes the gap in its first frame; the measure covers the other cards.
        style={compactHeader && (homeNotice != null || noticeHeight > 0) ? {marginTop: 20} : undefined}
      >
        <HomeNotice
          loading={loading}
          notice={homeNotice}
          onReceive={onReceive}
          onDismiss={homeNotice?.kind === HOME_NOTICE_SYNC ? onDismissSyncNotice : onDismissFoundAssets}
          onRetry={onRefresh}
          onReview={onReviewFoundAssets}
        />
        <NotificationWidget followsHomeNotice={homeNotice != null} />
      </View>
      {/* The line shows once the list scrolls. It changes no layout and no React state. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.headerDivider, {backgroundColor: theme.colors.border, opacity: dividerOpacity}]}
      />
    </View>
  );
});

PortfolioBalanceSkeleton.displayName = 'PortfolioBalanceSkeleton';
ChartStripSkeleton.displayName = 'ChartStripSkeleton';
HomeAssetRow.displayName = 'HomeAssetRow';
HomeHeader.displayName = 'HomeHeader';

const MemoActionBar = React.memo(SignedInActionBar);
const MemoDisplayCurrencySheet = React.memo(DisplayCurrencySheet);

const getAssetRowValues = (item, showBalance, displayCurrency) => {
  const presentation = item.presentation || getAssetPresentation(item.coin);
  const crypto = BigNumber(item.balance || 0);
  const cryptoAmountText = item.balance == null ? '—' : `${item.balanceComplete ? '' : '≥ '}${crypto
    .decimalPlaces(4, BigNumber.ROUND_DOWN)
    .toFixed(4)}`;
  const cryptoText = showBalance
    ? `${cryptoAmountText} ${presentation.ticker}`
    : 'balance hidden';
  const rateText = item.rate == null ? null : formatFiat(item.rate, displayCurrency);
  const fiatText = item.fiatValue != null ? formatFiat(item.fiatValue, displayCurrency) : 'N/A';
  // Before its launch an asset has no price. The row says when it launches
  // and what this wallet pre-converted to it.
  const prelaunch = item.prelaunch;
  const accessibilityLabel = prelaunch
    ? [
        presentation.name,
        prelaunch.preconverted
          ? showBalance
            ? `${prelaunch.preconverted} pre-converted`
            : 'balance hidden'
          : cryptoText,
        prelaunch.badge,
      ].join(', ')
    : `${presentation.name}, ${cryptoText}`;

  return {
    presentation,
    cryptoAmountText,
    rateText,
    fiatText,
    accessibilityLabel,
    prelaunchBadge: prelaunch?.badge || null,
    preconvertedText: prelaunch?.preconverted ? `${prelaunch.preconverted} pre-converted` : null,
  };
};

const SignedInWalletHome = ({
  assets,
  hiddenAssetCount = 0,
  assetsReady = true,
  assetsLoadError = false,
  homeNotice = null,
  displayCurrency,
  loading,
  showBalance,
  totalFiatBalance,
  history,
  onToggleBalance,
  onSelectDisplayCurrency,
  onRefresh,
  onOpenAsset,
  convertAvailable,
  receiveAvailable,
  sendAvailable,
  onReceive,
  onConvert,
  onSend,
  onManageAssets,
  onReviewFoundAssets,
  onDismissFoundAssets,
  onDismissSyncNotice,
}) => {
  const theme = useOnboardingTheme();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { expanded: chartExpanded, hydrated: preferenceHydrated, setExpanded } = useHomeChartPreference();
  const hydrated = history.hydrated && preferenceHydrated;
  const dividerRef = useRef(false);
  const dividerOpacity = useRef(new Animated.Value(0)).current;
  const panRef = useRef(null);
  const amountRef = useRef(null);
  const scrubRef = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);
  // Before the saved record is read, keep the chart's space when the wallet
  // can have a chart at all, so the header does not jump.
  const compactHeader = hydrated ? history?.state !== 'none' : history.hasPrice === true;
  const onScrub = useCallback((point) => {
    amountRef.current?.setScrub(point);
    const active = point != null;
    if (active !== scrubRef.current) {
      scrubRef.current = active;
      setScrubbing(active);
    }
  }, []);
  const balanceRevealProgress = useBalanceRevealProgress(showBalance);
  const stripScrubbing = scrubbing && !chartExpanded;
  const actionsOpacity = useBalanceRevealProgress(!stripScrubbing);

  // The newest asset items, for the stable row callback.
  const assetsById = useRef({});
  assetsById.current = {};
  assets.forEach(item => { assetsById.current[item.coin.id] = item; });
  const openAsset = useLatestCallback(coinId => {
    const item = assetsById.current[coinId];
    if (item) onOpenAsset(item.coin, item.preferredCard);
  });
  const openCurrencySheet = useCallback(() => setCurrencyOpen(true), []);
  const closeCurrencySheet = useCallback(() => setCurrencyOpen(false), []);
  const formatValue = useCallback(value => formatFiat(value, displayCurrency), [displayCurrency]);
  const toggleChart = useCallback(() => setExpanded(!chartExpanded), [chartExpanded, setExpanded]);
  const pullToRefresh = useLatestCallback(() => {
    if (!scrubRef.current) onRefresh();
  });

  const handleScroll = useCallback(event => {
    const next = (event?.nativeEvent?.contentOffset?.y || 0) > HEADER_DIVIDER_THRESHOLD;
    if (next !== dividerRef.current) {
      dividerRef.current = next;
      dividerOpacity.setValue(next ? 1 : 0);
    }
  }, [dividerOpacity]);

  const renderAsset = useCallback(({item}) => {
    const values = getAssetRowValues(item, showBalance, displayCurrency);

    return (
      <HomeAssetRow
        coinId={item.coin.id}
        logoId={values.presentation.logoId}
        badgeTicker={values.presentation.badgeTicker}
        name={values.presentation.name}
        ticker={values.presentation.ticker}
        accessibilityLabel={values.accessibilityLabel}
        cryptoAmountText={values.cryptoAmountText}
        fiatText={values.fiatText}
        rateText={values.rateText}
        prelaunchBadge={values.prelaunchBadge}
        preconvertedText={values.preconvertedText}
        showBalance={showBalance}
        revealProgress={balanceRevealProgress}
        theme={theme}
        onOpen={openAsset}
      />
    );
  }, [showBalance, displayCurrency, balanceRevealProgress, theme, openAsset]);

  // Until the record is read, a plain skeleton keeps the closed or open chart's space.
  const listHeader = useMemo(() => {
    if (!hydrated) {
      return history.hasPrice ? (
        <ChartStripSkeleton expanded={preferenceHydrated && chartExpanded} />
      ) : null;
    }
    return (
      <HomeValueChart
        history={history}
        panRef={panRef}
        showBalance={showBalance}
        formatValue={formatValue}
        onScrub={onScrub}
        expanded={chartExpanded}
        preferenceHydrated={preferenceHydrated}
        onToggle={toggleChart}
      />
    );
  }, [hydrated, history, showBalance, formatValue, onScrub, chartExpanded,
    preferenceHydrated, toggleChart]);
  const chartReady = history.state === 'chart' && !history.loading;

  const listEmpty = useMemo(() => (
    !assetsReady && !assetsLoadError ? (
      <SkeletonLoader accessibilityLabel="Loading your assets" style={{padding: 20}}>
        {[0, 1, 2].map(row => <SkeletonBlock key={row} height={48} style={{marginBottom: 20}} />)}
      </SkeletonLoader>
    ) : !assetsLoadError && hiddenAssetCount > 0 ? (
      <EmptyState
        actionLabel="Manage assets"
        message="Your funds stay in your wallet."
        onAction={onManageAssets}
        title={`${hiddenAssetCount} ${hiddenAssetCount === 1 ? 'asset is' : 'assets are'} hidden from Home`}
      />
    ) : (
      <Text style={[theme.typography.bodyMd, {color: theme.colors.textSecondary, padding: 20}]}>
        {assetsLoadError ? 'Your saved assets are temporarily unavailable.' : 'No assets on Home'}
      </Text>
    )
  ), [assetsReady, assetsLoadError, hiddenAssetCount, onManageAssets, theme]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={loading}
      enabled={!scrubbing}
      waitFor={chartReady ? panRef : undefined}
      onRefresh={pullToRefresh}
    />
  ), [loading, scrubbing, chartReady, pullToRefresh]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}
    >
      <HomeHeader
        amountRef={amountRef}
        compactHeader={compactHeader}
        displayCurrency={displayCurrency}
        dividerOpacity={dividerOpacity}
        history={history}
        homeNotice={homeNotice}
        hydrated={hydrated}
        loading={loading}
        chartExpanded={chartExpanded}
        revealProgress={balanceRevealProgress}
        actionsOpacity={actionsOpacity}
        showBalance={showBalance}
        stripScrubbing={stripScrubbing}
        theme={theme}
        totalFiatBalance={totalFiatBalance}
        onDismissFoundAssets={onDismissFoundAssets}
        onDismissSyncNotice={onDismissSyncNotice}
        onManageAssets={onManageAssets}
        onReceive={onReceive}
        onRefresh={onRefresh}
        onReviewFoundAssets={onReviewFoundAssets}
        onSelectCurrency={openCurrencySheet}
        onToggleBalance={onToggleBalance}
      />

      <FlatList
        data={assets}
        waitFor={chartReady ? panRef : undefined}
        scrollEnabled={!scrubbing}
        bounces={!scrubbing}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        keyExtractor={assetKey}
        renderItem={renderAsset}
        refreshControl={refreshControl}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
      />

      <MemoActionBar
        convertDisabled={!convertAvailable}
        receiveDisabled={!receiveAvailable}
        sendDisabled={!sendAvailable}
        onConvert={onConvert}
        onReceive={onReceive}
        onSend={onSend}
      />
      <MemoDisplayCurrencySheet
        visible={currencyOpen}
        displayCurrency={displayCurrency}
        onClose={closeCurrencySheet}
        onSelect={onSelectDisplayCurrency}
      />
    </SafeAreaView>
  );
};

const assetKey = item => item.coin.id;

const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8},
  balanceRow: {flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 8},
  balanceTouchable: {flex: 1},
  balanceActions: {flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginTop: 12},
  balanceToggle: {marginRight: 6},
  iconButton: {padding: 6},
  heroValueRow: {flexDirection: 'row', alignItems: 'flex-start', marginVertical: 12},
  heroSymbolFrame: {marginRight: 4, marginTop: 2},
  heroSymbol: {...fontStyle('semiBold'), fontSize: 17, lineHeight: 22},
  heroAmountFrame: {flexShrink: 1},
  heroAmount: {...fontStyle('bold'), fontSize: 34, lineHeight: 40, letterSpacing: -0.5, fontVariant: ['tabular-nums']},
  headerDivider: {position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth},
  skeletonRow: {flexDirection: 'row', alignItems: 'flex-start'},
  heroAmountSkeleton: {marginVertical: 4},
  // The closed strip leaves 54 points for the range label and chevron.
  closedStripPlot: {paddingRight: 54},
  listContent: {paddingBottom: 16},
  assetRow: {backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row'},
  logoWrap: {width: 38, height: 38, marginRight: 16, justifyContent: 'center', alignItems: 'center'},
  assetCopy: {flex: 1, minWidth: 0, justifyContent: 'center'},
  assetLine: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  assetSecondaryLine: {marginTop: 2},
  assetName: {flexShrink: 1, marginRight: 12},
  fiatValue: {...fontStyle('semiBold'), fontSize: 16, lineHeight: 20, textAlign: 'right'},
  fiatUnavailable: {...fontStyle('regular'), fontSize: 13, lineHeight: 18, textAlign: 'right'},
  cryptoValue: {alignItems: 'center', flexDirection: 'row', flexShrink: 1, marginRight: 12},
  cryptoTicker: {marginLeft: 4, flexShrink: 1},
  fiatRate: {textAlign: 'right'},
  prelaunchBadge: {flexShrink: 0},
});

SignedInWalletHome.propTypes = { history: homeValueChartHistoryPropType.isRequired };

export default SignedInWalletHome;
