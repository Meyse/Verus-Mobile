import React, {useCallback, useState} from 'react';
import AlertAsync from 'react-native-alert-async';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {SecureStorage} from '../../../utils/keychain/secureStore';
import {SettingsRow} from './SettingsScaffold';
import {resetToSecureLoading} from './settingsTaskNavigation';

const KeychainEncryptionSettingRow = ({last = false, navigation}) => {
  const [usingKeychainEncryption] = useState(() => SecureStorage.isEncrypted());

  const canToggleKeychainEncryption = useCallback(
    () =>
      AlertAsync(
        'Confirm',
        usingKeychainEncryption
          ? "Keychain encryption is an extra layer of security that uses your device's native keychain to encrypt your wallet data in addition to your password. Disabling it is not recommended, only do so if it significantly degrades wallet startup performance. Would you like to disable keychain encryption?"
          : 'Are you sure you would like to enable keychain encryption?',
        [
          {
            text: 'No, take me back',
            onPress: () => Promise.resolve(false),
            style: 'cancel',
          },
          {text: 'Yes', onPress: () => Promise.resolve(true)},
        ],
        {cancelable: false},
      ),
    [usingKeychainEncryption],
  );

  const toggleKeychainEncryption = useCallback(() => {
    canToggleKeychainEncryption().then(confirmed => {
      if (confirmed) {
        resetToSecureLoading(navigation, {
          task: async () => {
            try {
              if (usingKeychainEncryption) {
                await SecureStorage.decryptAllStorage();

                if (SecureStorage.isEncrypted()) {
                  createAlert('Error', 'Failed to disable keychain encryption');
                } else {
                  createAlert('Success', 'Disabled keychain encryption');
                }
              } else {
                await SecureStorage.encryptAllStorage();

                if (!SecureStorage.isEncrypted()) {
                  createAlert('Error', 'Failed to enable keychain encryption');
                } else {
                  createAlert('Success', 'Enabled keychain encryption');
                }
              }
            } catch (e) {
              createAlert('Error', e.message);
            }
          },
          message: `${
            usingKeychainEncryption ? 'Disabling' : 'Enabling'
          } keychain encryption`,
          route: 'Home',
          successMsg: `Keychain encryption ${
            usingKeychainEncryption ? 'disabled' : 'enabled'
          } successfully`,
          errorMsg: `Failed to ${
            usingKeychainEncryption ? 'disable' : 'enable'
          } keychain encryption`,
        });
      }
    });
  }, [canToggleKeychainEncryption, navigation, usingKeychainEncryption]);

  return (
    <SettingsRow
      description="Extra protection for stored wallet data"
      icon="shield-key-outline"
      last={last}
      onPress={toggleKeychainEncryption}
      showChevron={false}
      title={`${usingKeychainEncryption ? 'Disable' : 'Enable'} keychain encryption`}
    />
  );
};

export default KeychainEncryptionSettingRow;
