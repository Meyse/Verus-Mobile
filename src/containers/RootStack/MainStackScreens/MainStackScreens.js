import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import AddCoin from '../../AddCoin/AddCoin'
import CoinDetails from '../../CoinDetails/CoinDetails'
import DisplaySeed from '../../DisplaySeed/DisplaySeed'
import SettingsMenus from '../../Settings/SettingsMenus'
import CoinMenus from '../../Coin/CoinMenus'
import VerusPay from '../../VerusPay/VerusPay'
import ProfileInfo from '../../Settings/ProfileSettings/ProfileInfo/ProfileInfo'
import ResetPwd from '../../Settings/ProfileSettings/ResetPwd/ResetPwd'
import RecoverSeed from '../../Settings/ProfileSettings/RecoverSeed/RecoverSeed'
import GeneralWalletSettings from '../../Settings/WalletSettings/GeneralWalletSettings/GeneralWalletSettings'
import CoinSettings from '../../Settings/WalletSettings/CoinSettings/CoinSettings'
import DeleteProfile from '../../Settings/ProfileSettings/DeleteProfile/DeleteProfile'
import SecureLoading from '../../SecureLoading/SecureLoading'
import HomeTabScreens from '../HomeTabScreens/HomeTabScreens';
import AddressBlocklist from '../../Settings/WalletSettings/AddressBlocklist/AddressBlocklist';
import VrpcOverrides from '../../Settings/WalletSettings/VrpcOverrides/VrpcOverrides';
import NfcBackup from '../../Settings/WalletSettings/NfcBackup/NfcBackup';
import ProfileSettings from '../../Settings/ProfileSettings/ProfileSettings';
import WalletSettings from '../../Settings/WalletSettings/WalletSettings';
import AppInfo from '../../Settings/AppInfo/AppInfo';
import Appearance from '../../Settings/Appearance/Appearance';
import ReceiveAssetsList from '../../Transfer/ReceiveAssetsList';
import ReceiveAssetDetails from '../../Transfer/ReceiveAssetDetails';
import SendWizardNavigator from '../../SendWizard/SendWizardNavigator';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../env/index';
import {
  createRedesignedHeaderOptions,
  createSettingsHeaderOptions,
} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';

const MainStack = createStackNavigator();

const MainStackScreens = props => {
  const theme = useOnboardingTheme();
  const settingsHeaderOptions = createSettingsHeaderOptions(theme);

  return (
    <MainStack.Navigator
      screenOptions={
        ENABLE_SIGNED_IN_REDESIGN
          ? createRedesignedHeaderOptions(theme)
          : defaultHeaderOptions
      }
    >
      <MainStack.Screen
        name="Home"
        component={HomeTabScreens}
        options={{ headerShown: false }}
      />

      <MainStack.Screen
        name="AddCoin"
        component={AddCoin}
        options={{
          title: "Add Coin",
        }}
      />

      <MainStack.Screen
        name="CoinDetails"
        component={CoinDetails}
        options={{
          title: "Details",
        }}
      />

      <MainStack.Screen
        name="DisplaySeed"
        component={DisplaySeed}
        options={{
          ...settingsHeaderOptions,
          title: "Recovery secrets",
        }}
      />

      <MainStack.Screen name="CoinMenus" component={CoinMenus} />

      {ENABLE_SIGNED_IN_REDESIGN && (
        <MainStack.Screen
          name="ReceiveAssetsList"
          component={ReceiveAssetsList}
          options={{title: 'Receive assets'}}
        />
      )}

      {ENABLE_SIGNED_IN_REDESIGN && (
        <MainStack.Screen
          name="ReceiveAssetDetails"
          component={ReceiveAssetDetails}
          options={{title: 'Receive'}}
        />
      )}

      {ENABLE_SIGNED_IN_REDESIGN && (
        <MainStack.Screen
          name="SendWizard"
          component={SendWizardNavigator}
          options={{headerShown: false}}
        />
      )}

      <MainStack.Screen
        name="SettingsMenus"
        component={SettingsMenus}
        options={settingsHeaderOptions}
      />

      <MainStack.Screen
        name="ProfileSettings"
        component={ProfileSettings}
        options={{...settingsHeaderOptions, title: 'Wallet and security'}}
      />

      <MainStack.Screen
        name="WalletSettings"
        component={WalletSettings}
        options={{...settingsHeaderOptions, title: 'Wallet settings'}}
      />

      <MainStack.Screen
        name="Appearance"
        component={Appearance}
        options={{...settingsHeaderOptions, title: 'Appearance'}}
      />

      <MainStack.Screen
        name="AppInfo"
        component={AppInfo}
        options={{...settingsHeaderOptions, title: 'App information'}}
      />

      <MainStack.Screen
        name="ProfileInfo"
        component={ProfileInfo}
        options={{
          ...settingsHeaderOptions,
          title: "Info",
        }}
      />

      <MainStack.Screen
        name="ResetPwd"
        component={ResetPwd}
        options={{
          ...settingsHeaderOptions,
          title: "Reset",
        }}
      />

      <MainStack.Screen
        name="RecoverSeed"
        component={RecoverSeed}
        options={{
          ...settingsHeaderOptions,
          title: "Recover",
        }}
      />

      <MainStack.Screen
        name="GeneralWalletSettings"
        component={GeneralWalletSettings}
        options={{
          ...settingsHeaderOptions,
          title: "General",
        }}
      />

      <MainStack.Screen
        name="AddressBlocklist"
        component={AddressBlocklist}
        options={{
          ...settingsHeaderOptions,
          title: "Blocked addresses",
        }}
      />

      <MainStack.Screen
        name="VrpcOverrides"
        component={VrpcOverrides}
        options={{
          ...settingsHeaderOptions,
          title: "Custom RPC servers",
        }}
      />  

      <MainStack.Screen
        name="NfcBackup"
        component={NfcBackup}
        options={{
          ...settingsHeaderOptions,
          title: "NFC backup",
        }}
      />

      <MainStack.Screen
        name="CoinSettings"
        component={CoinSettings}
        options={({ route }) => ({
          ...settingsHeaderOptions,
          title: route.params != null ? route.params.title : null,
        })}
      />

      <MainStack.Screen
        name="DeleteProfile"
        component={DeleteProfile}
        options={{
          ...settingsHeaderOptions,
          title: "Delete",
        }}
      />

      <MainStack.Screen
        name="SecureLoading"
        component={SecureLoading}
        options={{
          title: "Loading",
          headerRight: () => null,
          headerLeft: () => null,
        }}
      />
    </MainStack.Navigator>
  );
};

export default MainStackScreens
