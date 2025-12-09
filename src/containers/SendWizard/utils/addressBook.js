import BigNumber from "bignumber.js";

/**
 * Groups user sources (subwallets) by network for a specific coin.
 * 
 * @param {String} coinId - The ID of the coin to look up.
 * @param {Object} allSubWallets - From Redux: state.coinMenus.allSubWallets
 * @param {Object} balances - From Redux: state.ledger.balances
 * @param {Object} activeAccount - From Redux: state.authentication.activeAccount
 * @param {Object} CoinDirectory - Directory to resolve network names
 * @returns {Array} - Grouped sources.
 */
export const getGroupedSources = (coinId, allSubWallets, balances, activeAccount, CoinDirectory) => {
  const subWallets = allSubWallets[coinId] || [];
  const groups = {};
  
  // Guard against missing data
  if (!allSubWallets || !balances || !activeAccount) return [];

  subWallets.forEach(wallet => {
    const coinObj = CoinDirectory.findCoinObj(coinId, activeAccount.accountHash);
    const networkName = coinObj.display_ticker; 
    const networkId = coinObj.system_id || coinObj.id;

    if (!groups[networkId]) {
      groups[networkId] = {
        networkId,
        networkName, 
        networkIcon: null, 
        rows: []
      };
    }

    const rawBalance = balances[coinId] && balances[coinId][wallet.id] 
      ? balances[coinId][wallet.id].total 
      : 0;

    groups[networkId].rows.push({
      subWalletId: wallet.id,
      label: wallet.name,
      address: wallet.address, // In Verus Mobile, wallet.address is usually the address string
      balance: BigNumber(rawBalance).toNumber()
    });
  });

  return Object.values(groups);
};

/**
 * Gets user's own addresses for a specific destination network.
 * 
 * @param {String} destNetworkId - The target network/system ID.
 * @param {Array} activeCoinsForUser - List of user's active coins.
 * @param {Object} allSubWallets - Map of coinId -> subWallets.
 * @param {Object} activeAccount - User account.
 * @param {Object} CoinDirectory - Directory.
 * @returns {Array} - List of { label, address, coinTicker }
 */
export const getAddressesForNetwork = (destNetworkId, activeCoinsForUser, allSubWallets, activeAccount, CoinDirectory) => {
  const addresses = [];
  const seenAddresses = new Set();

  if (!activeCoinsForUser || !allSubWallets) return [];

  activeCoinsForUser.forEach(coinObj => {
    // Check if this coin is on the destination network
    // The 'system_id' usually denotes the chain.
    // For ETH/ERC20, system_id is '.eth' or similar.
    // For PBaaS, it's the chain ID.
    
    // We normalize comparison to handle cases where IDs might differ slightly (e.g. system vs currency ID for root)
    const matchesSystem = coinObj.system_id === destNetworkId || coinObj.id === destNetworkId;
    const matchesEth = destNetworkId === 'ETH' && coinObj.system_id === '.eth';

    let matchesCurrencyId = false;
    try {
      if (destNetworkId && CoinDirectory.coinExistsInDirectory(destNetworkId)) {
        const dirCoin = CoinDirectory.getBasicCoinObj(destNetworkId);
        matchesCurrencyId = dirCoin.system_id === coinObj.system_id || dirCoin.id === coinObj.id;
      }
    } catch (e) {}

    const onSameChain = matchesSystem || matchesEth || matchesCurrencyId;

    if (onSameChain) {
      const wallets = allSubWallets[coinObj.id] || [];
      wallets.forEach(wallet => {
        if (wallet.address && !seenAddresses.has(wallet.address)) {
          addresses.push({
            label: wallet.name,
            address: wallet.address,
            coinTicker: coinObj.display_ticker,
            networkId: destNetworkId
          });
          seenAddresses.add(wallet.address);
        }
      });
    }
  });

  // Fallback 1: if still empty, try any coin whose system_id matches destNetworkId
  if (addresses.length === 0 && destNetworkId) {
    activeCoinsForUser.forEach(coinObj => {
      if (coinObj.system_id === destNetworkId) {
        const wallets = allSubWallets[coinObj.id] || [];
        wallets.forEach(wallet => {
          if (wallet.address && !seenAddresses.has(wallet.address)) {
            addresses.push({
              label: wallet.name,
              address: wallet.address,
              coinTicker: coinObj.display_ticker,
              networkId: destNetworkId
            });
            seenAddresses.add(wallet.address);
          }
        });
      }
    });
  }

  // Fallback 2: if still empty and destNetworkId resolves to a system coin in directory,
  // try that coin's subwallets directly.
  if (addresses.length === 0 && destNetworkId) {
    try {
      if (CoinDirectory.coinExistsInDirectory(destNetworkId)) {
        const sys = CoinDirectory.getBasicCoinObj(destNetworkId);
        const wallets = allSubWallets[sys.id] || [];
        wallets.forEach(wallet => {
          if (wallet.address && !seenAddresses.has(wallet.address)) {
            addresses.push({
              label: wallet.name,
              address: wallet.address,
              coinTicker: sys.display_ticker,
              networkId: destNetworkId
            });
            seenAddresses.add(wallet.address);
          }
        });
      }
    } catch (e) {}
  }
  
  return addresses;
};
