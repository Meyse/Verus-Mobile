import React from 'react';
import {StyleSheet} from 'react-native';
import {Portal} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Colors from '../globals/colors';
import SemiModal from './SemiModal';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../theme/onboarding';

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
  const bottomSpacing = floating ? Math.max(insets.bottom, 12) : 0;
  const safeAreaPadding = floating ? 0 : insets.bottom;
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

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        transparent
        visible={visible}
        onDismiss={onClosed}
        onRequestClose={onClose}
        flexHeight={0.01}
        contentContainerStyle={sheetStyle}
        modalTheme={theme}
        {...modalProps}
        showHeader={false}>
        <OnboardingThemeProvider modeOverride={theme.mode}>
          {children}
        </OnboardingThemeProvider>
      </SemiModal>
    </Portal>
  );
};

const styles = StyleSheet.create({
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
    shadowOffset: {width: 0, height: -8},
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
