import { LOADING_ACCOUNT, VALIDATING_ACCOUNT } from "../../../../utils/constants/constants";
import { signIntoAuthenticatedAccount } from "../../../actionCreators";
import { COIN_MANAGER_MAP, fetchActiveCoins, setUserCoins } from "../../coins/Coins";
import {
  activateChainLifecycle,
  activateServiceLifecycle,
  clearServiceIntervals,
  clearChainLifecycle,
} from "../../intervals/dispatchers/lifecycleManager";
import { initPersonalDataForUser } from "../../personal/dispatchers/personal";
import { initServiceStoredDataForUser } from "../../services/dispatchers/services";
import { fetchUsers, validateLogin } from "../../UserData";
import { initSettings, saveGeneralSettings } from "../../WalletSettings";
import { DISABLED_CHANNELS } from '../../../../../env/index'
import store from "../../../../store";
import { getAddressBlocklistFromServer } from "../../../../utils/api/channels/general/addressBlocklist/getAddressBlocklist";
import { normalizeLastOpenedAccountTimestamps } from "../../../../utils/account/accountActivity";
import { buildDefaultAccountSettingsForAccount } from "../../../../utils/account/accountNetwork";

export const initializeAccountData = async (
  account,
  password,
  makeDefault = false,
  setInitStep = () => {},
  alertOnFail = true,
) => {
  setInitStep(VALIDATING_ACCOUNT);
  const accountAuthenticator = await validateLogin(
    account,
    password,
    alertOnFail,
  );

  if (accountAuthenticator) {
    setInitStep(LOADING_ACCOUNT);
    await initServiceStoredDataForUser(account.accountHash);

    const generalWalletSettings =
      store.getState().settings.generalWalletSettings;
    const lastOpenedAccountTimestamps = {
      ...normalizeLastOpenedAccountTimestamps(
        generalWalletSettings.lastOpenedAccountTimestamps,
      ),
      [account.accountHash]: Date.now(),
    };
    const accountSettings = makeDefault
      ? buildDefaultAccountSettingsForAccount(account, generalWalletSettings)
      : {};

    await saveGeneralSettings({
      ...accountSettings,
      lastOpenedAccountTimestamps,
    });

    const coinList = await fetchActiveCoins();
    const setUserCoinsAction = setUserCoins(
      coinList.activeCoinList,
      account.id,
    );
    const {activeCoinsForUser} = setUserCoinsAction.payload;

    const settingsAction = await initSettings()
    store.dispatch(settingsAction);

    try {
      const fetchedBlocklist = await getAddressBlocklistFromServer();
      const currentBlocklist = [];

      for (const address of fetchedBlocklist) {
        currentBlocklist.unshift({ 
          address, 
          details: '', 
          lastModified: Math.floor(Date.now() / 1000) 
        });
      }

      const saveGeneralSettingsAction = await saveGeneralSettings({
        addressBlocklist: currentBlocklist
      });

      store.dispatch(saveGeneralSettingsAction);
    } catch(e) {
      console.warn("Failed to fetch address blocklist");
      console.warn(e);
    }

    store.dispatch(accountAuthenticator);
    store.dispatch(coinList);

    store.dispatch(setUserCoinsAction);

    for (let i = 0; i < activeCoinsForUser.length; i++) {
      const coinObj = activeCoinsForUser[i];

      await Promise.all(
        coinObj.compatible_channels.map(channel => {
          if (
            !DISABLED_CHANNELS.includes(channel) &&
            COIN_MANAGER_MAP.initializers[channel]
          ) {
            return COIN_MANAGER_MAP.initializers[channel](coinObj);
          } else {
            return null;
          }
        }),
      );

      activateChainLifecycle(coinObj, activeCoinsForUser);
    }

    store.dispatch(setUserCoinsAction);

    activateServiceLifecycle();
    await initPersonalDataForUser(account.accountHash);
    store.dispatch(signIntoAuthenticatedAccount());
  } else {
    throw new Error(
      `Failed to validate and initialize account "${account.id}"`,
    );
  }
};


export const clearActiveAccountLifecycles = async () => {
  const state = store.getState();
  const activeAccount = state.authentication.activeAccount;
  const activeCoinsForUser = state.coins.activeCoinsForUser;

  if (activeAccount == null || !Array.isArray(activeCoinsForUser)) {
    clearServiceIntervals();
    return;
  }

  for (let i = 0; i < activeCoinsForUser.length; i++) {
    const coinObj = activeCoinsForUser[i];

    await Promise.all(
      coinObj.compatible_channels.map(channel => {
        if (
          !DISABLED_CHANNELS.includes(channel) &&
          COIN_MANAGER_MAP.closers[channel]
        ) {
          return COIN_MANAGER_MAP.closers[channel](coinObj);
        } else {
          return null;
        }
      }),
    );

    clearChainLifecycle(coinObj.id);
  }

  clearServiceIntervals();
};


export const refreshAccountData = async (
  accountHash,
  password,
  makeDefault = false,
  setInitStep = () => {},
  alertOnFail = true,
) => {
  await clearActiveAccountLifecycles();
  store.dispatch(await fetchUsers())
  
  const newAccount = store
    .getState()
    .authentication.accounts.find(
      (account) => account.accountHash === accountHash
    );

  return await initializeAccountData(
    newAccount,
    password,
    makeDefault,
    setInitStep,
    alertOnFail,
  );
};
