/**
 * Update: Fix navigation passed to child screens to use stack navigation.
 * - Ensures in-stack navigation works (e.g., UseBiometrics -> CreateWallet)
 */
import {createStackNavigator} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {addCoin, addUser, setProfileCreationInProgress} from '../../../actions/actionCreators';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {CHANNELS, ELECTRUM} from '../../../utils/constants/intervalConstants';
import {hashAccountId} from '../../../utils/crypto/hash';
import {storeBiometricPassword} from '../../../utils/keychain/keychain';
import {arrayToObject} from '../../../utils/objectManip';
import CreateWalletStackScreens from '../../CreateWallet/CreateWallet';
import ChooseName from './Forms/ChooseName';
import CreatePassword from './Forms/CreatePassword';
import ConfirmPassword from './Forms/ConfirmPassword';
import UseBiometrics from './Forms/UseBiometrics';
import {KEY_DERIVATION_VERSION, SERVICES_DISABLED_DEFAULT} from '../../../../env/index';
import {START_COINS, TEST_PROFILE_OVERRIDES} from '../../../utils/constants/constants';
import {useDispatch} from 'react-redux';
import {
  closeLoadingModal,
  initializeAccountData,
  openLoadingModal,
} from '../../../actions/actionDispatchers';
import { deriveKeyPair } from '../../../utils/keys';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { useObjectSelector } from '../../../hooks/useObjectSelector';

const CreateProfileStack = createStackNavigator();

export default function CreateProfileStackScreens(props) {
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [walletType, setWalletType] = useState(props.route?.params?.walletType || 'new');
  const dispatch = useDispatch();

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);

  const addStartingCoins = async (accountId, testnetOverrides = {}) => {
    const testAccount = Object.keys(testnetOverrides).length > 0;

    for (const coinId of START_COINS) {
      if (testAccount && testnetOverrides[coinId] == null) {
        continue;
      }

      const coinKey = testnetOverrides[coinId] ? testnetOverrides[coinId] : coinId;

      const fullCoinData = CoinDirectory.findCoinObj(coinKey, accountId);

      dispatch(await addCoin(fullCoinData, activeCoinList, accountId, []));
    }
  };

  const createProfile = async (seed, testProfile, options = {}) => {
    const uiMode = options.uiMode || 'modal';
    if (uiMode === 'modal') openLoadingModal('Setting up your new profile...');
    else dispatch(setProfileCreationInProgress(true));

    try {
      const _userName = profileName;
      const _pin = password;
      const _seeds = {[ELECTRUM]: seed};

      try {
        for (const startCoin of START_COINS) {
          await deriveKeyPair(
            seed,
            CoinDirectory.findCoinObj(startCoin),
            ELECTRUM,
            KEY_DERIVATION_VERSION,
          );
        }
      } catch(e) {
        throw new Error(`Could not create keypair from seed: ${e.message}`);
      }

      if (_seeds[ELECTRUM] == null) {
        throw new Error('Please configure at least a primary seed.');
      }

      let biometry = false;
      const accountHash = hashAccountId(_userName);

      if (accounts.find(x => x.accountHash === accountHash) != null) {
        throw new Error('Cannot create duplicate account.');
      }

      if (useBiometrics) {
        try {
          await storeBiometricPassword(accountHash, _pin);
          biometry = true;
        } catch (e) {
          console.warn(e);
        }
      }

      const overrides = testProfile ? TEST_PROFILE_OVERRIDES : undefined

      const action = await addUser(
        _userName,
        arrayToObject(CHANNELS, (acc, channel) => _seeds[channel], true),
        _pin,
        accounts,
        biometry,
        KEY_DERIVATION_VERSION,
        SERVICES_DISABLED_DEFAULT,
        overrides
      );

      dispatch(action);
      await addStartingCoins(_userName, overrides);

      const newAccount = action.payload.accounts.find(
        x => x.accountHash === accountHash,
      );

      if (!newAccount) {
        throw new Error('Failed to create new account');
      }

      //Log in new user
      // In inline mode, we defer sign-in so UI can show success and the user can tap Next
      await initializeAccountData(newAccount, _pin, false, () => {}, uiMode === 'inline');
      if (uiMode === 'modal') {
        createAlert('Profile created!', `Your '${_userName}' profile has been created and is ready to use.`);
      }
    } catch (e) {
      console.error(e)
      createAlert('Error', e.message);
    }

    if (uiMode === 'modal') closeLoadingModal();
  };

  return (
    <CreateProfileStack.Navigator>
      <CreateProfileStack.Screen
        name="ChooseName"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitleVisible: false,
          headerTintColor: '#111827',
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}>
        {({ navigation: stackNavigation }) => (
          <ChooseName
            profileName={profileName}
            setProfileName={setProfileName}
            navigation={stackNavigation}
          />
        )}
      </CreateProfileStack.Screen>
      <CreateProfileStack.Screen
        name="CreatePassword"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitleVisible: false,
          headerTintColor: '#111827',
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}>
        {({ navigation: stackNavigation }) => (
          <CreatePassword
            password={password}
            setPassword={setPassword}
            navigation={stackNavigation}
          />
        )}
      </CreateProfileStack.Screen>
      <CreateProfileStack.Screen
        name="UseBiometrics"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitleVisible: false,
          headerTintColor: '#111827',
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}>
        {({ navigation: stackNavigation }) => (
          <UseBiometrics
            useBiometrics={useBiometrics}
            setUseBiometrics={setUseBiometrics}
            navigation={stackNavigation}
            walletType={walletType}
          />
        )}
      </CreateProfileStack.Screen>
      <CreateProfileStack.Screen
        name="ConfirmPassword"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitleVisible: false,
          headerTintColor: '#111827',
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}>
        {({ navigation: stackNavigation }) => (
          <ConfirmPassword
            password={password}
            navigation={stackNavigation}
          />
        )}
      </CreateProfileStack.Screen>
      <CreateProfileStack.Screen
        name="CreateWallet"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitleVisible: false,
          headerTintColor: '#111827',
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}>
        {() => (
          <CreateWalletStackScreens
            navigation={props.navigation}
            createProfile={createProfile}
            walletType={walletType}
          />
        )}
      </CreateProfileStack.Screen>
    </CreateProfileStack.Navigator>
  );
}
