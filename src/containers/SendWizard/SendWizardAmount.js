import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useIsFocused,
} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AmountInput from '../../components/AmountInput';
import {transparentDustError} from '../../utils/transactions/transparentDust';
import TextAction from '../../components/TextAction';
import AmountKeypad from '../../components/AmountKeypad';
import {getAmountDecimalSeparator} from '../../utils/amountInput';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {estimateConversion} from '../../utils/api/channels/vrpc/requests/estimateConversion';
import {estimateEthereumExportFee} from '../../utils/api/channels/vrpc/requests/estimateEthereumExportFee';
import {timeout} from '../../utils/promises';
import {USD} from '../../utils/constants/currencies';
import {API_GET_FIATPRICE} from '../../utils/constants/intervalConstants';
import {coinsToSats, truncateDecimal} from '../../utils/math';
import {getConversionPaths} from '../../utils/api/routers/getConversionPaths';
import {useSendWizard} from './SendWizardContext';
import {getWizardCryptoAmount} from './wizardAmount';
import {IMPACT_LEVEL} from './priceImpact';
import {usePriceImpact} from './usePriceImpact';
import {useReceivedPrice} from './useReceivedPrice';
import {
  ErrorMessage,
  WizardFooter,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import AmountEstimate from './components/AmountEstimate';
import PriceRouteSheet from './components/PriceRouteSheet';
import {TargetNetworkSheet} from './components/SelectionSheets';
import useAdvancedFormMenu from './components/useAdvancedFormMenu';
import {
  buildSendTarget,
  ADDRESS_TYPE,
  getCurrencyDisplay,
  getEstimateLimit,
  getRecipientAddressType,
  MAX_ESTIMATED_CONVERTERS,
  getRouteName,
  isConversionChannel,
  pickEstimateRoutes,
  SEND_WIZARD_MODE,
  shouldShowAdvancedFormMenu,
} from './wizardUtils';

const SendWizardAmount = () => {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const {mode, state, setAmount, setAmountDraft, setEstimate, setRecipient, setRoute} = useSendWizard();
  const {
    channel,
    sourceCoin,
    sourceSubWallet,
    sourceBalance,
    sourceSendLimit,
    target,
    route,
  } = state;
  // Available and MAX: the confirmed balance (PR 266 review R13).
  const sendLimit = sourceSendLimit ?? sourceBalance;
  const input = state.amountInput || '';
  const fiatMode = Boolean(state.fiatMode);
  const setInput = value => setAmountDraft({amountInput: value.replace(/,/g, '.')});
  const setFiatMode = value => setAmountDraft({fiatMode: value});
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState(null);
  const [routeEstimates, setRouteEstimates] = useState({});
  const [preferredRouteKey, setPreferredRouteKey] = useState(null);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  // Amount loads other networks only when the user presses Change network,
  // for a Send from Home and from a card alike (PR 266 F5 and P1).
  const [loadedNetworks, setLoadedNetworks] = useState(null);
  const sendTarget = loadedNetworks || target;
  const networksLoaded = Boolean(loadedNetworks);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [networkSheetOpen, setNetworkSheetOpen] = useState(false);
  const [exportFeeQuote, setExportFeeQuote] = useState(null);
  const amountInputRef = useRef(null);
  const decimalSeparator = useMemo(getAmountDecimalSeparator, []);
  const refocusAfterSheet = useCallback(() => amountInputRef.current?.focus(), []);

  // Send only: "More options" holds the Advanced form. The form starts empty;
  // an amount typed here is not carried over.
  const advancedFormSheet = useAdvancedFormMenu({
    // The amount field uses the app keypad, not the system keyboard.
    dismissKeyboard: false,
    enabled: shouldShowAdvancedFormMenu({mode, routeName: 'SendWizardAmount', state}),
    onDismissed: refocusAfterSheet,
    onOpenForm: () => navigation.navigate('SendWizardAdvanced'),
  });

  useFocusEffect(useCallback(() => {
    Keyboard.dismiss();
    const task = InteractionManager.runAfterInteractions(() => amountInputRef.current?.focus());
    return () => task.cancel();
  }, []));

  const displayCurrency = useSelector(
    stateValue =>
      stateValue.settings.generalWalletSettings.displayCurrency || USD,
  );
  const rates = useObjectSelector(stateValue => stateValue.ledger.rates);
  const fiatChannel = sourceSubWallet?.api_channels?.[API_GET_FIATPRICE];
  const rate =
    fiatChannel == null
      ? null
      : rates?.[fiatChannel]?.[sourceCoin?.id]?.[displayCurrency];

  // A scanned address can only be reached on networks of its own kind. A
  // private address is on the Verus network itself.
  const scannedType = state.scanRequest?.address
    ? getRecipientAddressType(state.scanRequest.address)
    : null;
  const scanAddressType =
    scannedType === ADDRESS_TYPE.PRIVATE ? ADDRESS_TYPE.VERUS : scannedType;
  const networkOptionsFor = targetValue => (targetValue?.networkOptions || []).filter(
    option =>
      !scanAddressType ||
      option.routes.some(candidate => candidate.addressType === scanAddressType),
  );

  // Other networks load only when the user asks for them (PR 266 feedback
  // F5). The card's own network is the default.
  const networkRequest = useRef(0);
  useEffect(() => {
    networkRequest.current += 1;
    setLoadedNetworks(null);
    setNetworkLoading(false);
    setNetworkError(null);
  }, [channel, sourceCoin]);
  useEffect(() => () => {
    networkRequest.current += 1;
  }, []);
  const loadSendNetworks = async () => {
    if (networksLoaded) {
      setNetworkSheetOpen(true);
      return;
    }
    const request = ++networkRequest.current;
    const sourceNetworkId =
      channel.split('.')[2] || sourceCoin.system_id || sourceCoin.id;
    setNetworkLoading(true);
    setNetworkError(null);
    try {
      const paths = await timeout(
        NETWORK_LOOKUP_TIMEOUT_MS,
        getConversionPaths(sourceCoin, channel, {
          src: sourceCoin.currency_id || sourceCoin.id,
        }),
      );
      if (request !== networkRequest.current) return;
      const loaded = buildSendTarget(paths || {}, sourceCoin, sourceNetworkId);
      setLoadedNetworks(loaded);
      setNetworkLoading(false);
      const options = networkOptionsFor(loaded);
      const onlyOther = options.length === 1 && !options[0].isSameNetwork
        ? options[0]
        : null;
      if (onlyOther && scanNeedsNetwork) {
        // A scanned address that only one other network can reach starts
        // there, as Select asset did before (PR 266 P1).
        chooseSendNetwork(onlyOther);
      } else if (options.length > 1 && navigation.isFocused?.() !== false) {
        setNetworkSheetOpen(true);
      }
    } catch (_) {
      if (request !== networkRequest.current) return;
      setNetworkLoading(false);
      setNetworkError('Networks unavailable. Try again');
    }
  };
  // A scanned address that the card's own network cannot reach needs another
  // network, so its networks load at once.
  const scanNeedsNetwork = Boolean(scanAddressType) &&
    mode === SEND_WIZARD_MODE.SEND &&
    isConversionChannel(channel) &&
    Boolean(route) && route.addressType !== scanAddressType;
  const scanNetworkLoadStarted = useRef(false);
  useEffect(() => {
    if (!scanNeedsNetwork || networksLoaded || scanNetworkLoadStarted.current) return;
    scanNetworkLoadStarted.current = true;
    loadSendNetworks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networksLoaded, scanNeedsNetwork]);

  // A fiat entry is cut down to the places the asset can hold.
  const cryptoAmount = useMemo(() => getWizardCryptoAmount({
    input,
    fiatMode,
    rate,
    coin: sourceCoin,
    isConversion: Boolean(target?.isConversion),
    isCrossChain: Boolean(route?.isCrossChain),
  }), [
    fiatMode,
    input,
    rate,
    route?.isCrossChain,
    sourceCoin,
    target?.isConversion,
  ]);
  const cryptoAmountValue = cryptoAmount.isFinite()
    ? cryptoAmount.toString()
    : '';
  const decimals = sourceCoin?.decimals ?? 8;
  // Validate the entered amount before the existing rounding step. Money entry
  // keeps 2 decimals; the keypad refuses more, and pasted text gets this error.
  const enteredAmount = BigNumber(String(input || 0).replace(',', '.'));
  const inputDecimals = fiatMode ? FIAT_DECIMALS : decimals;
  const excessivePrecision = enteredAmount.decimalPlaces() > inputDecimals;
  // A zero draft ("0", "0.0") is not finished yet, so it shows no error.
  const zeroDraft = enteredAmount.isFinite() && enteredAmount.isZero();
  const dustError = !target?.isConversion && route?.addressType !== ADDRESS_TYPE.ETHEREUM &&
    cryptoAmount.isGreaterThan(0)
    ? transparentDustError(sourceCoin, channel, cryptoAmount) : null;
  const validAmount =
    !dustError &&
    !excessivePrecision &&
    cryptoAmount.isFinite() &&
    cryptoAmount.isGreaterThan(0) &&
    cryptoAmount.isLessThanOrEqualTo(sendLimit || 0);
  const ethereumExport =
    channel?.split('.')[0] === 'vrpc' &&
    route?.isCrossChain &&
    route?.addressType === ADDRESS_TYPE.ETHEREUM;
  // Bind the result to the complete route request. A changed route must not
  // briefly display an old fee or enable Continue before its effect runs.
  // verusd prices this fee from gas and Bridge prices, not from the amount,
  // so typing an amount does not refetch it.
  const exportFeeRequest = ethereumExport ? JSON.stringify({
    channel,
    currency: sourceCoin?.currency_id || sourceCoin?.id,
    ...(target?.isConversion ? {convertto: target.transactionCurrency} : {}),
    exportto: route.exportTo,
    ...(route.via ? {via: route.via} : {}),
    ...(route.preconvert ? {preconvert: true} : {}),
  }) : null;
  const exportFee = exportFeeQuote?.request === exportFeeRequest
    ? exportFeeQuote?.fee : null;
  const exportFeeLoading = Boolean(
    exportFeeRequest && exportFeeQuote?.request !== exportFeeRequest,
  );
  const sourcePaysExportFee = Boolean(exportFee && exportFee.currencyId ===
    (sourceCoin?.currency_id || sourceCoin?.id));
  const exportFeeBlocksRoute = sourcePaysExportFee &&
    BigNumber(sendLimit || 0).isLessThanOrEqualTo(exportFee.amount);
  const insufficientExportFunds = sourcePaysExportFee &&
    (exportFeeBlocksRoute || (cryptoAmount.isFinite() && cryptoAmount.isGreaterThan(0) &&
      cryptoAmount.plus(exportFee.amount).isGreaterThan(sendLimit || 0)));
  const maximumDisabled = exportFeeLoading || exportFeeBlocksRoute;
  const exportFeeTicker = exportFee
    ? sourcePaysExportFee ? sourceCoin.display_ticker
      : getCurrencyDisplay(exportFee.currencyId).ticker
    : '';
  const exportFeeDisplay = exportFee
    ? `${BigNumber(exportFee.amount).isLessThan(0.01)
      ? truncateDecimal(BigNumber(exportFee.amount), 8)
      : BigNumber(exportFee.amount).toFixed(2)} ${exportFeeTicker}` : '';
  let amountError = null;
  if (excessivePrecision) {
    amountError = `Use no more than ${inputDecimals} decimal places.`;
  } else if (dustError) {
    amountError = dustError;
  } else if (input && !zeroDraft && !validAmount) {
    amountError = cryptoAmount.isGreaterThan(sendLimit || 0)
      ? "The amount exceeds this address's spendable balance."
      : 'Enter a valid amount.';
  }
  const exportFeeError = insufficientExportFunds
    ? `Not enough ${sourceCoin.display_ticker} for the bridge fee (about ${exportFeeDisplay}).`
    : null;

  useEffect(() => {
    if (!exportFeeRequest) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      const {channel: requestChannel, ...output} = JSON.parse(exportFeeRequest);
      const [, source, systemId] = requestChannel.split('.');
      try {
        const fee = await timeout(15000, estimateEthereumExportFee(systemId, source, output));
        if (active) setExportFeeQuote({request: exportFeeRequest, fee});
      } catch (_) {
        if (active) setExportFeeQuote({request: exportFeeRequest, fee: null});
      }
    }, 280);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [exportFeeRequest]);

  // A pre-conversion gets the launch price, which nobody knows yet. An estimate
  // would only guess (the daemon quotes as if the launch were now).
  const preconvert = Boolean(route?.preconvert);

  // The estimates for one amount pause: the same channel, source, target
  // currency and amount. Amount asks each route once per pause, at most 30
  // routes; more only after a tap on "Check 30 more routes" in "Price and
  // route" (F13, and R2 option A, owner 2026-11-22). A route pick or a tap
  // reuses what is known (audit row 14).
  const sourceCurrency = sourceCoin?.currency_id || sourceCoin?.id;
  const estimateBase = target?.isConversion && validAmount && !preconvert
    ? JSON.stringify([channel, sourceCurrency, target.transactionCurrency, cryptoAmountValue])
    : null;
  const [estimatePages, setEstimatePages] = useState({base: null, pages: 1});
  const pages = estimatePages.base === estimateBase ? estimatePages.pages : 1;
  const estimateRoutes = useMemo(
    () => (target?.routes?.length
      ? pickEstimateRoutes(target.routes, preferredRouteKey, getEstimateLimit(pages))
      : route ? [route] : []),
    // The route stands in only for a target without routes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, preferredRouteKey, target, target?.routes?.length ? null : route],
  );
  const estimateKeys = estimateRoutes.map(candidate => candidate?.key).join('|');
  const [checkingMore, setCheckingMore] = useState(false);
  // Per amount pause: route key -> estimate (null when its estimate failed),
  // and the keys asked but not answered yet. An answer bumps the version.
  const knownEstimates = useRef({base: null, results: {}, pending: new Set()});
  const [estimateVersion, setEstimateVersion] = useState(0);
  useEffect(() => {
    if (!estimateBase) {
      knownEstimates.current = {base: null, results: {}, pending: new Set()};
      setEstimate(null);
      setEstimateError(null);
      setEstimateLoading(false);
      setCheckingMore(false);
      setRouteEstimates({});
      return undefined;
    }
    // A new pause starts at one batch, also on a return to an amount whose
    // earlier pause had more (its answers are gone).
    const newPause = knownEstimates.current.base !== estimateBase;
    if (newPause) {
      knownEstimates.current = {base: estimateBase, results: {}, pending: new Set()};
      if (pages !== 1) setEstimatePages({base: estimateBase, pages: 1});
    }
    const known = knownEstimates.current;
    const pool = target?.routes?.length ? target.routes : estimateRoutes;
    // Never more estimates in one pause than its batches allow: 30, plus 30
    // per tap. The user's pick goes first, then the oldest.
    const budget = (newPause ? MAX_ESTIMATED_CONVERTERS : getEstimateLimit(pages)) -
      Object.keys(known.results).length - known.pending.size;
    const missing = estimateRoutes
      .filter(candidate =>
        !(candidate.key in known.results) && !known.pending.has(candidate.key))
      .sort((first, second) =>
        (second.key === preferredRouteKey) - (first.key === preferredRouteKey))
      .slice(0, Math.max(0, budget));
    missing.forEach(candidate => known.pending.add(candidate.key));
    // In the order the routes were checked (each batch oldest first), so on
    // equal estimates the route found first stays the best, as before.
    const poolByKey = Object.fromEntries(pool.map(candidate => [candidate.key, candidate]));
    const checked = Object.keys(known.results)
      .map(key => poolByKey[key])
      .filter(Boolean);
    const waiting = known.pending.size > 0;

    if (checked.length) {
      // The route chosen once its estimates are in: the user's pick, else the
      // best known, else the current one. Its basket name shows only now. A
      // tap on "Check 30 more routes" keeps this on screen while it checks.
      const nextEstimates = Object.fromEntries(
        checked.map(candidate => [candidate.key, known.results[candidate.key]]),
      );
      const best = checked.reduce((current, candidate) => {
        const estimate = known.results[candidate.key];
        return estimate && (!current || BigNumber(estimate.estimatedcurrencyout)
          .isGreaterThan(known.results[current.key].estimatedcurrencyout))
          ? candidate : current;
      }, null);
      const selectedRoute =
        checked.find(candidate => candidate.key === preferredRouteKey) ||
        best ||
        route;
      const selectedEstimate = known.results[selectedRoute?.key] || null;

      setRouteEstimates(nextEstimates);
      if (selectedRoute && selectedRoute.key !== route?.key) {
        setRoute(selectedRoute);
      }
      setEstimate(selectedEstimate);
      setEstimateError(selectedEstimate ? null : 'Estimate unavailable.');
      setEstimateLoading(false);
      setCheckingMore(waiting);
    } else if (!waiting) {
      // Nothing left to ask and no answer (cannot happen with routes).
      setEstimate(null);
      setRouteEstimates({});
      setEstimateError('Estimate unavailable.');
      setEstimateLoading(false);
      setCheckingMore(false);
    } else {
      // A new amount: the skeleton until its estimates are in.
      setEstimate(null);
      setRouteEstimates({});
      setEstimateError(null);
      setEstimateLoading(true);
      setCheckingMore(false);
    }
    if (!missing.length) return undefined;

    let started = false;
    const timer = setTimeout(async () => {
      started = true;
      const results = await Promise.all(
        missing.map(async candidate => {
          try {
            const result = await estimateConversion(
              channel?.split('.')[2] || sourceCoin.system_id || sourceCoin.id,
              sourceCurrency,
              target.transactionCurrency,
              cryptoAmount,
              candidate?.via,
              Boolean(candidate?.preconvert),
            );

            if (result?.error) {
              throw new Error(result.error.message || 'Estimate unavailable.');
            }
            const output = result?.result?.estimatedcurrencyout;
            if (
              output == null ||
              !BigNumber(output).isFinite() ||
              BigNumber(output).isNegative()
            ) {
              throw new Error('Estimate unavailable.');
            }
            return [candidate.key, result.result];
          } catch (error) {
            if (__DEV__) {
              console.warn('Conversion estimate unavailable:', error.message);
            }
            return [candidate.key, null];
          }
        }),
      );
      // Answers for an older amount are dropped. Answers for this one are
      // kept even when a route pick re-ran this effect meanwhile, so no route
      // is asked twice.
      if (knownEstimates.current !== known) return;
      results.forEach(([key, estimate]) => {
        known.results[key] = estimate;
        known.pending.delete(key);
      });
      setEstimateVersion(version => version + 1);
    }, checked.length ? 0 : 280);

    return () => {
      if (started) return;
      clearTimeout(timer);
      missing.forEach(candidate => known.pending.delete(candidate.key));
    };
    // `route` is only the fallback; a route set from here must not ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    estimateBase,
    estimateKeys,
    estimateVersion,
    pages,
    preferredRouteKey,
    setEstimate,
    setRoute,
  ]);
  const checkMoreRoutes = () => {
    if (!estimateBase || checkingMore || estimateLoading) return;
    setEstimatePages({base: estimateBase, pages: pages + 1});
  };

  // The market sample also costs an estimate, so it runs only for a route
  // that gets one (F13).
  const sampledRoute = route && (route.key in routeEstimates ||
    estimateRoutes.some(candidate => candidate.key === route.key))
    ? route : null;
  const priceImpact = usePriceImpact({
    channel,
    sourceCoin,
    target,
    route: sampledRoute,
    amount: cryptoAmount,
    output: validAmount ? state.estimate?.estimatedcurrencyout : null,
    rate,
  });

  const applySuggestedAmount = suggestedAmount => {
    setInput(
      fiatMode && rate != null
        ? suggestedAmount.multipliedBy(rate).decimalPlaces(2).toFixed(2)
        : suggestedAmount.toFixed(),
    );
  };

  const useMaximum = () => {
    if (maximumDisabled) return;
    const maximum = BigNumber.maximum(0, BigNumber(sendLimit || 0)
      .minus(sourcePaysExportFee ? exportFee.amount : 0));
    if (sourcePaysExportFee) {
      // Keep MAX exact. Rounding a fiat value could spend the reserved fee.
      setFiatMode(false);
      setInput(maximum.decimalPlaces(8, BigNumber.ROUND_DOWN).toFixed());
      return;
    }
    setInput(
      fiatMode && rate != null
        ? maximum.multipliedBy(rate).decimalPlaces(2).toFixed(2)
        : maximum.toFixed(),
    );
  };

  // An empty or zero field stays empty in the other unit. A converted value is
  // selected, so the first key replaces it (PR 266 review R14).
  const toggleInputMode = () => {
    if (rate == null) return;
    const converted = zeroDraft || !cryptoAmount.isFinite() || cryptoAmount.isZero()
      ? ''
      : fiatMode
        ? cryptoAmount.toFixed()
        : cryptoAmount.multipliedBy(rate).decimalPlaces(FIAT_DECIMALS).toFixed();
    amountInputRef.current?.selectAll(converted);
    setInput(converted);
    setFiatMode(!fiatMode);
  };

  const continueToRecipient = () => {
    if (!validAmount || exportFeeLoading || insufficientExportFunds || scanNeedsNetwork) return;
    setAmount(
      cryptoAmount.toString(),
      coinsToSats(cryptoAmount).toString(),
      state.estimate,
      input,
      fiatMode,
    );
    // A pre-conversion goes to the source card's own address, so a failed
    // launch refunds the same address. Confirm comes next.
    if (preconvert) {
      setRecipient(channel.split('.')[1]);
      navigation.navigate('SendWizardConfirm');
      return;
    }
    // A scanned recipient is fixed, so Confirm comes next.
    navigation.navigate(
      state.scanRequest?.address || (state.invoice && !state.invoice.anyDestination)
        ? 'SendWizardConfirm'
        : 'SendWizardRecipient',
    );
  };

  const sendNetworkOptions = networkOptionsFor(sendTarget);
  const selectedNetwork =
    sendNetworkOptions.find(option =>
      option.routes.some(candidate => candidate.key === route?.key),
    ) || sendNetworkOptions.find(option => option.isSameNetwork);
  const chooseSendNetwork = option => {
    const nextRoute =
      option.routes.find(candidate => !candidate.via) || option.routes[0];

    if (nextRoute) setRoute(nextRoute, option);
    setNetworkSheetOpen(false);
  };

  // The received asset's own price from the ledger. Never the paid asset's
  // price or the small-trade crypto ratio from usePriceImpact. A missing price
  // stays absent.
  const receiveRate = useReceivedPrice(
    target?.coinId || target?.id,
    fiatChannel,
  );

  if (!sourceCoin || !target || !route) {
    return (
      <WizardScreen contentContainerStyle={styles.fallbackContent}>
        <ErrorMessage style={styles.fallbackError}>Source or recipient Asset selection is missing.</ErrorMessage>
      </WizardScreen>
    );
  }

  const available = `${truncateDecimal(BigNumber(sourceBalance || 0), 8)} ${sourceCoin.display_ticker}`;
  // The private card spends confirmed funds only. Say when the rest is ready.
  const convertedFiat =
    rate != null && cryptoAmount.isFinite()
      ? formatCurrency({
          amount: cryptoAmount.multipliedBy(rate).decimalPlaces(2).toFixed(2),
          code: displayCurrency,
        })[0]
      : null;
  const estimatedOutput = state.estimate?.estimatedcurrencyout;
  // A route through a basket shows the row too, to name the basket under its
  // label, also below 0.1% ("Details"; R3 option 1, owner 2026-11-22).
  const viaName = target.isConversion && route.via ? getRouteName(route) : null;
  const showPriceRouteChip =
    !preconvert &&
    (target.isConversion || ethereumExport) &&
    (priceImpact.level !== IMPACT_LEVEL.NONE ||
      (target.routes || []).length > 1 ||
      Boolean(viaName) ||
      ethereumExport);
  const receiveAmount = validAmount
    ? target.isConversion ? estimatedOutput : cryptoAmountValue
    : null;
  const receiveMoneyValue = receiveAmount != null &&
    BigNumber(receiveAmount).isFinite() && BigNumber(receiveRate).isFinite() &&
    BigNumber(receiveRate).isGreaterThan(0)
    ? formatCurrency({
        amount: BigNumber(receiveAmount).multipliedBy(receiveRate).decimalPlaces(2).toFixed(2),
        code: displayCurrency,
      })[0] : null;
  const enteredCryptoAmount = truncateDecimal(
    cryptoAmount.isFinite() ? cryptoAmount : 0,
    8,
  );
  const modeText = fiatMode
    ? `${input ? enteredCryptoAmount : '—'} ${sourceCoin.display_ticker}`
    : convertedFiat || `— ${displayCurrency}`;

  const sourceNetworkId = channel?.split('.')[2] || sourceCoin.system_id || sourceCoin.id;
  const sourceNetwork = sendTarget?.networkOptions?.find(option => option.isSameNetwork)?.networkName ||
    getCurrencyDisplay(sourceNetworkId, sourceCoin.display_name).name;
  const destinationNetwork = selectedNetwork?.networkName || route.networkName || sourceNetwork;
  const networkChoice = mode === SEND_WIZARD_MODE.SEND && isConversionChannel(channel);
  const canChangeNetwork = networkChoice && sendNetworkOptions.length > 1;
  const noOtherNetwork = networkChoice && networksLoaded && !canChangeNetwork;
  const amountErrorMessage = (exportFeeBlocksRoute && exportFeeError) || amountError || exportFeeError || estimateError;
  const estimateVisible = target.isConversion || (validAmount && ethereumExport);
  const emptyAmount = !input || (cryptoAmount.isFinite() && cryptoAmount.isZero());
  const showNetworkAction = !target.isConversion && networkChoice;
  const contextShown = route.isCrossChain || showNetworkAction;

  return (
    <WizardScreen scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Boolean(amountErrorMessage)}>
        {/* Small windows: an empty context takes no height, and a shown one is a
            20-point line whose 44-point target comes from hit slop. */}
        <View style={[styles.context, smallDevice && (contextShown ? styles.contextCompact : styles.contextEmpty)]}>
          {route.isCrossChain ? (
            <Pressable
              accessibilityLabel={`From ${sourceNetwork} to ${destinationNetwork}${canChangeNetwork ? '. Change destination network' : ''}`}
              accessibilityRole={canChangeNetwork ? 'button' : undefined}
              disabled={!canChangeNetwork || networkLoading}
              hitSlop={smallDevice ? COMPACT_LINE_HIT_SLOP : undefined}
              onPress={() => setNetworkSheetOpen(true)}
              style={[styles.networkAction, smallDevice && styles.networkActionCompact]}>
              <Text numberOfLines={1} style={[theme.typography.bodySm, styles.contextText, {color: theme.colors.textSecondary}]}>{sourceNetwork}</Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color={theme.colors.textSecondary} />
              <Text numberOfLines={1} style={[theme.typography.labelMd, styles.contextText, {color: theme.colors.textPrimary}]}>{destinationNetwork}</Text>
              {canChangeNetwork ? <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.textSecondary} /> : null}
            </Pressable>
          ) : showNetworkAction ? (
            <TextAction
              accessibilityRole="button"
              disabled={networkLoading || noOtherNetwork}
              hitSlop={smallDevice ? COMPACT_LINE_HIT_SLOP : undefined}
              Icon={networkLoading ? NetworkSpinner : undefined}
              onPress={loadSendNetworks}
              size="small"
              style={[styles.networkAction, smallDevice && styles.networkActionCompact]}>
              {networkLoading
                ? 'Checking networks…'
                : networkError || (noOtherNetwork ? 'No other networks' : 'Change network')}
            </TextAction>
          ) : null}
        </View>
        <View style={[styles.entry, smallDevice && (contextShown ? styles.entryTight : styles.entryCompact)]}>
          <AmountInput
            ref={amountInputRef}
            compact={smallDevice}
            decimalSeparator={decimalSeparator}
            maxDecimals={fiatMode ? FIAT_DECIMALS : undefined}
            onChangeText={setInput}
            unit={fiatMode ? displayCurrency : sourceCoin.display_ticker}
            value={input}
          />
          <View style={rate != null ? [styles.modeSlot, smallDevice && styles.modeSlotCompact] : null}>
            {rate != null ? (
              <Pressable
                accessibilityLabel={`Switch amount between ${sourceCoin.display_ticker} and ${displayCurrency}`}
                accessibilityRole="button"
                hitSlop={smallDevice ? COMPACT_MODE_HIT_SLOP : undefined}
                onPress={toggleInputMode}
                style={[styles.modeAction, smallDevice && styles.modeActionCompact]}>
                <View style={[styles.modeChip, {backgroundColor: theme.colors.surfaceMuted}]}>
                  <Text style={[theme.typography.bodySm, {color: theme.colors.textPrimary}]}>{modeText}</Text>
                  <MaterialCommunityIcons name="swap-vertical" size={16} color={theme.colors.textSecondary} />
                </View>
              </Pressable>
            ) : null}
          </View>
          <ErrorMessage style={styles.error}>{amountErrorMessage}</ErrorMessage>
          <View style={[styles.balanceRow, smallDevice && styles.balanceRowCompact]}>
            <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>Available: {available}</Text>
            <TextAction
              accessibilityLabel="Use maximum available amount"
              accessibilityRole="button"
              accessibilityState={{disabled: maximumDisabled}}
              disabled={maximumDisabled}
              onPress={useMaximum}
              variant="chip"
              style={[styles.maxButton, smallDevice && styles.maxButtonCompact]}>
              MAX
            </TextAction>
          </View>
        </View>
      </ScrollView>
      {estimateVisible ? (
        <View style={styles.estimateSlot}>
          <AmountEstimate
            atLaunch={preconvert}
            estimateLoading={validAmount && !emptyAmount && estimateLoading}
            estimatedOutput={emptyAmount ? null : receiveAmount}
            moneyValue={receiveMoneyValue}
            onOpenDetails={() => setRouteSheetOpen(true)}
            priceImpact={priceImpact}
            showDetails={validAmount && !emptyAmount && showPriceRouteChip}
            target={target}
            // The name only with an estimate: the route chosen once the
            // estimates arrived, never the first route before them.
            via={receiveAmount != null && !emptyAmount ? viaName : null}
            viaRoutes={Boolean(target.isConversion && target.routes?.some(candidate => candidate.via))}
          />
        </View>
      ) : null}
      <WizardFooter
        bottomSpacing={smallDevice ? 8 : 16}
        // A scanned address the chosen network cannot reach waits for a
        // network that can (PR 266 review of P1).
        disabled={!validAmount || estimateLoading || checkingMore || exportFeeLoading || insufficientExportFunds || scanNeedsNetwork}
        includeBottomInset={false}
        onPress={continueToRecipient}
        safeAreaSpacing={0}
      />
      <AmountKeypad
        decimalSeparator={decimalSeparator}
        onKeyPress={key => amountInputRef.current?.edit(key)}
        visible={focused && !routeSheetOpen && !networkSheetOpen}
      />
      {advancedFormSheet}
      <PriceRouteSheet
        cryptoAmount={cryptoAmount}
        displayCurrency={displayCurrency}
        estimatedOutput={estimatedOutput}
        ethereumExport={ethereumExport}
        exportFeeDisplay={exportFeeDisplay}
        exportFeeLoading={exportFeeLoading}
        hasExportFee={Boolean(exportFee)}
        onUseSuggestion={applySuggestedAmount}
        priceImpact={priceImpact}
        rate={rate}
        route={route}
        sourceCoin={sourceCoin}
        checkingMore={checkingMore}
        estimates={routeEstimates}
        onCheckMore={checkMoreRoutes}
        target={target}
        visible={routeSheetOpen}
        onClose={() => setRouteSheetOpen(false)}
        onClosed={refocusAfterSheet}
        onSelect={nextRoute => {
          setPreferredRouteKey(nextRoute.key);
          setRoute(nextRoute);
          setEstimate(routeEstimates[nextRoute.key] || null);
          setEstimateError(routeEstimates[nextRoute.key] ? null : 'Estimate unavailable.');
          setRouteSheetOpen(false);
        }}
      />
      <TargetNetworkSheet
        selectedKey={route?.networkKey}
        onClose={() => setNetworkSheetOpen(false)}
        onClosed={refocusAfterSheet}
        onSelect={chooseSendNetwork}
        options={sendNetworkOptions}
        target={sendTarget}
        visible={networkSheetOpen}
      />
    </WizardScreen>
  );
};

// The routes for an Ethereum asset take several requests to the bridge.
const NETWORK_LOOKUP_TIMEOUT_MS = 20000;

// TextAction draws its icon in the label color; the spinner takes that color.
const NetworkSpinner = ({color}) => <ActivityIndicator color={color} size="small" />;

// Money entry keeps cents only.
const FIAT_DECIMALS = 2;

// Small windows: a 20-point context line and a 36-point fiat chip slot keep
// 44-point targets through hit slop. TextAction adds its own (MAX keeps 48).
const COMPACT_LINE_HIT_SLOP = {top: 12, bottom: 12};
const COMPACT_MODE_HIT_SLOP = {top: 4, bottom: 4};

const styles = StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 16, paddingBottom: 8},
  fallbackContent: {paddingTop: WIZARD_CONTENT_TOP_INSET},
  fallbackError: {marginVertical: 0},
  context: {height: 44, alignItems: 'center', justifyContent: 'center'},
  contextCompact: {height: 20},
  contextEmpty: {height: 0},
  networkAction: {alignSelf: 'center', minHeight: 44, maxWidth: '100%', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center'},
  networkActionCompact: {minHeight: 20},
  contextText: {flexShrink: 1},
  entry: {paddingTop: 48, alignItems: 'center'},
  entryCompact: {paddingTop: 8},
  entryTight: {paddingTop: 0},
  modeSlot: {minHeight: 44, width: '100%', alignItems: 'center', justifyContent: 'center'},
  modeSlotCompact: {minHeight: 36},
  modeAction: {minHeight: 44, justifyContent: 'center'},
  modeActionCompact: {minHeight: 36},
  modeChip: {borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6},
  error: {marginHorizontal: 0, marginVertical: 4, alignSelf: 'stretch'},
  balanceRow: {minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  balanceRowCompact: {minHeight: 44},
  maxButton: {minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center'},
  maxButtonCompact: {minHeight: 44},
  estimateSlot: {minHeight: 49, paddingHorizontal: 16},
});

export default SendWizardAmount;
