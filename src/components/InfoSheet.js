import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from './AppButton';
import BottomSheetModal from './BottomSheetModal';
import SheetScrollView from './SheetScrollView';
import {deepLinkRequestReviewStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

// `headerAccessory` sits at the right of the title line, for example a
// status badge.
const InfoSheet = ({
  children,
  headerAccessory,
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
            <View style={localStyles.titleLine}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.requestSheetTitle,
                  localStyles.title,
                  headerAccessory && localStyles.titleWithAccessory,
                ]}>
                {title}
              </Text>
              {headerAccessory}
            </View>
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

const localStyles = StyleSheet.create({
  titleLine: {flexDirection: 'row', alignItems: 'center'},
  title: {flex: 1},
  titleWithAccessory: {marginRight: 12},
});

export default InfoSheet;
