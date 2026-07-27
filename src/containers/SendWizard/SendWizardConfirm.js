import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import BottomSheetModal from '../../components/BottomSheetModal';
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
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_TRANSACTIONS,
} from '../../utils/constants/intervalConstants';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {
  I_ADDRESS_VERSION,
  MID_VERIFICATION,
  NO_VERIFICATION,
  R_ADDRESS_VERSION,
} from '../../utils/constants/constants';
import {useSendWizard} from './SendWizardContext';
import {
  ErrorMessage,
  WizardFooter,
  WizardHeading,
  WizardScreen,
} from './components/WizardUI';
import {getCurrencyDisplay} from './wizardUtils';

const formatFeeAmount = value => {
  const amount = BigNumber(value || 0);

  if (amount.isLessThan(0.0001)) return amount.decimalPlaces(8).toString();
  if (amount.isLessThan(0.01)) return amount.decimalPlaces(6).toString();
  return amount.decimalPlaces(4).toString();
};

const SendWizardConfirm = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {state, setPreflight, setTxResult} = useSendWizard();
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
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [feeSheetOpen, setFeeSheetOpen] = useState(false);

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
      ...(route?.mapTo ? {mapto: route.mapTo} : {}),
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

        if (preflight?.submittedsats && preflight?.output?.satoshis) {
          const submitted = BigNumber(preflight.submittedsats);
          const actual = BigNumber(preflight.output.satoshis);
          if (!submitted.isEqualTo(actual)) {
            nextWarnings.push(
              `The send amount was adjusted from ${satsToCoins(submitted).toString()} to ${satsToCoins(actual).toString()} to pay transaction fees.`,
            );
          }
        } else if (simpleSend && preflight?.value != null) {
          const submitted = BigNumber(preflight.amountSubmitted ?? amount);
          const actual = BigNumber(preflight.value);
          if (
            submitted.isFinite() &&
            actual.isFinite() &&
            !submitted.isEqualTo(actual)
          ) {
            nextWarnings.push(
              `The send amount was adjusted from ${submitted.toString()} to ${actual.toString()} to pay transaction fees.`,
            );
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
    if (!preflightResult || sending) return;
    setSending(true);
    setError(null);
    try {
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
        throw new Error(result.result || result.error?.message || 'Transaction failed.');
      }

      dispatch(expireCoinData(sourceCoin.id, API_GET_BALANCES));
      dispatch(expireCoinData(sourceCoin.id, API_GET_TRANSACTIONS));
      dispatch(expireCoinData(sourceCoin.id, API_GET_FIATPRICE));
      setTxResult(result?.result);
      navigation.navigate('SendWizardSuccess');
    } catch (sendError) {
      setError(sendError.message || 'Transaction failed.');
    } finally {
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
      preflightResult.fee ||
      preflightResult.txfee ||
      preflightResult.networkfee;
    if (directFee != null) {
      const currencyId =
        preflightResult.feeCurr || sourceCoin?.id || sourceCoin?.currency_id;
      const display = getCurrencyDisplay(
        currencyId,
        preflightResult.feeCurr || sourceCoin?.display_ticker,
      );
      return [
        {
          amount: formatFeeAmount(directFee),
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
          amount: formatFeeAmount(satsToCoins(BigNumber(feeSats))),
          currency: display.ticker,
        };
      });
  }, [preflightResult, sourceCoin]);
  const feeSummary = feeItems.length
    ? feeItems.map(item => `${item.amount} ${item.currency}`).join(' + ')
    : 'Calculated by wallet';
  const destinationNetwork =
    route?.exportToFqn || route?.exportTo || sourceCoin?.display_name || '';
  const estimatedTime = route?.isCrossChain
    ? '1-3 hours'
    : target?.isConversion
    ? '2-10 minutes'
    : '1-5 minutes';
  const detailRows = [
    ['To', recipientAddress],
    ...(route?.isCrossChain
      ? [['Destination network', destinationNetwork]]
      : []),
    [
      route?.via ? 'Route' : 'Estimated time',
      route?.via
        ? `${route.viaFqn || route.via} · ${estimatedTime}`
        : estimatedTime,
    ],
  ];
  const balanceAfter = BigNumber(sourceBalance || 0).minus(displayAmount);

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

  return (
    <WizardScreen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <WizardHeading
          style={styles.headingInset}
          subtitle="Review your transaction">
          Confirm
        </WizardHeading>
        <View style={[styles.amountSection, {backgroundColor: theme.colors.surfaceMuted}]}>
          <View style={styles.amountBlock}>
            <Text style={[styles.amountLabel, {color: theme.colors.textSecondary}]}>YOU’RE SENDING</Text>
            <View style={styles.amountRow}>
              <AssetCoinLogo coinId={sourceCoin?.id} size={28} />
              <View style={styles.amountCopy}>
                <View style={styles.amountValueRow}>
                  <Text style={[styles.amountValue, {color: theme.colors.textPrimary}]}>{truncateDecimal(displayAmount, 8)}</Text>
                  <Text style={[styles.amountTicker, {color: theme.colors.textSecondary}]}>{sourceCoin?.display_ticker || ''}</Text>
                </View>
              </View>
            </View>
          </View>
          {target?.isConversion && estimatedReceive != null ? (
            <>
              <View style={styles.conversionDivider}>
                <View style={[styles.dividerLine, {backgroundColor: theme.colors.border}]} />
                <View style={[styles.arrowCircle, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
                  <MaterialCommunityIcons name="arrow-down" size={16} color={theme.colors.textSecondary} />
                </View>
                <View style={[styles.dividerLine, {backgroundColor: theme.colors.border}]} />
              </View>
              <View style={styles.amountBlock}>
                <View style={styles.estimateBadge}>
                  <Text style={[styles.estimateBadgeText, {color: theme.colors.primary}]}>Estimated</Text>
                  <MaterialCommunityIcons name="information-outline" size={14} color={theme.colors.primary} />
                </View>
                <Text style={[styles.amountLabel, {color: theme.colors.textSecondary}]}>THEY RECEIVE</Text>
                <View style={styles.amountRow}>
                  <AssetCoinLogo coinId={target.coinId || target.id} size={28} />
                  <View style={styles.amountCopy}>
                    <View style={styles.amountValueRow}>
                      <Text style={[styles.amountValue, {color: theme.colors.textPrimary}]}>{truncateDecimal(BigNumber(estimatedReceive), 8)}</Text>
                      <Text style={[styles.amountTicker, {color: theme.colors.textSecondary}]}>{target.ticker}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </View>
        <View style={[styles.detailsCard, {backgroundColor: theme.colors.surfaceRaised}]}>
          {detailRows.map(([label, value]) => (
            <View key={label} style={[styles.detailRow, {borderBottomColor: theme.colors.border}]}>
              <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>{label}</Text>
              <Text numberOfLines={2} style={[styles.detailValue, {color: theme.colors.textPrimary}]}>{value}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setFeeSheetOpen(true)}
            style={[styles.detailRow, {borderBottomColor: theme.colors.border}]}>
            <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>Fees</Text>
            <View style={styles.infoValue}>
              <View style={styles.feeValueContainer}>
                <Text numberOfLines={1} style={[styles.detailValue, {color: theme.colors.textPrimary}]}>{feeSummary}</Text>
                <Text style={[styles.feeHint, {color: theme.colors.textSubtle}]}>Tap for details</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} style={styles.infoIcon} />
            </View>
          </TouchableOpacity>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>From</Text>
            <Text numberOfLines={2} style={[styles.detailValue, {color: theme.colors.textPrimary}]}>{`${sourceCoin?.display_name || ''} · ${sourceSubWallet?.name || ''}`}</Text>
          </View>
        </View>
        <Text style={[styles.balanceAfter, {color: theme.colors.textSubtle}]}>Balance after: {truncateDecimal(balanceAfter, 8)} {sourceCoin?.display_ticker}</Text>
        {warnings.map(message => (
          <View key={message} style={[styles.warning, {backgroundColor: theme.colors.surfaceMuted}]}>
            <Text style={[styles.warningText, {color: theme.colors.warning}]}>{message}</Text>
          </View>
        ))}
        <ErrorMessage>{error}</ErrorMessage>
      </ScrollView>
      <WizardFooter
        disabled={!preflightResult}
        holdToConfirm
        loading={sending}
        holdingText="Hold to confirm..."
        loadingText="Sending..."
        onPress={submit}>
        Hold to confirm &amp; send
      </WizardFooter>
      <BottomSheetModal floating={false} maxHeight="45%" onClose={() => setFeeSheetOpen(false)} visible={feeSheetOpen}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, {color: theme.colors.textPrimary}]}>Fee breakdown</Text>
          <TouchableOpacity onPress={() => setFeeSheetOpen(false)} style={[styles.sheetClose, {backgroundColor: theme.colors.surfaceMuted}]}>
            <MaterialCommunityIcons name="close" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.feeBreakdown}>
          {(feeItems.length ? feeItems : [{amount: 'Calculated by wallet', currency: ''}]).map(
            (item, index) => (
              <View
                key={`${item.amount}:${item.currency}:${index}`}
                style={[
                  styles.feeBreakdownRow,
                  {borderBottomColor: theme.colors.border},
                  index === Math.max(feeItems.length, 1) - 1 &&
                    styles.feeBreakdownRowLast,
                ]}>
                <Text style={[styles.feeBreakdownLabel, {color: theme.colors.textSecondary}]}>Network fee</Text>
                <Text style={[styles.feeBreakdownValue, {color: theme.colors.textPrimary}]}>{`${item.amount}${item.currency ? ` ${item.currency}` : ''}`}</Text>
              </View>
            ),
          )}
        </View>
        <Text style={[styles.sheetBody, {color: theme.colors.textSecondary}]}>Fees are calculated by the selected Verus Card and route during preflight.</Text>
      </BottomSheetModal>
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  content: {paddingHorizontal: 16, paddingBottom: 20},
  headingInset: {marginHorizontal: -16},
  amountSection: {borderRadius: 12, padding: 16, marginBottom: 16},
  amountBlock: {paddingVertical: 4, position: 'relative'},
  amountLabel: {fontSize: 11, lineHeight: 15, marginBottom: 6, letterSpacing: 0.3, ...fontStyle('medium')},
  amountRow: {flexDirection: 'row', alignItems: 'center'},
  amountCopy: {flex: 1, marginLeft: 10},
  amountValueRow: {flexDirection: 'row', alignItems: 'baseline'},
  amountValue: {fontSize: 22, lineHeight: 28, ...fontStyle('bold')},
  amountTicker: {fontSize: 14, lineHeight: 19, marginLeft: 6, ...fontStyle('semiBold')},
  conversionDivider: {flexDirection: 'row', alignItems: 'center', marginVertical: 12},
  dividerLine: {flex: 1, height: StyleSheet.hairlineWidth},
  arrowCircle: {width: 28, height: 28, borderRadius: 14, borderWidth: 1, marginHorizontal: 12, alignItems: 'center', justifyContent: 'center'},
  estimateBadge: {position: 'absolute', top: -8, right: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(49, 101, 212, 0.35)', flexDirection: 'row', alignItems: 'center'},
  estimateBadgeText: {fontSize: 11, lineHeight: 15, marginRight: 4, ...fontStyle('semiBold')},
  detailsCard: {borderRadius: 12, paddingHorizontal: 16, marginBottom: 16},
  detailRow: {minHeight: 44, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  detailRowLast: {borderBottomWidth: 0},
  detailLabel: {fontSize: 14, lineHeight: 19, ...fontStyle('regular')},
  detailValue: {maxWidth: '60%', textAlign: 'right', fontSize: 14, lineHeight: 19, ...fontStyle('semiBold')},
  infoValue: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'},
  infoIcon: {marginLeft: 6},
  feeValueContainer: {maxWidth: '72%', alignItems: 'flex-end'},
  feeHint: {fontSize: 12, lineHeight: 16, marginTop: 2, ...fontStyle('regular')},
  balanceAfter: {fontSize: 13, lineHeight: 18, textAlign: 'center', ...fontStyle('regular')},
  centeredState: {flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center'},
  preparingSkeleton: {width: '100%', marginBottom: 24},
  stateTitle: {fontSize: 20, lineHeight: 26, textAlign: 'center', marginTop: 18, ...fontStyle('bold')},
  stateBody: {fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
  warning: {borderRadius: 10, padding: 10, marginBottom: 8},
  warningText: {fontSize: 13, lineHeight: 19, ...fontStyle('regular')},
  sheetHeader: {minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center'},
  sheetTitle: {flex: 1, fontSize: 20, lineHeight: 26, ...fontStyle('bold')},
  sheetClose: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  feeBreakdown: {marginHorizontal: 20, marginBottom: 16},
  feeBreakdownRow: {minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  feeBreakdownRowLast: {borderBottomWidth: 0},
  feeBreakdownLabel: {fontSize: 14, lineHeight: 20, ...fontStyle('regular')},
  feeBreakdownValue: {maxWidth: '60%', textAlign: 'right', fontSize: 14, lineHeight: 20, ...fontStyle('semiBold')},
  sheetBody: {paddingHorizontal: 20, paddingBottom: 32, fontSize: 15, lineHeight: 22, ...fontStyle('regular')},
});

export default SendWizardConfirm;
