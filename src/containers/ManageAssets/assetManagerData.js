import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {START_COINS} from '../../utils/constants/constants';
import {IS_PBAAS_CHAIN} from '../../utils/constants/currencies';
import {
  IS_PBAAS,
  IS_PBAAS_ROOT,
  WYRE_SERVICE,
} from '../../utils/constants/intervalConstants';

export const ASSET_COLLECTIONS = {
  ALL: 'all',
  WALLET: 'wallet',
  PBAAS: 'pbaas',
  BLOCKCHAINS: 'blockchains',
  BRIDGE: 'bridge',
};

const hasTag = (coinObj, tag) => coinObj.tags?.includes(tag);
const normalizeId = value => (value == null ? '' : value.toLowerCase());

const isEcosystemBlockchain = coinObj =>
  hasTag(coinObj, IS_PBAAS) &&
  !hasTag(coinObj, IS_PBAAS_ROOT) &&
  coinObj.id === coinObj.system_id &&
  (coinObj.pbaas_options & IS_PBAAS_CHAIN) === IS_PBAAS_CHAIN;

const uniqueCoins = coins => {
  const seen = new Set();

  return coins.filter(coinObj => {
    if (!coinObj || seen.has(coinObj.id)) return false;
    seen.add(coinObj.id);
    return true;
  });
};

const sortCoins = (coins, priorityIds = []) => {
  const priority = new Map(priorityIds.map((id, index) => [id, index]));

  return [...coins].sort((left, right) => {
    const leftRank = priority.has(left.id)
      ? priority.get(left.id)
      : Number.MAX_SAFE_INTEGER;
    const rightRank = priority.has(right.id)
      ? priority.get(right.id)
      : Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) return leftRank - rightRank;

    return (left.display_ticker || left.display_name || left.id).localeCompare(
      right.display_ticker || right.display_name || right.id,
    );
  });
};

const getStarterIds = (testAccount, testnetOverrides) =>
  START_COINS.map(coinId =>
    testAccount ? testnetOverrides?.[coinId] : coinId,
  ).filter(Boolean);

const getCatalogueIds = ({activeAccount, testAccount}) => {
  if (testAccount) return CoinDirectory.testCoinList;

  return activeAccount?.disabledServices?.[WYRE_SERVICE]
    ? CoinDirectory.enabledNameList
    : CoinDirectory.supportedCoinList;
};

const getCatalogueCoin = coinId => {
  try {
    return CoinDirectory.getBasicCoinObj(coinId);
  } catch (error) {
    console.warn(`Unable to load asset catalogue entry ${coinId}`, error);
    return null;
  }
};

export const buildAssetManagerData = ({
  activeAccount,
  activeCoins,
  testAccount,
}) => {
  const starterIds = getStarterIds(
    testAccount,
    activeAccount?.testnetOverrides,
  );
  const catalogue = sortCoins(
    uniqueCoins(
      getCatalogueIds({activeAccount, testAccount})
        .map(getCatalogueCoin)
        .filter(Boolean),
    ),
    starterIds,
  );
  const activeAssets = sortCoins(uniqueCoins(activeCoins || []), starterIds);
  const ecosystemBlockchains = catalogue.filter(isEcosystemBlockchain);
  const ecosystemBlockchainIds = new Set(
    ecosystemBlockchains.map(coinObj => coinObj.id),
  );
  const pbaasCurrencies = catalogue.filter(
    coinObj =>
      hasTag(coinObj, IS_PBAAS) &&
      !hasTag(coinObj, IS_PBAAS_ROOT) &&
      !ecosystemBlockchainIds.has(coinObj.id),
  );
  const mappedTargets = new Set(
    catalogue
      .filter(coinObj => hasTag(coinObj, IS_PBAAS))
      .map(coinObj => normalizeId(coinObj.mapped_to))
      .filter(Boolean),
  );
  const bridgeErc20s = catalogue.filter(
    coinObj =>
      coinObj.proto === 'erc20' &&
      (mappedTargets.has(normalizeId(coinObj.id)) ||
        mappedTargets.has(normalizeId(coinObj.currency_id))),
  );

  return {
    activeAssets,
    bridgeErc20s,
    catalogue,
    ecosystemBlockchains,
    pbaasCurrencies,
  };
};

export const getAssetsForCollection = (data, collection) => {
  switch (collection) {
    case ASSET_COLLECTIONS.WALLET:
      return data.activeAssets;
    case ASSET_COLLECTIONS.PBAAS:
      return data.pbaasCurrencies;
    case ASSET_COLLECTIONS.BLOCKCHAINS:
      return data.ecosystemBlockchains;
    case ASSET_COLLECTIONS.BRIDGE:
      return data.bridgeErc20s;
    default:
      return data.catalogue;
  }
};

export const getCollectionTitle = collection => {
  switch (collection) {
    case ASSET_COLLECTIONS.WALLET:
      return 'Your wallet';
    case ASSET_COLLECTIONS.PBAAS:
      return 'PBaaS currencies';
    case ASSET_COLLECTIONS.BLOCKCHAINS:
      return 'Ecosystem blockchains';
    case ASSET_COLLECTIONS.BRIDGE:
      return 'Bridged ERC-20s';
    default:
      return 'Discover assets';
  }
};

export const getAssetDescription = (coinObj, data) => {
  if (data.ecosystemBlockchains.some(item => item.id === coinObj.id)) {
    return 'Verus ecosystem blockchain';
  }

  if (data.bridgeErc20s.some(item => item.id === coinObj.id)) {
    return 'Ethereum · Bridged ERC-20';
  }

  if (coinObj.tags?.includes(IS_PBAAS)) {
    return coinObj.mapped_to
      ? 'Verus · Mapped currency'
      : 'Verus · PBaaS currency';
  }

  if (coinObj.proto === 'erc20') return 'Ethereum · ERC-20 token';
  if (coinObj.proto === 'eth') return 'Ethereum network';

  return 'Blockchain asset';
};
