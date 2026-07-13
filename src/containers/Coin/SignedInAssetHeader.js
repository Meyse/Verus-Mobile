import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {setCoinSubWallet} from '../../actions/actionCreators';
import CopyAction from '../../components/CopyAction';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {CONNECTION_ERROR} from '../../utils/api/errors/errorMessages';
import {USD} from '../../utils/constants/currencies';
import {
  API_GET_ADDRESSES,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
} from '../../utils/constants/intervalConstants';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import {truncateDecimal} from '../../utils/math';

const CARD_SPACING = 12;
const CONTAINER_PADDING = 20;
const CARD_WIDTH_OFFSET = 72;
const CARD_HEIGHT = 206;

const clamp = (number, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, number));

const normalizeHex = value => {
  if (typeof value !== 'string') return null;

  const hex = value.trim();
  if (!hex.startsWith('#')) return null;

  if (hex.length === 4) {
    const red = hex[1];
    const green = hex[2];
    const blue = hex[3];
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }

  return hex.length === 7 ? hex.toUpperCase() : null;
};

const hexToRgb = value => {
  const hex = normalizeHex(value);
  if (!hex) return null;

  return {
    red: parseInt(hex.slice(1, 3), 16),
    green: parseInt(hex.slice(3, 5), 16),
    blue: parseInt(hex.slice(5, 7), 16),
  };
};

const rgbToHex = ({red, green, blue}) => {
  const toHex = component =>
    clamp(Math.round(component), 0, 255).toString(16).padStart(2, '0');

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase();
};

const mixHex = (first, second, weight = 0.5) => {
  const firstRgb = hexToRgb(first);
  const secondRgb = hexToRgb(second);
  if (!firstRgb || !secondRgb) return first;

  const normalizedWeight = clamp(weight, 0, 1);
  return rgbToHex({
    red: firstRgb.red * (1 - normalizedWeight) + secondRgb.red * normalizedWeight,
    green:
      firstRgb.green * (1 - normalizedWeight) +
      secondRgb.green * normalizedWeight,
    blue:
      firstRgb.blue * (1 - normalizedWeight) +
      secondRgb.blue * normalizedWeight,
  });
};

const withAlpha = (value, alpha) => {
  const rgb = hexToRgb(value);
  if (!rgb) return value;

  return `rgba(${rgb.red},${rgb.green},${rgb.blue},${alpha})`;
};

const isLightColor = value => {
  const rgb = hexToRgb(value);
  if (!rgb) return false;

  const luma =
    (0.299 * rgb.red + 0.587 * rgb.green + 0.114 * rgb.blue) / 255;
  return luma > 0.72;
};

const truncateMiddle = (value, start = 8, end = 8) => {
  if (typeof value !== 'string') return '';
  if (value.length <= start + end + 3) return value;

  return `${value.slice(0, start)}...${value.slice(value.length - end)}`;
};

const getNetworkTicker = systemId => {
  if (!systemId) return '';
  if (systemId === '.eth') return 'ETH';
  if (coinsList[systemId]?.display_ticker) {
    return coinsList[systemId].display_ticker;
  }

  try {
    const coin = CoinDirectory.findCoinObj(systemId);
    if (coin?.display_ticker) return coin.display_ticker;
  } catch (error) {
    // The Card can reference a system that is not enabled in CoinDirectory.
  }

  if (
    typeof systemId === 'string' &&
    systemId.startsWith('i') &&
    systemId.length > 30
  ) {
    return '';
  }

  return systemId;
};

const getLedgerConfirmed = ledgerEntry => {
  if (ledgerEntry == null) return null;
  return BigNumber.isBigNumber(ledgerEntry)
    ? ledgerEntry
    : ledgerEntry.confirmed;
};

const getLedgerPending = ledgerEntry => {
  if (ledgerEntry == null || BigNumber.isBigNumber(ledgerEntry)) return null;
  return ledgerEntry.pending;
};

const SignedInAssetHeader = () => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {width: screenWidth} = useWindowDimensions();
  const flatListRef = useRef(null);
  const activeWalletIdRef = useRef(null);

  const activeCoin = useObjectSelector(state => state.coins.activeCoin);
  const chainTicker = activeCoin?.id;
  const displayTicker = activeCoin?.display_ticker || '';
  const selectedSubWallet = useObjectSelector(
    state => state.coinMenus.activeSubWallets[chainTicker],
  );
  const allSubWallets = useObjectSelector(
    state => state.coinMenus.allSubWallets[chainTicker] || [],
  );
  const balances = useObjectSelector(state =>
    chainTicker
      ? extractLedgerData(
          state,
          'balances',
          API_GET_BALANCES,
          chainTicker,
        )
      : {},
  );
  const info = useObjectSelector(state =>
    chainTicker
      ? extractLedgerData(state, 'info', API_GET_INFO, chainTicker)
      : {},
  );
  const balanceErrors = useObjectSelector(state =>
    chainTicker ? extractErrorData(state, API_GET_BALANCES, chainTicker) : {},
  );
  const rates = useObjectSelector(state => state.ledger.rates);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const showBalance = useSelector(state => state.coins.showBalance);
  const displayCurrency = useSelector(
    state =>
      state.settings.generalWalletSettings.displayCurrency || USD,
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = screenWidth - CARD_WIDTH_OFFSET;

  const cardTheme = useMemo(() => {
    const base = normalizeHex(activeCoin?.theme_color) || theme.colors.primary;
    const light = isLightColor(base);
    const darkCardText = theme.isDark
      ? theme.colors.background
      : theme.colors.textPrimary;
    const text = light ? darkCardText : theme.colors.onPrimary;

    return {
      top: mixHex(base, theme.colors.primary, 0.55),
      middle: mixHex(base, theme.colors.primary, 0.25),
      bottom: mixHex(base, darkCardText, 0.18),
      highlight: mixHex(base, theme.colors.onPrimary, 0.35),
      text,
      mutedText: withAlpha(text, 0.78),
      border: withAlpha(text, 0.1),
      addressBorder: withAlpha(text, light ? 0.1 : 0.18),
      watermark: withAlpha(text, 0.22),
    };
  }, [activeCoin?.theme_color, theme]);

  const walletItems = useMemo(() => {
    const items = allSubWallets.map((wallet, originalIndex) => {
      const confirmed = getLedgerConfirmed(balances?.[wallet.id]);

      return {
        ...wallet,
        originalIndex,
        confirmedSortValue:
          confirmed == null ? BigNumber(0) : BigNumber(confirmed),
      };
    });

    items.sort((first, second) => {
      const balanceOrder = second.confirmedSortValue.comparedTo(
        first.confirmedSortValue,
      );
      return balanceOrder === 0
        ? first.originalIndex - second.originalIndex
        : balanceOrder;
    });

    return items;
  }, [allSubWallets, balances]);

  const totalConfirmedBalance = useMemo(
    () =>
      Object.values(balances || {}).reduce((total, ledgerEntry) => {
        const confirmed = getLedgerConfirmed(ledgerEntry);
        return confirmed == null ? total : total.plus(BigNumber(confirmed));
      }, BigNumber(0)),
    [balances],
  );

  useEffect(() => {
    if (walletItems.length === 0) {
      activeWalletIdRef.current = null;
      setActiveIndex(0);
      return undefined;
    }

    const selectedIndex = selectedSubWallet
      ? walletItems.findIndex(wallet => wallet.id === selectedSubWallet.id)
      : -1;
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const selectedItem = walletItems[nextIndex];

    activeWalletIdRef.current = selectedItem?.id || null;
    setActiveIndex(currentIndex =>
      currentIndex === nextIndex ? currentIndex : nextIndex,
    );

    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * (cardWidth + CARD_SPACING),
        animated: false,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [cardWidth, selectedSubWallet, walletItems]);

  const getWalletFiatDisplay = useCallback(
    (wallet, confirmedBalance) => {
      if (!wallet || confirmedBalance == null) return null;

      const fiatChannel = wallet.api_channels?.[API_GET_FIATPRICE];
      const rate =
        fiatChannel == null
          ? null
          : rates?.[fiatChannel]?.[chainTicker]?.[displayCurrency];
      if (rate == null) return null;

      const fiatValue = BigNumber(confirmedBalance).multipliedBy(
        BigNumber(rate),
      );
      if (!fiatValue.isFinite()) return null;

      return formatCurrency({
        amount: fiatValue.toFixed(2),
        code: displayCurrency,
      })[0];
    },
    [chainTicker, displayCurrency, rates],
  );

  const getDisplayAddress = useCallback(
    wallet => {
      if (!wallet) return '-';
      if (wallet.name?.endsWith('@')) return wallet.name;

      const addressChannel = wallet.api_channels?.[API_GET_ADDRESSES];
      const addresses =
        addressChannel == null
          ? null
          : activeAccount?.keys?.[chainTicker]?.[addressChannel]?.addresses;

      return addresses?.[0] || wallet.name || '-';
    },
    [activeAccount, chainTicker],
  );

  const handleMomentumScrollEnd = useCallback(
    event => {
      if (walletItems.length === 0) return;

      const offset = event.nativeEvent.contentOffset.x;
      const nextIndex = clamp(
        Math.round(offset / (cardWidth + CARD_SPACING)),
        0,
        walletItems.length - 1,
      );
      const nextItem = walletItems[nextIndex];

      setActiveIndex(nextIndex);
      activeWalletIdRef.current = nextItem?.id || null;

      if (nextItem && nextItem.id !== selectedSubWallet?.id) {
        const sourceWallet = allSubWallets.find(
          wallet => wallet.id === nextItem.id,
        );
        if (sourceWallet) {
          dispatch(setCoinSubWallet(chainTicker, sourceWallet));
        }
      }
    },
    [
      allSubWallets,
      cardWidth,
      chainTicker,
      dispatch,
      selectedSubWallet?.id,
      walletItems,
    ],
  );

  const renderWalletCard = useCallback(
    ({item, index}) => {
      const displayAddress = getDisplayAddress(item);
      const networkTicker = getNetworkTicker(item.network);
      const safeId = String(item.id || index).replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      );
      const gradientId = `signedInCardGradient_${safeId}`;
      const highlightId = `signedInCardHighlight_${safeId}`;
      const ledgerEntry = balances?.[item.id];
      const walletBalance = getLedgerConfirmed(ledgerEntry);
      const walletPending = getLedgerPending(ledgerEntry);
      const walletHasError = Boolean(balanceErrors?.[item.id]);
      const walletSync = info?.[item.id]?.percent;

      let amountText = truncateDecimal(walletBalance, 8);
      let fiatText = getWalletFiatDisplay(item, walletBalance);
      if (!showBalance) {
        amountText = '*****';
        fiatText = '***';
      } else if (walletHasError) {
        amountText = CONNECTION_ERROR;
        fiatText = null;
      } else if (walletBalance == null) {
        amountText = '—';
      }

      let pendingText = null;
      if (
        showBalance &&
        walletPending != null &&
        !BigNumber(walletPending).isEqualTo(0)
      ) {
        const pendingPrefix = BigNumber(walletPending).isGreaterThan(0)
          ? '+'
          : '';
        pendingText = `${pendingPrefix}${truncateDecimal(
          walletPending,
          8,
        )} pending`;
      }
      const syncText =
        walletSync != null && walletSync !== 100 && walletSync !== -1
          ? `Syncing ${Number(walletSync).toFixed(0)}%`
          : null;
      const statusText =
        pendingText && syncText
          ? `${pendingText} • ${syncText}`
          : pendingText || syncText;

      return (
        <View
          style={[
            styles.walletCard,
            {
              width: cardWidth,
              borderColor: cardTheme.border,
              shadowColor: theme.colors.shadow,
            },
          ]}>
          <Svg
            width={cardWidth}
            height={CARD_HEIGHT}
            viewBox={`0 0 ${cardWidth} ${CARD_HEIGHT}`}
            pointerEvents="none"
            style={styles.cardBackground}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={cardTheme.top} />
                <Stop offset="0.6" stopColor={cardTheme.middle} />
                <Stop offset="1" stopColor={cardTheme.bottom} />
              </LinearGradient>
              <RadialGradient id={highlightId} cx="0.9" cy="0.15" r="1">
                <Stop
                  offset="0"
                  stopColor={cardTheme.highlight}
                  stopOpacity="0.35"
                />
                <Stop
                  offset="1"
                  stopColor={cardTheme.highlight}
                  stopOpacity="0"
                />
              </RadialGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={cardWidth}
              height={CARD_HEIGHT}
              fill={`url(#${gradientId})`}
            />
            <Rect
              x="0"
              y="0"
              width={cardWidth}
              height={CARD_HEIGHT}
              fill={`url(#${highlightId})`}
            />
          </Svg>

          {networkTicker ? (
            <View pointerEvents="none" style={styles.networkWatermark}>
              <Text
                numberOfLines={1}
                style={[
                  styles.networkWatermarkText,
                  {color: cardTheme.watermark},
                ]}>
                {networkTicker}
              </Text>
              <MaterialCommunityIcons
                name="link-variant"
                size={22}
                color={cardTheme.watermark}
                style={styles.networkWatermarkIcon}
              />
            </View>
          ) : null}

          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Text
                numberOfLines={1}
                style={[styles.amountText, {color: cardTheme.text}]}>
                {amountText}
              </Text>
              {!walletHasError ? (
                <Text
                  numberOfLines={1}
                  style={[styles.tickerText, {color: cardTheme.mutedText}]}>
                  {` ${displayTicker}`}
                </Text>
              ) : null}
            </View>
            {fiatText != null ? (
              <Text
                numberOfLines={1}
                style={[styles.fiatText, {color: cardTheme.mutedText}]}>
                {fiatText}
              </Text>
            ) : null}
            {statusText ? (
              <Text
                numberOfLines={1}
                style={[styles.statusText, {color: cardTheme.mutedText}]}>
                {statusText}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.cardAddressRow,
              {borderTopColor: cardTheme.addressBorder},
            ]}>
            <Text
              selectable
              ellipsizeMode="middle"
              numberOfLines={1}
              style={[styles.addressText, {color: cardTheme.text}]}>
              {truncateMiddle(displayAddress)}
            </Text>
            <View style={styles.copyLane}>
              <CopyAction
                accessibilityLabel={`Copy ${item.name || 'Card'} address`}
                copiedAccessibilityLabel="Address copied"
                color={cardTheme.text}
                copiedColor={cardTheme.text}
                iconSize={16}
                strokeWidth={2}
                value={displayAddress === '-' ? '' : displayAddress}
                style={styles.copyAction}
              />
            </View>
          </View>
        </View>
      );
    },
    [
      balanceErrors,
      balances,
      cardTheme,
      cardWidth,
      displayTicker,
      getDisplayAddress,
      getWalletFiatDisplay,
      info,
      showBalance,
      theme.colors.shadow,
    ],
  );

  if (!activeCoin) return null;

  const tickerText =
    allSubWallets.length > 1 && showBalance
      ? `Total (all addresses): ${truncateDecimal(
          totalConfirmedBalance,
          4,
        )} ${displayTicker}`
      : displayTicker;

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.assetIdentity}>
        <View style={styles.titleRow}>
          {RenderSquareCoinLogo(activeCoin.id, {}, 28, 28)}
          <Text
            numberOfLines={1}
            style={[styles.assetTitle, {color: theme.colors.textPrimary}]}>
            {activeCoin.display_name}
          </Text>
        </View>
        <View style={styles.tickerRow}>
          <Text
            numberOfLines={1}
            style={[styles.assetTicker, {color: theme.colors.textSecondary}]}>
            {tickerText}
          </Text>
        </View>
      </View>

      <View style={styles.selectorHeader}>
        <Text style={[styles.selectorText, {color: theme.colors.textSecondary}]}>
          Addresses
        </Text>
        {walletItems.length > 1 ? (
          <Text
            style={[styles.selectorText, {color: theme.colors.textSecondary}]}>
            {`${activeIndex + 1}/${walletItems.length}`}
          </Text>
        ) : null}
      </View>

      <FlatList
        ref={flatListRef}
        horizontal
        data={walletItems}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: cardWidth + CARD_SPACING,
          offset: (cardWidth + CARD_SPACING) * index,
          index,
        })}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        keyExtractor={item => String(item.id)}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={renderWalletCard}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={cardWidth + CARD_SPACING}
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 6,
  },
  assetIdentity: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: CONTAINER_PADDING,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assetTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 22,
    lineHeight: 28,
    ...fontStyle('bold'),
  },
  tickerRow: {
    marginLeft: 38,
  },
  assetTicker: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('medium'),
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CONTAINER_PADDING,
    paddingBottom: 8,
  },
  selectorText: {
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  carouselContent: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingBottom: 8,
  },
  cardSeparator: {
    width: CARD_SPACING,
  },
  walletCard: {
    height: CARD_HEIGHT,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  networkWatermark: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkWatermarkText: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.8,
    ...fontStyle('bold'),
  },
  networkWatermarkIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
  amountSection: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  amountText: {
    flexShrink: 1,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.4,
    ...fontStyle('bold'),
  },
  tickerText: {
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  fiatText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  statusText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    ...fontStyle('semiBold'),
  },
  cardAddressRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addressText: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'left',
    ...fontStyle('semiBold'),
  },
  copyLane: {
    width: 50,
    height: 18,
    position: 'relative',
  },
  copyAction: {
    position: 'absolute',
    top: -13,
    right: -14,
  },
});

export default SignedInAssetHeader;
