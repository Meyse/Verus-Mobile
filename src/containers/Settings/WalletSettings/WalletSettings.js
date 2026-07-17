/*
  This component displays the different coin setting menu options a user
  has. This includes general coin settings and specific settings for each 
  active coin.
*/

import React, {useCallback, useState} from 'react';
import AlertAsync from "react-native-alert-async";
import { connect } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { clearCacheData } from '../../../actions/actionCreators';
import { ELECTRUM } from "../../../utils/constants/intervalConstants";
import { RenderSquareCoinLogo } from "../../../utils/CoinData/Graphics";
import { SecureStorage } from "../../../utils/keychain/secureStore";
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert";
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../components/SettingsScaffold';

const GENERAL_WALLET_SETTINGS = "GeneralWalletSettings"
const COIN_SETTINGS = "CoinSettings"
const VRPC_OVERRIDES = "VrpcOverrides"
const ADDRESS_BLOCKLIST = "AddressBlocklist"

const WalletSettings = ({ navigation, dispatch, activeCoinsForUser }) => {
  const [usingKeychainEncryption, setUsingKeychainEncryption] = useState(SecureStorage.isEncrypted());

  const openSettings = useCallback((screen, data, header) => {
    navigation.navigate(screen, {
      data: data,
      title: header ? header : undefined,
    });
  }, [navigation]);

  const resetToScreen = useCallback((route, data) => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [
        { name: route, params: { data } },
      ],
    });

    if (navigation.closeDrawer) navigation.closeDrawer();
    navigation.dispatch(resetAction);
  }, [navigation]);

  const canClearCache = useCallback(() => {
    return AlertAsync(
      'Confirm',
      "Are you sure you would like to clear the stored data cache? " + 
      "(This could impact performance temporarily but will not delete any account information)",
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => Promise.resolve(true) },
      ],
      { cancelable: false },
    )
  }, []);

  const clearCache = useCallback(() => {
    canClearCache().then(res => {
      if (res) {
        let data = {
          task: () => clearCacheData(dispatch),
          message: "Clearing cache, please do not close Verus Mobile",
          route: "Home",
          successMsg: "Cache cleared successfully",
          errorMsg: "Cache failed to clear",
        }
        resetToScreen("SecureLoading", data)
      }
    })
  }, [canClearCache, dispatch, resetToScreen]);

  const canToggleKeychainEncryption = useCallback(() => {
    return AlertAsync(
      'Confirm',
      usingKeychainEncryption ? "Keychain encryption is an extra layer of security that uses your device's native keychain to encrypt your wallet data in addition to your password. Disabling it is not recommended, only do so if it significantly degrades wallet startup performance. Would you like to disable keychain encryption?" : "Are you sure you would like to enable keychain encryption?",
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => Promise.resolve(true) },
      ],
      { cancelable: false },
    )
  }, []);

  const toggleKeychainEncryption = useCallback(() => {
    canToggleKeychainEncryption().then(res => {
      if (res) {
        let data = {
          task: async () => {
            try {
              if (usingKeychainEncryption) {
                await SecureStorage.decryptAllStorage();

                if (SecureStorage.isEncrypted()) {
                  createAlert("Error", "Failed to disable keychain encryption")
                } else {
                  createAlert("Success", "Disabled keychain encryption")
                }
              } else {
                await SecureStorage.encryptAllStorage();

                if (!SecureStorage.isEncrypted()) {
                  createAlert("Error", "Failed to enable keychain encryption")
                } else {
                  createAlert("Success", "Enabled keychain encryption")
                }
              }
            } catch (e) {
              createAlert("Error", e.message)
            }
          },
          message: `${usingKeychainEncryption ? "Disabling" : "Enabling"} keychain encryption`,
          route: "Home",
          successMsg: `Keychain encryption ${usingKeychainEncryption ? "disabled" : "enabled"} successfully`,
          errorMsg: `Failed to ${usingKeychainEncryption ? "disable" : "enable"} keychain encryption`,
        }
        resetToScreen("SecureLoading", data)
      }
    })
  }, [canToggleKeychainEncryption, dispatch, resetToScreen]);

  const electrumCoins = activeCoinsForUser.filter(coin =>
    coin.compatible_channels.includes(ELECTRUM),
  );

  return (
    <SettingsScreen testID="settings.wallet">
      <SettingsSection title="Preferences">
        <SettingsRow
          description="Currency, display and requests"
          icon="tune"
          onPress={() => openSettings(GENERAL_WALLET_SETTINGS)}
          title="General settings"
        />
        <SettingsRow
          icon="block-helper"
          onPress={() => openSettings(ADDRESS_BLOCKLIST)}
          title="Address blocklist"
        />
        <SettingsRow
          icon="server"
          last
          onPress={() => openSettings(VRPC_OVERRIDES)}
          title="Custom RPC servers"
        />
      </SettingsSection>
      <SettingsSection title="Storage & encryption">
        <SettingsRow
          description="Wallet data will resync"
          icon="database-refresh"
          onPress={clearCache}
          showChevron={false}
          title="Clear cache"
        />
        <SettingsRow
          description="Extra protection for stored wallet data"
          icon="shield-key-outline"
          last
          onPress={toggleKeychainEncryption}
          showChevron={false}
          title={`${usingKeychainEncryption ? 'Disable' : 'Enable'} keychain encryption`}
        />
      </SettingsSection>
      {electrumCoins.length > 0 ? (
        <SettingsSection title="Electrum coin settings">
          {electrumCoins.map((coin, index) => (
            <SettingsRow
              description="Transaction verification"
              key={coin.id}
              last={index === electrumCoins.length - 1}
              leading={RenderSquareCoinLogo(coin.id)}
              onPress={() =>
                openSettings(COIN_SETTINGS, coin.id, coin.display_name)
              }
              title={`${coin.display_name} settings`}
            />
          ))}
        </SettingsSection>
      ) : null}
    </SettingsScreen>
  );
};

const mapStateToProps = (state) => ({
  activeAccount: state.authentication.activeAccount,
  activeCoinsForUser: state.coins.activeCoinsForUser,
});

export default connect(mapStateToProps)(WalletSettings);
