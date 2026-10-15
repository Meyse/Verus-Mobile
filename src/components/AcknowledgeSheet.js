import React, {useMemo, useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {fontStyle} from '../globals/fonts';
import {createSignedOutSheetStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';
import AppButton from './AppButton';
import BottomSheetModal from './BottomSheetModal';

// Warning sheet. It matches the "Protect your Secret Recovery Phrase" sheet in
// CreateSeed/SeedIntro. `onClose` runs on outside tap, system back, the
// confirm button, and the optional dismiss button. `onAcknowledged` runs once
// the closing animation ends, and only after the confirm button. Pass
// `dismissLabel` (for example "Not now") to show a text button under the
// confirm button, so the user can see how to back out.
const AcknowledgeSheet = ({
  visible,
  title,
  message,
  confirmLabel = 'I understand',
  dismissLabel,
  onClose,
  onAcknowledged,
  testID,
}) => {
  const theme = useOnboardingTheme();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const confirmedRef = useRef(false);

  const handleConfirm = () => {
    confirmedRef.current = true;
    onClose();
  };

  const handleClosed = () => {
    const confirmed = confirmedRef.current;
    confirmedRef.current = false;

    if (confirmed && typeof onAcknowledged === 'function') {
      onAcknowledged();
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={handleClosed}
      maxHeight="64%">
      <View style={styles.sheet}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={[sheetStyles.bodyText, styles.message]}>{message}</Text>
        <AppButton
          height={56}
          onPress={handleConfirm}
          style={styles.button}
          testID={testID}
          variant="primary">
          {confirmLabel}
        </AppButton>
        {dismissLabel ? (
          <AppButton
            height={56}
            onPress={onClose}
            style={styles.dismissButton}
            testID={testID ? `${testID}.dismiss` : undefined}
            variant="secondary">
            {dismissLabel}
          </AppButton>
        ) : null}
      </View>
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    sheet: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 21,
      lineHeight: 27,
      ...fontStyle('semiBold'),
    },
    message: {
      marginTop: 12,
    },
    button: {
      marginTop: 22,
    },
    dismissButton: {
      marginTop: 10,
    },
  });

export default AcknowledgeSheet;
