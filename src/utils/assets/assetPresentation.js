import {CoinDirectory} from '../CoinData/CoinDirectory';
import {CoinLogos} from '../CoinData/CoinData';
import {coinsList} from '../CoinData/CoinsList';
import {API_GET_BALANCES, VRPC} from '../constants/intervalConstants';
import {IS_PBAAS_CHAIN} from '../constants/currencies';
import {ethereumNetwork, isTestnetAccount} from './assetIdentity';

// Presentation aliases are keyed by verified currency IDs. They never replace
// the network-specific identities used for balances, activation or preferences.
const MAINNET_DISPLAY = {
  i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X: {name: 'Ethereum', ticker: 'ETH'},
  i61cV2uicKSi1rSMQCBNQeSYC3UAi9GVzd: {name: 'USDC', ticker: 'USDC'},
  iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM: {name: 'DAI', ticker: 'DAI'},
  iCkKJuJScy4Z6NSDK7Mt42ZAB2NEnAE1o4: {name: 'Maker', ticker: 'MKR'},
  iC5TQFrFXSYLQGkiZ8FYmZHFJzaRF5CYgE: {name: 'EURC', ticker: 'EURC'},
  iS8TfRPfVpKo5FVfSUzfHBQxo9KuzpnqLU: {name: 'tBTC', ticker: 'tBTC'},
  i9oCSqKALwJtcv49xUKS2U2i79h1kX6NEY: {name: 'Tether', ticker: 'USDT'},
  i9nLSK4S1U5sVMq4eJUHR1gbFALz56J9Lj: {name: 'Savings crvUSD', ticker: 'scrvUSD'},
  iQ1mX2VtESKfJ3PoWVcYKfnDEpYkWW59ZB: {name: 'crvUSD', ticker: 'crvUSD'},
  '0xbc2738ba63882891094c99e59a02141ca1a1c36a': {name: 'Verus', ticker: 'VRSC'},
  '0xe6052dcc60573561ecef2d9a4c0fea6d3ac5b9a2': {name: 'Bridge.vETH', ticker: 'VBRID'},
};

const readCoin = id => {
  try { return CoinDirectory.getBasicCoinObj(id); }
  catch (_) { return null; }
};

const currencyId = coin => coin.proto === 'erc20'
  ? String(coin.currency_id || coin.id).toLowerCase()
  : coin.currency_id || coin.id;

const catalogueCoin = coin => Object.values(coinsList).find(candidate =>
  candidate.proto === coin.proto && Boolean(candidate.testnet) === Boolean(coin.testnet) &&
  currencyId(candidate) === currencyId(coin) &&
  (coin.proto !== 'erc20' && coin.proto !== 'eth' || ethereumNetwork(candidate) === ethereumNetwork(coin)));

// A currency's system may be a gateway. Follow it to an actual PBaaS chain,
// keeping the chain's own currency ID as the network key.
export const getVrpcNetwork = (systemId, testnet) => {
  const seen = new Set();
  let id = systemId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const coin = readCoin(id);
    if (!coin || coin.proto !== 'vrsc' || Boolean(coin.testnet) !== Boolean(testnet)) return null;
    if ((coin.pbaas_options & IS_PBAAS_CHAIN) === IS_PBAAS_CHAIN &&
        coin.currency_id === coin.system_id) {
      return {id: coin.currency_id, label: coin.display_name, iconId: coin.id, coin};
    }
    id = coin.system_id;
  }
  return null;
};

const assetNetworks = (coin, {cards, systemId}) => {
  if (coin.system_id === '.wyre') return [{id: '.wyre', label: 'Wyre', iconId: null}];
  if (coin.proto === 'eth' || coin.proto === 'erc20') {
    const id = ethereumNetwork(coin);
    return [{id, label: id === 'homestead' ? 'Ethereum' : id === 'goerli' ? 'Goerli testnet' : id, iconId: 'ETH'}];
  }
  if (coin.proto !== 'vrsc') {
    return [{id: coin.id, label: coin.proto === 'fiat' ? 'Fiat' : coin.display_name, iconId: coin.id}];
  }
  const cardSystems = (cards || []).map(card => {
    const channel = card.api_channels?.[API_GET_BALANCES];
    return channel?.startsWith(`${VRPC}.`) ? channel.split('.')[2] : card.network;
  }).filter(Boolean);
  const ids = systemId ? [systemId] : cardSystems.length ? cardSystems : [coin.system_id];
  const networks = new Map();
  for (const id of ids) {
    const network = getVrpcNetwork(id, coin.testnet);
    if (network) networks.set(network.id, network);
    else networks.set(id, {id, label: 'Network unavailable', iconId: null});
  }
  return [...networks.values()];
};

export const getAssetPresentation = (coin, context = {}) => {
  const known = catalogueCoin(coin);
  const display = known && !coin.testnet ? MAINNET_DISPLAY[currencyId(known)] : null;
  const name = display?.name || known?.display_name || coin.display_name || 'Unknown asset';
  const ticker = display?.ticker || known?.display_ticker || coin.display_ticker || name;
  const networks = assetNetworks(coin, context);
  const network = networks.length === 1 ? networks[0] : null;
  const definition = known || coin;
  let badgeTicker = null;
  if (network?.iconId) {
    if (Object.prototype.hasOwnProperty.call(definition, 'icon_badge')) {
      badgeTicker = definition.icon_badge;
    } else if (coin.proto === 'erc20' && coin.system_id !== '.wyre') {
      badgeTicker = network.iconId;
    } else if (coin.proto === 'vrsc' && coin.currency_id !== network.id &&
        (definition.mapped_to || getVrpcNetwork(coin.system_id, coin.testnet)?.id !== network.id)) {
      badgeTicker = network.iconId;
    }
  }
  return {
    name,
    ticker,
    fullName: coin.display_name || known?.display_name || name,
    identifier: coin.currency_id || coin.id,
    iconId: known && CoinLogos[known.id] ? known.id : null,
    badgeTicker,
    networks,
    networkLabel: networks.map(item => item.label).join(', ') || 'Network unavailable',
    searchTerms: [name, ticker, coin.display_name, coin.display_ticker, coin.currency_id,
      ...(coin.alt_names || []), ...networks.map(item => item.label)],
  };
};

export const resolvedAssetCoin = result => {
  if (result.coinData || result.catalogueMatch) return result.coinData || result.catalogueMatch;
  if (result.kind === 'pbaas') {
    const definition = result.currencyDefinition;
    return {
      id: definition.currencyid,
      currency_id: definition.currencyid,
      system_id: definition.systemid,
      proto: 'vrsc',
      testnet: result.testnet,
      display_name: definition.fullyqualifiedname,
      display_ticker: definition.fullyqualifiedname,
    };
  }
  return {
    id: result.canonicalAddress,
    currency_id: result.canonicalAddress,
    system_id: '.eth',
    proto: 'erc20',
    testnet: result.testnet,
    network: result.network,
    display_name: result.name,
    display_ticker: result.symbol,
  };
};

export const getAssetLookupNetworks = (account, activeCoins, kind) => {
  const testnet = isTestnetAccount(account);
  if (kind === 'erc20') {
    const coin = readCoin(account?.testnetOverrides?.ETH || (testnet ? 'GETH' : 'ETH'));
    if (!coin || Boolean(coin.testnet) !== testnet) return [];
    return [{id: ethereumNetwork(coin), label: testnet ? 'Goerli testnet' : 'Ethereum mainnet', coin}];
  }
  const root = readCoin(account?.testnetOverrides?.VRSC || (testnet ? 'VRSCTEST' : 'VRSC'));
  const rootNetwork = root && getVrpcNetwork(root.currency_id, testnet);
  if (!rootNetwork) return [];
  const networks = new Map([[rootNetwork.id, {
    ...rootNetwork, label: testnet ? 'Verus testnet' : 'Verus mainnet',
  }]]);
  for (const coin of activeCoins) {
    if (coin.proto !== 'vrsc' || Boolean(coin.testnet) !== testnet) continue;
    const network = getVrpcNetwork(coin.system_id, testnet);
    if (!network || networks.has(network.id)) continue;
    try {
      if (CoinDirectory.getVrpcEndpoints(network.id)?.length) networks.set(network.id, network);
    } catch (_) { /* Only offer already supported chains. */ }
  }
  return [...networks.values()];
};
