import React, {useEffect, useMemo, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '../theme/app';
import OnboardingBackButton from './OnboardingBackButton';

const ProgressHeader = ({
  backDisabled = false,
  borderless = false,
  showBack = true,
  showProgress = true,
  onBack,
  progress = 0.25,
  title,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const animatedProgress = useRef(new Animated.Value(clampedProgress)).current;
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

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

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
        if (active) {
          animatedProgress.setValue(clampedProgress);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }
    };
  }, [animatedProgress, clampedProgress]);

  return (
    <View
      style={[
        styles.container,
        borderless && {borderBottomWidth: 0},
        {
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      <View style={styles.actionRow}>
        {showBack ? (
          <OnboardingBackButton
            disabled={backDisabled}
            onPress={onBack}
            style={styles.backButtonOffset}
          />
        ) : (
          <View style={styles.actionPlaceholder} />
        )}
        {title ? (
          <>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[
                styles.title,
                theme.typography.titleSheet,
                {color: theme.colors.textPrimary},
              ]}>
              {title}
            </Text>
            <View style={styles.actionPlaceholder} />
          </>
        ) : null}
      </View>
      {showProgress ? (
        <View
          accessibilityLabel={`${Math.round(clampedProgress * 100)}% complete`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(clampedProgress * 100),
          }}
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
      ) : null}
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
  },
  actionPlaceholder: {
    width: 40,
    height: 40,
  },
  backButtonOffset: {
    marginLeft: -8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
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

export default ProgressHeader;
