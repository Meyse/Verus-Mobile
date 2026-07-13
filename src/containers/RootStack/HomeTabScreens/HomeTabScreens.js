import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import Colors from '../../../globals/colors';
import WalletStackScreens from '../WalletStackScreens/WalletStackScreens';
import ProfileStackScreens from '../ProfileStackScreens/ProfileStackScreens';
import ServicesStackScreens from '../ServicesStackScreens/ServicesStackScreens';
import VerusPay from '../../VerusPay/VerusPay';
import ConvertStackScreens from '../ConvertStackScreens/ConvertStackScreens';
import SettingsStackScreens from '../SettingsStackScreens/SettingsStackScreens';
import IdentityStackScreens from '../IdentityStackScreens/IdentityStackScreens';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../env/index';
import {useOnboardingTheme} from '../../../theme/onboarding';
import signedInCopy from '../../../copy/signedIn';

const HomeTabs = createMaterialBottomTabNavigator()

const HomeTabScreens = props => {
  const theme = useOnboardingTheme();

  if (ENABLE_SIGNED_IN_REDESIGN) {
    return (
      <HomeTabs.Navigator
        barStyle={{
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        }}
        activeColor={theme.colors.primary}
        inactiveColor={theme.colors.textSubtle}
        shifting={false}
        labeled>
        <HomeTabs.Screen
          name="WalletHome"
          component={WalletStackScreens}
          options={{
            title: signedInCopy.navigation.wallet,
            tabBarIcon: ({color}) => (
              <MaterialCommunityIcons name="wallet-outline" color={color} size={25} />
            ),
          }}
        />
        <HomeTabs.Screen
          name="ServicesHome"
          component={ServicesStackScreens}
          options={{
            title: signedInCopy.navigation.services,
            tabBarIcon: ({color}) => (
              <MaterialCommunityIcons name="view-grid-outline" color={color} size={25} />
            ),
          }}
        />
        <HomeTabs.Screen
          name="IdentityHome"
          component={IdentityStackScreens}
          options={{
            title: signedInCopy.navigation.identity,
            tabBarIcon: ({color}) => (
              <MaterialCommunityIcons name="account-key-outline" color={color} size={25} />
            ),
          }}
        />
        <HomeTabs.Screen
          name="SettingsHome"
          component={SettingsStackScreens}
          options={{
            title: signedInCopy.navigation.settings,
            tabBarIcon: ({color}) => (
              <MaterialCommunityIcons name="cog-outline" color={color} size={25} />
            ),
          }}
        />
        <HomeTabs.Screen
          name="VerusPay"
          component={VerusPay}
          options={{
            title: signedInCopy.navigation.scan,
            tabBarIcon: ({color}) => (
              <MaterialCommunityIcons name="line-scan" color={color} size={25} />
            ),
          }}
        />
      </HomeTabs.Navigator>
    );
  }

  return (
    <HomeTabs.Navigator
      barStyle={{ backgroundColor: Colors.primaryColor }}
      shifting={false}
    >
      <HomeTabs.Screen
        name="WalletHome"
        component={WalletStackScreens}
        options={{
          title: "Wallets",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="wallet" color={color} size={26} />
          ),
        }}
      />
      <HomeTabs.Screen
        name="PersonalHome"
        component={ProfileStackScreens}
        options={{
          title: "Personal",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="fingerprint"
              color={color}
              size={26}
            />
          ),
        }}
      />
      <HomeTabs.Screen
        name="ServicesHome"
        component={ServicesStackScreens}
        options={{
          title: "Services",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="room-service"
              color={color}
              size={26}
            />
          ),
        }}
      />
      {/* <HomeTabs.Screen
        name="Convert"
        component={ConvertStackScreens}
        options={{
          title: "Convert",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="swap-horizontal"
              color={color}
              size={26}
            />
          ),
        }}
      /> */}
      <HomeTabs.Screen
        name="VerusPay"
        component={VerusPay}
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="camera"
              color={color}
              size={26}
            />
          ),
        }}
      />
    </HomeTabs.Navigator>
  );
};

export default HomeTabScreens
