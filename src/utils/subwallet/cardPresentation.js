import BigNumber from 'bignumber.js';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {coinsList} from '../CoinData/CoinsList';
import {
  API_GET_ADDRESSES,
  IS_PBAAS,
  IS_VERUS,
} from '../constants/intervalConstants';
import {getShownBalance} from '../ledger/shownBalance';

export const isVerusIdWallet = wallet =>
  Boolean(wallet?.name?.endsWith('@'));

const isVrpcWallet = wallet => Boolean(wallet?.channel?.startsWith('vrpc.'));

export const getSubWalletCardType = wallet => {
  if (isVerusIdWallet(wallet)) return 'VerusID';
  if (wallet?.id === 'PRIVATE_WALLET') return 'Private';
  if (isVrpcWallet(wallet)) return 'Transparent';

  return 'Address';
};

const getCoinForSystem = systemId => {
  if (!systemId) return null;
  if (coinsList[systemId]) return coinsList[systemId];

  try {
    return CoinDirectory.findCoinObj(systemId);
  } catch (error) {
    return null;
  }
};

export const getNetworkTicker = systemId => {
  if (!systemId) return '';
  if (systemId === '.eth') return 'ETH';

  const coin = getCoinForSystem(systemId);
  if (coin?.display_ticker) return coin.display_ticker;

  if (
    typeof systemId === 'string' &&
    systemId.startsWith('i') &&
    systemId.length > 30
  ) {
    return '';
  }

  return systemId;
};

export const getSubWalletNetworkLabel = (wallet, coin) => {
  const networkCoin = getCoinForSystem(wallet?.network);

  return (
    networkCoin?.display_name ||
    networkCoin?.display_ticker ||
    coin?.display_name ||
    coin?.display_ticker ||
    wallet?.network ||
    ''
  );
};

export const getSubWalletDisplayIdentifier = (
  wallet,
  activeAccount,
  chainTicker,
  fallbackToName = true,
) => {
  if (!wallet) return '-';
  if (isVerusIdWallet(wallet)) return wallet.name;

  const addressChannel = wallet.api_channels?.[API_GET_ADDRESSES];
  const addresses =
    addressChannel == null
      ? null
      : activeAccount?.keys?.[chainTicker]?.[addressChannel]?.addresses;

  return addresses?.[0] || (fallbackToName ? wallet.name : null) || '-';
};

export const truncateMiddle = (
  value,
  start = 8,
  end = 8,
  separator = '...',
) => {
  if (typeof value !== 'string') return '';
  if (value.length <= start + end + separator.length) return value;

  return `${value.slice(0, start)}${separator}${value.slice(-end)}`;
};

// A short address: the first and last 6 characters (owner, 2026-11-19).
export const shortenAddress = address => truncateMiddle(address, 6, 6, '…');

// The chain a card's funds are on, as the quiet words "on Verus" (owner,
// 2026-11-25; it replaces the " · <ticker>" suffix of 2026-11-19). Only Verus
// chains (VRSC, VRSCTEST and PBaaS chains) get one: an Ethereum, Bitcoin or
// other Electrum card shows none, because its address already says the chain.
// VRSC reads "Verus", VRSCTEST "Verus Testnet" and any other PBaaS chain its
// short ticker ("vETH", "vARRR"), never a long display name.
const isVerusChainCoin = networkCoin =>
  Boolean(
    networkCoin?.tags?.includes(IS_VERUS) ||
      networkCoin?.tags?.includes(IS_PBAAS),
  );

const getChainName = (systemId, networkCoin) => {
  if (systemId === coinsList.VRSC.system_id) return 'Verus';
  if (systemId === coinsList.VRSCTEST.system_id) return 'Verus Testnet';

  return networkCoin?.display_ticker || getNetworkTicker(systemId) || null;
};

// Returns {name, ticker} of the Verus chain the card is on, or null.
const getCardVerusChain = (wallet, coin) => {
  const systemId = wallet?.network || coin?.system_id;
  if (typeof systemId !== 'string' || systemId.length === 0) return null;
  // Ethereum and Electrum systems (".eth", ".btc", ".kmd") are not Verus.
  if (systemId.startsWith('.')) return null;

  const networkCoin = getCoinForSystem(systemId);
  const verusCard =
    isVerusChainCoin(networkCoin) ||
    isVerusIdWallet(wallet) ||
    wallet?.id === 'PRIVATE_WALLET' ||
    isVrpcWallet(wallet);
  if (!verusCard) return null;

  const name = getChainName(systemId, networkCoin);
  if (!name) return null;

  return {name, ticker: networkCoin?.display_ticker || name};
};

// "on Verus", or null for a card that is not on a Verus chain.
export const getCardChainLabel = (wallet, coin) => {
  const chain = getCardVerusChain(wallet, coin);

  return chain ? `on ${chain.name}` : null;
};

// The card's name wherever the app names it (owner, 2026-11-19, PR 266 review
// R8 option C with the owner's change): a transparent or other address card
// shows its short address, a VerusID card its name, the private card
// "Private". A card on a Verus chain adds "on Verus" as `chainLabel` (owner,
// 2026-11-25); `text` joins both for one-line places and screen readers.
const isShownAddress = value =>
  typeof value === 'string' && value.length > 0 && value !== '-';

export const getSubWalletCardTitle = (wallet, {address, coin} = {}) => {
  const type = getSubWalletCardType(wallet);
  // A Verus card's channel ("vrpc.<address>.<system>") holds its address,
  // so the title does not wait for the account's address list.
  const channelAddress =
    typeof wallet?.channel === 'string' && wallet.channel.startsWith('vrpc.')
      ? wallet.channel.split('.')[1]
      : null;
  const shownAddress = isShownAddress(address) ? address : channelAddress;
  const isAddress =
    (type === 'Transparent' || type === 'Address') &&
    isShownAddress(shownAddress);
  const name =
    type === 'VerusID'
      ? wallet.name
      : isAddress
      ? shortenAddress(shownAddress)
      : type;
  const chain = getCardVerusChain(wallet, coin);
  // A VerusID name such as "devphone.VRSCTEST@" already names its chain, so
  // it gets no label (owner, 2026-11-25). A root "alice@" on Verus keeps it.
  const nameCarriesChain =
    chain != null &&
    type === 'VerusID' &&
    typeof name === 'string' &&
    name.toLowerCase().endsWith(`.${chain.ticker.toLowerCase()}@`);
  const chainLabel = chain && !nameCarriesChain ? `on ${chain.name}` : null;

  return {
    type,
    name,
    isAddress,
    chainLabel,
    text: chainLabel ? `${name} ${chainLabel}` : name,
  };
};

// The same title, with the address read from the account's keys.
export const getSubWalletCardTitleForAccount = (wallet, activeAccount, coin) =>
  getSubWalletCardTitle(wallet, {
    coin,
    address: getSubWalletDisplayIdentifier(
      wallet,
      activeAccount,
      coin?.id,
      false,
    ),
  });

export const sortSubWalletsByBalance = (subWallets = [], balances = {}) => {
  return subWallets
    .map((wallet, originalIndex) => {
      const confirmed = getShownBalance(balances?.[wallet.id]);

      return {
        wallet,
        originalIndex,
        confirmedSortValue:
          confirmed == null ? BigNumber(0) : BigNumber(confirmed),
      };
    })
    .sort((first, second) => {
      const balanceOrder = second.confirmedSortValue.comparedTo(
        first.confirmedSortValue,
      );

      return balanceOrder === 0
        ? first.originalIndex - second.originalIndex
        : balanceOrder;
    })
    .map(item => item.wallet);
};
