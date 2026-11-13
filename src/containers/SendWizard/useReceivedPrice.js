/* global __DEV__ */
import {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {getCoinRates} from '../../utils/api/channels/general/callCreators';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {USD} from '../../utils/constants/currencies';

const CACHE_MS = 60000;
const fetched = new Map();

const findCoin = coinId => {
  try {
    return CoinDirectory.findCoinObj(coinId);
  } catch (error) {
    return null;
  }
};

// The display-currency price of the currency the user receives, or null.
// The ledger holds a price only for wallet assets. For a target that is not in
// the wallet yet, ask the ledger's own price source once. This is never the
// paid asset's price and never the conversion's own crypto ratio.
export const useReceivedPrice = (coinId, fiatChannel) => {
  const displayCurrency = useSelector(
    stateValue => stateValue.settings.generalWalletSettings.displayCurrency || USD,
  );
  const testnetPrices = useSelector(
    stateValue => stateValue.settings.generalWalletSettings.testnetPrices === true,
  );
  const ledgerRates = useObjectSelector(
    stateValue =>
      fiatChannel == null || coinId == null
        ? null
        : stateValue.ledger.rates?.[fiatChannel]?.[coinId],
  );
  // The developer testnet-price switch changes what the source returns.
  const cacheKey = `${coinId}:${testnetPrices}`;
  // Keep the key with its rates: a rate must never show for another coin.
  const [fetchedFor, setFetchedFor] = useState(() => ({
    key: cacheKey,
    rates: fetched.get(cacheKey)?.rates || null,
  }));
  const ledgerPrice = ledgerRates?.[displayCurrency] ?? null;

  useEffect(() => {
    if (coinId == null || fiatChannel == null || ledgerPrice != null) {
      return undefined;
    }

    const cached = fetched.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      setFetchedFor({key: cacheKey, rates: cached.rates});
      return undefined;
    }

    const coinObj = findCoin(coinId);
    if (!coinObj) return undefined;

    let current = true;
    getCoinRates(coinObj, __DEV__ && testnetPrices)
      .then(({result}) => {
        const rates = result && Object.keys(result).length ? result : null;
        if (rates) fetched.set(cacheKey, {at: Date.now(), rates});
        if (current) setFetchedFor({key: cacheKey, rates});
      })
      // No price is a normal outcome: the money line stays absent.
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [cacheKey, coinId, fiatChannel, ledgerPrice, testnetPrices]);

  const fetchedPrice =
    fetchedFor.key === cacheKey ? fetchedFor.rates?.[displayCurrency] : null;
  return ledgerPrice ?? fetchedPrice ?? null;
};

export default useReceivedPrice;
