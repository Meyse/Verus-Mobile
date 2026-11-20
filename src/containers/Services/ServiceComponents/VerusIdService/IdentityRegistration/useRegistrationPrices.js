import {useCallback, useMemo} from 'react';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {useObjectSelector} from '../../../../../hooks/useObjectSelector';
import {USD} from '../../../../../utils/constants/currencies';
import {GENERAL} from '../../../../../utils/constants/intervalConstants';
import {registrationFiat} from './namespaceData';

// Read the same display setting and cached ledger rates as useWizardFiat.
// Formatting never fetches rates.
export const useRegistrationFiat = () => {
  const displayCurrency = useSelector(state => state.settings.generalWalletSettings.displayCurrency || USD);
  const rates = useObjectSelector(state => state.ledger.rates[GENERAL]);
  return useCallback((amounts, prices) => registrationFiat(amounts, prices, displayCurrency, rates), [displayCurrency, rates]);
};

const usdOf = record => {
  const value = new BigNumber(record?.[USD]);
  return value.isFinite() && value.gt(0) ? value.toString() : null;
};

// USD display prices for the currencies of a registration quote, from the
// ledger only: the chain's own coin, and any other currency the wallet has a
// market price for. A currency without one has no fiat line. No request.
export default function useRegistrationPrices(coin, quote) {
  const rates = useObjectSelector(state => state.ledger.rates[GENERAL]);
  const ids = Object.keys(quote?.totalOperationRequired || {}).sort().join(',');
  return useMemo(() => {
    const prices = {};
    if (!coin) return prices;
    const nativeUsd = usdOf(rates?.[coin.id]);
    if (nativeUsd) prices[coin.system_id] = nativeUsd;
    (ids ? ids.split(',') : []).forEach(id => {
      if (prices[id]) return;
      const usd = usdOf(rates?.[id]);
      if (usd) prices[id] = usd;
    });
    return prices;
  }, [coin?.id, coin?.system_id, ids, rates]);
}
