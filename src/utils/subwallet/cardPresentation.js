import BigNumber from 'bignumber.js';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {coinsList} from '../CoinData/CoinsList';
import {API_GET_ADDRESSES} from '../constants/intervalConstants';
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

// The ticker of the network a card lives on. Electrum (".btc", ".kmd", ...)
// and Ethereum cards have no network of their own, so they take their coin's
// chain.
export const getCardNetworkTicker = (wallet, coin) => {
  const systemId = wallet?.network || coin?.system_id;
  if (systemId === '.eth') return coin?.testnet ? 'gETH' : 'ETH';
  if (typeof systemId === 'string' && systemId.startsWith('.')) {
    return coin?.display_ticker || systemId.slice(1).toUpperCase();
  }

  return getNetworkTicker(systemId);
};

// The card's name wherever the app names it (owner, 2026-11-19, PR 266 review
// R8 option C with the owner's change): a transparent or other address card
// shows its short address, a VerusID card its name, the private card
// "Private". The network follows on every card: "RT7d8L…HcM3Wy · VRSC".
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
  const ticker = getCardNetworkTicker(wallet, coin) || null;
  // A VerusID name such as "devphone.VRSCTEST@" already names its network,
  // so it shows no suffix (owner, 2026-11-19). A root "alice@" keeps it.
  const nameCarriesNetwork =
    type === 'VerusID' &&
    ticker != null &&
    typeof name === 'string' &&
    name.toLowerCase().endsWith(`.${ticker.toLowerCase()}@`);
  const network = nameCarriesNetwork ? null : ticker;

  return {
    type,
    name,
    isAddress,
    network,
    // Always the ticker, also when the name carries it (choosers show it
    // under the name on every row).
    networkTicker: ticker,
    text: network ? `${name} · ${network}` : name,
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
