// Testnet environments differ in the Verus API that serves VRSCTEST and in the
// Sepolia contract that bridges it to Ethereum. The active environment is read
// from general wallet settings once at startup, so changing it needs a reload.
// Keep this module free of app imports: CoinDirectory and the web3 layer read it.

export const TESTNET_ENVIRONMENT_PUBLIC = 'public';
export const TESTNET_ENVIRONMENT_PRIVATE = 'private';

// Bridge delegator addresses are the `nativecurrencyid` of vETH on each chain.
// Keep them lowercase: the daemon returns lowercase and the app compares them.
export const TESTNET_ENVIRONMENTS = {
  [TESTNET_ENVIRONMENT_PUBLIC]: {
    vrpcEndpoints: null, // null keeps the default VRSCTEST endpoints
    disableDlight: false,
    bridgeDelegator: '0xcaa98a4ec79dac8a06cb3bfdcf5351b6576d939f',
  },
  [TESTNET_ENVIRONMENT_PRIVATE]: {
    vrpcEndpoints: ['https://ptestapi.verustest.net'],
    disableDlight: true,
    bridgeDelegator: '0x98f58684b05e7d40719e61955015af91ef7e77d3',
  },
};

let activeEnvironment = TESTNET_ENVIRONMENT_PUBLIC;

export const normalizeTestnetEnvironment = environment =>
  Object.prototype.hasOwnProperty.call(TESTNET_ENVIRONMENTS, environment)
    ? environment
    : TESTNET_ENVIRONMENT_PUBLIC;

export const setTestnetEnvironment = environment => {
  activeEnvironment = normalizeTestnetEnvironment(environment);
};

export const getTestnetEnvironment = () => activeEnvironment;

export const getTestnetBridgeDelegator = () =>
  TESTNET_ENVIRONMENTS[activeEnvironment].bridgeDelegator;

// Endpoint overrides keyed by system ID, in the shape of the user's
// `vrpcOverrides` setting. They take precedence over the user's.
export const getTestnetVrpcOverrides = testnetSystemId => {
  const {vrpcEndpoints} = TESTNET_ENVIRONMENTS[activeEnvironment];

  return vrpcEndpoints ? {[testnetSystemId]: [...vrpcEndpoints]} : {};
};

export const shouldDisableTestnetDlight = () =>
  TESTNET_ENVIRONMENTS[activeEnvironment].disableDlight;
