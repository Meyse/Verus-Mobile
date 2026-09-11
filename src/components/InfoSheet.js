import React, {useMemo} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from './AppButton';
import BottomSheetModal from './BottomSheetModal';
import SheetScrollView from './SheetScrollView';
import {deepLinkRequestReviewStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

const InfoSheet = ({
  children,
  maxHeight = '78%',
  onClose,
  onClosed,
  subtitle,
  title,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => deepLinkRequestReviewStyles(theme), [theme]);
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      maxHeight={maxHeight}>
      <View style={styles.requestSheetBody} onAccessibilityEscape={onClose}>
        <View style={styles.requestSheetHeader}>
          <View style={styles.requestSheetHeaderText}>
            <Text accessibilityRole="header" style={styles.requestSheetTitle}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.requestSheetSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        <SheetScrollView>{children}</SheetScrollView>
        <AppButton
          accessibilityLabel="Done"
          height={56}
          onPress={onClose}
          style={styles.requestSheetActionButton}
          variant="secondary">
          Done
        </AppButton>
      </View>
    </BottomSheetModal>
  );
};

export default InfoSheet;
