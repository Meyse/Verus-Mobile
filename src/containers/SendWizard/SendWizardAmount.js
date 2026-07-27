import React, {useEffect, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import SkeletonLoader, {SkeletonRow} from '../../components/SkeletonLoader';
import {estimateConversion} from '../../utils/api/channels/vrpc/requests/estimateConversion';
import {USD} from '../../utils/constants/currencies';
import {API_GET_FIATPRICE} from '../../utils/constants/intervalConstants';
import {coinsToSats, truncateDecimal} from '../../utils/math';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {getConversionPaths} from '../../utils/api/routers/getConversionPaths';
import {useSendWizard} from './SendWizardContext';
import {
  ErrorMessage,
  WizardFooter,
  WizardHeading,
  WizardScreen,
} from './components/WizardUI';
import {
  RouteSheet,
  TargetNetworkSheet,
} from './components/SelectionSheets';
import {
  buildSendTarget,
  isConversionChannel,
  SEND_WIZARD_MODE,
} from './wizardUtils';

const SendWizardAmount = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const {mode, state, setAmount, setEstimate, setRoute} = useSendWizard();
  const {
    channel,
    sourceCoin,
    sourceSubWallet,
    sourceBalance,
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
  const validAmount =
    cryptoAmount.isFinite() &&
    cryptoAmount.isGreaterThan(0) &&
    cryptoAmount.isLessThanOrEqualTo(sourceBalance || 0);
  let amountError = null;
  if (input && !validAmount) {
    amountError = cryptoAmount.isGreaterThan(sourceBalance || 0)
      ? 'Amount exceeds this Card’s spendable balance.'
      : 'Enter a valid amount.';
  }

  useEffect(() => {
    if (!target?.isConversion || !validAmount) {
      setEstimate(null);
      setEstimateError(null);
      setEstimateLoading(false);
      setRouteEstimates({});
      return undefined;
    }

    let active = true;
    const timeout = setTimeout(async () => {
      setEstimateLoading(true);
      setEstimateError(null);
      try {
        const routes = target.routes?.length ? target.routes : [route];
        const results = await Promise.all(
          routes.map(async candidate => {
            try {
              const result = await estimateConversion(
                channel?.split('.')[2] || sourceCoin.system_id || sourceCoin.id,
                sourceCoin.currency_id || sourceCoin.id,
                target.transactionCurrency,
                cryptoAmount.toString(),
                candidate?.via || null,
                Boolean(candidate?.preconvert),
              );

              if (result?.result?.estimatedcurrencyout != null) {
                return {estimate: result.result, route: candidate};
              }
            } catch (error) {}

            if (candidate?.price != null) {
              return {
                estimate: {
                  estimatedcurrencyout: cryptoAmount
                    .multipliedBy(candidate.price)
                    .toString(),
                  price: String(candidate.price),
                  precomputed: true,
                },
                route: candidate,
              };
            }

            return null;
          }),
        );
        if (!active) return;
        const available = results.filter(Boolean);
        if (!available.length) throw new Error('Estimate unavailable.');

        const nextEstimates = Object.fromEntries(
          available.map(item => [item.route.key, item.estimate]),
        );
        const best = available.reduce((current, candidate) =>
          BigNumber(candidate.estimate.estimatedcurrencyout).isGreaterThan(
            current.estimate.estimatedcurrencyout,
          )
            ? candidate
            : current,
        );
        const selected =
          available.find(item => item.route.key === preferredRouteKey) || best;

        setRouteEstimates(nextEstimates);
        if (selected.route.key !== route?.key) setRoute(selected.route);
        setEstimate(selected.estimate);
      } catch (error) {
        if (!active) return;
        setRouteEstimates({});
        setEstimate(null);
        setEstimateError(error.message || 'Estimate unavailable.');
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
    preferredRouteKey,
    setEstimate,
    setRoute,
    sourceCoin,
    target,
    validAmount,
  ]);

  const useMaximum = () => {
    const maximum = BigNumber(sourceBalance || 0);
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
    if (!validAmount) return;
    setAmount(
      cryptoAmount.toString(),
      coinsToSats(cryptoAmount).toString(),
      state.estimate,
      input,
      fiatMode,
    );
    navigation.navigate('SendWizardRecipient');
  };

  const sendNetworkOptions = sendTarget?.networkOptions || [];
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
      <WizardScreen>
        <WizardHeading>Amount</WizardHeading>
        <ErrorMessage>Source or recipient Asset selection is missing.</ErrorMessage>
      </WizardScreen>
    );
  }

  const available = `${truncateDecimal(BigNumber(sourceBalance || 0), 8)} ${sourceCoin.display_ticker}`;
  const convertedFiat =
    rate != null && cryptoAmount.isFinite()
      ? formatCurrency({
          amount: cryptoAmount.multipliedBy(rate).decimalPlaces(2).toFixed(2),
          code: displayCurrency,
        })[0]
      : null;
  const contextLine = target.isConversion
    ? `Convert ${sourceCoin.display_ticker} → ${target.ticker}${
        route.isCrossChain && route.exportToFqn ? ` on ${route.exportToFqn}` : ''
      }`
    : route.isCrossChain
    ? `Send ${sourceCoin.display_ticker} to ${route.exportToFqn || route.exportTo}`
    : `Send ${sourceCoin.display_ticker} on ${sourceCoin.display_name}`;
  const estimatedOutput = state.estimate?.estimatedcurrencyout;
  const rateDisplay = state.estimate?.price;
  const routeName = route.viaFqn || route.via || route.label || 'Direct';
  const enteredCryptoAmount = truncateDecimal(
    cryptoAmount.isFinite() ? cryptoAmount : 0,
    8,
  );
  const modeText = fiatMode
    ? `${enteredCryptoAmount} ${sourceCoin.display_ticker}`
    : convertedFiat || `— ${displayCurrency}`;

  return (
    <WizardScreen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <WizardHeading style={styles.headingInset}>Amount</WizardHeading>
          <Text style={[styles.contextLine, {color: theme.colors.textSecondary}]}>{contextLine}</Text>
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
          <View style={styles.amountBlock}>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={setInput}
              placeholder="0"
              placeholderTextColor={theme.colors.textSubtle}
              selectionColor={theme.colors.primary}
              style={[styles.amountInput, {color: theme.colors.textPrimary}]}
              value={input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{disabled: rate == null}}
              disabled={rate == null}
              onPress={toggleInputMode}
              style={[styles.modeChip, {backgroundColor: theme.colors.surfaceMuted}]}>
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
            <View style={styles.balanceRow}>
              <Text style={[styles.balance, {color: theme.colors.textSecondary}]}>Available: {available}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={useMaximum}
                style={[styles.maxButton, {borderColor: theme.colors.primary}]}>
                <Text style={[styles.maxText, {color: theme.colors.primary}]}>MAX</Text>
              </Pressable>
            </View>
          </View>
          <ErrorMessage>{amountError || estimateError}</ErrorMessage>
          {target.isConversion ? (
            <View style={[styles.estimateCard, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
              {estimateLoading ? (
                <SkeletonLoader accessibilityLabel="Estimating conversion" style={styles.estimateSkeleton}>
                  <SkeletonRow labelWidth="28%" valueWidth="60%" />
                  <SkeletonRow labelWidth="28%" valueWidth="45%" />
                </SkeletonLoader>
              ) : estimatedOutput != null ? (
                <>
                  <Text style={[styles.estimateLabel, {color: theme.colors.textSecondary}]}>You receive</Text>
                  <View style={styles.estimateOutputRow}>
                    {RenderSquareCoinLogo(target.coinId || target.id, {}, 24, 24)}
                    <View style={styles.estimateCopy}>
                      <View style={styles.estimateValueRow}>
                        <Text style={[styles.estimateValue, {color: theme.colors.textPrimary}]}>
                          ≈ {truncateDecimal(BigNumber(estimatedOutput), 8)}
                        </Text>
                        <Text style={[styles.estimateTicker, {color: theme.colors.textSecondary}]}>{target.ticker}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.divider, {backgroundColor: theme.colors.border}]} />
                  <Pressable
                    disabled={(target.routes || []).length < 2}
                    onPress={() => setRouteSheetOpen(true)}
                    style={styles.routeRow}>
                    <Text style={[styles.routeLabel, {color: theme.colors.textSecondary}]}>Conversion route</Text>
                    <View style={styles.routeValueRow}>
                      <Text style={[styles.routeValue, {color: theme.colors.textPrimary}]}>{routeName}</Text>
                      {(target.routes || []).length > 1 ? (
                        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textSubtle} />
                      ) : null}
                    </View>
                  </Pressable>
                  {rateDisplay ? (
                    <View style={styles.routeRow}>
                      <Text style={[styles.routeLabel, {color: theme.colors.textSecondary}]}>Rate</Text>
                      <Text style={[styles.routeValue, {color: theme.colors.textPrimary}]}>
                        1 {sourceCoin.display_ticker} = {truncateDecimal(BigNumber(rateDisplay), 8)} {target.ticker}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.estimateEmpty, {color: theme.colors.textSecondary}]}>Enter amount to see estimate</Text>
              )}
            </View>
          ) : null}
        </ScrollView>
        <WizardFooter disabled={!validAmount || estimateLoading} onPress={continueToRecipient}>
          Continue
        </WizardFooter>
      </KeyboardAvoidingView>
      <RouteSheet
        estimates={routeEstimates}
        selectedKey={route?.key}
        target={target}
        title="Select conversion route"
        routes={target.routes || []}
        visible={routeSheetOpen}
        onClose={() => setRouteSheetOpen(false)}
        onSelect={nextRoute => {
          setPreferredRouteKey(nextRoute.key);
          setRoute(nextRoute);
          setEstimate(routeEstimates[nextRoute.key] || null);
          setRouteSheetOpen(false);
        }}
      />
      <TargetNetworkSheet
        onClose={() => setNetworkSheetOpen(false)}
        onSelect={chooseSendNetwork}
        options={sendNetworkOptions}
        target={sendTarget}
        visible={networkSheetOpen}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {flexGrow: 1, paddingHorizontal: 16, paddingBottom: 12},
  headingInset: {marginHorizontal: -16},
  contextLine: {fontSize: 14, lineHeight: 20, marginBottom: 8, ...fontStyle('regular')},
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
  amountBlock: {alignItems: 'center', marginTop: 8, marginBottom: 8},
  amountInput: {minWidth: 160, maxWidth: '90%', padding: 0, textAlign: 'center', fontSize: 40, lineHeight: 48, ...fontStyle('bold')},
  modeChip: {borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4, marginBottom: 12, flexDirection: 'row', alignItems: 'center'},
  modeText: {fontSize: 14, lineHeight: 20, ...fontStyle('semiBold')},
  modeIcon: {marginLeft: 6},
  balanceRow: {width: '100%', paddingHorizontal: 4, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  balance: {fontSize: 13, lineHeight: 18, ...fontStyle('regular')},
  maxButton: {borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4},
  maxText: {fontSize: 11, lineHeight: 15, letterSpacing: 0.5, ...fontStyle('bold')},
  estimateCard: {borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 10, marginBottom: 10},
  estimateLabel: {fontSize: 12, lineHeight: 17, marginBottom: 6, ...fontStyle('bold')},
  estimateOutputRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  estimateCopy: {flex: 1, marginLeft: 10},
  estimateValueRow: {flexDirection: 'row', alignItems: 'baseline'},
  estimateValue: {fontSize: 17, lineHeight: 22, ...fontStyle('bold')},
  estimateTicker: {fontSize: 14, lineHeight: 19, marginLeft: 6, ...fontStyle('medium')},
  divider: {height: StyleSheet.hairlineWidth, width: '100%', marginVertical: 6},
  routeRow: {minHeight: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  routeValueRow: {flexDirection: 'row', alignItems: 'center', flexShrink: 1},
  routeLabel: {fontSize: 13, lineHeight: 18, ...fontStyle('regular')},
  routeValue: {maxWidth: 220, textAlign: 'right', fontSize: 13, lineHeight: 18, ...fontStyle('semiBold')},
  estimateEmpty: {paddingVertical: 8, fontSize: 13, lineHeight: 18, ...fontStyle('regular')},
  estimateSkeleton: {paddingVertical: 4},
});

export default SendWizardAmount;
