import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {Buffer} from 'buffer';
import BigNumber from 'bignumber.js';
import {networks} from 'bitgo-utxo-lib';
import {ethers} from 'ethers';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  DEST_ETH,
  DEST_ID,
  DEST_PKH,
  TransferDestination,
  fromBase58Check,
  toLowerCaseCLocale,
} from 'verus-typescript-primitives';
import FeeBreakdownSheet from './components/FeeBreakdownSheet';
import NetworkFeeSheet from './components/NetworkFeeSheet';
import useNetworkFee from './useNetworkFee';
import {arrivalForFee, FEE_TIERS, formatFeeAmount, maxBTCFeeRate, networkFeeKind, previewNetworkFee} from './networkFeeUtils';
import {
  TransferConnector,
  TransferNode,
} from './components/TransferSummary';
import ConfirmFacts, {ConfirmNotice} from './components/ConfirmFacts';
import ConfirmPreparing from './components/ConfirmPreparing';
import {
  formatEstimatedAmount,
  formatUnitPrice,
  getConversionPriceSummary,
} from './components/impactFormat';
import FadedScrollView from '../../components/FadedScrollView';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {expireCoinData} from '../../actions/actionCreators';
import {getIdentity} from '../../utils/api/routers/getIdentity';
import {preflightConvertOrCrossChain} from '../../utils/api/routers/preflightConvertOrCrossChain';
import {preflightSend} from '../../utils/api/routers/preflightSend';
import {sendConvertOrCrossChain} from '../../utils/api/routers/sendConvertOrCrossChain';
import {send} from '../../utils/api/routers/send';
import {
  ETH,
  ERC20,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_TRANSACTIONS,
} from '../../utils/constants/intervalConstants';
import {captureAssetContext} from '../../utils/assets/assetManagementService';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {
  I_ADDRESS_VERSION,
  MID_VERIFICATION,
  NO_VERIFICATION,
  R_ADDRESS_VERSION,
} from '../../utils/constants/constants';
import {useSendWizard} from './SendWizardContext';
import {refreshSourceBalance} from './refreshSourceBalance';
import {autoAddConversionAsset} from './autoAddConversionAsset';
import {
  ErrorMessage,
  WizardFooter,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import {useWizardFiat} from './useWizardFiat';
import {
  getCurrencyDisplay,
  getDestinationNetwork,
  getRouteName,
  isOwnChannelAddress,
} from './wizardUtils';

// Apply only to explicit rejection responses, never transport/unknown outcomes.
const getRejectionMessage = message =>
  /\b(transaction already in block chain|txn-already-in-mempool|txn-already-known|txn-mempool-conflict|bad-txns-inputs-spent|missing inputs|bad-txns-inputs-missingorspent|bad-txns-inputs-missing)\b/i.test(message)
    ? 'Your previous transaction is still being confirmed. Wait for the next block, then review this transaction again.'
    : message;

const SendWizardConfirm = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {state, setPreflight, setTxResult, setBroadcastError} = useSendWizard();
  const {
    amount,
    amountSats,
    channel,
    estimate,
    preflightResult,
    recipientAddress,
    route,
    sourceCoin,
    sourceBalance,
    sourceSubWallet,
    target,
  } = state;
  const activeAccount = useObjectSelector(
    stateValue => stateValue.authentication.activeAccount,
  );
  const coinSettings = useObjectSelector(
    stateValue => stateValue.settings.coinSettings,
  );
  const [preflighting, setPreflighting] = useState(true);
  const [sending, setSending] = useState(false);
  const submissionInFlight = useRef(false);
  const submitted = useRef(Boolean(state.txResult));
  const broadcastUnknown = useRef(Boolean(state.broadcastError));
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [feeSheetOpen, setFeeSheetOpen] = useState(false);
  const preflightSequence = useRef(0);
  const preparedParams = useRef(null);
  const lastReview = useRef(null);
  const generalWalletSettings = useObjectSelector(value => value.settings.generalWalletSettings);
  const {displayCurrency, format: formatFiat, getRate} = useWizardFiat(
    sourceSubWallet,
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: !sending,
      wizardNavigationDisabled: sending,
    });
  }, [navigation, sending]);

  const simpleSend = Boolean(
    target && !target.isConversion && !route?.isCrossChain,
  );
  const feeKind = networkFeeKind(simpleSend, channel, sourceCoin);
  const networkFee = useNetworkFee({
    kind: feeKind, coin: sourceCoin, channel,
    minGasPriceGwei: generalWalletSettings?.minGasPriceGwei,
  });
  const reviewKey = `${sourceCoin?.id}:${channel}:${amount}:${recipientAddress}`;
  const simpleSendParams = useMemo(() => {
    const verificationLevel = coinSettings?.[sourceCoin?.id]?.verificationLvl;
    const network =
      networks[toLowerCaseCLocale(sourceCoin?.id || '')] || networks.default;

    return {
      defaultFee: feeKind === 'btc' ? networkFee.fee : sourceCoin?.fee,
      ...(feeKind === 'eth' && networkFee.fee ? {networkFee: networkFee.fee} : {}),
      network,
      verifyMerkle:
        verificationLevel == null
          ? true
          : verificationLevel > MID_VERIFICATION,
      verifyTxid:
        verificationLevel == null
          ? true
          : verificationLevel > NO_VERIFICATION,
    };
  }, [coinSettings, sourceCoin, feeKind, networkFee.fee]);

  const buildDestination = useCallback(async () => {
    let destination = recipientAddress;
    if (destination.endsWith('@')) {
      const identityResult = await getIdentity(
        sourceCoin,
        activeAccount,
        channel,
        destination,
      );
      if (identityResult?.error || identityResult?.err) {
        throw new Error(
          identityResult?.result ||
            'Could not resolve this VerusID. Use its i-address instead.',
        );
      }
      destination = identityResult?.result?.identity?.identityaddress;
      if (!destination) throw new Error('This VerusID has no compatible destination.');
    }

    if (ethers.isAddress(destination)) {
      return new TransferDestination({
        destinationBytes: Buffer.from(destination.slice(2), 'hex'),
        type: DEST_ETH,
      });
    }

    const {hash, version} = fromBase58Check(destination);
    const type =
      version === I_ADDRESS_VERSION
        ? DEST_ID
        : version === R_ADDRESS_VERSION
        ? DEST_PKH
        : null;
    if (type == null) throw new Error('Incompatible destination address type.');
    return new TransferDestination({destinationBytes: hash, type});
  }, [activeAccount, channel, recipientAddress, sourceCoin]);

  const conversionOutput = useMemo(
    () => ({
      currency: sourceCoin?.currency_id || sourceCoin?.id,
      satoshis: amountSats,
      ...(target?.isConversion
        ? {
            convertto:
              target.convertToFqn || target.transactionCurrency,
          }
        : {}),
      ...(route?.isCrossChain
        ? {exportto: route.exportToFqn || route.exportTo}
        : {}),
      ...(route?.via ? {via: route.viaFqn || route.via} : {}),
      ...(route?.mapTo && [ETH, ERC20].includes(channel?.split('.')[0])
        ? {mapto: route.mapTo} : {}),
      ...(route?.preconvert ? {preconvert: true} : {}),
      ...(route?.bridgePrelaunch ? {bridgeprelaunch: true} : {}),
    }),
    [amountSats, route, sourceCoin, target],
  );

  useEffect(() => {
    const request = ++preflightSequence.current;
    preparedParams.current = null;
    if (
      !sourceCoin ||
      !sourceSubWallet ||
      !channel ||
      !amount ||
      !amountSats ||
      !recipientAddress ||
      !target ||
      !route
    ) {
      setPreflighting(false);
      setError('Transaction details are incomplete.');
      setPreflight(null);
      return undefined;
    }

    let active = true;
    setPreflighting(true);
    setError(null);
    setWarnings([]);
    setPreflight(null);
    if (feeKind && (networkFee.loading || !networkFee.fee)) {
      setPreflighting(networkFee.loading);
      setError(networkFee.loading ? null : networkFee.error);
      return () => { active = false; };
    }

    const run = async () => {
      try {
        const result = simpleSend
          ? await preflightSend(
              sourceCoin,
              activeAccount,
              recipientAddress,
              BigNumber(amount),
              channel,
              simpleSendParams,
            )
          : await preflightConvertOrCrossChain(
              sourceCoin,
              activeAccount,
              channel,
              {
                ...conversionOutput,
                address: await buildDestination(),
              },
            );

        if (!active || request !== preflightSequence.current) return;
        if (result?.err || result?.error) {
          throw new Error(result.result || result.error?.message || 'Preflight failed.');
        }
        const preflight = result?.result;
        const nextWarnings = [];

        const preflightEstimate = preflight?.estimate;
        if (
          target.isConversion &&
          preflightEstimate == null &&
          estimate?.estimatedcurrencyout == null
        ) {
          nextWarnings.push('Could not calculate an estimated result for this conversion.');
        }

        if (
          target.isConversion &&
          estimate?.estimatedcurrencyout &&
          preflightEstimate?.estimatedcurrencyout
        ) {
          const earlier = BigNumber(estimate.estimatedcurrencyout);
          const latest = BigNumber(preflightEstimate.estimatedcurrencyout);
          if (earlier.isGreaterThan(0) && latest.isGreaterThan(0)) {
            const slippage = earlier.minus(latest).dividedBy(earlier).multipliedBy(100);
            if (slippage.isGreaterThan(2)) {
              nextWarnings.push(
                `The latest estimated output is ${slippage.decimalPlaces(1).toString()}% lower. Verify the new amount before holding to confirm.`,
              );
            }
          }
        }

        setWarnings(nextWarnings);
        preparedParams.current = simpleSendParams;
        lastReview.current = {key: reviewKey, result: preflight};
        setPreflight(preflight);
      } catch (preflightError) {
        if (active && request === preflightSequence.current) setError(preflightError.message || 'Preflight failed.');
      } finally {
        if (active && request === preflightSequence.current) setPreflighting(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [
    activeAccount,
    feeKind,
    networkFee.loading,
    networkFee.error,
    reviewKey,
    amount,
    amountSats,
    buildDestination,
    channel,
    conversionOutput,
    estimate,
    recipientAddress,
    route,
    setPreflight,
    simpleSend,
    simpleSendParams,
    sourceCoin,
    sourceSubWallet,
    target,
  ]);

  const changeNetworkFee = next => {
    if (submissionInFlight.current || submitted.current || broadcastUnknown.current) return;
    preflightSequence.current++;
    preparedParams.current = null;
    setPreflight(null);
    setPreflighting(true);
    networkFee.choose(next);
  };
  const retryNetworkFee = () => {
    if (submissionInFlight.current || submitted.current || broadcastUnknown.current) return;
    preflightSequence.current++;
    preparedParams.current = null;
    setPreflight(null);
    setPreflighting(true);
    setError(null);
    networkFee.retry();
  };

  const submit = async () => {
    if (
      !preflightResult ||
      preflighting ||
      networkFee.loading ||
      preparedParams.current !== simpleSendParams ||
      submissionInFlight.current ||
      submitted.current ||
      state.txResult ||
      broadcastUnknown.current ||
      state.broadcastError
    ) return;
    submissionInFlight.current = true;
    setSending(true);
    setError(null);
    try {
      const assetContext = captureAssetContext();
      const validatedSendAmount =
        simpleSend && preflightResult.value != null
          ? BigNumber(preflightResult.value)
          : BigNumber(amount);
      const result = simpleSend
        ? await send(
            sourceCoin,
            activeAccount,
            recipientAddress,
            validatedSendAmount,
            channel,
            {...simpleSendParams, ...preflightResult},
          )
        : await sendConvertOrCrossChain(
            sourceCoin,
            activeAccount,
            channel,
            preflightResult,
          );
      if (result?.err || result?.error) {
        const rejection = new Error(
          result.result?.message || result.result || result.error?.message || 'Transaction failed.',
        );
        rejection.ambiguousBroadcast = result.ambiguousBroadcast;
        rejection.rejected = true;
        throw rejection;
      }

      // Block stale hold callbacks before context and navigation update.
      submitted.current = true;
      void refreshSourceBalance(sourceCoin, channel, activeAccount.accountHash);
      setTxResult(result?.result);
      navigation.reset({
        index: 0,
        routes: [{name: 'SendWizardSuccess'}],
      });
      void autoAddConversionAsset({
        activeAccount,
        channel,
        context: assetContext,
        recipientAddress,
        route,
        sourceCoin,
        target,
      });
    } catch (sendError) {
      if (sendError.ambiguousBroadcast) {
        broadcastUnknown.current = true;
        setBroadcastError(sendError.message || 'The transaction may have been sent. Check your transaction history before starting another send.');
      } else {
        // Electrum preserves an explicit rejection on the thrown error.
        const message = sendError.message || 'Transaction failed.';
        setError(
          sendError.rejected || sendError.ambiguousBroadcast === false
            ? getRejectionMessage(message)
            : message,
        );
      }
    } finally {
      dispatch(expireCoinData(sourceCoin.id, API_GET_BALANCES));
      dispatch(expireCoinData(sourceCoin.id, API_GET_TRANSACTIONS));
      dispatch(expireCoinData(sourceCoin.id, API_GET_FIATPRICE));
      submissionInFlight.current = false;
      setSending(false);
    }
  };

  const reviewResult = preflightResult || (feeKind && lastReview.current?.key === reviewKey ? lastReview.current.result : null);
  const displayEstimate = reviewResult?.estimate || estimate;
  const estimatedReceive = displayEstimate?.estimatedcurrencyout;
  const displayAmount =
    simpleSend && reviewResult?.value != null
      ? BigNumber(reviewResult.value)
      : reviewResult?.submittedsats && reviewResult?.output?.satoshis
      ? satsToCoins(BigNumber(reviewResult.output.satoshis))
      : BigNumber(amount || 0);
  const feeItems = useMemo(() => {
    if (!reviewResult) return [];

    const directFee =
      reviewResult.fee ??
      reviewResult.txfee ??
      reviewResult.networkfee;
    if (directFee != null) {
      const currencyId =
        reviewResult.feeCurr || sourceCoin?.currency_id || sourceCoin?.id;
      const display = getCurrencyDisplay(
        currencyId,
        reviewResult.feeCurr || sourceCoin?.display_ticker,
      );
      return [
        {
          amount: BigNumber(directFee).toFixed(),
          currencyId,
          currency: display.ticker,
        },
      ];
    }

    return Object.entries(reviewResult.validation?.fees || {})
      .filter(([, feeSats]) => BigNumber(feeSats).isGreaterThan(0))
      .map(([currencyId, feeSats]) => {
        const friendlyName = reviewResult.names?.get?.(currencyId);
        const display = getCurrencyDisplay(
          currencyId,
          /^0x0{40}$/i.test(currencyId) ? 'ETH' : friendlyName,
        );

        return {
          amount: satsToCoins(BigNumber(feeSats)).toFixed(),
          currencyId,
          currency: display.ticker,
        };
      });
  }, [reviewResult, sourceCoin]);
  const feeSummary = feeItems.length
    ? feeItems.map(item => `${item.amount} ${item.currency}`).join(' + ')
    : 'Calculated by wallet';
  const destinationNetwork = getDestinationNetwork(
    route,
    sourceCoin?.display_name,
  );
  const feeCurrencyId = feeKind === 'btc' ? 'BTC'
    : sourceCoin?.network === 'sepolia' ? 'GETH' : 'ETH';
  const feeTicker = feeKind === 'btc' ? 'BTC'
    : sourceCoin?.network === 'sepolia' ? 'gETH' : 'ETH';
  const likelyFee = preflightResult
    ? (feeKind === 'eth' ? preflightResult.likelyFee : preflightResult.fee)
    : previewNetworkFee(feeKind, networkFee.fee, reviewResult, networkFee.quote)?.likelyFee;
  const hasNetworkFee = Boolean(networkFee.fee && likelyFee != null);
  const feeMoney = formatFiat(likelyFee, feeCurrencyId);
  const feeSpeed = networkFee.quote?.tiers || networkFee.choice.id === 'custom'
    ? (networkFee.choice.id === 'custom' ? 'Custom fee' : FEE_TIERS.find(tier => tier.id === networkFee.choice.id)?.title) : null;
  const networkFeeRow = feeKind ? {
    amount: hasNetworkFee
      ? formatFeeAmount(likelyFee, feeTicker, feeKind === 'eth')
      : feeKind === 'btc' && !networkFee.fee ? 'Fee rates unavailable' : 'Fee unavailable',
    caption: hasNetworkFee ? [feeSpeed, feeMoney ? `≈ ${feeMoney}` : null].filter(Boolean).join(' · ') : null,
  } : null;
  const estimatedTime = feeKind && hasNetworkFee ? arrivalForFee(feeKind, networkFee.choice, networkFee.quote)
    : feeKind ? '—' : route?.isCrossChain
    ? '1-3 hours'
    : target?.isConversion
    ? '2-10 minutes'
    : '1-5 minutes';
  // Keep the exact preflight fee amounts and currency IDs for balance math.
  // Tickers alone are not currency identity (a token can share a system ticker).
  const sourceFees = feeItems.reduce(
    (total, item) =>
      [sourceCoin?.id, sourceCoin?.currency_id].includes(item.currencyId)
        ? total.plus(item.amount)
        : total,
    BigNumber(0),
  );
  const isSelfSend =
    simpleSend && isOwnChannelAddress({
      activeAccount, channel, recipientAddress, sourceCoin,
    });
  const balanceAfter = BigNumber(sourceBalance || 0)
    .minus(isSelfSend ? 0 : displayAmount)
    .minus(sourceFees);
  const submittedAmount = reviewResult?.submittedsats != null
    ? satsToCoins(BigNumber(reviewResult.submittedsats))
    : BigNumber(reviewResult?.amountSubmitted ?? amount ?? 0);
  const amountAdjustment = submittedAmount.isGreaterThan(displayAmount)
    ? `Reduced from ${truncateDecimal(submittedAmount, 8)} ${sourceCoin?.display_ticker || ''} to cover transaction fees.`
    : null;

  if (preflighting && (!feeKind || !reviewResult)) {
    const preparingReceive = Boolean(
      target?.isConversion && estimatedReceive != null,
    );

    return (
      <WizardScreen scroll={false}>
        <ConfirmPreparing
          amount={displayAmount}
          destinationNetwork={route?.isCrossChain ? destinationNetwork : null}
          isConversion={preparingReceive}
          networkFee={Boolean(feeKind)}
          recipient={recipientAddress}
          showPriceImpact={preparingReceive && Boolean(state.marketPrice)}
          sourceCoin={sourceCoin}
          target={target}
        />
        <WizardFooter
          disabled
          holdToConfirm
          loading
          loadingText="Preparing…"
          onPress={() => {}}>
          Hold to confirm & send
        </WizardFooter>
      </WizardScreen>
    );
  }

  if (error && !preflightResult && !feeKind) {
    return (
      <WizardScreen scroll={false}>
        <View style={styles.centeredState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.danger} />
          <Text style={[styles.stateTitle, {color: theme.colors.textPrimary}]}>Couldn’t prepare transaction</Text>
          <Text style={[styles.stateBody, {color: theme.colors.textSecondary}]}>{error}</Text>
        </View>
        <WizardFooter onPress={() => navigation.goBack()}>Go Back</WizardFooter>
      </WizardScreen>
    );
  }

  const showReceive = Boolean(target?.isConversion && estimatedReceive != null);
  const {impact, level, lossText, unitPrice} = showReceive
    ? getConversionPriceSummary({
        amount: displayAmount,
        displayCurrency,
        marketPrice: state.marketPrice,
        output: estimatedReceive,
        rate: getRate(sourceCoin?.id),
        targetTicker: target?.ticker || '',
      })
    : {};
  const connectorLines = [
    unitPrice
      ? `1 ${sourceCoin?.display_ticker || ''} = ${formatUnitPrice(unitPrice)} ${target?.ticker || ''}`
      : null,
    route?.via ? `via ${route.viaFqn || route.via}` : null,
  ].filter(Boolean);
  // Notices and errors stay above Hold to confirm. On a short screen they would
  // otherwise sit below the fold, out of sight when the user holds.
  const pinnedMessage = state.broadcastError || error;
  const needsFeeRetry = Boolean(feeKind && networkFee.error && !networkFee.fee &&
    !state.broadcastError && !state.txResult);

  return (
    <WizardScreen scroll={false}>
      <FadedScrollView
        containerStyle={styles.scrollViewport}
        contentContainerStyle={styles.content}
        fadeBackgroundColor={theme.colors.background}>
        <TransferNode
          amount={truncateDecimal(displayAmount, 8)}
          coinId={sourceCoin?.id}
          fiat={formatFiat(displayAmount, sourceCoin?.id)}
          label={showReceive ? 'You pay' : 'You send'}
          ticker={sourceCoin?.display_ticker || ''}
        />
        {showReceive ? (
          <>
            {connectorLines.length ? (
              <TransferConnector>{connectorLines}</TransferConnector>
            ) : null}
            <TransferNode
              amount={`≈ ${formatEstimatedAmount(estimatedReceive)}`}
              coinId={target.coinId || target.id}
              fiat={formatFiat(estimatedReceive, target.coinId || target.id)}
              label="You receive"
              ticker={target.ticker}
            />
          </>
        ) : null}
        {amountAdjustment ? (
          <Text style={[theme.typography.caption, styles.adjustment, {color: theme.colors.textSecondary}]}>
            {amountAdjustment}
          </Text>
        ) : null}
        <ConfirmFacts
          arrives={estimatedTime}
          destinationNetwork={route?.isCrossChain ? destinationNetwork : null}
          fees={feeSummary}
          networkFee={networkFeeRow}
          feeLoading={Boolean(feeKind && (preflighting || networkFee.loading))}
          impact={impact ? {impact, level, lossText} : null}
          onOpenFees={feeKind && (sending || state.broadcastError || state.txResult || !networkFee.canChoose) ? undefined : () => setFeeSheetOpen(true)}
          recipient={recipientAddress}
        />
      </FadedScrollView>
      <WizardFooter
        above={
          pinnedMessage || warnings.length ? (
            <View style={styles.pinnedNotices}>
              {warnings.map(message => (
                <ConfirmNotice key={message}>{message}</ConfirmNotice>
              ))}
              <ErrorMessage style={styles.pinnedError}>
                {pinnedMessage}
              </ErrorMessage>
            </View>
          ) : null
        }
        disabled={
          (!needsFeeRetry && (!preflightResult || preparedParams.current !== simpleSendParams)) ||
          preflighting ||
          networkFee.loading ||
          submitted.current ||
          Boolean(state.txResult) ||
          Boolean(state.broadcastError)
        }
        holdToConfirm={!needsFeeRetry}
        loading={sending || preflighting || networkFee.loading}
        holdingText="Hold to confirm..."
        loadingText={preflighting || networkFee.loading ? "Preparing…" : "Sending..."}
        onPress={needsFeeRetry ? retryNetworkFee : submit}>
        {state.broadcastError ? 'Status unknown' : needsFeeRetry ? 'Try again' : 'Hold to confirm & send'}
      </WizardFooter>
      {feeKind ? (
        <NetworkFeeSheet
          visible={feeSheetOpen}
          onClose={() => setFeeSheetOpen(false)}
          onChoose={changeNetworkFee}
          kind={feeKind}
          quote={networkFee.quote}
          choice={networkFee.choice}
          review={reviewResult}
          confirmedReview={preflightResult}
          maximum={maxBTCFeeRate(sourceCoin)}
          ticker={feeTicker}
          formatFiat={fee => formatFiat(fee, feeCurrencyId)}
        />
      ) : <FeeBreakdownSheet feeItems={feeItems} onClose={() => setFeeSheetOpen(false)} visible={feeSheetOpen} />}
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  scrollViewport: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 20},
  adjustment: {marginTop: 8},
  pinnedNotices: {marginBottom: 4},
  pinnedError: {marginHorizontal: 0, marginVertical: 0, marginBottom: 8},
  centeredState: {flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center'},
  stateTitle: {fontSize: 20, lineHeight: 26, textAlign: 'center', marginTop: 18, ...fontStyle('bold')},
  stateBody: {fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
});

export default SendWizardConfirm;
