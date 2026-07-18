import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {SafeAreaView} from 'react-native-safe-area-context';
import PrivacyBlurredText from '../../components/PrivacyBlurredText';
import SignedInActionBar from '../../components/SignedInActionBar';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {
  DisplayCurrencySheet,
  ManageAssetsSheet,
} from './components/SignedInWalletSheets';
import NotificationWidget from './HomeWidgets/NotificationWidget';

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

const PortfolioBalance = ({
  amount,
  currency,
  revealProgress,
  showBalance,
  theme,
}) => {
  const value = getCurrencyParts(amount, currency);

  return (
    <View style={styles.heroValueRow}>
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
        style={styles.heroAmount}>
        {value.value}
      </PrivacyBlurredText>
    </View>
  );
};

const SignedInWalletHome = ({
  assets,
  displayCurrency,
  loading,
  showBalance,
  totalFiatBalance,
  onToggleBalance,
  onSelectDisplayCurrency,
  onRefresh,
  onOpenAsset,
  receiveAvailable,
  transferAvailable,
  onReceive,
  onSendOrConvert,
  onAddCoin,
  onAddPbaasCurrency,
  onAddErc20Token,
}) => {
  const theme = useOnboardingTheme();
  const [manageAssetsOpen, setManageAssetsOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [showHeaderDivider, setShowHeaderDivider] = useState(false);
  const dividerRef = useRef(false);
  const balanceRevealProgress = useBalanceRevealProgress(showBalance);

  const handleScroll = event => {
    const next = (event?.nativeEvent?.contentOffset?.y || 0) > HEADER_DIVIDER_THRESHOLD;
    if (next !== dividerRef.current) {
      dividerRef.current = next;
      setShowHeaderDivider(next);
    }
  };

  const renderAsset = ({item}) => {
    const crypto = BigNumber(item.balance || 0);
    const hasBalance = crypto.isGreaterThan(0);
    const cryptoAmountText = crypto
      .decimalPlaces(4, BigNumber.ROUND_DOWN)
      .toFixed(4);
    const cryptoText = showBalance
      ? `${cryptoAmountText} ${item.coin.display_ticker}`
      : 'balance hidden';
    const rateText = item.rate == null ? null : formatFiat(item.rate, displayCurrency);
    let fiatText;

    if (item.fiatValue != null) {
      fiatText = formatFiat(item.fiatValue, displayCurrency);
    } else {
      fiatText = hasBalance ? 'N/A' : formatFiat(0, displayCurrency);
    }

    const fiatUnavailable = fiatText === 'N/A';

    return (
      <TouchableOpacity
        activeOpacity={0.76}
        accessibilityRole="button"
        accessibilityLabel={`${item.coin.display_name}, ${cryptoText}`}
        onPress={() => onOpenAsset(item.coin, item.preferredCard)}
        style={styles.assetRow}>
        <View style={styles.logoWrap}>
          {RenderSquareCoinLogo(item.coin.id, {}, 38, 38)}
        </View>
        <View style={styles.assetCopy}>
          <View style={styles.assetLine}>
            <Text
              numberOfLines={1}
              style={[styles.assetName, {color: theme.colors.textPrimary}]}>
              {item.coin.display_name}
            </Text>
            {fiatUnavailable ? (
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
                revealProgress={balanceRevealProgress}
                style={styles.fiatValue}>
                {fiatText}
              </PrivacyBlurredText>
            )}
          </View>
          <View style={[styles.assetLine, styles.assetSecondaryLine]}>
            <View style={styles.cryptoValue}>
              <PrivacyBlurredText
                blurRadius={5}
                color={theme.colors.textSecondary}
                hidden={!showBalance}
                revealProgress={balanceRevealProgress}
                style={styles.cryptoAmount}>
                {cryptoAmountText}
              </PrivacyBlurredText>
              <Text style={[styles.cryptoTicker, {color: theme.colors.textSecondary}]}>
                {item.coin.display_ticker}
              </Text>
            </View>
            {rateText ? (
              <Text numberOfLines={1} style={[styles.fiatRate, {color: theme.colors.textSubtle}]}>
                {rateText}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <View
        style={[
          styles.header,
          {backgroundColor: theme.colors.background},
          showHeaderDivider && {borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth},
        ]}>
        <View style={styles.balanceRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change display currency"
            onPress={() => setCurrencyOpen(true)}
            style={styles.balanceTouchable}>
            <PortfolioBalance
              amount={totalFiatBalance}
              currency={displayCurrency}
              revealProgress={balanceRevealProgress}
              showBalance={showBalance}
              theme={theme}
            />
          </Pressable>
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
                color={theme.colors.textSubtle}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Manage assets"
              hitSlop={ICON_HIT_SLOP}
              onPress={() => setManageAssetsOpen(true)}
              style={styles.iconButton}>
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>
        <NotificationWidget />
      </View>

      <FlatList
        data={assets}
        keyExtractor={item => item.coin.id}
        renderItem={renderAsset}
        refreshing={loading}
        onRefresh={onRefresh}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
      />

      <SignedInActionBar
        receiveDisabled={!receiveAvailable}
        sendOrConvertDisabled={!transferAvailable}
        onReceive={onReceive}
        onSendOrConvert={onSendOrConvert}
      />
      <ManageAssetsSheet
        visible={manageAssetsOpen}
        onClose={() => setManageAssetsOpen(false)}
        onAddCoin={onAddCoin}
        onAddPbaasCurrency={onAddPbaasCurrency}
        onAddErc20Token={onAddErc20Token}
      />
      <DisplayCurrencySheet
        visible={currencyOpen}
        displayCurrency={displayCurrency}
        onClose={() => setCurrencyOpen(false)}
        onSelect={onSelectDisplayCurrency}
      />
    </SafeAreaView>
  );
};

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
  heroSymbol: {...fontStyle('semiBold'), fontSize: 20, lineHeight: 24},
  heroAmountFrame: {flexShrink: 1},
  heroAmount: {...fontStyle('bold'), fontSize: 40, lineHeight: 44, letterSpacing: -0.5},
  listContent: {paddingBottom: 16},
  assetRow: {backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row'},
  logoWrap: {width: 38, height: 38, marginRight: 16, justifyContent: 'center', alignItems: 'center'},
  assetCopy: {flex: 1, minWidth: 0, justifyContent: 'center'},
  assetLine: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  assetSecondaryLine: {marginTop: 6},
  assetName: {...fontStyle('semiBold'), fontSize: 17, lineHeight: 21, flexShrink: 1, marginRight: 12},
  fiatValue: {...fontStyle('semiBold'), fontSize: 16, lineHeight: 20, textAlign: 'right'},
  fiatUnavailable: {...fontStyle('regular'), fontSize: 13, lineHeight: 18, textAlign: 'right'},
  cryptoValue: {alignItems: 'center', flexDirection: 'row', flexShrink: 1, marginRight: 12},
  cryptoAmount: {...fontStyle('medium'), fontSize: 16, lineHeight: 20},
  cryptoTicker: {...fontStyle('medium'), fontSize: 16, lineHeight: 20, marginLeft: 5},
  fiatRate: {...fontStyle('regular'), fontSize: 12, lineHeight: 16, textAlign: 'right'},
});

export default SignedInWalletHome;
