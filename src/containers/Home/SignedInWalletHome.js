/* eslint no-use-before-define: ["error", {"functions": true, "classes": true, "variables": false}] -- Home keeps its shared styles below the component. */
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {FlatList, RefreshControl} from 'react-native-gesture-handler';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ArrowDownUp, ChevronDown} from 'lucide-react-native';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {SafeAreaView} from 'react-native-safe-area-context';
import PrivacyBlurredText from '../../components/PrivacyBlurredText';
import SignedInActionBar from '../../components/SignedInActionBar';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {NO_PRICE_DATA_CAPTION} from '../../utils/assets/homeNoPriceCaption';
import {getAssetPresentation} from '../../utils/assets/assetPresentation';
import {DisplayCurrencySheet, HomeSortSheet} from './components/SignedInWalletSheets';
import {HOME_SORT_BALANCE, HOME_SORT_CUSTOM, HOME_SORT_NAME} from '../../utils/assets/assetOrder';
import NotificationWidget from './HomeWidgets/NotificationWidget';
import HomeNotice, {HOME_NOTICE_SYNC} from './HomeWidgets/HomeNotice';
import SkeletonLoader, {SkeletonBlock} from '../../components/SkeletonLoader';
import WalletSetupLogoSlot from '../../components/WalletSetup/WalletSetupLogoSlot';
import {useLatestCallback} from '../../hooks/useLatestCallback';

const HEADER_DIVIDER_THRESHOLD = 1;
const ICON_HIT_SLOP = {top: 10, bottom: 10, left: 10, right: 10};
const SORT_HIT_SLOP = {top: 6, bottom: 6, left: 8, right: 8};
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

const PortfolioBalance = React.memo(({
  amount,
  currency,
  revealProgress,
  showBalance,
  theme,
  noPriceCaption = false,
  onSelectCurrency,
}) => {
  const value = amount == null ? {symbol: '', value: '—'} : getCurrencyParts(amount, currency);

  return (
    <View style={styles.heroValueRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change display currency"
        onPress={onSelectCurrency}
        style={styles.balanceTouchable}>
        <View style={styles.amountGroup}>
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
        {noPriceCaption ? (
          <Text
            style={[theme.typography.caption, styles.noPriceCaption, {color: theme.colors.textSecondary}]}
            testID="home-no-price-caption">
            {NO_PRICE_DATA_CAPTION}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
});

PortfolioBalance.displayName = 'PortfolioBalance';
PortfolioBalance.propTypes = {
  theme: PropTypes.shape({
    colors: PropTypes.shape({textPrimary: PropTypes.string}),
  }).isRequired,
  onSelectCurrency: PropTypes.func.isRequired,
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

// The Home notice and the notification cards (PF1 option A, owner pick
// 2026-11-19). They are the first part of the list header, so they scroll away
// with the assets, and the action bar and the assets stay reachable at any
// count. They draw again only when their own values change.
const HomeNotices = React.memo(({
  homeNotice,
  loading,
  onDismissFoundAssets,
  onDismissSyncNotice,
  onReceive,
  onRefresh,
  onReviewFoundAssets,
}) => {
  const [noticeHeight, setNoticeHeight] = useState(0);
  const shown = homeNotice != null || noticeHeight > 0;

  return (
    <View
      testID="home-notices"
      onLayout={(event) => setNoticeHeight(event.nativeEvent.layout.height)}
      // A Home notice takes the gap in its first frame; the measure covers the
      // other cards.
      style={[styles.notices, shown && styles.noticesShown]}
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
  );
});

export const HOME_SORT_LABELS = {
  [HOME_SORT_CUSTOM]: 'My order',
  [HOME_SORT_BALANCE]: 'Balance',
  [HOME_SORT_NAME]: 'Name',
};

// Opens "Sort assets". It names the current sort.
const HomeSortControl = React.memo(({sort, theme, onPress}) => {
  const label = HOME_SORT_LABELS[sort] || HOME_SORT_LABELS[HOME_SORT_CUSTOM];
  return (
    <View style={styles.sortRow}>
      <TouchableOpacity
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={`Sort assets, ${label}`}
        hitSlop={SORT_HIT_SLOP}
        onPress={onPress}
        style={styles.sortControl}
        testID="home-sort-control"
      >
        <ArrowDownUp size={16} strokeWidth={2} color={theme.colors.link} />
        <Text style={[theme.typography.labelSm, styles.sortLabel, {color: theme.colors.link}]}>{label}</Text>
        <ChevronDown size={16} strokeWidth={2} color={theme.colors.link} />
      </TouchableOpacity>
    </View>
  );
});

// The balance and its actions. It draws again only when one of its own values
// changes, not on each asset balance result.
const HomeHeader = React.memo(({
  displayCurrency,
  dividerOpacity,
  revealProgress,
  showBalance,
  theme,
  totalFiatBalance,
  noPriceCaption,
  onManageAssets,
  onSelectCurrency,
  onToggleBalance,
}) => {
  return (
    <View style={[styles.header, {backgroundColor: theme.colors.background}]}>
      <View style={styles.balanceRow}>
        <View style={styles.balanceTouchable}>
          <PortfolioBalance
            amount={totalFiatBalance}
            currency={displayCurrency}
            noPriceCaption={noPriceCaption}
            revealProgress={revealProgress}
            showBalance={showBalance}
            theme={theme}
            onSelectCurrency={onSelectCurrency}
          />
        </View>
        <View style={styles.balanceActions}>
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
        </View>
      </View>
      {/* The line shows once the list scrolls. It changes no layout and no React state. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.headerDivider, {backgroundColor: theme.colors.border, opacity: dividerOpacity}]}
      />
    </View>
  );
});

HomeAssetRow.displayName = 'HomeAssetRow';
HomeHeader.displayName = 'HomeHeader';
HomeNotices.displayName = 'HomeNotices';
HomeSortControl.displayName = 'HomeSortControl';

const MemoActionBar = React.memo(SignedInActionBar);
const MemoDisplayCurrencySheet = React.memo(DisplayCurrencySheet);
const MemoHomeSortSheet = React.memo(HomeSortSheet);

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
  noPriceCaption = false,
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
  sort = HOME_SORT_CUSTOM,
  onSelectSort,
}) => {
  const theme = useOnboardingTheme();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const dividerRef = useRef(false);
  const dividerOpacity = useRef(new Animated.Value(0)).current;
  const balanceRevealProgress = useBalanceRevealProgress(showBalance);

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
  const openSortSheet = useCallback(() => setSortOpen(true), []);
  const closeSortSheet = useCallback(() => setSortOpen(false), []);
  const selectSort = useLatestCallback(next => onSelectSort?.(next));
  const pullToRefresh = useLatestCallback(() => onRefresh());

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

  // The sort control shows when there are two or more rows to sort.
  const sortable = assets.length >= 2;
  // Notices, then the sort control. Both scroll with the rows.
  const listHeader = useMemo(() => (
    <>
      <HomeNotices
        homeNotice={homeNotice}
        loading={loading}
        onDismissFoundAssets={onDismissFoundAssets}
        onDismissSyncNotice={onDismissSyncNotice}
        onReceive={onReceive}
        onRefresh={onRefresh}
        onReviewFoundAssets={onReviewFoundAssets}
      />
      {sortable ? <HomeSortControl sort={sort} theme={theme} onPress={openSortSheet} /> : null}
    </>
  ), [homeNotice, loading, onDismissFoundAssets, onDismissSyncNotice, onReceive,
    onRefresh, onReviewFoundAssets, sortable, sort, theme, openSortSheet]);

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
      onRefresh={pullToRefresh}
    />
  ), [loading, pullToRefresh]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}
    >
      <HomeHeader
        displayCurrency={displayCurrency}
        dividerOpacity={dividerOpacity}
        revealProgress={balanceRevealProgress}
        showBalance={showBalance}
        theme={theme}
        totalFiatBalance={totalFiatBalance}
        noPriceCaption={noPriceCaption}
        onManageAssets={onManageAssets}
        onSelectCurrency={openCurrencySheet}
        onToggleBalance={onToggleBalance}
      />

      <FlatList
        data={assets}
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
      <MemoHomeSortSheet
        visible={sortOpen}
        sort={sort}
        onClose={closeSortSheet}
        onSelect={selectSort}
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
  noPriceCaption: {marginTop: 2},
  heroSymbolFrame: {marginRight: 4, marginTop: 2},
  heroSymbol: {...fontStyle('semiBold'), fontSize: 17, lineHeight: 22},
  amountGroup: {flexDirection: 'row', alignItems: 'flex-start', flexShrink: 1, minWidth: 0},
  heroAmountFrame: {flexShrink: 1},
  heroAmount: {...fontStyle('bold'), fontSize: 34, lineHeight: 40, letterSpacing: -0.5, fontVariant: ['tabular-nums']},
  headerDivider: {position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth},
  listContent: {paddingBottom: 16},
  notices: {paddingHorizontal: 20},
  noticesShown: {marginBottom: 8},
  // A 32-point line above the rows; the hit slop keeps a 44-point target.
  sortRow: {flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, marginBottom: 4},
  sortControl: {height: 32, flexDirection: 'row', alignItems: 'center', gap: 4},
  sortLabel: {marginLeft: 2},
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

export default SignedInWalletHome;
