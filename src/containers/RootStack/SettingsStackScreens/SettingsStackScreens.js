import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import SignedInSettingsHome from '../../Settings/SignedInSettingsHome';
import {createRedesignedHeaderOptions} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';

const SettingsStack = createStackNavigator();

const SettingsStackScreens = () => {
  const theme = useOnboardingTheme();

  return (
    <SettingsStack.Navigator
      screenOptions={createRedesignedHeaderOptions(theme)}>
      <SettingsStack.Screen
        name="Settings"
        component={SignedInSettingsHome}
        options={{headerShown: false}}
      />
    </SettingsStack.Navigator>
  );
};

export default SettingsStackScreens;
