export const WALLET_NETWORKS = {
  MAINNET: 'mainnet',
  TESTNET: 'testnet',
};

export const DEFAULT_ACCOUNTS_BY_NETWORK = {
  [WALLET_NETWORKS.MAINNET]: null,
  [WALLET_NETWORKS.TESTNET]: null,
};

export const getWalletNetworkKey = testProfile =>
  testProfile ? WALLET_NETWORKS.TESTNET : WALLET_NETWORKS.MAINNET;

export const getWalletNetworkLabel = networkKey =>
  networkKey === WALLET_NETWORKS.TESTNET ? 'Testnet' : 'Mainnet';

export const accountIsTestnet = account =>
  !!(
    account &&
    account.testnetOverrides &&
    Object.keys(account.testnetOverrides).length > 0
  );

export const getAccountNetworkKey = account =>
  accountIsTestnet(account)
    ? WALLET_NETWORKS.TESTNET
    : WALLET_NETWORKS.MAINNET;

export const accountMatchesNetwork = (account, networkKey) =>
  !!account && getAccountNetworkKey(account) === networkKey;

export const filterAccountsForNetwork = (accounts, networkKey) =>
  (Array.isArray(accounts) ? accounts : []).filter(account =>
    accountMatchesNetwork(account, networkKey),
  );

export const normalizeDefaultAccountsByNetwork = defaultAccountsByNetwork => ({
  ...DEFAULT_ACCOUNTS_BY_NETWORK,
  ...(defaultAccountsByNetwork || {}),
});

export const resolveDefaultAccountHashForNetwork = (
  accounts,
  generalWalletSettings = {},
  networkKey,
) => {
  const defaultsByNetwork = normalizeDefaultAccountsByNetwork(
    generalWalletSettings.defaultAccountsByNetwork,
  );
  const networkDefault = defaultsByNetwork[networkKey];
  const matchingNetworkDefault = (accounts || []).find(
    account =>
      account.accountHash === networkDefault &&
      accountMatchesNetwork(account, networkKey),
  );

  if (matchingNetworkDefault) {
    return matchingNetworkDefault.accountHash;
  }

  const legacyDefault = generalWalletSettings.defaultAccount;
  const matchingLegacyDefault = (accounts || []).find(
    account =>
      account.accountHash === legacyDefault &&
      accountMatchesNetwork(account, networkKey),
  );

  return matchingLegacyDefault ? matchingLegacyDefault.accountHash : null;
};

export const getDefaultAccountForNetwork = (
  accounts,
  generalWalletSettings,
  networkKey,
) => {
  const defaultAccountHash = resolveDefaultAccountHashForNetwork(
    accounts,
    generalWalletSettings,
    networkKey,
  );

  return (
    (accounts || []).find(account => account.accountHash === defaultAccountHash) ||
    null
  );
};

export const buildDefaultAccountsByNetwork = (
  currentDefaultAccountsByNetwork,
  account,
) => ({
  ...normalizeDefaultAccountsByNetwork(currentDefaultAccountsByNetwork),
  [getAccountNetworkKey(account)]: account.accountHash,
});

export const buildDefaultAccountSettingsForAccount = (
  account,
  generalWalletSettings = {},
) => ({
  defaultAccount: account.accountHash,
  defaultAccountsByNetwork: buildDefaultAccountsByNetwork(
    generalWalletSettings.defaultAccountsByNetwork,
    account,
  ),
});
