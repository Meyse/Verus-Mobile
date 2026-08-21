import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AccessibilityInfo,
  PanResponder,
  Pressable,
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Path} from 'react-native-svg';
import {fontStyle} from '../../../../globals/fonts';
import {useAppTheme} from '../../../../theme/app';

const WALLET_CARD_WIDTH = 360;
const WALLET_CARD_HEIGHT = 227;
const CARD_ASPECT_RATIO = WALLET_CARD_WIDTH / WALLET_CARD_HEIGHT;
const CARD_PERSPECTIVE = 1100;
const FLIP_DURATION_MS = 420;
const SWIPE_THRESHOLD = 44;
const SWIPE_VELOCITY_THRESHOLD = 0.35;
const FLIP_CONFIG = {
  duration: FLIP_DURATION_MS,
  easing: Easing.bezier(0.22, 0.8, 0.18, 1),
};
const CARD_FRONT = '#26313A';
const CARD_BACK = '#202A32';
const CARD_TEXT = '#F4F1E9';
const CARD_TEXT_MUTED = 'rgba(244,241,233,0.72)';
const CARD_SHAPE =
  'M 20 0 H 340 Q 360 0 360 20 V 99 L 350 113.5 L 360 128 V 207 Q 360 227 340 227 H 20 Q 0 227 0 207 V 128 L 10 113.5 L 0 99 V 20 Q 0 0 20 0 Z';

const formatCardDate = timestamp => {
  if (!timestamp) return '';

  try {
    return new Date(timestamp).toLocaleDateString();
  } catch (_) {
    return '';
  }
};

const CardMaterial = ({back = false, height, width}) => (
  <Svg
    accessible={false}
    height={height}
    pointerEvents="none"
    style={StyleSheet.absoluteFill}
    viewBox={`0 0 ${WALLET_CARD_WIDTH} ${WALLET_CARD_HEIGHT}`}
    width={width}>
    <Path
      d={CARD_SHAPE}
      fill={back ? CARD_BACK : CARD_FRONT}
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="1"
    />
  </Svg>
);

const SharingAction = ({disabled, icon, label, onPress}) => (
  <TouchableOpacity
    accessibilityLabel={label}
    accessibilityRole="button"
    activeOpacity={0.72}
    disabled={disabled}
    onPress={onPress}
    style={[styles.sharingAction, disabled && styles.disabled]}>
    <MaterialCommunityIcons color={CARD_TEXT} name={icon} size={27} />
    <Text numberOfLines={1} style={styles.sharingActionLabel}>
      {label}
    </Text>
  </TouchableOpacity>
);

const GiftCardFlipCard = ({
  busy,
  canShare,
  card,
  onOpenQr,
  onShareNative,
  onWriteNfc,
  presentation,
}) => {
  const theme = useAppTheme();
  const {width: screenWidth} = useWindowDimensions();
  const cardWidth = Math.min(Math.max(screenWidth - 32, 288), 430);
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const compact = cardWidth < 330;
  const flipProgress = useSharedValue(0);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    setShowBack(false);
    flipProgress.value = 0;
  }, [canShare, card?.id, flipProgress]);

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
      if (backVisible && !canShare) return;

      const targetProgress = backVisible ? 1 : 0;

      setShowBack(backVisible);
      flipProgress.value = reduceMotionEnabled
        ? targetProgress
        : withTiming(targetProgress, FLIP_CONFIG);

      if (backVisible !== showBack) {
        AccessibilityInfo.announceForAccessibility(
          backVisible ? 'Sharing options shown' : 'Gift card front shown',
        );
      }
    },
    [canShare, flipProgress, reduceMotionEnabled, showBack],
  );

  const showSharingOptions = useCallback(() => {
    if (canShare && !busy) setFace(true);
  }, [busy, canShare, setFace]);

  const panResponder = useMemo(() => {
    const shouldHandleHorizontalSwipe = (_, gestureState) => {
      if (!canShare) return false;

      const horizontal =
        Math.abs(gestureState.dx) > 8 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;

      return horizontal;
    };

    return PanResponder.create({
      onMoveShouldSetPanResponder: shouldHandleHorizontalSwipe,
      onMoveShouldSetPanResponderCapture: shouldHandleHorizontalSwipe,
      onPanResponderMove: (_, gestureState) => {
        const startProgress = showBack ? 1 : 0;
        const nextProgress =
          startProgress - gestureState.dx / Math.max(cardWidth, 1);

        flipProgress.value = Math.min(1, Math.max(0, nextProgress));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldFlip = showBack
          ? gestureState.dx > SWIPE_THRESHOLD ||
            gestureState.vx > SWIPE_VELOCITY_THRESHOLD
          : gestureState.dx < -SWIPE_THRESHOLD ||
            gestureState.vx < -SWIPE_VELOCITY_THRESHOLD;

        setFace(shouldFlip ? !showBack : showBack);
      },
      onPanResponderTerminate: () => setFace(showBack),
      onPanResponderTerminationRequest: () => false,
    });
  }, [canShare, cardWidth, flipProgress, setFace, showBack]);

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
  const issuedText = createdDate ? `Issued ${createdDate}` : 'Gift card';
  const terminalPresentation = presentation.primaryContent.type === 'redeemed';
  const FrontSurface = canShare ? Pressable : View;
  const frontInteractionProps = canShare
    ? {
        accessibilityHint: 'Tap or swipe left to show sharing options',
        accessibilityRole: 'button',
        disabled: busy,
        onPress: showSharingOptions,
      }
    : {};
  const frontAccessibilityLabel = `${presentation.label}. ${
    presentation.statusLabel
  }. ${presentation.primaryContent.value} ${
    presentation.primaryContent.label
  }. ${issuedText}.${
    presentation.additionalConfirmedCount > 0
      ? ` ${presentation.additionalConfirmedCount} additional confirmed items.`
      : ''
  }${
    presentation.hasPending
      ? ' Pending funding is separate from confirmed contents.'
      : ''
  }`;

  return (
    <View style={styles.container}>
      <View
        {...(canShare ? panResponder.panHandlers : {})}
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
          <CardMaterial height={cardHeight} width={cardWidth} />
          <FrontSurface
            accessible
            accessibilityLabel={frontAccessibilityLabel}
            {...frontInteractionProps}
            style={styles.facePressable}>
            <View
              style={[
                styles.faceContent,
                compact && styles.faceContentCompact,
              ]}>
              <View style={styles.cardTopline}>
                <Text numberOfLines={1} style={styles.cardKind}>
                  VERUS GIFT CARD
                </Text>
                <View style={styles.statusBadge}>
                  <Text numberOfLines={1} style={styles.statusText}>
                    {presentation.statusLabel.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.amountSection}>
                <View
                  style={[
                    styles.amountRow,
                    terminalPresentation && styles.terminalAmountRow,
                  ]}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={[
                      styles.primaryValue,
                      compact && styles.primaryValueCompact,
                      terminalPresentation && styles.terminalPrimaryValue,
                    ]}>
                    {presentation.primaryContent.value}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.primaryLabel,
                      terminalPresentation && styles.terminalPrimaryLabel,
                    ]}>
                    {presentation.primaryContent.label}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.issuedText}>
                  {issuedText}
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
                {canShare ? (
                  <View style={styles.shareCue}>
                    <MaterialCommunityIcons
                      color={CARD_TEXT}
                      name="gesture-swipe-horizontal"
                      size={17}
                    />
                    <Text numberOfLines={1} style={styles.shareCueText}>
                      Swipe or tap to share
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </FrontSurface>
        </Animated.View>

        {canShare ? (
          <Animated.View
            accessibilityElementsHidden={!showBack}
            importantForAccessibility={
              showBack ? 'yes' : 'no-hide-descendants'
            }
            pointerEvents={showBack ? 'auto' : 'none'}
            style={[styles.face, backAnimatedStyle]}>
            <CardMaterial back height={cardHeight} width={cardWidth} />
            <View
              style={[
                styles.backContent,
                compact && styles.backContentCompact,
              ]}>
              <View style={styles.backHeader}>
                <Text numberOfLines={1} style={styles.backEyebrow}>
                  SHARE GIFT CARD
                </Text>
                <Text numberOfLines={1} style={styles.backCardLabel}>
                  {String(presentation.label || '').toUpperCase()}
                </Text>
              </View>

              <View style={styles.sharingActions}>
                <SharingAction
                  disabled={busy}
                  icon="share-variant"
                  label="Share"
                  onPress={onShareNative}
                />
                <SharingAction
                  disabled={busy}
                  icon="qrcode"
                  label="QR"
                  onPress={onOpenQr}
                />
                <SharingAction
                  disabled={busy}
                  icon="credit-card-wireless-outline"
                  label="NFC"
                  onPress={onWriteNfc}
                />
              </View>

              <Text numberOfLines={1} style={styles.shareSafety}>
                Sharing locks further funding.
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      {canShare ? (
        <TouchableOpacity
          accessibilityLabel={
            showBack ? 'Return to gift card front' : 'Show sharing options'
          }
          accessibilityRole="button"
          activeOpacity={0.7}
          disabled={busy}
          onPress={() => setFace(!showBack)}
          style={[styles.flipHint, busy && styles.disabled]}>
          <MaterialCommunityIcons
            color={theme.colors.textSecondary}
            name="gesture-swipe-horizontal"
            size={18}
          />
          <Text
            style={[styles.flipHintText, {color: theme.colors.textSecondary}]}>
            {showBack ? 'Swipe right for front' : 'Swipe left for sharing'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  cardFrame: {
    borderRadius: 20,
    shadowColor: '#07101F',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    borderRadius: 20,
  },
  facePressable: {
    flex: 1,
  },
  faceContent: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  faceContentCompact: {
    paddingHorizontal: 21,
    paddingVertical: 17,
  },
  cardTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardKind: {
    minWidth: 0,
    flex: 1,
    color: CARD_TEXT,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.1,
    ...fontStyle('bold'),
  },
  statusBadge: {
    minHeight: 27,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
  },
  statusText: {
    color: CARD_TEXT,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1,
    ...fontStyle('semiBold'),
  },
  amountSection: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
    gap: 7,
  },
  terminalAmountRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 0,
  },
  primaryValue: {
    minWidth: 0,
    flexShrink: 1,
    color: CARD_TEXT,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.8,
    ...fontStyle('bold'),
  },
  primaryValueCompact: {
    fontSize: 38,
    lineHeight: 44,
  },
  terminalPrimaryValue: {
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -1,
  },
  primaryLabel: {
    flexShrink: 1,
    color: CARD_TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('semiBold'),
  },
  terminalPrimaryLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  issuedText: {
    marginTop: 4,
    color: CARD_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
    ...fontStyle('regular'),
  },
  pendingText: {
    marginTop: 3,
    color: '#FFE0A6',
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle('semiBold'),
  },
  cardBottomline: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardLabel: {
    minWidth: 0,
    flex: 1,
    color: CARD_TEXT,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  shareCue: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shareCueText: {
    color: CARD_TEXT,
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle('semiBold'),
  },
  backContent: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: 18,
  },
  backContentCompact: {
    paddingHorizontal: 21,
    paddingVertical: 15,
  },
  backHeader: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backEyebrow: {
    minWidth: 0,
    flex: 1,
    color: CARD_TEXT_MUTED,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1,
    ...fontStyle('bold'),
  },
  backCardLabel: {
    maxWidth: '42%',
    color: CARD_TEXT_MUTED,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1,
    ...fontStyle('bold'),
  },
  sharingActions: {
    minHeight: 0,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 9,
  },
  sharingAction: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sharingActionLabel: {
    color: CARD_TEXT,
    fontSize: 12,
    lineHeight: 17,
    ...fontStyle('semiBold'),
  },
  shareSafety: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    ...fontStyle('semiBold'),
  },
  flipHint: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  flipHintText: {
    fontSize: 11,
    lineHeight: 15,
    ...fontStyle('semiBold'),
  },
  disabled: {
    opacity: 0.45,
  },
});

export default GiftCardFlipCard;
