import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {PanGestureHandler} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolate,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useDispatch, useSelector} from 'react-redux';
import {Network} from 'lucide-react-native';
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
import {CONNECTION_ERROR} from '../../utils/api/errors/errorMessages';
import {USD} from '../../utils/constants/currencies';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
} from '../../utils/constants/intervalConstants';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import {truncateDecimal} from '../../utils/math';
import {
  getLedgerConfirmed,
  getNetworkTicker,
  getSubWalletCardType,
  getSubWalletDisplayIdentifier,
  isVerusIdWallet,
  sortSubWalletsByBalance,
  truncateMiddle,
} from '../../utils/subwallet/cardPresentation';

const CONTAINER_PADDING = 20;
const CARD_WIDTH_RATIO = 0.78;
const MAX_CARD_WIDTH = 314;
const CARD_HEIGHT = 206;
const CARD_PERSPECTIVE = 1100;
const NEIGHBOR_SCALE = 0.88;
const NEIGHBOR_OPACITY = 0.82;
const NEIGHBOR_CENTER_OFFSET = 0.6;
const NEIGHBOR_ROTATE_Y = 18;
const NEIGHBOR_ROTATE_Z = 3.5;
const SWIPE_DISTANCE_THRESHOLD = 39;
const KINETIC_SNAP_DURATION = 480;
const KINETIC_SNAP_CONFIG = {
  duration: KINETIC_SNAP_DURATION,
  easing: Easing.bezier(0.22, 0.8, 0.18, 1),
};
const CIRCULAR_RAIL_MIN_CARDS = 3;
const RAIL_DOT_COLOR = '#CCD2DF';
const RAIL_DOT_ACTIVE_COLOR = '#3165D4';
const MAGICPATH_CARD_ACCENTS = {
  verusId: ['#6B7CFF', '#00A6A8'],
  address: ['#4F8CEB', '#00A6A8', '#6B7CFF'],
  private: '#6F7788',
};
const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const clamp = (number, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, number));

const getLogicalCardIndex = (railPosition, itemCount) => {
  if (itemCount === 0) return 0;

  const roundedPosition = Math.round(railPosition);
  return ((roundedPosition % itemCount) + itemCount) % itemCount;
};

const getNearestRailPosition = (
  currentPosition,
  logicalIndex,
  itemCount,
  circular,
) => {
  if (!circular || itemCount === 0) return logicalIndex;

  const cycle = Math.round((currentPosition - logicalIndex) / itemCount);
  return logicalIndex + cycle * itemCount;
};

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
    red:
      firstRgb.red * (1 - normalizedWeight) + secondRgb.red * normalizedWeight,
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

const getCardTheme = accent => {
  const text = '#FFFFFF';

  return {
    top: mixHex(accent, '#182442', 0.28),
    middle: mixHex(accent, '#1B2333', 0.55),
    bottom: '#1B2333',
    highlight: mixHex(accent, text, 0.32),
    text,
    mutedText: withAlpha(text, 0.72),
    border: withAlpha(text, 0.14),
    watermark: withAlpha(text, 0.84),
  };
};

const KineticRailCard = ({
  cardWidth,
  carouselPadding,
  children,
  circular,
  index,
  itemCount,
  railPosition,
  reduceMotionEnabled,
  selected,
  style,
}) => {
  const neighborCenterOffset = cardWidth * NEIGHBOR_CENTER_OFFSET;
  const animatedStyle = useAnimatedStyle(() => {
    let itemPosition = index;

    if (circular && itemCount > 0) {
      const cycle = Math.round((railPosition.value - index) / itemCount);
      itemPosition += cycle * itemCount;
    }

    const delta = itemPosition - railPosition.value;
    const absoluteDelta = Math.abs(delta);
    const clampedDelta = Math.max(-1, Math.min(1, delta));
    const translateX = delta * neighborCenterOffset;
    const opacity = interpolate(
      absoluteDelta,
      [0, 1, 1.35],
      [1, NEIGHBOR_OPACITY, 0],
      Extrapolate.CLAMP,
    );
    const layer = Math.max(1, Math.round(100 - absoluteDelta * 10));

    if (reduceMotionEnabled) {
      return {
        opacity,
        zIndex: layer,
        elevation: Math.max(1, Math.round(5 - absoluteDelta * 2)),
        transform: [{translateX}],
      };
    }

    return {
      opacity,
      zIndex: layer,
      elevation: Math.max(1, Math.round(5 - absoluteDelta * 2)),
      transform: [
        {perspective: CARD_PERSPECTIVE},
        {translateX},
        {rotateY: `${-clampedDelta * NEIGHBOR_ROTATE_Y}deg`},
        {rotateZ: `${clampedDelta * NEIGHBOR_ROTATE_Z}deg`},
        {
          scale: interpolate(
            absoluteDelta,
            [0, 1],
            [1, NEIGHBOR_SCALE],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  }, [cardWidth, circular, index, itemCount, reduceMotionEnabled]);

  return (
    <Animated.View
      accessibilityElementsHidden={!selected}
      importantForAccessibility={selected ? 'yes' : 'no-hide-descendants'}
      pointerEvents={selected ? 'auto' : 'none'}
      style={[
        style,
        {
          left: carouselPadding,
          position: 'absolute',
          top: 0,
          width: cardWidth,
        },
        animatedStyle,
      ]}>
      {children}
    </Animated.View>
  );
};

const SignedInAssetHeader = () => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {width: screenWidth} = useWindowDimensions();
  const activeWalletIdRef = useRef(null);
  const internalSelectionIdRef = useRef(null);
  const railPosition = useSharedValue(0);
  const selectedRailPosition = useSharedValue(0);

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
      ? extractLedgerData(state, 'balances', API_GET_BALANCES, chainTicker)
      : {},
  );
  const balanceErrors = useObjectSelector(state =>
    chainTicker ? extractErrorData(state, API_GET_BALANCES, chainTicker) : {},
  );
  const rates = useObjectSelector(state => state.ledger.rates);
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const showBalance = useSelector(state => state.coins.showBalance);
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [frozenWalletItems, setFrozenWalletItems] = useState(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const cardWidth = Math.min(screenWidth * CARD_WIDTH_RATIO, MAX_CARD_WIDTH);
  const carouselPadding = Math.max((screenWidth - cardWidth) / 2, 0);

  const cardAccents = useMemo(() => {
    let verusIdIndex = 0;
    let addressIndex = 0;

    return allSubWallets.reduce((accents, wallet) => {
      if (wallet.id === 'PRIVATE_WALLET') {
        accents[wallet.id] = MAGICPATH_CARD_ACCENTS.private;
      } else if (isVerusIdWallet(wallet)) {
        accents[wallet.id] =
          MAGICPATH_CARD_ACCENTS.verusId[
            verusIdIndex % MAGICPATH_CARD_ACCENTS.verusId.length
          ];
        verusIdIndex += 1;
      } else if (wallet.id === 'MAIN_WALLET') {
        accents[wallet.id] = MAGICPATH_CARD_ACCENTS.address[0];
      } else {
        accents[wallet.id] =
          MAGICPATH_CARD_ACCENTS.address[
            addressIndex % MAGICPATH_CARD_ACCENTS.address.length
          ];
        addressIndex += 1;
      }

      return accents;
    }, {});
  }, [allSubWallets]);

  const sortedWalletItems = useMemo(
    () => sortSubWalletsByBalance(allSubWallets, balances),
    [allSubWallets, balances],
  );
  const walletItems = frozenWalletItems || sortedWalletItems;
  const itemCount = walletItems.length;
  const circularRail = itemCount >= CIRCULAR_RAIL_MIN_CARDS;

  const totalConfirmedBalance = useMemo(
    () =>
      Object.values(balances || {}).reduce((total, ledgerEntry) => {
        const confirmed = getLedgerConfirmed(ledgerEntry);
        return confirmed == null ? total : total.plus(BigNumber(confirmed));
      }, BigNumber(0)),
    [balances],
  );

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (active) setReduceMotionEnabled(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (itemCount === 0) {
      activeWalletIdRef.current = null;
      setActiveIndex(0);
      railPosition.value = 0;
      selectedRailPosition.value = 0;
      return;
    }

    const selectedIndex = selectedSubWallet
      ? walletItems.findIndex(wallet => wallet.id === selectedSubWallet.id)
      : -1;
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const selectedItem = walletItems[nextIndex];
    const previousWalletId = activeWalletIdRef.current;
    const targetRailPosition = getNearestRailPosition(
      railPosition.value,
      nextIndex,
      itemCount,
      circularRail,
    );
    const isInternalSelection =
      internalSelectionIdRef.current === selectedItem?.id;

    internalSelectionIdRef.current = null;
    activeWalletIdRef.current = selectedItem?.id || null;
    setActiveIndex(currentIndex =>
      currentIndex === nextIndex ? currentIndex : nextIndex,
    );
    selectedRailPosition.value = targetRailPosition;

    if (isInternalSelection) return;

    cancelAnimation(railPosition);
    if (
      reduceMotionEnabled ||
      previousWalletId == null ||
      previousWalletId === selectedItem?.id
    ) {
      railPosition.value = targetRailPosition;
    } else {
      railPosition.value = withTiming(
        targetRailPosition,
        KINETIC_SNAP_CONFIG,
      );
    }
  }, [
    circularRail,
    itemCount,
    railPosition,
    reduceMotionEnabled,
    selectedRailPosition,
    selectedSubWallet,
    walletItems,
  ]);

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

  const totalFiatDisplay = useMemo(() => {
    for (const wallet of allSubWallets) {
      const fiatDisplay = getWalletFiatDisplay(wallet, totalConfirmedBalance);
      if (fiatDisplay != null) return fiatDisplay;
    }

    return null;
  }, [allSubWallets, getWalletFiatDisplay, totalConfirmedBalance]);

  const getDisplayIdentifier = useCallback(
    wallet =>
      getSubWalletDisplayIdentifier(wallet, activeAccount, chainTicker),
    [activeAccount, chainTicker],
  );

  const activateCard = useCallback(
    nextIndex => {
      if (itemCount === 0) return;

      const nextItem = walletItems[nextIndex];
      const sourceWallet = nextItem
        ? allSubWallets.find(wallet => wallet.id === nextItem.id)
        : null;

      setActiveIndex(nextIndex);

      if (sourceWallet && sourceWallet.id !== activeWalletIdRef.current) {
        activeWalletIdRef.current = sourceWallet.id;
        internalSelectionIdRef.current = sourceWallet.id;
        dispatch(setCoinSubWallet(chainTicker, sourceWallet));
      }
    },
    [allSubWallets, chainTicker, dispatch, itemCount, walletItems],
  );

  const beginRailInteraction = useCallback(() => {
    setFrozenWalletItems(currentItems => currentItems || sortedWalletItems);
  }, [sortedWalletItems]);

  const finishRailInteraction = useCallback(() => {
    setFrozenWalletItems(null);
  }, []);

  const animateToRailPosition = useCallback(
    targetRailPosition => {
      const nextIndex = getLogicalCardIndex(
        targetRailPosition,
        itemCount,
      );

      selectedRailPosition.value = targetRailPosition;
      activateCard(nextIndex);
      cancelAnimation(railPosition);

      if (reduceMotionEnabled) {
        railPosition.value = targetRailPosition;
        finishRailInteraction();
      } else {
        railPosition.value = withTiming(
          targetRailPosition,
          KINETIC_SNAP_CONFIG,
          finished => {
            if (finished) runOnJS(finishRailInteraction)();
          },
        );
      }
    },
    [
      activateCard,
      finishRailInteraction,
      itemCount,
      railPosition,
      reduceMotionEnabled,
      selectedRailPosition,
    ],
  );

  const selectRelativeCard = useCallback(
    direction => {
      if (itemCount <= 1) return;

      const currentPosition = selectedRailPosition.value;
      const targetPosition = circularRail
        ? currentPosition + direction
        : clamp(
            Math.round(currentPosition) + direction,
            0,
            itemCount - 1,
          );

      if (targetPosition === currentPosition) return;

      beginRailInteraction();
      animateToRailPosition(targetPosition);
    },
    [
      animateToRailPosition,
      beginRailInteraction,
      circularRail,
      itemCount,
      selectedRailPosition,
    ],
  );

  const handleAccessibilityAction = useCallback(
    event => {
      if (event.nativeEvent.actionName === 'increment') {
        selectRelativeCard(1);
      } else if (event.nativeEvent.actionName === 'decrement') {
        selectRelativeCard(-1);
      }
    },
    [selectRelativeCard],
  );

  const gestureHandler = useAnimatedGestureHandler(
    {
      onStart: (_, context) => {
        cancelAnimation(railPosition);
        context.startPosition = railPosition.value;
        context.selectedPosition = selectedRailPosition.value;
        runOnJS(beginRailInteraction)();
      },
      onActive: (event, context) => {
        const centerOffset = cardWidth * NEIGHBOR_CENTER_OFFSET;
        let nextPosition =
          context.startPosition - event.translationX / centerOffset;

        if (!circularRail) {
          nextPosition = Math.max(
            0,
            Math.min(itemCount - 1, nextPosition),
          );
        }

        railPosition.value = nextPosition;
      },
      onEnd: (event, context) => {
        let direction = 0;
        if (event.translationX <= -SWIPE_DISTANCE_THRESHOLD) direction = 1;
        if (event.translationX >= SWIPE_DISTANCE_THRESHOLD) direction = -1;

        let targetPosition = context.selectedPosition + direction;
        if (!circularRail) {
          targetPosition = Math.max(
            0,
            Math.min(itemCount - 1, targetPosition),
          );
        }

        const roundedPosition = Math.round(targetPosition);
        const nextIndex =
          itemCount === 0
            ? 0
            : ((roundedPosition % itemCount) + itemCount) % itemCount;

        selectedRailPosition.value = targetPosition;
        runOnJS(activateCard)(nextIndex);

        if (reduceMotionEnabled) {
          railPosition.value = targetPosition;
          runOnJS(finishRailInteraction)();
        } else {
          railPosition.value = withTiming(
            targetPosition,
            KINETIC_SNAP_CONFIG,
            finished => {
              if (finished) runOnJS(finishRailInteraction)();
            },
          );
        }
      },
      onCancel: (_, context) => {
        const targetPosition =
          context.selectedPosition == null
            ? selectedRailPosition.value
            : context.selectedPosition;
        railPosition.value = reduceMotionEnabled
          ? targetPosition
          : withTiming(targetPosition, KINETIC_SNAP_CONFIG, finished => {
              if (finished) runOnJS(finishRailInteraction)();
            });
        if (reduceMotionEnabled) runOnJS(finishRailInteraction)();
      },
      onFail: (_, context) => {
        const targetPosition =
          context.selectedPosition == null
            ? selectedRailPosition.value
            : context.selectedPosition;
        railPosition.value = reduceMotionEnabled
          ? targetPosition
          : withTiming(targetPosition, KINETIC_SNAP_CONFIG, finished => {
              if (finished) runOnJS(finishRailInteraction)();
            });
        if (reduceMotionEnabled) runOnJS(finishRailInteraction)();
      },
    },
    [
      activateCard,
      beginRailInteraction,
      cardWidth,
      circularRail,
      finishRailInteraction,
      itemCount,
      reduceMotionEnabled,
    ],
  );

  const renderWalletCard = useCallback(
    (item, index) => {
      const displayIdentifier = getDisplayIdentifier(item);
      const cardType = getSubWalletCardType(item);
      const isVerusIdCard = cardType === 'VerusID';
      const cardTheme = getCardTheme(
        cardAccents[item.id] || MAGICPATH_CARD_ACCENTS.address[0],
      );
      const networkTicker = getNetworkTicker(item.network);
      const systemLabel = networkTicker || displayTicker;
      const safeId = String(`${item.id || index}:${index}`).replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      );
      const gradientId = `signedInCardGradient_${safeId}`;
      const highlightId = `signedInCardHighlight_${safeId}`;
      const ledgerEntry = balances?.[item.id];
      const walletBalance = getLedgerConfirmed(ledgerEntry);
      const walletHasError = Boolean(balanceErrors?.[item.id]);

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

      return (
        <KineticRailCard
          key={String(item.id)}
          cardWidth={cardWidth}
          carouselPadding={carouselPadding}
          circular={circularRail}
          index={index}
          itemCount={itemCount}
          railPosition={railPosition}
          reduceMotionEnabled={reduceMotionEnabled}
          selected={index === activeIndex}
          style={[
            styles.walletCard,
            {
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

          <View style={styles.cardTopline}>
            <View style={styles.cardSystem}>
              <Network
                size={16}
                strokeWidth={2.2}
                color={cardTheme.watermark}
              />
              <Text
                numberOfLines={1}
                style={[styles.cardSystemText, {color: cardTheme.watermark}]}>
                {systemLabel}
              </Text>
            </View>
            <View style={styles.cardTypeBadge}>
              <Text style={[styles.cardTypeText, {color: cardTheme.text}]}>
                {cardType}
              </Text>
            </View>
          </View>

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
          </View>

          <View style={styles.cardAddressRow}>
            <Text
              selectable
              ellipsizeMode={isVerusIdCard ? 'tail' : 'middle'}
              numberOfLines={1}
              style={[
                styles.addressText,
                isVerusIdCard && styles.verusIdText,
                {color: cardTheme.text},
              ]}>
              {isVerusIdCard
                ? displayIdentifier
                : truncateMiddle(displayIdentifier)}
            </Text>
            <View style={styles.copyLane}>
              <CopyAction
                accessibilityLabel={
                  cardType === 'VerusID'
                    ? `Copy ${displayIdentifier} VerusID`
                    : 'Copy address'
                }
                copiedAccessibilityLabel={
                  cardType === 'VerusID' ? 'VerusID copied' : 'Address copied'
                }
                color={cardTheme.text}
                copiedColor={cardTheme.text}
                iconSize={16}
                strokeWidth={2}
                value={displayIdentifier === '-' ? '' : displayIdentifier}
              />
            </View>
          </View>
        </KineticRailCard>
      );
    },
    [
      activeIndex,
      balanceErrors,
      balances,
      cardAccents,
      cardWidth,
      carouselPadding,
      circularRail,
      displayTicker,
      getDisplayIdentifier,
      getWalletFiatDisplay,
      itemCount,
      railPosition,
      reduceMotionEnabled,
      showBalance,
      theme.colors.shadow,
    ],
  );

  if (!activeCoin) return null;

  const totalAmountText = showBalance
    ? truncateDecimal(totalConfirmedBalance, 4)
    : '*****';
  const shouldShowTotalFiat = totalFiatDisplay != null || activeCoin.testnet;
  let totalFiatText = null;
  if (shouldShowTotalFiat) {
    totalFiatText = showBalance ? totalFiatDisplay ?? '—' : '***';
  }

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.assetIdentity}>
        <View style={styles.coinIdentity}>
          {RenderSquareCoinLogo(activeCoin.id, {}, 28, 28)}
          <Text
            numberOfLines={1}
            style={[styles.assetTicker, {color: theme.colors.textSecondary}]}>
            {displayTicker}
          </Text>
        </View>
        <View style={styles.totalBalance}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.totalAmount, {color: theme.colors.textPrimary}]}>
            {totalAmountText}
          </Text>
          {totalFiatText != null ? (
            <Text
              numberOfLines={1}
              style={[styles.totalFiat, {color: theme.colors.textSecondary}]}>
              {totalFiatText}
            </Text>
          ) : null}
        </View>
      </View>

      <PanGestureHandler
        activeOffsetX={[-8, 8]}
        enabled={itemCount > 1}
        failOffsetY={[-16, 16]}
        onGestureEvent={gestureHandler}>
        <Animated.View style={styles.carouselContent}>
          {walletItems.map(renderWalletCard)}
        </Animated.View>
      </PanGestureHandler>

      {itemCount > 0 ? (
        <View
          accessible
          accessibilityActions={[
            {name: 'decrement', label: 'Show previous Card'},
            {name: 'increment', label: 'Show next Card'},
          ]}
          accessibilityHint="Swipe up or down to change Cards"
          accessibilityLabel={`Card ${activeIndex + 1} of ${itemCount}`}
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 1,
            max: itemCount,
            now: activeIndex + 1,
          }}
          onAccessibilityAction={handleAccessibilityAction}
          style={styles.railDots}>
          {walletItems.map((wallet, index) => (
            <View
              accessible={false}
              key={String(wallet.id)}
              style={[
                styles.railDot,
                index === activeIndex && styles.railDotActive,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 6,
  },
  assetIdentity: {
    minHeight: 52,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: CONTAINER_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinIdentity: {
    flex: 1,
    minWidth: 0,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetTicker: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  totalBalance: {
    flexShrink: 1,
    maxWidth: '48%',
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    textAlign: 'right',
    ...fontStyle('bold'),
  },
  totalFiat: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
    ...fontStyle('semiBold'),
  },
  carouselContent: {
    height: CARD_HEIGHT + 8,
    paddingBottom: 8,
    overflow: 'visible',
  },
  railDots: {
    height: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  railDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: RAIL_DOT_COLOR,
  },
  railDotActive: {
    width: 17,
    borderRadius: 4,
    backgroundColor: RAIL_DOT_ACTIVE_COLOR,
  },
  walletCard: {
    height: CARD_HEIGHT,
    borderRadius: 23,
    padding: 18,
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
  cardTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSystem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  cardSystemText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.9,
    ...fontStyle('bold'),
  },
  cardTypeBadge: {
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardTypeText: {
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle('semiBold'),
  },
  amountSection: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 4,
    paddingBottom: 24,
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
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    ...fontStyle('semiBold'),
  },
  cardAddressRow: {
    height: 44,
    position: 'absolute',
    left: 18,
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressText: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: MONOSPACE_FONT,
  },
  verusIdText: {
    marginRight: 4,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  copyLane: {
    width: 44,
    height: 44,
  },
});

export default SignedInAssetHeader;
