import React, {useLayoutEffect, useState} from 'react';
import {Keyboard, Pressable, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import OptionsSheet from '../../../components/OptionsSheet';
import {useOnboardingTheme} from '../../../theme/onboarding';

// The wizard header's "More options" action and its sheet. The action sits
// left of Close (the header's `rightAccessory`) and belongs to the screen that
// calls this hook; the stack keeps options per screen. Returns the sheet to
// render in the screen. `onOpenForm` runs after the sheet has closed.
const useAdvancedFormMenu = ({enabled, onOpenForm}) => {
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
            Keyboard.dismiss();
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
  }, [enabled, navigation, theme.colors.textPrimary]);

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
