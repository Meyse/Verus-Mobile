/* global __DEV__ */
import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AppState } from 'react-native';
import { GENERAL } from '../constants/intervalConstants';
import { isTestnetAccount, uniqueAssets } from '../assets/assetIdentity';
import { appendBalanceRecord, readBalanceRecord, subscribeBalanceRecord } from './balanceRecord';
import { getFiatHistory, getUsdHistory } from './priceHistory';
import {
  availableRanges, buildSeries, HOUR, visibility,
} from './chartMath';

const usePortfolioHistory = ({
  account, activeCoins, balances, total, rates, currency, ready, refreshing,
  testnetPrices,
}) => {
  const navigationFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const focused = navigationFocused && appActive;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const accountHash = account?.accountHash;
  const [saved, setSaved] = useState(null);
  const [range, setRange] = useState('1M');
  const [now, setNow] = useState(Date.now());
  const [market, setMarket] = useState(null);
  const coins = useMemo(() => uniqueAssets(activeCoins)
    .filter((coin) => Boolean(coin.testnet) === isTestnetAccount(account))
    .filter((coin) => !coin.testnet || (__DEV__ && testnetPrices))
    .map((coin) => ({ ...coin, usd: rates[GENERAL]?.[coin.id]?.USD }))
    .filter((coin) => Number(coin.usd) > 0 && Number.isFinite(Number(coin.usd))),
  [activeCoins, account, rates, testnetPrices]);
  const [readTimedOut, setReadTimedOut] = useState(null);
  const record = saved && saved.accountHash === accountHash ? saved.record : null;
  // Home waits briefly for the record so the header does not jump. A slow read must not keep Home hidden.
  const hydrated = !accountHash || saved?.accountHash === accountHash || readTimedOut === accountHash;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    setRange('1M');
    if (!accountHash) return undefined;
    const timer = setTimeout(() => { if (active) setReadTimedOut(accountHash); }, 400);
    const unsubscribe = subscribeBalanceRecord((hash, value) => {
      if (active && hash === accountHash) setSaved({ accountHash, record: value });
    });
    readBalanceRecord(accountHash).then((value) => {
      if (active) setSaved({ accountHash, record: value });
    }).catch((error) => {
      console.warn('Could not read the local portfolio record.', error.message);
      if (active) setSaved({ accountHash, record: null });
    });
    return () => { active = false; clearTimeout(timer); unsubscribe(); };
  }, [accountHash]);

  useEffect(() => {
    if (!accountHash || !ready || total == null || !Number.isFinite(total)) return undefined;
    let active = true;
    appendBalanceRecord(accountHash, balances).then((value) => {
      if (active) setSaved({ accountHash, record: value });
    }).catch((error) => console.warn('Could not save the local portfolio record.', error.message));
    return () => { active = false; };
  }, [accountHash, balances, total, ready]);

  useEffect(() => {
    if (!focused) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [focused]);

  const state = visibility(record, coins.length > 0, total, now);
  const start = record?.start;
  // Keep replies with their account. The persistent market cache contains no account data.
  // The current price is not part of the key: a price update must not reload the history.
  const coinKey = coins.map((coin) => `${coin.id}:${coin.system_id}:${coin.price_currency_id}`).join('|');
  const marketKey = `${accountHash}:${coinKey}:${currency}:${start}`;
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const hourBucket = Math.floor(now / HOUR);
  useEffect(() => {
    if (!focused || state !== 'chart' || refreshing) return undefined;
    let active = true;
    const canFetch = () => active && focusedRef.current;
    const time = Date.now();
    // Keep the drawn history while it refreshes; show skeletons only for a new key.
    setMarket((previous) => (previous?.key === marketKey ? previous : {
      key: marketKey, loading: true, prices: {}, fx: [],
    }));
    const priceRequests = coinsRef.current.map(async (coin) => {
      try {
        const samples = await getUsdHistory(coin, start, time, canFetch);
        return [coin.id, samples];
      } catch (error) {
        console.warn('Could not load portfolio price history; using the current price.', coin.id, error.message);
        return [coin.id, []];
      }
    });
    const fiatRequest = getFiatHistory(currency, start, time, canFetch)
      .catch((error) => {
        console.warn('Could not load portfolio exchange history; using the current ratio.', error.message);
        return [];
      });
    Promise.all([Promise.all(priceRequests), fiatRequest]).then(([prices, fx]) => {
      if (active) {
        setMarket({
          key: marketKey, loading: false, prices: Object.fromEntries(prices), fx,
        });
      }
    });
    return () => { active = false; };
  }, [focused, state, refreshing, marketKey, start, currency, hourBucket]);

  const ranges = record ? availableRanges(record.start, now) : ['1D', '1W', '1M', '1Y'];
  const selectedRange = ranges.includes(range) ? range : '1M';
  const data = market?.key === marketKey ? market : null;
  const ratioCoin = coins.find((coin) => Number(rates[GENERAL]?.[coin.id]?.[currency]) > 0);
  const currentRatio = ratioCoin ? Number(rates[GENERAL][ratioCoin.id][currency]) / Number(ratioCoin.usd) : 0;
  const fxFallback = currency === 'USD' ? 1 : currentRatio;
  const series = useMemo(() => (state === 'chart' ? buildSeries({
    record,
    coins,
    prices: data?.prices,
    fx: data?.fx,
    fxFallback,
    total: total ?? 0,
    range: selectedRange,
    now,
  }) : null),
  [state, record, coins, data, fxFallback, total, selectedRange, now]);
  return {
    hydrated,
    focused,
    state,
    record,
    series,
    range: selectedRange,
    ranges,
    setRange,
    now,
    loading: state === 'chart' && (total == null || !data || data.loading),
  };
};

export default usePortfolioHistory;
