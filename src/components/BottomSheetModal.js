import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet} from 'react-native';
import {Portal} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Colors from '../globals/colors';
import SemiModal from './SemiModal';
import {useOnboardingTheme} from '../theme/onboarding';

const OPEN_ANIMATION_DURATION = 230;
const CLOSE_ANIMATION_DURATION = 160;

const BottomSheetModal = ({
  visible,
  onClose,
  onClosed,
  children,
  floating = true,
  maxHeight = '80%',
  contentContainerStyle,
  ...modalProps
}) => {
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const animation = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const renderVisibleRef = useRef(visible);
  const onClosedRef = useRef(onClosed);
  const [renderVisible, setRenderVisible] = useState(visible);
  const bottomSpacing = floating ? Math.max(insets.bottom, 12) : 0;
  const safeAreaPadding = floating ? 0 : insets.bottom;

  const setInternalVisible = useCallback(nextVisible => {
    renderVisibleRef.current = nextVisible;
    setRenderVisible(nextVisible);
  }, []);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    let active = true;

    animation.stopAnimation();

    if (visible) {
      setInternalVisible(true);
      animation.setValue(0);
      Animated.timing(animation, {
        toValue: 1,
        duration: OPEN_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (renderVisibleRef.current) {
      Animated.timing(animation, {
        toValue: 0,
        duration: CLOSE_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (active && finished) {
          setInternalVisible(false);
          if (typeof onClosedRef.current === 'function') {
            onClosedRef.current();
          }
        }
      });
    }

    return () => {
      active = false;
      animation.stopAnimation();
    };
  }, [animation, setInternalVisible, visible]);

  const sheetStyle = StyleSheet.flatten([
    styles.sheet,
    floating ? styles.floatingSheet : styles.attachedSheet,
    {
      marginBottom: bottomSpacing,
      paddingBottom: safeAreaPadding,
      maxHeight,
      backgroundColor: theme.colors.sheet,
      borderWidth: theme.isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
    },
    contentContainerStyle,
  ]);
  const overlayAnimatedStyle = {
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, theme.colors.scrimOpacity],
    }),
  };
  const sheetAnimatedStyle = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [44, 0],
        }),
      },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  return (
    <Portal>
      {renderVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            {backgroundColor: theme.colors.scrim},
            overlayAnimatedStyle,
          ]}
        />
      )}
      <SemiModal
        animationType="none"
        transparent={true}
        visible={renderVisible}
        onRequestClose={onClose}
        flexHeight={0.01}
        contentContainerStyle={sheetStyle}
        sheetAnimatedStyle={sheetAnimatedStyle}
        modalTheme={theme}
        {...modalProps}
        showHeader={false}
        showOverlay={false}>
        {children}
      </SemiModal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.quinaryColor,
    elevation: 15,
    zIndex: 15,
  },
  sheet: {
    flex: 0,
    alignSelf: 'stretch',
    backgroundColor: Colors.secondaryColor,
  },
  floatingSheet: {
    marginHorizontal: 12,
    borderRadius: 24,
    shadowColor: Colors.quinaryColor,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    elevation: 16,
  },
  attachedSheet: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});

export default BottomSheetModal;
