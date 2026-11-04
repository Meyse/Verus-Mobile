/* global __DEV__ */
import {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {registrationDisplayPrices} from './namespaceData';

export default function useRegistrationPrices(coin, quote) {
  const testnetPrices = useSelector(state => state.settings?.generalWalletSettings?.testnetPrices === true);
  const [prices, setPrices] = useState({});
  const ids = Object.keys(quote?.totalOperationRequired || {}).sort().join(',');
  const enabled = !!coin && (!coin.testnet || (__DEV__ && testnetPrices));
  useEffect(() => {
    let active = true;
    setPrices({});
    if (enabled) registrationDisplayPrices(coin, ids ? ids.split(',') : []).then(value => { if (active) setPrices(value); });
    return () => { active = false; };
  }, [coin?.id, enabled, ids]);
  return prices;
}
