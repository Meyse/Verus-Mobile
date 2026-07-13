import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import Home from '../../Home/Home';
import Service from '../../Services/Service/Service';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../env/index';
import {createRedesignedHeaderOptions} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';
import CoinMenus from '../../Coin/CoinMenus';

const WalletStack = createStackNavigator();

const WalletStackScreens = props => {
  const theme = useOnboardingTheme();

  return (
    <WalletStack.Navigator
      screenOptions={
        ENABLE_SIGNED_IN_REDESIGN
          ? createRedesignedHeaderOptions(theme)
          : defaultHeaderOptions
      }
    >
      <WalletStack.Screen
        name="Wallets"
        component={Home}
        options={{
          title: ENABLE_SIGNED_IN_REDESIGN ? "Wallet" : "Wallets",
          headerShown: !ENABLE_SIGNED_IN_REDESIGN,
        }}
      />
      <WalletStack.Screen
        name="Service"
        component={Service}
      />
      {ENABLE_SIGNED_IN_REDESIGN && (
        <WalletStack.Screen
          name="CoinMenus"
          component={CoinMenus}
          options={{title: '', headerShadowVisible: false}}
        />
      )}
    </WalletStack.Navigator>
  );
};

export default WalletStackScreens
