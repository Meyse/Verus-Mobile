import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Check, ChevronLeft, CirclePlus} from 'lucide-react-native';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {fontStyle} from '../../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import LinkExistingVerusIdSheet from './LinkExistingVerusIdSheet';

export const VERUSID_SHEET_MODES = {
  CHOOSE: 'choose',
  LINK: 'link',
};

const HEADER_ROW_HEIGHT = 36;
const EXIT_ANIMATION_DURATION = 90;
const ENTER_ANIMATION_DURATION = 170;
const ROW_ENTER_ANIMATION_DURATION = 180;
const ROW_STAGGER_DURATION = 24;
const TRANSITION_DISTANCE = 14;

const truncateAddress = addr => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const getMatchingIdentities = ({
  linkedIds,
  sortedIds,
  isIdentityAllowed,
}) => {
  return Object.keys(sortedIds).flatMap(chainId => {
    const filteredIds = sortedIds[chainId].filter(iAddr =>
      isIdentityAllowed(chainId, iAddr),
    );

    return filteredIds.map(iAddress => ({
      chainId,
      iAddress,
      friendlyName: linkedIds[chainId][iAddress],
    }));
  });
};

const IdentityPickerSheet = ({
  visible,
  coinObj,
  isCandidateAllowed,
  linkedIds,
  sortedIds,
  isIdentityAllowed,
  selectedIdentity,
  canProvision,
  initialMode = VERUSID_SHEET_MODES.CHOOSE,
  onClose,
  onLinkCandidate,
  onManualLink,
  onRequestVerusId,
  onSelect,
  requestIsTestnet,
}) => {
  const theme = useOnboardingTheme();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sheetMode, setSheetMode] = useState(initialMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const headerProgress = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);
  const rowAnimations = useRef([]).current;
  const matchingIdentities = useMemo(
    () => getMatchingIdentities({linkedIds, sortedIds, isIdentityAllowed}),
    [linkedIds, sortedIds, isIdentityAllowed],
  );
  const matchingCount = matchingIdentities.length;
  const resolvedInitialMode =
    initialMode === VERUSID_SHEET_MODES.LINK
      ? VERUSID_SHEET_MODES.LINK
      : VERUSID_SHEET_MODES.CHOOSE;

  useEffect(() => {
    if (visible) {
      setSheetMode(resolvedInitialMode);
      setIsTransitioning(false);
      contentOpacity.setValue(1);
      contentTranslateX.setValue(0);
      headerProgress.setValue(
        resolvedInitialMode === VERUSID_SHEET_MODES.LINK ? 1 : 0,
      );
      rowAnimations.forEach(animation => animation.setValue(1));
    }
  }, [
    contentOpacity,
    contentTranslateX,
    headerProgress,
    resolvedInitialMode,
    rowAnimations,
    visible,
  ]);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (active) {
          reduceMotionRef.current = reduceMotionEnabled;
        }
      })
      .catch(() => {
        reduceMotionRef.current = false;
      });

    return () => {
      active = false;
      contentOpacity.stopAnimation();
      contentTranslateX.stopAnimation();
      headerProgress.stopAnimation();
      rowAnimations.forEach(animation => animation.stopAnimation());
    };
  }, [contentOpacity, contentTranslateX, headerProgress, rowAnimations]);

  const getRowAnimation = index => {
    while (rowAnimations.length <= index) {
      rowAnimations.push(new Animated.Value(1));
    }

    return rowAnimations[index];
  };

  const animateRowsIn = rowCount => {
    const rowAnimationSet = rowAnimations
      .slice(0, rowCount)
      .map(animation => {
        animation.setValue(0);

        return Animated.timing(animation, {
          toValue: 1,
          duration: ROW_ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
      });

    Animated.stagger(ROW_STAGGER_DURATION, rowAnimationSet).start();
  };

  const transitionToMode = nextMode => {
    if (nextMode === sheetMode || isTransitioning) return;

    const forward = nextMode === VERUSID_SHEET_MODES.LINK;

    if (reduceMotionRef.current) {
      setSheetMode(nextMode);
      headerProgress.setValue(
        nextMode === VERUSID_SHEET_MODES.LINK ? 1 : 0,
      );
      rowAnimations.forEach(animation => animation.setValue(1));
      return;
    }

    setIsTransitioning(true);
    contentOpacity.stopAnimation();
    contentTranslateX.stopAnimation();
    headerProgress.stopAnimation();

    const exitAnimations = [
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: EXIT_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: forward ? -TRANSITION_DISTANCE : TRANSITION_DISTANCE,
        duration: EXIT_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ];

    if (!forward) {
      exitAnimations.push(
        Animated.timing(headerProgress, {
          toValue: 0,
          duration: EXIT_ANIMATION_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      );
    }

    Animated.parallel(exitAnimations).start(({finished}) => {
      if (!finished) {
        headerProgress.setValue(
          sheetMode === VERUSID_SHEET_MODES.LINK ? 1 : 0,
        );
        setIsTransitioning(false);
        return;
      }

      setSheetMode(nextMode);
      contentTranslateX.setValue(
        forward ? TRANSITION_DISTANCE : -TRANSITION_DISTANCE,
      );
      headerProgress.setValue(0);
      animateRowsIn(rowAnimations.length);

      const enterAnimations = [
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: 0,
          duration: ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ];

      if (forward) {
        enterAnimations.push(
          Animated.timing(headerProgress, {
            toValue: 1,
            duration: ENTER_ANIMATION_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        );
      }

      Animated.parallel(enterAnimations).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleLinkExisting = () => {
    transitionToMode(VERUSID_SHEET_MODES.LINK);
  };

  const headerAnimatedStyle = {
    height: headerProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, HEADER_ROW_HEIGHT],
    }),
    opacity: headerProgress,
  };
  const backButtonAnimatedStyle = {
    opacity: headerProgress,
    transform: [
      {
        translateY: headerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 0],
        }),
      },
    ],
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} maxHeight="76%">
      <View style={[signedOutSheetStyles.body, signedOutSheetStyles.bodyShort]}>
        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: contentOpacity,
              transform: [{translateX: contentTranslateX}],
            },
          ]}>
          <Animated.View
            pointerEvents={sheetMode === VERUSID_SHEET_MODES.LINK ? 'auto' : 'none'}
            style={[styles.headerRow, headerAnimatedStyle]}>
            {sheetMode === VERUSID_SHEET_MODES.LINK ? (
              <Animated.View style={backButtonAnimatedStyle}>
                <TouchableOpacity
                  accessibilityLabel="Back to VerusID options"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  disabled={isTransitioning}
                  onPress={() => transitionToMode(VERUSID_SHEET_MODES.CHOOSE)}
                  style={styles.backButton}>
                  <View style={signedOutSheetStyles.actionIcon}>
                    <ChevronLeft size={22} color={theme.colors.textPrimary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
          </Animated.View>
          {sheetMode === VERUSID_SHEET_MODES.LINK ? (
            <LinkExistingVerusIdSheet
              active={visible && sheetMode === VERUSID_SHEET_MODES.LINK}
              coinObj={coinObj}
              isCandidateAllowed={isCandidateAllowed}
              linkedIds={linkedIds}
              requestIsTestnet={requestIsTestnet}
              onLinkCandidate={onLinkCandidate}
              onManualLink={onManualLink}
            />
          ) : (
            <ScrollView
              alwaysBounceVertical={false}
              bounces={false}
              contentContainerStyle={signedOutSheetStyles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <ChooseRows
                canProvision={canProvision}
                disabled={isTransitioning}
                getRowAnimation={getRowAnimation}
                matchingCount={matchingCount}
                matchingIdentities={matchingIdentities}
                onLinkExisting={handleLinkExisting}
                onRequestVerusId={onRequestVerusId}
                onSelect={onSelect}
                selectedIdentity={selectedIdentity}
                signedOutSheetStyles={signedOutSheetStyles}
                styles={styles}
                theme={theme}
              />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </BottomSheetModal>
  );
};

const getRowAnimatedStyle = animatedValue => ({
  opacity: animatedValue,
  transform: [
    {
      translateY: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 0],
      }),
    },
  ],
});

const ChooseRows = ({
  canProvision,
  disabled,
  getRowAnimation,
  matchingCount,
  matchingIdentities,
  onLinkExisting,
  onRequestVerusId,
  onSelect,
  selectedIdentity,
  signedOutSheetStyles,
  styles,
  theme,
}) => {
  let rowIndex = 0;

  return (
    <>
      {canProvision && (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <ActionRow
            disabled={disabled}
            IconComponent={CirclePlus}
            label="Request VerusID"
            signedOutSheetStyles={signedOutSheetStyles}
            onPress={onRequestVerusId}
            theme={theme}
          />
        </Animated.View>
      )}
      {matchingIdentities.map(identity => (
        <Animated.View
          key={`${identity.chainId}:${identity.iAddress}`}
          style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <IdentityRow
            disabled={disabled}
            identity={identity}
            isSelected={
              selectedIdentity &&
              selectedIdentity.chainId === identity.chainId &&
              selectedIdentity.iAddress === identity.iAddress
            }
            onSelect={() =>
              onSelect(
                identity.chainId,
                identity.iAddress,
                identity.friendlyName,
              )
            }
            styles={styles}
            theme={theme}
          />
        </Animated.View>
      ))}
      {matchingCount === 0 && !canProvision && (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {'No linked VerusIDs match this request.'}
            </Text>
          </View>
        </Animated.View>
      )}
      <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
        <ActionRow
          disabled={disabled}
          IconComponent={CirclePlus}
          label="Link existing VerusID"
          signedOutSheetStyles={signedOutSheetStyles}
          onPress={onLinkExisting}
          theme={theme}
        />
      </Animated.View>
    </>
  );
};

const ActionRow = ({
  disabled,
  IconComponent,
  label,
  onPress,
  signedOutSheetStyles,
  theme,
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={disabled ? 1 : 0.74}
    disabled={disabled}
    onPress={onPress}
    style={signedOutSheetStyles.actionRow}>
    <View
      style={[
        signedOutSheetStyles.actionIconContainer,
        signedOutSheetStyles.actionIcon,
      ]}>
      <IconComponent size={24} color={theme.colors.textPrimary} />
    </View>
    <Text numberOfLines={1} style={signedOutSheetStyles.actionLabel}>
      {label}
    </Text>
    <MaterialCommunityIcons
      name="chevron-right"
      size={22}
      color={theme.colors.textSubtle}
    />
  </TouchableOpacity>
);

const IdentityRow = ({disabled, identity, isSelected, onSelect, styles, theme}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{selected: isSelected}}
    activeOpacity={disabled ? 1 : 0.74}
    disabled={disabled}
    onPress={onSelect}
    style={[
      styles.identityRow,
      {
        backgroundColor: isSelected
          ? theme.colors.successBackground
          : theme.colors.surfaceMuted,
      },
    ]}>
    <View style={styles.identityText}>
      <Text numberOfLines={1} style={styles.identityName}>
        {identity.friendlyName}
      </Text>
      <Text numberOfLines={1} style={styles.identityAddress}>
        {truncateAddress(identity.iAddress)}
      </Text>
    </View>
    <View style={styles.checkContainer}>
      {isSelected && (
        <Check color={theme.colors.success} size={20} strokeWidth={2.4} />
      )}
    </View>
  </TouchableOpacity>
);

const createStyles = theme =>
  StyleSheet.create({
    animatedContent: {
      flex: 0,
    },
    headerRow: {
      justifyContent: 'center',
      overflow: 'hidden',
    },
    backButton: {
      width: 40,
      height: HEADER_ROW_HEIGHT,
      marginLeft: -8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      minHeight: 54,
      justifyContent: 'center',
    },
    emptyText: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      ...fontStyle('regular'),
    },
    identityRow: {
      minHeight: 72,
      borderRadius: 14,
      paddingHorizontal: 16,
      marginVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    identityText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },
    identityName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    identityAddress: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 12,
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
    },
    checkContainer: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default IdentityPickerSheet;
