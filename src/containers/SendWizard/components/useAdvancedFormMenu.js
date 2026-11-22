import React, {useLayoutEffect, useState} from 'react';
import {Keyboard, Pressable, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import OptionsSheet from '../../../components/OptionsSheet';
import {useOnboardingTheme} from '../../../theme/onboarding';

// The wizard header's "More options" action and its sheet. The action sits
// left of Close (the header's `rightAccessory`) and belongs to the screen that
// calls this hook; the stack keeps options per screen. Returns the sheet to
// render in the screen. `onOpenForm` runs after the sheet has closed;
// `onDismissed` runs when it closed with no choice (to give focus back).
// `dismissKeyboard: false` is for a step with no system keyboard: its field
// keeps focus under the sheet, so the cursor is there when the sheet closes
// (iOS does not give focus back to a field that was blurred first).
const useAdvancedFormMenu = ({
  dismissKeyboard = true,
  enabled,
  onDismissed,
  onOpenForm,
}) => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      wizardRightAccessory: enabled ? (
        <Pressable
          accessibilityLabel="More options"
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => {
            if (dismissKeyboard) Keyboard.dismiss();
            setVisible(true);
          }}
          style={styles.button}
          testID="send-wizard-more">
          <MaterialCommunityIcons
            color={theme.colors.textPrimary}
            name="dots-horizontal"
            size={24}
          />
        </Pressable>
      ) : undefined,
    });
  }, [dismissKeyboard, enabled, navigation, theme.colors.textPrimary]);

  return enabled ? (
    <OptionsSheet
      actions={[
        {
          key: 'advanced-form',
          label: 'Advanced form',
          icon: 'tune-variant',
          onPress: onOpenForm,
          testID: 'send-wizard-more-advanced-form',
        },
      ]}
      onClose={() => setVisible(false)}
      onDismissed={onDismissed}
      visible={visible}
    />
  ) : null;
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default useAdvancedFormMenu;
