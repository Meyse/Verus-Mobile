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
import Colors from '../../../globals/colors';

const CompactSetupHeader = ({onBack, progress = 0.25}) => {
  const insets = useSafeAreaInsets();
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
        {
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        },
      ]}>
      <View style={styles.actionRow}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          activeOpacity={0.74}
          onPress={onBack}
          style={styles.backButton}>
          <MaterialCommunityIcons
            color={Colors.quaternaryColor}
            name="arrow-left"
            size={24}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, {width: progressWidth}]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
    backgroundColor: Colors.secondaryColor,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 5,
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E7ECF2',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primaryColor,
  },
});

export default CompactSetupHeader;
