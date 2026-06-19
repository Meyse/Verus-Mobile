/*
  ConfirmPayStep (Step 4 / final step)
  - 2026-02-05: Created. Replaces IdentityUpdatePaymentConfiguration and the
    UpdateIdentity SendModal (Form/Confirm/Result).
  - 2026-06-18: Payment source selection is driven by the primary action. The
    selected source is shown only in the footer, and the source sheet uses
    iconless filled rows.
  - 2026-03-11: Tightened fee validation and post-broadcast error handling .
*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { formatCurrency } from 'react-native-format-currency';
import { Check } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import AnimatedSuccessCheckmark from '../../../../components/AnimatedSuccessCheckmark';
import AppButton from '../../../../components/AppButton';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import CopyAction from '../../../../components/CopyAction';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import { useOnboardingTheme } from '../../../../theme/onboarding';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { createUpdateIdentityTx, pushUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { requestPrivKey } from '../../../../utils/auth/authBox';
import { satsToCoins, truncateDecimal } from '../../../../utils/math';
import { API_GET_BALANCES, API_SEND, GENERAL, WYRE_SERVICE, USD } from '../../../../utils/constants/intervalConstants';
import { GENERIC_REQUEST_DELIVERY_TYPES } from '../../../../utils/deeplink/genericRequestDelivery';
import BigNumber from 'bignumber.js';
import {
  CompactAddressObject,
  GenericResponse,
  IdentityUpdateResponseDetails,
  IdentityUpdateResponseOrdinalVDXFObject,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import { processEncryptedKeys } from '../../../../utils/crypto/encryptCredentials';
import { confirmPayStepStyles as createConfirmPayStepStyles } from '../../../../styles';

const IDENTITY_UPDATE_COMPLETION_SHEET_HEIGHT = 360;
const COMPLETION_SHEET_STAGE = {
  IDLE: 'idle',
  BROADCASTING: 'broadcasting',
  READY: 'ready',
  DELIVERING: 'delivering',
  SUCCESS: 'success',
  ERROR: 'error',
};

const truncateAddress = value => {
  if (!value) return '';
  const text = String(value);
  if (text.includes('...') || text.length <= 15) return text;
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
};

const truncateTxid = value => {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 23) return text;
  return `${text.slice(0, 10)}...${text.slice(-10)}`;
};

const getSourceAddress = source => source?.wallet?.channel?.split('.')?.[1];

const isAddressLikeSourceName = value => {
  if (!value) return false;

  const text = String(value);
  if (text.includes('@')) return false;
  if (text.includes('...')) return true;

  return /^[A-Za-z0-9]{20,}$/.test(text);
};

const getSourceDisplayName = source => {
  if (!source) return '';

  const displayName =
    source.wallet?.name ||
    source.wallet?.id ||
    getSourceAddress(source) ||
    'Wallet';

  return isAddressLikeSourceName(displayName)
    ? truncateAddress(displayName)
    : displayName;
};

const getDeliveryTitle = deliveryInfo => {
  const destination = deliveryInfo?.destinationHost || 'the requester';

  if (deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT) {
    return `Returning to ${destination}`;
  }

  if (deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
    return 'Sending response';
  }

  return 'Completing request';
};

const getDeliveryErrorMessage = (error, deliveryInfo) => {
  if (error?.isResponsePostError) {
    return `We couldn't send the response to ${
      deliveryInfo?.destinationHost || 'the requester'
    }.`;
  }

  return error?.message || 'Verus Mobile could not complete this request.';
};

const ConfirmPayStep = ({
  details,
  requestIsTestnet,
  subjectIdentity,
  subjectIdTxHex,
  updateIdTxHex,
  friendlyNames,
  coinObj,
  responseBufferString,
  detailIndex,
  deliverIdentityUpdateResponse,
  identityUpdateDeliveryInfo,
  completeIdentityUpdateWithoutDelivery,
  next,
  cancel,
  highRiskCount,
  contentCount,
  hasEncryptedKeys,
  onBroadcastingChange,
  styles: parentStyles,
}) => {
  const theme = useOnboardingTheme();
  const localStyles = useMemo(
    () => createConfirmPayStepStyles(theme),
    [theme],
  );
  const [selectedSource, setSelectedSource] = useState(null);
  const [fee, setFee] = useState(null);
  const [feeCurrency, setFeeCurrency] = useState(null);
  const [txHex, setTxHex] = useState(null);
  const [utxos, setUtxos] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [completionSheetStage, setCompletionSheetStage] = useState(
    COMPLETION_SHEET_STAGE.IDLE,
  );
  const [broadcastTxid, setBroadcastTxid] = useState(null);
  const [pendingResponse, setPendingResponse] = useState(null);
  const [completionError, setCompletionError] = useState(null);
  const [completionDeliveryInfo, setCompletionDeliveryInfo] = useState(null);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  const feeCalculationIdRef = useRef(0);
  const mountedRef = useRef(true);

  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const allBalances = useObjectSelector(state => state.ledger.balances);

  const signerIdentityAddress = subjectIdentity.identity
    ? subjectIdentity.identity.identityaddress
    : subjectIdentity.identityaddress;

  const requestedCurrency = useMemo(() => {
    if (details.containsSystem()) return details.systemID.toAddress();
    return requestIsTestnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id;
  }, [details, requestIsTestnet]);

  const feeCurrencyDisplay = useMemo(() => {
    if (!feeCurrency) return '';
    if (friendlyNames[feeCurrency]) return friendlyNames[feeCurrency].replace('@', '');
    return feeCurrency;
  }, [feeCurrency, friendlyNames]);

  const hasFee = fee != null && !calculating;

  // --- Fiat fee display ---
  const rates = useObjectSelector(state => state.ledger.rates);
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );

  const feeFiatDisplay = useMemo(() => {
    if (!fee || !feeCurrency) return null;

    // Find the coin ID for the fee currency to look up rate
    let feeCoinId = null;
    try {
      const coin = CoinDirectory.findCoinObj(feeCurrency);
      if (coin) feeCoinId = coin.id;
    } catch (e) {}

    if (!feeCoinId) return null;

    const rate = rates?.[WYRE_SERVICE]?.[feeCoinId]?.[displayCurrency] != null
      ? rates[WYRE_SERVICE][feeCoinId][displayCurrency]
      : rates?.[GENERAL]?.[feeCoinId]?.[displayCurrency] != null
        ? rates[GENERAL][feeCoinId][displayCurrency]
        : null;

    if (!rate) return null;

    try {
      const fiatValue = BigNumber(fee).multipliedBy(BigNumber(rate));
      if (fiatValue.isNaN() || !fiatValue.isFinite()) return null;
      const [formatted] = formatCurrency({
        amount: fiatValue.decimalPlaces(2, BigNumber.ROUND_HALF_UP).toNumber(),
        code: displayCurrency,
      });
      return formatted;
    } catch (e) {
      return null;
    }
  }, [fee, feeCurrency, rates, displayCurrency]);

  useEffect(() => {
    if (typeof onBroadcastingChange === 'function') {
      onBroadcastingChange(
        completionSheetStage !== COMPLETION_SHEET_STAGE.IDLE,
      );
    }
  }, [completionSheetStage, onBroadcastingChange]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      feeCalculationIdRef.current += 1;
    },
    [],
  );

  useEffect(
    () => () => {
      if (typeof onBroadcastingChange === 'function') {
        onBroadcastingChange(false);
      }
    },
    [onBroadcastingChange],
  );

  // --- Build available payment sources ---
  const paymentSources = useMemo(() => {
    const sources = [];

    for (const cObj of activeCoinsForUser) {
      if (cObj.currency_id !== requestedCurrency) continue;

      const chainTicker = cObj.id;
      const subWallets = allSubWallets[chainTicker] || [];

      for (const wallet of subWallets) {
        if (!wallet.network) continue;

        // Get balance for this wallet
        const balanceChannel = wallet.api_channels?.[API_GET_BALANCES];
        const balanceData = balanceChannel && allBalances[balanceChannel]?.[chainTicker];
        const balance = balanceData?.total != null ? BigNumber(balanceData.total) : BigNumber(0);

        if (balance.isGreaterThan(0)) {
          sources.push({
            coinObj: cObj,
            wallet,
            balance,
            balanceDisplay: truncateDecimal(balance, 4),
          });
        }
      }
    }

    return sources;
  }, [activeCoinsForUser, allSubWallets, allBalances, requestedCurrency]);

  // --- Handlers ---

  const handleSelectSource = useCallback(async (source) => {
    const calculationId = feeCalculationIdRef.current + 1;
    feeCalculationIdRef.current = calculationId;

    setSourceSheetVisible(false);
    setSelectedSource(source);
    setCalculating(true);
    setFee(null);
    setFeeCurrency(null);
    setTxHex(null);
    setUtxos(null);

    try {
      const [, address, systemId] = source.wallet.channel.split('.');

      // If request contains encrypted credential keys, encrypt them before
      // creating the tx so plaintext credentials are never sent to the server.
      let effectiveDetails = details;
      if (hasEncryptedKeys) {
        effectiveDetails = await processEncryptedKeys(
          systemId,
          details,
          subjectIdentity,
          coinObj,
        );
      }

      const updateIdentityTx = await createUpdateIdentityTx(
        systemId,
        effectiveDetails,
        address,
        subjectIdTxHex,
        subjectIdentity.blockheight,
        true,
        undefined,
        requestIsTestnet,
      );

      if (updateIdentityTx.deltas.size !== 1) throw new Error('Unknown fees');

      const feeObj = Object.fromEntries(updateIdentityTx.deltas.entries());
      const currency = Object.keys(feeObj)[0];
      if (currency !== requestedCurrency) {
        throw new Error('Unexpected fee currency');
      }

      if (
        !mountedRef.current ||
        calculationId !== feeCalculationIdRef.current
      ) {
        return;
      }

      setSelectedSource(source);
      setFee(satsToCoins(BigNumber(updateIdentityTx.deltas.get(currency).abs().toString())).toString());
      setFeeCurrency(currency);
      setTxHex(updateIdentityTx.hex);
      setUtxos(updateIdentityTx.utxos);
    } catch (e) {
      if (
        !mountedRef.current ||
        calculationId !== feeCalculationIdRef.current
      ) {
        return;
      }

      setSelectedSource(null);
      setTxHex(null);
      setUtxos(null);
      Alert.alert('Error', e.message || 'Failed to calculate fee');
    } finally {
      if (
        mountedRef.current &&
        calculationId === feeCalculationIdRef.current
      ) {
        setCalculating(false);
      }
    }
  }, [
    coinObj,
    details,
    hasEncryptedKeys,
    requestedCurrency,
    requestIsTestnet,
    subjectIdTxHex,
    subjectIdentity,
  ]);

  const handleUpdate = useCallback(async () => {
    if (typeof onBroadcastingChange === 'function') {
      onBroadcastingChange(true);
    }
    setBroadcastTxid(null);
    setPendingResponse(null);
    setCompletionError(null);
    setCompletionDeliveryInfo(null);
    setCompletionSheetStage(COMPLETION_SHEET_STAGE.BROADCASTING);
    let resultTxid = null;

    try {
      const { wallet, coinObj: sourceCoinObj } = selectedSource;
      const [channelName, , systemId] = wallet.api_channels[API_SEND].split('.');

      const spendingKey = await requestPrivKey(sourceCoinObj.id, channelName);

      const keys = [];
      for (let i = 0; i < utxos.length; i++) {
        keys.push([spendingKey]);
      }

      const result = await pushUpdateIdentityTx(systemId, txHex, utxos, keys);

      if (result.error) throw new Error(result.error.message);

      resultTxid = result.result;

      // Build response (mirrored from IdentityUpdatePaymentConfiguration)
      const baseResponse = new GenericResponse();
      if (responseBufferString && responseBufferString.length > 0) {
        baseResponse.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);
      }

      const responseDetail = new IdentityUpdateResponseOrdinalVDXFObject({
        data: new IdentityUpdateResponseDetails({
          requestID: details.containsRequestID() ? details.requestID : undefined,
          txid: resultTxid
            ? Buffer.from(resultTxid, 'hex').reverse()
            : undefined,
        }),
      });

      if (baseResponse.details == null) baseResponse.details = [];
      baseResponse.details = [...baseResponse.details, responseDetail];

      if (baseResponse.signature == null) {
        baseResponse.signature = new VerifiableSignatureData({
          systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
          identityID: CompactAddressObject.fromIAddress(signerIdentityAddress),
        });
        baseResponse.setSigned();
      }

      if (next) {
        setBroadcastTxid(resultTxid);
        setPendingResponse(baseResponse);
        setCompletionSheetStage(COMPLETION_SHEET_STAGE.READY);
      } else {
        cancel();
      }
    } catch (e) {
      const errorMessage = resultTxid
        ? `Your identity update transaction was already broadcast (${resultTxid}). ${e.message || 'A later step failed after the broadcast completed.'}`
        : e.message || 'Failed to broadcast transaction';
      // once a txid exists, surface that funds were spent instead of implying a failed broadcast.
      Alert.alert('Error', errorMessage);
      if (typeof onBroadcastingChange === 'function') {
        onBroadcastingChange(false);
      }
      setCompletionSheetStage(COMPLETION_SHEET_STAGE.IDLE);
    }
  }, [selectedSource, txHex, utxos, details, responseBufferString, coinObj, signerIdentityAddress, next, detailIndex, cancel, onBroadcastingChange]);

  const deliverPendingResponse = useCallback(async () => {
    if (!pendingResponse || !next) return;

    setCompletionError(null);
    setCompletionDeliveryInfo(identityUpdateDeliveryInfo || null);
    setCompletionSheetStage(COMPLETION_SHEET_STAGE.DELIVERING);

    try {
      if (typeof deliverIdentityUpdateResponse === 'function') {
        const deliveryResult = await deliverIdentityUpdateResponse(
          pendingResponse,
          [detailIndex],
        );

        if (deliveryResult?.skippedInlineDelivery) {
          setPendingResponse(null);
          setBroadcastTxid(null);
          setCompletionSheetStage(COMPLETION_SHEET_STAGE.IDLE);
          return;
        }

        setCompletionDeliveryInfo(deliveryResult || identityUpdateDeliveryInfo);

        if (deliveryResult?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
          setCompletionSheetStage(COMPLETION_SHEET_STAGE.SUCCESS);
        }

        return;
      }

      setCompletionSheetStage(COMPLETION_SHEET_STAGE.IDLE);
      await next(pendingResponse, [detailIndex], {
        autoDeliverOnComplete: true,
      });
    } catch (e) {
      setCompletionDeliveryInfo(e?.deliveryInfo || identityUpdateDeliveryInfo);
      setCompletionError(e);
      setCompletionSheetStage(COMPLETION_SHEET_STAGE.ERROR);
    }
  }, [
    deliverIdentityUpdateResponse,
    detailIndex,
    identityUpdateDeliveryInfo,
    next,
    pendingResponse,
  ]);

  const handleCompleteUpdate = useCallback(() => {
    deliverPendingResponse();
  }, [deliverPendingResponse]);

  const handleRetryDelivery = useCallback(() => {
    deliverPendingResponse();
  }, [deliverPendingResponse]);

  const handleLeaveWithoutSending = useCallback(() => {
    if (typeof completeIdentityUpdateWithoutDelivery === 'function') {
      completeIdentityUpdateWithoutDelivery();
      return;
    }

    cancel();
  }, [cancel, completeIdentityUpdateWithoutDelivery]);

  const handlePrimaryAction = useCallback(() => {
    if (!selectedSource) {
      setSourceSheetVisible(true);
      return;
    }

    if (hasFee && !calculating) {
      handleUpdate();
    }
  }, [calculating, handleUpdate, hasFee, selectedSource]);

  const primaryActionLabel = selectedSource
    ? calculating
      ? 'Calculating fee'
      : 'Update'
    : 'Select payment source';
  const primaryActionDisabled = !!selectedSource && !hasFee;
  const recapRows = [
    highRiskCount > 0
      ? {label: 'High-risk acknowledgements', value: highRiskCount}
      : null,
    contentCount > 0 ? {label: 'Content changes', value: contentCount} : null,
  ].filter(Boolean);
  const selectedSourceDisplay = getSourceDisplayName(selectedSource);
  const selectedSourceDisplayIsAddress =
    isAddressLikeSourceName(selectedSourceDisplay);
  const completionSheetVisible =
    completionSheetStage !== COMPLETION_SHEET_STAGE.IDLE;
  const effectiveDeliveryInfo =
    completionDeliveryInfo || identityUpdateDeliveryInfo;
  const completionIsBroadcasting =
    completionSheetStage === COMPLETION_SHEET_STAGE.BROADCASTING;
  const completionIsReady =
    completionSheetStage === COMPLETION_SHEET_STAGE.READY;
  const completionIsDelivering =
    completionSheetStage === COMPLETION_SHEET_STAGE.DELIVERING;
  const completionIsSuccess =
    completionSheetStage === COMPLETION_SHEET_STAGE.SUCCESS;
  const completionIsError =
    completionSheetStage === COMPLETION_SHEET_STAGE.ERROR;
  const completionTitle = completionIsBroadcasting
    ? 'Broadcasting update'
    : completionIsReady
      ? 'Identity update broadcast'
      : completionIsDelivering
        ? getDeliveryTitle(effectiveDeliveryInfo)
        : completionIsSuccess
          ? 'Response sent'
          : 'Response not sent';
  const completionMessage = completionIsBroadcasting
    ? 'This may take a moment.'
    : completionIsError
      ? getDeliveryErrorMessage(completionError, effectiveDeliveryInfo)
      : null;
  const showLoadingAnimation = completionIsBroadcasting || completionIsDelivering;
  const showSuccessAnimation = completionIsReady || completionIsSuccess;
  const showTxidCard =
    !completionIsBroadcasting && !completionIsDelivering && !!broadcastTxid;
  const redirectCompleteHint =
    completionIsReady &&
    effectiveDeliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT &&
    effectiveDeliveryInfo?.destinationHost
      ? `You'll return to ${effectiveDeliveryInfo.destinationHost} when you tap Complete.`
      : null;

  // --- Always render confirm layout ---
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={parentStyles.scrollView}
        contentContainerStyle={parentStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={parentStyles.header}>
          <Text style={parentStyles.mainTitle}>Confirm update</Text>
          <Text style={parentStyles.subtitle}>Select a payment source and confirm the identity update</Text>
        </View>

        {/* Fee */}
        <View style={localStyles.feeCard}>
          <Text style={localStyles.feeLabel}>Transaction fee</Text>
          <View style={localStyles.feeContent}>
            {calculating ? (
              <View
                accessibilityLabel="Calculating transaction fee"
                accessibilityRole="progressbar"
                style={localStyles.feeCalculatingRow}>
                <LottieView
                  autoPlay
                  loop
                  source={require('../../../../animations/loading_7bars.json')}
                  style={localStyles.feeLoadingAnimation}
                />
                <Text style={localStyles.feeCalculating}>Calculating fee</Text>
              </View>
            ) : hasFee ? (
              <View>
                <Text style={localStyles.feeValue}>{fee} {feeCurrencyDisplay}</Text>
                {feeFiatDisplay && (
                  <Text style={localStyles.feeFiat}>{feeFiatDisplay}</Text>
                )}
              </View>
            ) : (
              <Text style={localStyles.feePlaceholder}>
                Select a payment source to see fee
              </Text>
            )}
          </View>
        </View>

        {/* Recap */}
        <View style={localStyles.recapCard}>
          <Text style={localStyles.recapTitle}>Changes recap</Text>
          {recapRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                localStyles.recapRow,
                index > 0 && localStyles.recapRowDivider,
              ]}>
              <Text style={localStyles.recapLabel}>{row.label}</Text>
              <Text style={localStyles.recapValue} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
          {hasEncryptedKeys && (
            <View style={localStyles.encryptedKeyRecapRow}>
              <Text style={localStyles.encryptedKeyRecapText}>
                Credential data will be encrypted with a key derived from your identity so that neither the credential type nor its contents are publicly visible on-chain. Your account's shielded (Z) seed must match the identity's z-address.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <SafeBottomActionStack
        gap={10}
        horizontalSpacing={24}
        style={parentStyles.footer}>
        {selectedSource && (
          <View>
            <Text style={localStyles.selectedSourceLabel}>Paying from</Text>
            <TouchableOpacity
              accessibilityHint="Open payment source options"
              accessibilityLabel={`Selected payment source ${selectedSourceDisplay}`}
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={() => setSourceSheetVisible(true)}
              style={localStyles.selectedSourceCard}>
              <View style={localStyles.selectedSourceText}>
                <Text
                  numberOfLines={1}
                  style={[
                    localStyles.selectedSourceName,
                    selectedSourceDisplayIsAddress &&
                      localStyles.selectedSourceNameMono,
                  ]}>
                  {selectedSourceDisplay}
                </Text>
              </View>
              <View style={localStyles.selectedSourceCheck}>
                <Check color={theme.colors.success} size={22} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        )}
        <AppButton
          disabled={primaryActionDisabled}
          height={56}
          onPress={handlePrimaryAction}
          themeMode={theme.mode}
          variant="primary">
          {primaryActionLabel}
        </AppButton>
      </SafeBottomActionStack>

      <BottomSheetModal
        visible={sourceSheetVisible}
        onClose={() => setSourceSheetVisible(false)}
        maxHeight="70%">
        <View style={localStyles.sheetBody}>
          <Text style={localStyles.sheetTitle}>Select payment source</Text>
          <ScrollView
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={localStyles.sheetListContainer}
            showsVerticalScrollIndicator={false}>
            {paymentSources.length === 0 ? (
              <View style={localStyles.sheetEmpty}>
                <Text style={localStyles.sheetEmptyText}>
                  No wallets with sufficient balance found.
                </Text>
              </View>
            ) : (
              paymentSources.map((source, index) => {
                const selected =
                  selectedSource &&
                  selectedSource.coinObj.id === source.coinObj.id &&
                  selectedSource.wallet.id === source.wallet.id;
                const sourceDisplayName = getSourceDisplayName(source);
                const sourceDisplayNameIsAddress =
                  isAddressLikeSourceName(sourceDisplayName);

                return (
                  <TouchableOpacity
                    key={`${source.coinObj.id}-${source.wallet.id}-${index}`}
                    style={[
                      localStyles.walletCard,
                      selected && localStyles.walletCardSelected,
                    ]}
                    onPress={() => handleSelectSource(source)}
                    activeOpacity={0.74}>
                    <View style={localStyles.walletTextSection}>
                      <Text
                        style={[
                          localStyles.walletNameText,
                          sourceDisplayNameIsAddress &&
                            localStyles.walletNameMonoText,
                        ]}
                        numberOfLines={1}>
                        {sourceDisplayName}
                      </Text>
                    </View>
                    <View style={localStyles.walletBalanceSection}>
                      <Text style={localStyles.walletBalanceAmount}>
                        {source.balanceDisplay}
                      </Text>
                      <Text style={localStyles.walletBalanceTicker}>
                        {source.coinObj.display_ticker}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        closeDisabled
        contentContainerStyle={localStyles.broadcastSheet}
        maxHeight={IDENTITY_UPDATE_COMPLETION_SHEET_HEIGHT}
        onClose={() => {}}
        visible={completionSheetVisible}>
        <View style={localStyles.broadcastSheetBody}>
          {(showLoadingAnimation || showSuccessAnimation) && (
            <View
              accessibilityLabel={
                showLoadingAnimation
                  ? completionTitle
                  : undefined
              }
              accessibilityRole={showLoadingAnimation ? 'progressbar' : undefined}
              style={localStyles.broadcastVisualSlot}>
              {showLoadingAnimation ? (
                <LottieView
                  autoPlay
                  loop
                  source={require('../../../../animations/loading_7bars.json')}
                  style={localStyles.broadcastLoadingAnimation}
                />
              ) : (
                <AnimatedSuccessCheckmark
                  style={localStyles.broadcastSuccessAnimation}
                />
              )}
            </View>
          )}
          <Text style={localStyles.broadcastTitle}>
            {completionTitle}
          </Text>
          {completionMessage && (
            <Text style={localStyles.broadcastMessage}>
              {completionMessage}
            </Text>
          )}
          {showTxidCard && (
            <View style={localStyles.txidCard}>
              <Text style={localStyles.txidLabel}>
                Identity update txid
              </Text>
              <View style={localStyles.txidRow}>
                <Text
                  numberOfLines={1}
                  selectable
                  style={localStyles.txidValue}>
                  {truncateTxid(broadcastTxid)}
                </Text>
                <CopyAction
                  accessibilityLabel="Copy transaction ID"
                  copiedAccessibilityLabel="Transaction ID copied"
                  color={theme.colors.textSubtle}
                  copiedColor={theme.colors.success}
                  style={localStyles.txidCopyButton}
                  value={broadcastTxid}
                />
              </View>
            </View>
          )}
          {completionIsReady && (
            <>
              {redirectCompleteHint && (
                <Text style={localStyles.redirectCompleteHint}>
                  {redirectCompleteHint}
                </Text>
              )}
              <AppButton
                height={52}
                onPress={handleCompleteUpdate}
                style={localStyles.completeButton}
                themeMode={theme.mode}
                variant="primary">
                Complete
              </AppButton>
            </>
          )}
          {completionIsError && (
            <View style={localStyles.deliveryActions}>
              <AppButton
                height={52}
                onPress={handleRetryDelivery}
                style={localStyles.deliveryActionButton}
                themeMode={theme.mode}
                variant="primary">
                Try again
              </AppButton>
              <AppButton
                height={52}
                onPress={handleLeaveWithoutSending}
                style={localStyles.deliveryActionButton}
                themeMode={theme.mode}
                variant="secondary">
                Leave without sending
              </AppButton>
            </View>
          )}
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default ConfirmPayStep;
