/* global __DEV__ */
import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AppState } from 'react-native';
import { GENERAL } from '../constants/intervalConstants';
import { isTestnetAccount, uniqueAssets } from '../assets/assetIdentity';
import { appendBalanceRecord, readBalanceRecord, subscribeBalanceRecord } from './balanceRecord';
import {
  getFiatHistory, getSavedFiatHistory, getSavedUsdHistory, getUsdHistory,
} from './priceHistory';
import { loadPriceCache } from './priceCache';
import {
  availableRanges, buildSeries, HOUR, visibility,
} from './chartMath';

// Long enough for the results of one refresh, also on a slow Android phone.
export const RECORD_SAVE_DELAY_MS = 3000;

const DEFAULT_RANGES = ['1D', '1W', '1M', '1Y'];

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
  const accountHashRef = useRef(accountHash);
  accountHashRef.current = accountHash;
  // The amounts last saved, and how many own saves are running (their record updates are not
  // a replacement from elsewhere).
  const appendedKey = useRef(null);
  const savingRecord = useRef(0);
  const [saved, setSaved] = useState(null);
  const [range, setRange] = useState('1M');
  const [now, setNow] = useState(Date.now());
  const [market, setMarket] = useState(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
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
    loadPriceCache().then(() => { if (active) setCacheLoaded(true); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setRange('1M');
    if (!accountHash) return undefined;
    const timer = setTimeout(() => { if (active) setReadTimedOut(accountHash); }, 400);
    const unsubscribe = subscribeBalanceRecord((hash, value) => {
      if (!active || hash !== accountHash) return;
      // A replaced or deleted record may no longer hold the saved amounts: save them again.
      if (savingRecord.current === 0) appendedKey.current = null;
      setSaved({ accountHash, record: value });
    });
    readBalanceRecord(accountHash).then((value) => {
      if (active) setSaved({ accountHash, record: value });
    }).catch((error) => {
      console.warn('Could not read the local portfolio record.', error.message);
      if (active) setSaved({ accountHash, record: null });
    });
    return () => { active = false; clearTimeout(timer); unsubscribe(); };
  }, [accountHash]);

  // Balance results of one refresh arrive one after the other. Save the record once, after
  // they stop changing, and not again for the same amounts. Each save reads and writes the
  // whole encrypted record. A save that is still waiting runs at once when the wallet
  // closes, the account changes or the total becomes unknown, so no change is lost.
  const pendingSave = useRef(null);
  const mounted = useRef(true);
  const saveNow = useRef(null);
  saveNow.current = (save) => {
    appendedKey.current = save.key;
    savingRecord.current += 1;
    appendBalanceRecord(save.accountHash, save.balances).then((value) => {
      if (mounted.current && save.accountHash === accountHashRef.current) {
        setSaved({ accountHash: save.accountHash, record: value });
      }
    }).catch((error) => {
      if (appendedKey.current === save.key) appendedKey.current = null;
      console.warn('Could not save the local portfolio record.', error.message);
    }).finally(() => { savingRecord.current -= 1; });
  };
  const flushPendingSave = () => {
    const save = pendingSave.current;
    pendingSave.current = null;
    if (save) saveNow.current(save);
  };
  useEffect(() => {
    if (!accountHash || !ready || total == null || !Number.isFinite(total)) {
      flushPendingSave();
      return undefined;
    }
    if (pendingSave.current && pendingSave.current.accountHash !== accountHash) flushPendingSave();
    const key = `${accountHash}:${JSON.stringify(balances)}`;
    if (key === appendedKey.current) {
      pendingSave.current = null;
      return undefined;
    }
    pendingSave.current = { accountHash, balances, key };
    const timer = setTimeout(flushPendingSave, RECORD_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- flushPendingSave reads refs only.
  }, [accountHash, balances, total, ready]);
  useEffect(() => () => {
    mounted.current = false;
    flushPendingSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on unmount.
  }, []);

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
  // The saved prices draw the chart at once. The requests below replace them when they return.
  const savedMarket = useMemo(() => {
    if (state !== 'chart' || !cacheLoaded) return null;
    const time = Date.now();
    const prices = coins.map((coin) => [coin.id, getSavedUsdHistory(coin, start, time)]);
    const fx = getSavedFiatHistory(currency);
    return fx && prices.every(([, samples]) => samples)
      ? { loading: false, prices: Object.fromEntries(prices), fx } : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- marketKey stands for coins, currency and start.
  }, [state, cacheLoaded, marketKey]);

  // The requests start with the Home refresh, not after it. `refreshing` stays a dependency so a
  // refresh tries failed requests again.
  useEffect(() => {
    if (!focused || state !== 'chart') return undefined;
    let active = true;
    // A started request may finish for the cache after this effect ends. Only an unfocused Home stops it.
    const canFetch = () => focusedRef.current;
    const time = Date.now();
    // Keep the drawn history while it refreshes; show skeletons only for a new key.
    setMarket((previous) => (previous?.key === marketKey ? previous : {
      key: marketKey, loading: true, prices: {}, fx: [],
    }));
    const load = (hourly, drawn) => Promise.all([
      Promise.all(coinsRef.current.map(async (coin) => {
        try {
          return [coin.id, await getUsdHistory(coin, start, time, canFetch, hourly)];
        } catch (error) {
          console.warn('Could not load portfolio price history; using the last known prices.', coin.id, error.message);
          return [coin.id, drawn?.prices[coin.id] || getSavedUsdHistory(coin, start, time) || []];
        }
      })),
      getFiatHistory(currency, start, time, canFetch).catch((error) => {
        console.warn('Could not load portfolio exchange history; using the last known rates.', error.message);
        return drawn?.fx || getSavedFiatHistory(currency) || [];
      }),
    ]).then(([prices, fx]) => {
      const loaded = {
        key: marketKey, loading: false, prices: Object.fromEntries(prices), fx,
      };
      if (active) setMarket(loaded);
      return loaded;
    });
    // Daily prices draw 1M and longer, the range Home opens with. Hourly prices follow for 1D and 1W.
    load(false).then((drawn) => { if (active) load(true, drawn); });
    return () => { active = false; };
  }, [focused, state, refreshing, marketKey, start, currency, hourBucket]);

  const ranges = useMemo(() => (record ? availableRanges(record.start, now) : DEFAULT_RANGES),
    [record, now]);
  const selectedRange = ranges.includes(range) ? range : '1M';
  const requested = market?.key === marketKey ? market : null;
  const data = requested && !requested.loading ? requested : savedMarket || requested;
  // Past values in another currency need past exchange rates. Without them (no saved
  // rates yet, or a currency the ECB does not publish) the history is not available;
  // today's rate is never used for past days.
  const fxFallback = currency === 'USD' ? 1 : null;
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
  const loading = state === 'chart' && (total == null || !data || data.loading);
  // The line needs two points with a real value. Missing prices are never filled in.
  const shownState = state === 'chart' && !loading && series.points.length < 2 ? 'unavailable' : state;
  // Before the record is read, Home can still tell whether a chart can show at all.
  const hasPrice = coins.length > 0;
  // One object per change, so the header and chart draw again only when the history changes.
  return useMemo(() => ({
    hydrated,
    hasPrice,
    focused,
    state: shownState,
    record,
    series,
    range: selectedRange,
    ranges,
    setRange,
    now,
    loading,
  }), [hydrated, hasPrice, focused, shownState, record, series, selectedRange, ranges, now, loading]);
};

export default usePortfolioHistory;
