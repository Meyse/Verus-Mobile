import React, {useEffect, useMemo, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useOnboardingTheme} from '../../../theme/onboarding';

const STEP_PROGRESS = {
  SendWizardSelectSource: 0.2,
  SendWizardSelectTarget: 0.4,
  SendWizardAmount: 0.6,
  SendWizardRecipient: 0.8,
  SendWizardConfirm: 1,
  SendWizardSuccess: 1,
};

export const getSendWizardProgress = routeName =>
  STEP_PROGRESS[routeName] || STEP_PROGRESS.SendWizardSelectSource;

const SendWizardHeader = ({
  disabled = false,
  onBack,
  onClose,
  progress,
  progressAnimation: sharedProgressAnimation,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const progressPercent = Math.round(clampedProgress * 100);
  const localProgressAnimation = useRef({
    generation: 0,
    value: new Animated.Value(clampedProgress),
  }).current;
  const progressAnimation =
    sharedProgressAnimation || localProgressAnimation;
  const animatedProgress = progressAnimation.value;
  const progressWidth = useMemo(
    () =>
      animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [animatedProgress],
  );

  useEffect(() => {
    let active = true;
    let animation;
    const generation = progressAnimation.generation + 1;
    progressAnimation.generation = generation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active || progressAnimation.generation !== generation) return;

        animatedProgress.stopAnimation();

        if (reduceMotionEnabled) {
          animatedProgress.setValue(clampedProgress);
          return;
        }

        animation = Animated.timing(animatedProgress, {
          toValue: clampedProgress,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        });
        animation.start();
      })
      .catch(() => {
        if (active && progressAnimation.generation === generation) {
          animatedProgress.setValue(clampedProgress);
        }
      });

    return () => {
      active = false;

      if (animation && progressAnimation.generation === generation) {
        animation.stop();
      }
    };
  }, [animatedProgress, clampedProgress, progressAnimation]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      <View style={styles.actionRow}>
        {onBack ? (
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityState={{disabled}}
            activeOpacity={0.74}
            disabled={disabled}
            onPress={onBack}
            style={[styles.backButton, disabled && styles.disabled]}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="arrow-left"
              size={24}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <TouchableOpacity
          accessibilityLabel="Close transfer"
          accessibilityRole="button"
          accessibilityState={{disabled}}
          activeOpacity={0.74}
          disabled={disabled}
          onPress={onClose}
          style={[styles.closeButton, disabled && styles.disabled]}>
          <MaterialCommunityIcons
            color={theme.colors.textPrimary}
            name="close"
            size={22}
          />
        </TouchableOpacity>
      </View>
      <View
        accessibilityLabel={`Transfer ${progressPercent}% complete`}
        accessibilityRole="progressbar"
        accessibilityValue={{min: 0, max: 100, now: progressPercent}}
        style={[
          styles.progressTrack,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
    marginLeft: -8,
  },
  disabled: {
    opacity: 0.4,
  },
  progressTrack: {
    height: 5,
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 999,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});

export default SendWizardHeader;
