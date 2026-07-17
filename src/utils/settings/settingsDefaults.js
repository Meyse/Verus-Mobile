import {ADDRESS_BLOCKLIST_FROM_WEBSERVER} from '../constants/constants';
import {USD} from '../constants/currencies';
import {normalizeLastOpenedAccountTimestamps} from '../account/accountActivity';

export const DEFAULT_GENERAL_WALLET_SETTINGS = {
  maxTxCount: 10,
  minGasPriceGwei: 1,
  displayCurrency: USD,
  appearance: 'system',
  lastOpenedAccountTimestamps: {},
  homeCardDragDetection: false,
  allowSettingVerusPaySlippage: false,
  enableSendCoinCameraToggle: false,
  enableExperimentalGenericRequests: false,
  ackedCurrencyDisclaimer: false,
  addressBlocklistDefinition: {
    type: ADDRESS_BLOCKLIST_FROM_WEBSERVER,
    data: null,
  },
  addressBlocklist: [],
  vrpcOverrides: {},
};

export const DEFAULT_SETTINGS = {
  btcFeesAdvanced: false,
  extendedCoinInfo: false,
  extendedTxInfo: false,
  pinForTxs: false,
  activeConfigSection: null,
  generalWalletSettings: DEFAULT_GENERAL_WALLET_SETTINGS,
  buySellSettings: {},
  coinSettings: {},
};

export const normalizeGeneralWalletSettings = generalWalletSettings => ({
  ...DEFAULT_GENERAL_WALLET_SETTINGS,
  ...(generalWalletSettings || {}),
  lastOpenedAccountTimestamps: normalizeLastOpenedAccountTimestamps(
    generalWalletSettings
      ? generalWalletSettings.lastOpenedAccountTimestamps
      : null,
  ),
});

export const normalizeSettings = settings => ({
  ...DEFAULT_SETTINGS,
  ...(settings || {}),
  generalWalletSettings: normalizeGeneralWalletSettings(
    settings ? settings.generalWalletSettings : null,
  ),
});
