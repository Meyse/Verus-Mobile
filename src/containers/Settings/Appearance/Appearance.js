import React from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {List, RadioButton, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {saveGeneralSettings} from '../../../actions/actionCreators';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import signedInCopy from '../../../copy/signedIn';
import {createSignedInStyles} from '../../../styles';
import {ONBOARDING_THEME_MODE, useOnboardingTheme} from '../../../theme/onboarding';

const OPTIONS = [
  {
    value: ONBOARDING_THEME_MODE.SYSTEM,
    title: signedInCopy.settings.system,
    description: signedInCopy.settings.systemDescription,
    icon: 'cellphone-cog',
  },
  {
    value: ONBOARDING_THEME_MODE.LIGHT,
    title: signedInCopy.settings.light,
    description: signedInCopy.settings.lightDescription,
    icon: 'white-balance-sunny',
  },
  {
    value: ONBOARDING_THEME_MODE.DARK,
    title: signedInCopy.settings.dark,
    description: signedInCopy.settings.darkDescription,
    icon: 'moon-waning-crescent',
  },
];

const Appearance = () => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const appearance = useSelector(
    state =>
      state.settings.generalWalletSettings.appearance ||
      ONBOARDING_THEME_MODE.SYSTEM,
  );

  const selectAppearance = async value => {
    try {
      dispatch(await saveGeneralSettings({appearance: value}));
    } catch (e) {
      createAlert('Unable to change appearance', e.message);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeScreen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          {signedInCopy.settings.appearanceDescription}
        </Text>
        <View style={[styles.surface, {marginTop: theme.spacing.lg}]}>
          {OPTIONS.map((option, index) => (
            <React.Fragment key={option.value}>
              <TouchableOpacity
                accessibilityRole="radio"
                accessibilityState={{selected: appearance === option.value}}
                onPress={() => selectAppearance(option.value)}>
                <List.Item
                  title={option.title}
                  description={option.description}
                  titleStyle={styles.rowTitle}
                  descriptionStyle={styles.rowDescription}
                  style={styles.row}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon={option.icon}
                      color={theme.colors.textSecondary}
                    />
                  )}
                  right={() => (
                    <RadioButton
                      value={option.value}
                      status={appearance === option.value ? 'checked' : 'unchecked'}
                      onPress={() => selectAppearance(option.value)}
                    />
                  )}
                />
              </TouchableOpacity>
              {index < OPTIONS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Appearance;
