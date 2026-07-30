import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {fontStyle} from '../../../../globals/fonts';

const WALLET_CARD_WIDTH = 314;
const WALLET_CARD_HEIGHT = 206;
const CARD_ASPECT_RATIO = WALLET_CARD_WIDTH / WALLET_CARD_HEIGHT;
const CARD_PERSPECTIVE = 1100;
const FLIP_DURATION_MS = 480;
const FLIP_CONFIG = {
  duration: FLIP_DURATION_MS,
  easing: Easing.bezier(0.22, 0.8, 0.18, 1),
};
const CARD_TEXT = '#FFFFFF';
const CARD_TEXT_MUTED = 'rgba(255,255,255,0.76)';
const CARD_LABEL_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.44)',
  textShadowOffset: {width: 0, height: 1},
  textShadowRadius: 2,
};

const formatCardDate = timestamp => {
  if (!timestamp) return '';

  try {
    return new Date(timestamp).toLocaleDateString();
  } catch (_) {
    return '';
  }
};

const getSeededFraction = (seed, offset) => {
  let value = Math.imul(seed ^ offset, 2654435761);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
};

const CardMaterial = ({height, material, width}) => {
  const surfacePaths = useMemo(() => {
    const seed = material.seed ?? 0x172034;
    const offset = getSeededFraction(seed, 31) * 4;
    const brush = Array.from({length: 35}, (_, lineIndex) => {
      const y = lineIndex * 6 + offset;
      return `M 0 ${y.toFixed(2)} H ${WALLET_CARD_WIDTH}`;
    }).join(' ');
    const grain = Array.from({length: 24}, (_, pointIndex) => {
      const x = getSeededFraction(seed, pointIndex * 2 + 101);
      const y = getSeededFraction(seed, pointIndex * 2 + 102);
      const length = 0.4 + getSeededFraction(seed, pointIndex + 151);

      return `M ${(x * WALLET_CARD_WIDTH).toFixed(2)} ${(
        y * WALLET_CARD_HEIGHT
      ).toFixed(2)} h ${length.toFixed(2)}`;
    }).join(' ');

    return {brush, grain};
  }, [material.seed]);

  return (
    <Svg
      accessible={false}
      height={height}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${WALLET_CARD_WIDTH} ${WALLET_CARD_HEIGHT}`}
      width={width}>
      <Defs>
        <LinearGradient id="giftCardBase" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor={material.top} />
          <Stop offset="0.52" stopColor={material.middle} />
          <Stop offset="1" stopColor={material.bottom} />
        </LinearGradient>
        <RadialGradient cx="76%" cy="12%" id="giftCardHighlight" r="92%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
          <Stop offset="0.28" stopColor={material.accent} stopOpacity="0.18" />
          <Stop offset="1" stopColor={material.accent} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient
          id="giftCardLegibility"
          x1="0"
          x2="0"
          y1="0"
          y2="1">
          <Stop offset="0" stopColor="#030812" stopOpacity="0.04" />
          <Stop offset="0.5" stopColor="#030812" stopOpacity="0.02" />
          <Stop offset="1" stopColor="#030812" stopOpacity="0.2" />
        </LinearGradient>
      </Defs>
      <Rect
        fill="url(#giftCardBase)"
        height={WALLET_CARD_HEIGHT}
        rx="23"
        width={WALLET_CARD_WIDTH}
      />
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
      <Rect
        fill="url(#giftCardHighlight)"
        height={WALLET_CARD_HEIGHT}
        opacity="0.54"
        rx="23"
        width={WALLET_CARD_WIDTH}
      />
      <Path
        d={surfacePaths.grain}
        stroke="#FFFFFF"
        strokeOpacity="0.12"
        strokeWidth="0.7"
      />
      <Rect
        fill="url(#giftCardLegibility)"
        height={WALLET_CARD_HEIGHT}
        rx="23"
        width={WALLET_CARD_WIDTH}
      />
      <Rect
        fill="none"
        height={WALLET_CARD_HEIGHT - 3}
        rx="21.5"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1"
        width={WALLET_CARD_WIDTH - 3}
        x="1.5"
        y="1.5"
      />
    </Svg>
  );
};

const SharingAction = ({disabled, label, onPress}) => (
  <TouchableOpacity
    accessibilityLabel={label}
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[styles.sharingAction, disabled && styles.disabled]}>
    <Text numberOfLines={1} style={styles.sharingActionLabel}>
      {label}
    </Text>
  </TouchableOpacity>
);

const GiftCardFlipCard = ({
  busy,
  card,
  copied,
  onCopyLink,
  onOpenQr,
  onPrepareShare,
  onRevealLink,
  onResetSharing,
  onShareNative,
  onWriteNfc,
  presentation,
}) => {
  const {width: screenWidth} = useWindowDimensions();
  const cardWidth = Math.min(
    Math.max(screenWidth * 0.78, 260),
    WALLET_CARD_WIDTH,
  );
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const compact = cardWidth < 292;
  const flipProgress = useSharedValue(0);
  const [linkRevealed, setLinkRevealed] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [showBack, setShowBack] = useState(false);

  const resetCard = useCallback(() => {
    setLinkRevealed(false);
    setShowBack(false);
    flipProgress.value = 0;
    onResetSharing();
  }, [flipProgress, onResetSharing]);

  useEffect(() => {
    resetCard();
    return resetCard;
  }, [card?.id, resetCard]);

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

  const setFace = useCallback(
    backVisible => {
      setLinkRevealed(false);
      setShowBack(backVisible);
      const targetProgress = backVisible ? 1 : 0;
      flipProgress.value = reduceMotionEnabled
        ? targetProgress
        : withTiming(targetProgress, FLIP_CONFIG);
      AccessibilityInfo.announceForAccessibility(
        backVisible ? 'Sharing options shown' : 'Gift card front shown',
      );
    },
    [flipProgress, reduceMotionEnabled],
  );

  const showSharingOptions = useCallback(async () => {
    if (onPrepareShare) {
      const prepared = await onPrepareShare();
      if (!prepared) return;
    }

    setFace(true);
  }, [onPrepareShare, setFace]);

  const toggleLink = useCallback(async () => {
    if (!linkRevealed) {
      if (onRevealLink) {
        const allowed = await onRevealLink(() => setLinkRevealed(true));

        if (!allowed) {
          setLinkRevealed(false);
          return;
        }
      } else {
        setLinkRevealed(true);
      }

      AccessibilityInfo.announceForAccessibility(
        'Redeemable gift card link revealed',
      );
      return;
    }

    setLinkRevealed(false);
    AccessibilityInfo.announceForAccessibility(
      'Redeemable gift card link hidden',
    );
  }, [linkRevealed, onRevealLink]);

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.49, 0.5, 1], [1, 1, 0, 0]),
    transform: [
      {perspective: CARD_PERSPECTIVE},
      {rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg`},
    ],
  }));
  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.49, 0.5, 1], [0, 0, 1, 1]),
    transform: [
      {perspective: CARD_PERSPECTIVE},
      {
        rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg`,
      },
    ],
  }));
  const createdDate = formatCardDate(card?.createdAt);
  const protectionText = [presentation.protectionLabel, createdDate]
    .filter(Boolean)
    .join(' · ');
  const additionalText =
    presentation.additionalConfirmedCount > 0
      ? ` · +${presentation.additionalConfirmedCount} more`
      : '';
  const frontAccessibilityLabel = `${presentation.label}. ${
    presentation.statusLabel
  }. ${presentation.primaryContent.value} ${
    presentation.primaryContent.label
  }. ${
    presentation.additionalConfirmedCount > 0
      ? `${presentation.additionalConfirmedCount} additional confirmed items.`
      : ''
  } ${presentation.protectionLabel}.${
    presentation.hasPending
      ? ' Pending funding is separate from confirmed contents.'
      : ''
  }`;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.cardFrame,
          {
            height: cardHeight,
            width: cardWidth,
          },
        ]}>
        <Animated.View
          accessibilityElementsHidden={showBack}
          importantForAccessibility={showBack ? 'no-hide-descendants' : 'yes'}
          pointerEvents={showBack ? 'none' : 'auto'}
          style={[styles.face, frontAnimatedStyle]}>
          <CardMaterial
            height={cardHeight}
            material={presentation.material}
            width={cardWidth}
          />
          <View
            accessible
            accessibilityLabel={frontAccessibilityLabel}
            style={[styles.faceContent, compact && styles.faceContentCompact]}>
            <View style={styles.cardTopline}>
              <Text numberOfLines={1} style={styles.cardKind}>
                GIFT CARD
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {presentation.statusLabel}
                </Text>
              </View>
            </View>

            <View style={styles.amountSection}>
              <View style={styles.amountRow}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                  style={[
                    styles.primaryValue,
                    compact && styles.primaryValueCompact,
                  ]}>
                  {presentation.primaryContent.value}
                </Text>
                <Text numberOfLines={1} style={styles.primaryLabel}>
                  {` ${presentation.primaryContent.label}`}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.protectionText}>
                {protectionText}
                {additionalText}
              </Text>
              {presentation.hasPending ? (
                <Text numberOfLines={1} style={styles.pendingText}>
                  Pending funding is not included
                </Text>
              ) : null}
            </View>

            <View style={styles.cardBottomline}>
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.cardLabel}>
                {presentation.label}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityLabel="Reveal sharing options"
            accessibilityRole="button"
            disabled={busy}
            hitSlop={{top: 4, right: 4, bottom: 4, left: 4}}
            onPress={showSharingOptions}
            style={[styles.shareButton, busy && styles.disabled]}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          accessibilityElementsHidden={!showBack}
          importantForAccessibility={showBack ? 'yes' : 'no-hide-descendants'}
          pointerEvents={showBack ? 'auto' : 'none'}
          style={[styles.face, backAnimatedStyle]}>
          <CardMaterial
            height={cardHeight}
            material={presentation.material}
            width={cardWidth}
          />
          <View
            style={[styles.backContent, compact && styles.backContentCompact]}>
            <View style={styles.backHeader}>
              <View style={styles.backTitleCopy}>
                <Text style={styles.backEyebrow}>REDEEMABLE LINK</Text>
                <Text numberOfLines={1} style={styles.backCardLabel}>
                  {presentation.label}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Return to gift card front"
                accessibilityRole="button"
                onPress={() => setFace(false)}
                style={styles.returnButton}>
                <Text style={styles.returnButtonText}>Front</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secretPanel}>
              <Text
                accessibilityLabel={
                  linkRevealed
                    ? card?.requestUri
                    : 'Redeemable gift card link hidden'
                }
                numberOfLines={1}
                selectable={linkRevealed}
                style={styles.secretValue}>
                {linkRevealed ? card?.requestUri : 'Redeemable link hidden'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={toggleLink}
                style={styles.revealButton}>
                <Text style={styles.revealButtonText}>
                  {linkRevealed ? 'Hide' : 'Reveal'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              numberOfLines={card?.encrypted ? 3 : 2}
              style={[styles.warning, compact && styles.warningCompact]}>
              Anyone with this link can claim current and future contents.
              {card?.encrypted
                ? ' Share the claim password separately; it cannot be recovered.'
                : ''}
            </Text>

            <View style={styles.sharingActions}>
              <SharingAction
                disabled={busy}
                label={copied ? 'Copied' : 'Copy'}
                onPress={onCopyLink}
              />
              <SharingAction
                disabled={busy}
                label="Share"
                onPress={onShareNative}
              />
              <SharingAction disabled={busy} label="QR" onPress={onOpenQr} />
              <SharingAction
                disabled={busy}
                label="NFC"
                onPress={onWriteNfc}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  cardFrame: {
    borderRadius: 23,
    shadowColor: '#07101F',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.23,
    shadowRadius: 22,
    elevation: 8,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: 23,
  },
  faceContent: {
    flex: 1,
    padding: 18,
  },
  faceContentCompact: {
    padding: 15,
  },
  cardTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardKind: {
    minWidth: 0,
    flex: 1,
    marginRight: 10,
    color: CARD_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.9,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('bold'),
  },
  statusBadge: {
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusText: {
    color: CARD_TEXT,
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
  primaryValue: {
    minWidth: 0,
    flexShrink: 1,
    color: CARD_TEXT,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.4,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('bold'),
  },
  primaryValueCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  primaryLabel: {
    flexShrink: 1,
    color: CARD_TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('semiBold'),
  },
  protectionText: {
    marginTop: 2,
    color: CARD_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 15,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('semiBold'),
  },
  pendingText: {
    marginTop: 3,
    color: '#FFE0A6',
    fontSize: 10,
    lineHeight: 14,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('semiBold'),
  },
  cardBottomline: {
    height: 44,
    position: 'absolute',
    right: 58,
    bottom: 4,
    left: 18,
    justifyContent: 'center',
  },
  cardLabel: {
    color: CARD_TEXT,
    fontSize: 12,
    lineHeight: 16,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('regular'),
  },
  shareButton: {
    width: 54,
    height: 44,
    position: 'absolute',
    right: 4,
    bottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shareButtonText: {
    color: CARD_TEXT,
    fontSize: 11,
    lineHeight: 15,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('semiBold'),
  },
  backContent: {
    flex: 1,
    padding: 15,
  },
  backContentCompact: {
    padding: 12,
  },
  backHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backTitleCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 10,
  },
  backEyebrow: {
    color: CARD_TEXT_MUTED,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.8,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('semiBold'),
  },
  backCardLabel: {
    marginTop: 1,
    color: CARD_TEXT,
    fontSize: 12,
    lineHeight: 16,
    ...CARD_LABEL_SHADOW,
    ...fontStyle('semiBold'),
  },
  returnButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  returnButtonText: {
    color: CARD_TEXT,
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle('semiBold'),
  },
  secretPanel: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 7,
    paddingLeft: 11,
    paddingRight: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 11,
    backgroundColor: 'rgba(5,11,28,0.24)',
  },
  secretValue: {
    minWidth: 0,
    flex: 1,
    color: CARD_TEXT,
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle('regular'),
  },
  revealButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  revealButtonText: {
    color: CARD_TEXT,
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle('semiBold'),
  },
  warning: {
    minHeight: 30,
    marginTop: 7,
    color: CARD_TEXT_MUTED,
    fontSize: 9,
    lineHeight: 13,
    ...fontStyle('regular'),
  },
  warningCompact: {
    minHeight: 25,
    marginTop: 4,
    fontSize: 8,
    lineHeight: 11,
  },
  sharingActions: {
    minHeight: 42,
    flexDirection: 'row',
    marginTop: 'auto',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 11,
    backgroundColor: 'rgba(5,11,28,0.24)',
  },
  sharingAction: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharingActionLabel: {
    color: CARD_TEXT,
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle('semiBold'),
  },
  disabled: {
    opacity: 0.45,
  },
});

export default GiftCardFlipCard;
