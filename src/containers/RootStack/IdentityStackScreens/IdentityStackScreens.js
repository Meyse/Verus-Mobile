import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import VerusIdService from '../../Services/ServiceComponents/VerusIdService/VerusIdService';
import {createRedesignedHeaderOptions} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';

const IdentityStack = createStackNavigator();

const IdentityStackScreens = () => {
  const theme = useOnboardingTheme();

  return (
    <IdentityStack.Navigator
      screenOptions={createRedesignedHeaderOptions(theme)}>
      <IdentityStack.Screen
        name="Identity"
        component={VerusIdService}
        options={{headerShown: false}}
      />
    </IdentityStack.Navigator>
  );
};

export default IdentityStackScreens;
