import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  InteractionManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../globals/fonts';
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
import {compareRoutes, IMPACT_LEVEL} from './priceImpact';
import {usePriceImpact} from './usePriceImpact';
import {
  ErrorMessage,
  WizardFormLayout,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import AmountEstimate from './components/AmountEstimate';
import PriceRouteSheet from './components/PriceRouteSheet';
import {TargetNetworkSheet} from './components/SelectionSheets';
import {
  buildSendTarget,
  ADDRESS_TYPE,
  getCurrencyDisplay,
  getRecipientAddressType,
  isConversionChannel,
  SEND_WIZARD_MODE,
} from './wizardUtils';

const SendWizardAmount = () => {
  const navigation = useNavigation();
  const {params} = useRoute();
  const theme = useOnboardingTheme();
  const {smallDevice, smallDeviceKeyboardVisible} = useOnboardingSmallDeviceLayout();
  const {mode, state, setAmount, setEstimate, setRecipient, setRoute} = useSendWizard();
  const {
    channel,
    sourceCoin,
    sourceSubWallet,
    sourceBalance,
    sourcePending,
    target,
    route,
  } = state;
  const [input, setInput] = useState(state.amountInput || state.amount || '');
  const [fiatMode, setFiatMode] = useState(Boolean(state.fiatMode));
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState(null);
  const [routeEstimates, setRouteEstimates] = useState({});
  const [preferredRouteKey, setPreferredRouteKey] = useState(null);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState(target);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [networkSheetOpen, setNetworkSheetOpen] = useState(false);
  const [exportFeeQuote, setExportFeeQuote] = useState(null);
  const [amountWidth, setAmountWidth] = useState(0);
  const amountInputRef = useRef(null);

  // Match Request amount's 40-to-20 point sizing. Limit typing to what fits
  // at 20 points, including Ethereum's 18-decimal amounts.
  const amountRoom = amountWidth * 0.9;
  const amountFontSize =
    amountWidth > 0
      ? Math.max(
          20,
          Math.min(40, Math.floor(amountRoom / (Math.max(input.length, 1) * 0.64))),
        )
      : 40;
  const maxAmountLength =
    amountWidth > 0 ? Math.floor(amountRoom / (20 * 0.64)) : 23;

  // Android does not show the keyboard for a field that is focused while a
  // sheet is still closing. Toggling focus once the sheet is gone asks the
  // keyboard to show. Do it only where a sheet was just closed: toggling a
  // keyboard that is already showing hides it, and Keyboard.isVisible() is not
  // reliable here because the window pans instead of resizing.
  const refocusAmount = useCallback(() => {
    const input = amountInputRef.current;
    if (!input) return;
    input.blur();
    input.focus();
  }, []);
  const refocusAfterSheet = useCallback(() => {
    if (Platform.OS === 'android') setTimeout(refocusAmount, 700);
  }, [refocusAmount]);
  const openedAfterSheet = useRef(Boolean(params?.afterSheet));

  // `autoFocus` only covers the first mount. A step reached while a sheet is
  // still closing, or reached again with Back, needs the keypad opened here.
  useFocusEffect(
    useCallback(() => {
      const focus = () => amountInputRef.current?.focus();
      const task = InteractionManager.runAfterInteractions(focus);
      const timers = [setTimeout(focus, 450)];
      if (Platform.OS === 'android' && openedAfterSheet.current) {
        openedAfterSheet.current = false;
        timers.push(setTimeout(refocusAmount, 900));
      }
      return () => {
        task.cancel();
        timers.forEach(clearTimeout);
      };
    }, [refocusAmount]),
  );

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

  useEffect(() => {
    setSendTarget(target);

    if (
      mode !== SEND_WIZARD_MODE.SEND ||
      !sourceCoin ||
      !channel ||
      !isConversionChannel(channel)
    ) {
      setNetworkLoading(false);
      setNetworkError(null);
      return undefined;
    }

    let active = true;
    const sourceNetworkId =
      channel.split('.')[2] || sourceCoin.system_id || sourceCoin.id;

    setNetworkLoading(true);
    setNetworkError(null);
    getConversionPaths(sourceCoin, channel, {
      src: sourceCoin.currency_id || sourceCoin.id,
    })
      .then(paths => {
        if (active) {
          setSendTarget(
            buildSendTarget(paths || {}, sourceCoin, sourceNetworkId),
          );
        }
      })
      .catch(() => {
        if (active) setNetworkError('Other networks unavailable.');
      })
      .finally(() => {
        if (active) setNetworkLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channel, mode, sourceCoin, target]);

  const cryptoAmount = useMemo(() => {
    const entered = BigNumber(String(input || 0).replace(',', '.'));
    if (!entered.isFinite() || entered.isNegative()) return BigNumber(NaN);
    const nativePrecision =
      ['eth', 'erc20'].includes(sourceCoin?.proto) &&
      !target?.isConversion &&
      !route?.isCrossChain;
    let value = entered;
    if (fiatMode) {
      if (rate == null || BigNumber(rate).isLessThanOrEqualTo(0)) {
        return BigNumber(NaN);
      }
      value = entered.dividedBy(rate);
    }
    return nativePrecision
      ? value
      : value.decimalPlaces(8, BigNumber.ROUND_DOWN);
  }, [
    fiatMode,
    input,
    rate,
    route?.isCrossChain,
    sourceCoin?.proto,
    target?.isConversion,
  ]);
  const cryptoAmountValue = cryptoAmount.isFinite()
    ? cryptoAmount.toString()
    : '';
  const decimals = sourceCoin?.decimals ?? 8;
  // Validate the entered asset amount before the existing rounding step.
  const excessivePrecision =
    !fiatMode &&
    BigNumber(String(input || 0).replace(',', '.')).decimalPlaces() > decimals;
  const validAmount =
    !excessivePrecision &&
    cryptoAmount.isFinite() &&
    cryptoAmount.isGreaterThan(0) &&
    cryptoAmount.isLessThanOrEqualTo(sourceBalance || 0);
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
    BigNumber(sourceBalance || 0).isLessThanOrEqualTo(exportFee.amount);
  const insufficientExportFunds = sourcePaysExportFee &&
    (exportFeeBlocksRoute || (cryptoAmount.isFinite() && cryptoAmount.isGreaterThan(0) &&
      cryptoAmount.plus(exportFee.amount).isGreaterThan(sourceBalance || 0)));
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
    amountError = `Use no more than ${decimals} decimal places.`;
  } else if (input && !validAmount) {
    amountError = cryptoAmount.isGreaterThan(sourceBalance || 0)
      ? 'Amount exceeds this Card’s spendable balance.'
      : 'Enter a valid amount.';
  }
  const exportFeeError = insufficientExportFunds
    ? `Not enough ${sourceCoin.display_ticker} for the Ethereum network fee (about ${exportFeeDisplay}).`
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

  useEffect(() => {
    if (!target?.isConversion || !validAmount || preconvert) {
      setEstimate(null);
      setEstimateError(null);
      setEstimateLoading(false);
      setRouteEstimates({});
      return undefined;
    }

    let active = true;
    setEstimate(null);
    setRouteEstimates({});
    setEstimateLoading(true);
    setEstimateError(null);
    const timeout = setTimeout(async () => {
      try {
        const routes = target.routes?.length ? target.routes : [route];
        const results = await Promise.all(
          routes.map(async candidate => {
            try {
              const result = await estimateConversion(
                channel?.split('.')[2] || sourceCoin.system_id || sourceCoin.id,
                sourceCoin.currency_id || sourceCoin.id,
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
              return {estimate: result.result, route: candidate};
            } catch (error) {
              if (__DEV__) {
                console.warn('Conversion estimate unavailable:', error.message);
              }
              return {estimate: null, route: candidate};
            }
          }),
        );
        if (!active) return;
        const nextEstimates = Object.fromEntries(
          results.map(item => [item.route.key, item.estimate]),
        );
        const available = results.filter(item => item.estimate != null);
        const best = available.reduce(
          (current, candidate) =>
            !current ||
            BigNumber(candidate.estimate.estimatedcurrencyout).isGreaterThan(
              current.estimate.estimatedcurrencyout,
            )
              ? candidate
              : current,
          null,
        );
        const selectedRoute =
          routes.find(candidate => candidate.key === preferredRouteKey) ||
          best?.route ||
          route;
        const selectedEstimate = nextEstimates[selectedRoute?.key] || null;

        setRouteEstimates(nextEstimates);
        if (selectedRoute && selectedRoute.key !== route?.key) {
          setRoute(selectedRoute);
        }
        setEstimate(selectedEstimate);
        setEstimateError(selectedEstimate ? null : 'Estimate unavailable.');
      } catch (error) {
        if (!active) return;
        setRouteEstimates({});
        setEstimate(null);
        setEstimateError('Estimate unavailable.');
      } finally {
        if (active) setEstimateLoading(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    channel,
    cryptoAmountValue,
    preconvert,
    preferredRouteKey,
    setEstimate,
    setRoute,
    sourceCoin,
    target,
    validAmount,
  ]);

  const priceImpact = usePriceImpact({
    channel,
    sourceCoin,
    target,
    route,
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
    const maximum = BigNumber.maximum(0, BigNumber(sourceBalance || 0)
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

  const toggleInputMode = () => {
    if (rate == null) return;
    const currentCrypto = cryptoAmount.isFinite() ? cryptoAmount : BigNumber(0);
    if (fiatMode) setInput(currentCrypto.toFixed());
    else setInput(currentCrypto.multipliedBy(rate).decimalPlaces(2).toFixed(2));
    setFiatMode(current => !current);
  };

  const continueToRecipient = () => {
    if (!validAmount || exportFeeLoading || insufficientExportFunds) return;
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

  // A scanned address can only be reached on networks of its own kind. A
  // private address is on the Verus network itself.
  const scannedType = state.scanRequest?.address
    ? getRecipientAddressType(state.scanRequest.address)
    : null;
  const scanAddressType =
    scannedType === ADDRESS_TYPE.PRIVATE ? ADDRESS_TYPE.VERUS : scannedType;
  const sendNetworkOptions = (sendTarget?.networkOptions || []).filter(
    option =>
      !scanAddressType ||
      option.routes.some(candidate => candidate.addressType === scanAddressType),
  );
  const selectedNetwork =
    sendNetworkOptions.find(option =>
      option.routes.some(candidate => candidate.key === route?.key),
    ) || sendNetworkOptions.find(option => option.isSameNetwork);
  const chooseSendNetwork = option => {
    const nextRoute =
      option.routes.find(candidate => !candidate.via) || option.routes[0];

    if (nextRoute) setRoute(nextRoute);
    setNetworkSheetOpen(false);
  };

  if (!sourceCoin || !target || !route) {
    return (
      <WizardScreen contentContainerStyle={styles.fallbackContent}>
        <ErrorMessage style={styles.fallbackError}>Source or recipient Asset selection is missing.</ErrorMessage>
      </WizardScreen>
    );
  }

  const available = `${truncateDecimal(BigNumber(sourceBalance || 0), 8)} ${sourceCoin.display_ticker}`;
  // The private card spends confirmed funds only. Say when the rest is ready.
  const confirming = BigNumber(sourcePending || 0).isGreaterThan(0)
    ? `${truncateDecimal(BigNumber(sourcePending), 8)} ${sourceCoin.display_ticker} can be sent in about 10 minutes.`
    : null;
  const convertedFiat =
    rate != null && cryptoAmount.isFinite()
      ? formatCurrency({
          amount: cryptoAmount.multipliedBy(rate).decimalPlaces(2).toFixed(2),
          code: displayCurrency,
        })[0]
      : null;
  const estimatedOutput = state.estimate?.estimatedcurrencyout;
  const showPriceRouteChip =
    !preconvert &&
    (target.isConversion || ethereumExport) &&
    (priceImpact.level !== IMPACT_LEVEL.NONE ||
      compareRoutes(target.routes || [], routeEstimates).length > 1 ||
      ethereumExport);
  const receiveAmount = target.isConversion ? estimatedOutput : cryptoAmountValue;
  const enteredCryptoAmount = truncateDecimal(
    cryptoAmount.isFinite() ? cryptoAmount : 0,
    8,
  );
  const modeText = fiatMode
    ? `${enteredCryptoAmount} ${sourceCoin.display_ticker}`
    : convertedFiat || `— ${displayCurrency}`;

  return (
    <WizardScreen scroll={false}>
      <WizardFormLayout
        contentContainerStyle={[styles.content, smallDevice && styles.contentCompact]}
        error={(exportFeeBlocksRoute && exportFeeError) || amountError || exportFeeError || estimateError}
        pinned={
          validAmount && (target.isConversion || ethereumExport) &&
          (preconvert || estimateLoading || receiveAmount != null || showPriceRouteChip) ? (
            <AmountEstimate
              atLaunch={preconvert}
              estimateLoading={estimateLoading}
              estimatedOutput={receiveAmount}
              onOpenDetails={() => setRouteSheetOpen(true)}
              priceImpact={priceImpact}
              showDetails={showPriceRouteChip}
              target={target}
            />
          ) : null
        }
        disabled={!validAmount || estimateLoading || exportFeeLoading || insufficientExportFunds}
        onPress={continueToRecipient}>
        {(errorMessage, onFieldLayout, onRecoveryLayout) => <>
          {mode === SEND_WIZARD_MODE.SEND &&
          isConversionChannel(channel) ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: networkLoading || sendNetworkOptions.length < 2,
                }}
                disabled={networkLoading || sendNetworkOptions.length < 2}
                onPress={() => setNetworkSheetOpen(true)}
                style={[
                  styles.networkRow,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  },
                ]}>
                <View>
                  <Text
                    style={[
                      styles.networkLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Network
                  </Text>
                  <Text
                    style={[
                      styles.networkValue,
                      {color: theme.colors.textPrimary},
                    ]}>
                    {selectedNetwork?.networkName ||
                      route.networkName ||
                      sourceCoin.display_name}
                  </Text>
                </View>
                <View style={styles.networkStatus}>
                  {networkLoading ? (
                    <Text
                      style={[
                        styles.networkHint,
                        {color: theme.colors.textSubtle},
                      ]}>
                      Checking…
                    </Text>
                  ) : sendNetworkOptions.length > 1 ? (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.colors.textSubtle}
                    />
                  ) : null}
                </View>
              </Pressable>
              {networkError ? (
                <Text
                  style={[
                    styles.networkError,
                    {color: theme.colors.textSubtle},
                  ]}>
                  {networkError}
                </Text>
              ) : null}
            </>
          ) : null}
          <View
            onLayout={event => {
              setAmountWidth(event.nativeEvent.layout.width);
              onFieldLayout(event);
            }}
            style={[styles.amountBlock, smallDevice && styles.amountBlockCompact]}>
            <TextInput
              ref={amountInputRef}
              autoFocus
              keyboardType="decimal-pad"
              maxLength={maxAmountLength}
              onChangeText={setInput}
              placeholder="0"
              placeholderTextColor={theme.colors.textSubtle}
              selectionColor={theme.colors.primary}
              style={[
                styles.amountInput,
                {
                  color: theme.colors.textPrimary,
                  fontSize: amountFontSize,
                  lineHeight: amountFontSize + 8,
                },
                // Leave room for a wrapped error and Available/MAX above the
                // compact Android keypad. Use the existing 20-point floor.
                Platform.OS === 'android' && smallDeviceKeyboardVisible &&
                  errorMessage && styles.amountInputWithError,
              ]}
              value={input}
            />
          </View>
          {errorMessage}
          <View
            onLayout={onRecoveryLayout}
            style={[
              styles.amountControls,
              errorMessage && smallDeviceKeyboardVisible && styles.amountControlsWithError,
            ]}>
            {rate != null ? (
              <Pressable
                accessibilityRole="button"
                onPress={toggleInputMode}
                style={[
                  styles.modeChip,
                  smallDevice && styles.modeChipCompact,
                  errorMessage && smallDeviceKeyboardVisible && styles.modeChipWithError,
                  {backgroundColor: theme.colors.surfaceMuted},
                ]}>
                <Text style={[styles.modeText, {color: theme.colors.textPrimary}]}>
                  {modeText}
                </Text>
                <MaterialCommunityIcons
                  name="swap-vertical"
                  size={16}
                  color={theme.colors.textSecondary}
                  style={styles.modeIcon}
                />
              </Pressable>
            ) : null}
            <View
              style={[
                styles.balanceRow,
                rate == null && styles.balanceRowNoChip,
                rate == null && smallDevice && styles.balanceRowNoChipCompact,
                errorMessage && smallDeviceKeyboardVisible && styles.balanceRowWithError,
              ]}>
              <Text style={[styles.balance, {color: theme.colors.textSecondary}]}>Available: {available}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{disabled: maximumDisabled}}
                disabled={maximumDisabled}
                onPress={useMaximum}
                style={[styles.maxButton, {borderColor: theme.colors.primary}, maximumDisabled && styles.maxDisabled]}>
                <Text style={[styles.maxText, {color: theme.colors.primary}]}>MAX</Text>
              </Pressable>
            </View>
            {confirming ? (
              <Text style={[styles.confirming, {color: theme.colors.textSecondary}]}>
                {confirming}
              </Text>
            ) : null}
          </View>
        </>}
      </WizardFormLayout>
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
        estimates={routeEstimates}
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

const styles = StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 16, paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 12},
  contentCompact: {paddingTop: 8},
  fallbackContent: {paddingTop: WIZARD_CONTENT_TOP_INSET},
  fallbackError: {marginVertical: 0},
  networkRow: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  networkLabel: {fontSize: 12, lineHeight: 17, ...fontStyle('regular')},
  networkValue: {fontSize: 15, lineHeight: 20, marginTop: 1, ...fontStyle('semiBold')},
  networkStatus: {minWidth: 28, alignItems: 'flex-end'},
  networkHint: {fontSize: 12, lineHeight: 17, ...fontStyle('regular')},
  networkError: {fontSize: 12, lineHeight: 17, marginBottom: 4, ...fontStyle('regular')},
  amountBlock: {alignItems: 'center', marginTop: 8},
  amountBlockCompact: {marginTop: 4},
  amountControls: {alignItems: 'center', marginBottom: 8},
  amountControlsWithError: {marginBottom: 0},
  amountInput: {minWidth: 160, maxWidth: '90%', padding: 0, textAlign: 'center', fontSize: 40, lineHeight: 48, ...fontStyle('bold')},
  amountInputWithError: {fontSize: 20, lineHeight: 28},
  modeChip: {borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4, marginBottom: 12, flexDirection: 'row', alignItems: 'center'},
  modeChipCompact: {marginBottom: 6},
  modeChipWithError: {marginTop: 0, marginBottom: 2},
  modeText: {fontSize: 14, lineHeight: 20, ...fontStyle('semiBold')},
  modeIcon: {marginLeft: 6},
  balanceRowNoChip: {marginTop: 12},
  balanceRowNoChipCompact: {marginTop: 6},
  balanceRow: {width: '100%', paddingHorizontal: 4, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  balanceRowWithError: {marginBottom: 4},
  balance: {fontSize: 13, lineHeight: 18, ...fontStyle('regular')},
  confirming: {width: '100%', paddingHorizontal: 4, marginTop: -2, marginBottom: 8, fontSize: 13, lineHeight: 18, ...fontStyle('regular')},
  maxButton: {borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4},
  maxDisabled: {opacity: 0.4},
  maxText: {fontSize: 11, lineHeight: 15, letterSpacing: 0.5, ...fontStyle('bold')},
});

export default SendWizardAmount;
