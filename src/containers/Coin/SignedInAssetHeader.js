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
  Path,
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
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
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
const CARD_TEXT_COLOR = '#FFFFFF';
const CARD_DARK_BASE = '#07111F';
const MIN_CARD_TEXT_CONTRAST = 4.5;
const VERUS_ID_MATERIAL_PALETTES = [
  ['#596CFF', '#00A6A8'],
  ['#6A58E2', '#118DA6'],
  ['#465FE8', '#168F7F'],
  ['#7156D8', '#1A7EAF'],
];
const TRANSPARENT_MATERIAL_PALETTES = [
  ['#3E7EE8', '#182442'],
  ['#2E82B5', '#172B42'],
  ['#4B72C7', '#1B2840'],
  ['#2D7698', '#15263C'],
];
const CARD_LABEL_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.44)',
  textShadowOffset: {width: 0, height: 1},
  textShadowRadius: 2,
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

const getRelativeLuminance = value => {
  const rgb = hexToRgb(value);
  if (!rgb) return 0;

  const channels = [rgb.red, rgb.green, rgb.blue].map(component => {
    const channel = component / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const getContrastRatio = (first, second) => {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

const ensureWhiteTextContrast = value => {
  let color = value;

  for (
    let attempt = 0;
    attempt < 8 &&
    getContrastRatio(CARD_TEXT_COLOR, color) < MIN_CARD_TEXT_CONTRAST;
    attempt += 1
  ) {
    color = mixHex(color, CARD_DARK_BASE, 0.12);
  }

  return color;
};

const getStableWalletHash = wallet => {
  const stableWalletId = String(wallet?.id || wallet?.name || 'wallet');
  let hash = 2166136261;

  for (let index = 0; index < stableWalletId.length; index += 1) {
    hash ^= stableWalletId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const getHashFraction = (hash, shift) => ((hash >>> shift) & 0xff) / 255;

const getCardMaterial = (wallet, cardType) => {
  const walletHash = getStableWalletHash(wallet);

  if (cardType === 'Private') {
    return {
      id: 'private_midnight_glass',
      kind: 'glass',
      seed: 0x172034,
      top: '#172034',
      middle: '#101625',
      bottom: '#080B12',
      spectralColor: '#8A9CFF',
      highlightX: 0.72,
      highlightY: 0.12,
      text: CARD_TEXT_COLOR,
      mutedText: withAlpha(CARD_TEXT_COLOR, 0.76),
      systemText: withAlpha(CARD_TEXT_COLOR, 0.86),
      border: withAlpha(CARD_TEXT_COLOR, 0.28),
      innerBorder: withAlpha(CARD_TEXT_COLOR, 0.13),
      shineOpacity: 0.13,
      shineRestOffset: 0.08,
      shineAngle: '-16deg',
      radius: 25,
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowDepth: 18,
    };
  }

  const holographic = cardType === 'VerusID';
  const palettes = holographic
    ? VERUS_ID_MATERIAL_PALETTES
    : TRANSPARENT_MATERIAL_PALETTES;
  const palette = palettes[walletHash % palettes.length];
  const firstVariation = getHashFraction(walletHash, 8);
  const secondVariation = getHashFraction(walletHash, 16);
  const base = mixHex(palette[0], palette[1], firstVariation * 0.08);
  const secondary = mixHex(palette[1], palette[0], secondVariation * 0.08);
  const top = ensureWhiteTextContrast(
    mixHex(base, CARD_DARK_BASE, holographic ? 0.18 : 0.24),
  );
  const middle = ensureWhiteTextContrast(
    mixHex(base, '#111B2E', holographic ? 0.48 : 0.54),
  );
  const bottom = ensureWhiteTextContrast(
    mixHex(secondary, CARD_DARK_BASE, holographic ? 0.46 : 0.58),
  );

  return {
    id: `${holographic ? 'holographic' : 'brushed'}_${walletHash.toString(16)}`,
    kind: holographic ? 'holographic' : 'brushed',
    seed: walletHash,
    top,
    middle,
    bottom,
    spectralColor: holographic ? '#EF93D3' : mixHex(base, '#FFFFFF', 0.46),
    highlightX: 0.64 + getHashFraction(walletHash, 16) * 0.28,
    highlightY: 0.08 + getHashFraction(walletHash, 24) * 0.16,
    text: CARD_TEXT_COLOR,
    mutedText: withAlpha(CARD_TEXT_COLOR, 0.76),
    systemText: withAlpha(CARD_TEXT_COLOR, 0.86),
    border: withAlpha(CARD_TEXT_COLOR, holographic ? 0.21 : 0.26),
    innerBorder: withAlpha(CARD_TEXT_COLOR, holographic ? 0.11 : 0.16),
    shineOpacity: holographic ? 0.15 : 0.17,
    shineRestOffset: (firstVariation - 0.5) * 0.18,
    shineAngle: holographic ? '-18deg' : '-14deg',
    radius: 23,
    shadowOpacity: holographic ? 0.2 : 0.23,
    shadowRadius: holographic ? 20 : 22,
    shadowDepth: holographic ? 14 : 16,
  };
};

const getSeededFraction = (seed, offset) => {
  let value = Math.imul(seed ^ offset, 2654435761);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
};

const CardMaterial = ({
  cardWidth,
  circular,
  index,
  itemCount,
  material,
  railPosition,
  reduceMotionEnabled,
}) => {
  const materialId = `${material.id}_${index}`;
  const baseGradientId = `cardBase_${materialId}`;
  const highlightGradientId = `cardHighlight_${materialId}`;
  const holographicGradientId = `cardHolographic_${materialId}`;
  const legibilityGradientId = `cardLegibility_${materialId}`;
  const shineGradientId = `cardShine_${materialId}`;
  const surfacePaths = useMemo(() => {
    const offset = getSeededFraction(material.seed, 31) * 4;
    const brush = Array.from({length: 35}, (_, lineIndex) => {
      const y = lineIndex * 6 + offset;
      return `M 0 ${y.toFixed(2)} H ${cardWidth}`;
    }).join(' ');
    const grain = Array.from({length: 24}, (_, pointIndex) => {
      const x = getSeededFraction(material.seed, pointIndex * 2 + 101);
      const y = getSeededFraction(material.seed, pointIndex * 2 + 102);
      const length = 0.4 + getSeededFraction(material.seed, pointIndex + 151);

      return `M ${(x * cardWidth).toFixed(2)} ${(y * CARD_HEIGHT).toFixed(
        2,
      )} h ${length.toFixed(2)}`;
    }).join(' ');

    return {brush, grain};
  }, [cardWidth, material.seed]);
  const shineStyle = useAnimatedStyle(() => {
    let itemPosition = index;

    if (circular && itemCount > 0) {
      const cycle = Math.round((railPosition.value - index) / itemCount);
      itemPosition += cycle * itemCount;
    }

    const delta = Math.max(-1, Math.min(1, itemPosition - railPosition.value));
    const travel = reduceMotionEnabled
      ? material.shineRestOffset
      : material.shineRestOffset - delta * 0.9;
    const motionOpacity = reduceMotionEnabled
      ? material.shineOpacity * 0.7
      : material.shineOpacity * (1 - Math.abs(delta) * 0.35);

    return {
      opacity: motionOpacity,
      transform: [
        {translateX: travel * cardWidth * 0.42},
        {rotate: material.shineAngle},
      ],
    };
  }, [
    cardWidth,
    circular,
    index,
    itemCount,
    material.shineAngle,
    material.shineOpacity,
    material.shineRestOffset,
    reduceMotionEnabled,
  ]);
  let grainOpacity = 0.04;
  if (material.kind === 'holographic') grainOpacity = 0.08;
  if (material.kind === 'brushed') grainOpacity = 0.12;

  return (
    <>
      <Svg
        width={cardWidth}
        height={CARD_HEIGHT}
        viewBox={`0 0 ${cardWidth} ${CARD_HEIGHT}`}
        pointerEvents="none"
        style={styles.cardBackground}>
        <Defs>
          <LinearGradient id={baseGradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={material.top} />
            <Stop offset="0.52" stopColor={material.middle} />
            <Stop offset="1" stopColor={material.bottom} />
          </LinearGradient>
          <RadialGradient
            id={highlightGradientId}
            cx={material.highlightX}
            cy={material.highlightY}
            r="0.92">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
            <Stop
              offset="0.28"
              stopColor={material.spectralColor}
              stopOpacity={material.kind === 'glass' ? '0.14' : '0.2'}
            />
            <Stop
              offset="1"
              stopColor={material.spectralColor}
              stopOpacity="0"
            />
          </RadialGradient>
          <LinearGradient
            id={holographicGradientId}
            x1="0"
            y1="1"
            x2="1"
            y2="0">
            <Stop offset="0" stopColor="#FF4E91" stopOpacity="0.04" />
            <Stop offset="0.2" stopColor="#FFD65C" stopOpacity="0.34" />
            <Stop offset="0.42" stopColor="#50EECE" stopOpacity="0.3" />
            <Stop offset="0.64" stopColor="#5894FF" stopOpacity="0.34" />
            <Stop offset="0.84" stopColor="#B064FF" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#FF4E91" stopOpacity="0.04" />
          </LinearGradient>
          <LinearGradient id={legibilityGradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#030812" stopOpacity="0.04" />
            <Stop offset="0.5" stopColor="#030812" stopOpacity="0.02" />
            <Stop offset="1" stopColor="#030812" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        <Rect
          x="0"
          y="0"
          width={cardWidth}
          height={CARD_HEIGHT}
          fill={`url(#${baseGradientId})`}
        />
        {material.kind === 'holographic' ? (
          <Rect
            x="-18"
            y="-18"
            width={cardWidth + 36}
            height={CARD_HEIGHT + 36}
            fill={`url(#${holographicGradientId})`}
            opacity="0.42"
          />
        ) : null}
        {material.kind === 'brushed' ? (
          <>
            <Path
              d={surfacePaths.brush}
              stroke="#FFFFFF"
              strokeOpacity="0.18"
              strokeWidth="0.42"
            />
            <Path
              d={surfacePaths.brush}
              stroke="#07111F"
              strokeDasharray="20 13"
              strokeDashoffset="7"
              strokeOpacity="0.18"
              strokeWidth="0.22"
            />
          </>
        ) : null}
        <Rect
          x="0"
          y="0"
          width={cardWidth}
          height={CARD_HEIGHT}
          fill={`url(#${highlightGradientId})`}
          opacity={material.kind === 'glass' ? '0.72' : '0.54'}
        />
        <Path
          d={surfacePaths.grain}
          stroke="#FFFFFF"
          strokeOpacity={grainOpacity}
          strokeWidth="0.7"
        />
        <Rect
          x="0"
          y="0"
          width={cardWidth}
          height={CARD_HEIGHT}
          fill={`url(#${legibilityGradientId})`}
        />
        <Rect
          x="1.5"
          y="1.5"
          width={cardWidth - 3}
          height={CARD_HEIGHT - 3}
          rx={material.radius - 1.5}
          fill="none"
          stroke={material.innerBorder}
          strokeWidth="1"
        />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.cardShine,
          {
            height: CARD_HEIGHT * 1.46,
            left: cardWidth * 0.2,
            top: -CARD_HEIGHT * 0.24,
            width: cardWidth * 0.46,
          },
          shineStyle,
        ]}>
        <Svg width="100%" height="100%" pointerEvents="none">
          <Defs>
            <LinearGradient id={shineGradientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.34" stopColor="#FFFFFF" stopOpacity="0.08" />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.78" />
              <Stop
                offset="0.62"
                stopColor={material.spectralColor}
                stopOpacity="0.22"
              />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${shineGradientId})`} />
        </Svg>
      </Animated.View>
    </>
  );
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

  const cardMaterials = useMemo(() => {
    return allSubWallets.reduce((materials, wallet) => {
      materials[wallet.id] = getCardMaterial(
        wallet,
        getSubWalletCardType(wallet),
      );
      return materials;
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
      const cardMaterial =
        cardMaterials[item.id] || getCardMaterial(item, cardType);
      const networkTicker = getNetworkTicker(item.network);
      const systemLabel = networkTicker || displayTicker;
      const ledgerEntry = balances?.[item.id];
      const walletBalance = getLedgerConfirmed(ledgerEntry);
      const walletHasError = Boolean(balanceErrors?.[item.id]);

      let amountText = '—';
      let fiatText = getWalletFiatDisplay(item, walletBalance);
      if (!showBalance) {
        amountText = '*****';
        fiatText = '***';
      } else if (walletHasError) {
        amountText = CONNECTION_ERROR;
        fiatText = null;
      } else if (walletBalance != null) {
        amountText = truncateDecimal(walletBalance, 8);
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
              borderColor: cardMaterial.border,
              borderRadius: cardMaterial.radius,
              shadowColor: theme.colors.shadow,
              shadowOffset: {width: 0, height: cardMaterial.shadowDepth},
              shadowOpacity: cardMaterial.shadowOpacity,
              shadowRadius: cardMaterial.shadowRadius,
            },
          ]}>
          <CardMaterial
            cardWidth={cardWidth}
            circular={circularRail}
            index={index}
            itemCount={itemCount}
            material={cardMaterial}
            railPosition={railPosition}
            reduceMotionEnabled={reduceMotionEnabled}
          />

          <View style={styles.cardTopline}>
            <View style={styles.cardSystem}>
              <Network
                size={16}
                strokeWidth={2.2}
                color={cardMaterial.systemText}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.cardSystemText,
                  {color: cardMaterial.systemText},
                ]}>
                {systemLabel}
              </Text>
            </View>
            <View style={styles.cardTypeBadge}>
              <Text style={[styles.cardTypeText, {color: cardMaterial.text}]}>
                {cardType}
              </Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Text
                numberOfLines={1}
                style={[styles.amountText, {color: cardMaterial.text}]}>
                {amountText}
              </Text>
              {!walletHasError ? (
                <Text
                  numberOfLines={1}
                  style={[styles.tickerText, {color: cardMaterial.mutedText}]}>
                  {` ${displayTicker}`}
                </Text>
              ) : null}
            </View>
            {fiatText != null ? (
              <Text
                numberOfLines={1}
                style={[styles.fiatText, {color: cardMaterial.mutedText}]}>
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
                {color: cardMaterial.text},
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
                color={cardMaterial.text}
                copiedColor={cardMaterial.text}
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
      cardMaterials,
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
          <AssetCoinLogo coinId={activeCoin.id} size={28} />
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
  cardShine: {
    position: 'absolute',
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
    ...CARD_LABEL_SHADOW,
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
    ...CARD_LABEL_SHADOW,
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
    ...CARD_LABEL_SHADOW,
    ...fontStyle('bold'),
  },
  tickerText: {
    fontSize: 16,
    lineHeight: 22,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('semiBold'),
  },
  fiatText: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    ...CARD_LABEL_SHADOW,
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
    ...CARD_LABEL_SHADOW,
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
