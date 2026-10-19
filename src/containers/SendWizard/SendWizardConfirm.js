import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
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
import SkeletonLoader, {SkeletonSection} from '../../components/SkeletonLoader';
import FeeBreakdownSheet from './components/FeeBreakdownSheet';
import TransferDetailsSheet from './components/TransferDetailsSheet';
import {
  TransferConnector,
  TransferNode,
} from './components/TransferSummary';
import ConfirmFacts, {ConfirmNotice} from './components/ConfirmFacts';
import {
  formatEstimatedAmount,
  formatUnitPrice,
  getConversionPriceSummary,
} from './components/impactFormat';
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
  isLongRecipient,
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
  const [detailsOpen, setDetailsOpen] = useState(false);
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
  const simpleSendParams = useMemo(() => {
    const verificationLevel = coinSettings?.[sourceCoin?.id]?.verificationLvl;
    const network =
      networks[toLowerCaseCLocale(sourceCoin?.id || '')] || networks.default;

    return {
      defaultFee: sourceCoin?.fee,
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
  }, [coinSettings, sourceCoin]);

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
      return undefined;
    }

    let active = true;
    setPreflighting(true);
    setError(null);
    setWarnings([]);
    setPreflight(null);

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

        if (!active) return;
        if (result?.err || result?.error) {
          throw new Error(result.result || result.error?.message || 'Preflight failed.');
        }
        const preflight = result?.result;
        const nextWarnings = [];

        if (preflight?.converterdef?.proofprotocol === 2) {
          nextWarnings.push(
            'This conversion involves a centrally controlled currency. Verify the issuer and route.',
          );
        }

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
        setPreflight(preflight);
      } catch (preflightError) {
        if (active) setError(preflightError.message || 'Preflight failed.');
      } finally {
        if (active) setPreflighting(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [
    activeAccount,
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

  const submit = async () => {
    if (
      !preflightResult ||
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

  const displayEstimate = preflightResult?.estimate || estimate;
  const estimatedReceive = displayEstimate?.estimatedcurrencyout;
  const displayAmount =
    simpleSend && preflightResult?.value != null
      ? BigNumber(preflightResult.value)
      : preflightResult?.submittedsats && preflightResult?.output?.satoshis
      ? satsToCoins(BigNumber(preflightResult.output.satoshis))
      : BigNumber(amount || 0);
  const feeItems = useMemo(() => {
    if (!preflightResult) return [];

    const directFee =
      preflightResult.fee ??
      preflightResult.txfee ??
      preflightResult.networkfee;
    if (directFee != null) {
      const currencyId =
        preflightResult.feeCurr || sourceCoin?.currency_id || sourceCoin?.id;
      const display = getCurrencyDisplay(
        currencyId,
        preflightResult.feeCurr || sourceCoin?.display_ticker,
      );
      return [
        {
          amount: BigNumber(directFee).toFixed(),
          currencyId,
          currency: display.ticker,
        },
      ];
    }

    return Object.entries(preflightResult.validation?.fees || {})
      .filter(([, feeSats]) => BigNumber(feeSats).isGreaterThan(0))
      .map(([currencyId, feeSats]) => {
        const friendlyName = preflightResult.names?.get?.(currencyId);
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
  }, [preflightResult, sourceCoin]);
  const feeSummary = feeItems.length
    ? feeItems.map(item => `${item.amount} ${item.currency}`).join(' + ')
    : 'Calculated by wallet';
  const destinationNetwork = getDestinationNetwork(
    route,
    sourceCoin?.display_name,
  );
  const estimatedTime = route?.isCrossChain
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
  const submittedAmount = preflightResult?.submittedsats != null
    ? satsToCoins(BigNumber(preflightResult.submittedsats))
    : BigNumber(preflightResult?.amountSubmitted ?? amount ?? 0);
  const amountAdjustment = submittedAmount.isGreaterThan(displayAmount)
    ? `Reduced from ${truncateDecimal(submittedAmount, 8)} ${sourceCoin?.display_ticker || ''} to cover transaction fees.`
    : null;

  if (preflighting) {
    return (
      <WizardScreen scroll={false}>
        <View style={styles.centeredState}>
          <SkeletonLoader accessibilityLabel="Preparing transaction" style={styles.preparingSkeleton}>
            <SkeletonSection rows={3} titleWidth="36%" />
          </SkeletonLoader>
          <Text style={[styles.stateTitle, {color: theme.colors.textPrimary}]}>Preparing transaction…</Text>
          <Text style={[styles.stateBody, {color: theme.colors.textSecondary}]}>Checking route, fees, and destination</Text>
        </View>
      </WizardScreen>
    );
  }

  if (error && !preflightResult) {
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
  // A conversion names the recipient in its receive line. Every other review
  // lists the full recipient, and so does a conversion to a long address.
  const showRecipientRow = !showReceive || isLongRecipient(recipientAddress);
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
  const connectorText = [
    unitPrice
      ? `1 ${sourceCoin?.display_ticker || ''} = ${formatUnitPrice(unitPrice)} ${target?.ticker || ''}`
      : null,
    route?.via ? `via ${route.viaFqn || route.via}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const detailRows = [
    {label: 'To', value: recipientAddress},
    route?.isCrossChain
      ? {label: 'Destination network', value: destinationNetwork}
      : null,
    route?.via ? {label: 'Route', value: getRouteName(route)} : null,
    {
      label: 'From',
      value: `${sourceCoin?.display_name || ''} · ${sourceSubWallet?.name || ''}`,
    },
    {
      label: 'Balance after',
      value: `${truncateDecimal(balanceAfter, 8)} ${sourceCoin?.display_ticker || ''}`,
    },
  ].filter(Boolean);

  return (
    <WizardScreen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <TransferNode
          amount={truncateDecimal(displayAmount, 8)}
          coinId={sourceCoin?.id}
          fiat={formatFiat(displayAmount, sourceCoin?.id)}
          label={showReceive ? 'You pay' : 'You send'}
          ticker={sourceCoin?.display_ticker || ''}
        />
        {showReceive ? (
          <>
            {connectorText ? (
              <TransferConnector>{connectorText}</TransferConnector>
            ) : null}
            <TransferNode
              amount={`≈ ${formatEstimatedAmount(estimatedReceive)}`}
              coinId={target.coinId || target.id}
              fiat={formatFiat(estimatedReceive, target.coinId || target.id)}
              name={recipientAddress}
              suffix="receives"
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
          impact={impact ? {impact, level, lossText} : null}
          hasRoute={Boolean(route?.via)}
          onOpenDetails={() => setDetailsOpen(true)}
          onOpenFees={() => setFeeSheetOpen(true)}
          recipient={recipientAddress}
          showRecipient={showRecipientRow}
        />
        {warnings.map(message => (
          <ConfirmNotice key={message}>{message}</ConfirmNotice>
        ))}
        <ErrorMessage>{state.broadcastError || error}</ErrorMessage>
      </ScrollView>
      <WizardFooter
        disabled={
          !preflightResult ||
          submitted.current ||
          Boolean(state.txResult) ||
          Boolean(state.broadcastError)
        }
        holdToConfirm
        loading={sending}
        holdingText="Hold to confirm..."
        loadingText="Sending..."
        onPress={submit}>
        {state.broadcastError ? 'Status unknown' : 'Hold to confirm & send'}
      </WizardFooter>
      <FeeBreakdownSheet feeItems={feeItems} onClose={() => setFeeSheetOpen(false)} visible={feeSheetOpen} />
      <TransferDetailsSheet onClose={() => setDetailsOpen(false)} rows={detailRows} visible={detailsOpen} />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  content: {paddingHorizontal: 16, paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 20},
  adjustment: {marginTop: 8},
  centeredState: {flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center'},
  preparingSkeleton: {width: '100%', marginBottom: 24},
  stateTitle: {fontSize: 20, lineHeight: 26, textAlign: 'center', marginTop: 18, ...fontStyle('bold')},
  stateBody: {fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
});

export default SendWizardConfirm;
