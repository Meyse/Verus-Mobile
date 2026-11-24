import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {BackHandler, Platform, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import FadedScrollView from '../../components/FadedScrollView';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {expireCoinData} from '../../actions/actionCreators';
import {sendConvertOrCrossChain} from '../../utils/api/routers/sendConvertOrCrossChain';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_TRANSACTIONS,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {SEND_MODAL_PRICE_ESTIMATE} from '../../utils/constants/sendModal';
import {truncateDecimal} from '../../utils/math';
import {useSendWizard} from './SendWizardContext';
import {getAdvancedReview} from './advancedReview';
import {getBroadcastRejectionMessage} from './broadcastRejection';
import {
  CONNECTION_FAILED_MESSAGE,
  isConnectionErrorMessage,
} from '../../utils/network/connectionErrors';
import {loweredNodeProps} from './loweredAmount';
import {closeWizard} from './wizardNavigation';
import {ConfirmNotice} from './components/ConfirmFacts';
import {TransferNode} from './components/TransferSummary';
import {
  ErrorMessage,
  FlatRow,
  WIZARD_CONTENT_TOP_INSET,
  WizardFooter,
  WizardScreen,
} from './components/WizardUI';

const MONOSPACE = Platform.select({ios: 'Menlo', default: 'monospace'});

// Confirm of the Advanced form (PR 266 pick ADV). The wizard's own Confirm
// prepares its transaction from a chosen route, so it cannot take this form's
// transaction without a change to how it is built. This step shows the old
// Confirm's facts with the wizard's rows and slide, and sends the prepared
// transaction exactly as the old Confirm did: one sendConvertOrCrossChain
// call, no new preflight.
const SendWizardAdvancedConfirm = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const {state, setAdvancedReview} = useSendWizard();
  const activeAccount = useObjectSelector(value => value.authentication.activeAccount);
  const review = state.advancedReview;
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [statusUnknown, setStatusUnknown] = useState(false);
  const inFlight = useRef(false);
  const submitted = useRef(false);

  // Nothing may leave a broadcast that is still running, as on the wizard's
  // Confirm: this step and the whole wizard (the iOS swipe on the parent).
  // The result replaces this step after `submitted` is set, so it passes.
  useEffect(() => {
    const blockWhileSending = event => {
      if (inFlight.current && !submitted.current) event.preventDefault();
    };
    const unsubscribes = [navigation, navigation.getParent?.()]
      .filter(Boolean)
      .map(target => target.addListener('beforeRemove', blockWhileSending));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [navigation]);

  const facts = useMemo(
    () =>
      review?.preflight
        ? getAdvancedReview({
            preflight: review.preflight,
            balances: review.balances,
            coinObj: review.sendModal.coinObj,
            priceEstimate: review.sendModal.data[SEND_MODAL_PRICE_ESTIMATE],
          })
        : null,
    [review],
  );

  // While it sends, and after an unknown result, the user cannot step back:
  // a second slide could send twice. Close leaves the whole wizard.
  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: !sending && !statusUnknown,
      wizardBackHidden: statusUnknown,
      wizardNavigationDisabled: sending,
    });
  }, [navigation, sending, statusUnknown]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (sending) return true;
        if (statusUnknown) {
          closeWizard(navigation);
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }, [navigation, sending, statusUnknown]),
  );

  if (!facts) {
    return (
      <WizardScreen contentContainerStyle={styles.fallback}>
        <ErrorMessage>Go back and fill in the form.</ErrorMessage>
      </WizardScreen>
    );
  }

  const {coinObj, subWallet} = review.sendModal;
  const ticker = coinObj.display_ticker;

  const submit = async () => {
    if (inFlight.current || submitted.current || statusUnknown) return;
    inFlight.current = true;
    setSending(true);
    setSendError(null);
    const {preflight} = review;
    try {
      const destination = preflight.output.address.getAddressString();
      const res = await sendConvertOrCrossChain(
        coinObj,
        activeAccount,
        subWallet.api_channels[API_SEND],
        preflight,
      );
      if (res.err) {
        const error = new Error(res.result?.message || res.result || 'Transaction failed.');
        error.ambiguousBroadcast = res.ambiguousBroadcast === true;
        error.rejected = true;
        throw error;
      }
      submitted.current = true;
      const names = preflight.names;
      setAdvancedReview({
        ...review,
        result: {
          ...res.result,
          output: preflight.output,
          destination:
            names && Object.prototype.hasOwnProperty.call(names, destination)
              ? names[destination]
              : destination,
        },
      });
      navigation.reset({index: 0, routes: [{name: 'SendWizardAdvancedResult'}]});
    } catch (error) {
      console.warn(error);
      if (error.ambiguousBroadcast === true) setStatusUnknown(true);
      else {
        // The wizard's Confirm maps send failures the same way: a node
        // refusal (such as an input an unconfirmed send already spent) does
        // not read as a connection problem.
        const message = error.message || 'Transaction failed.';
        setSendError(error.rejected
          ? getBroadcastRejectionMessage(message)
          : isConnectionErrorMessage(message)
            ? CONNECTION_FAILED_MESSAGE
            : message);
      }
    } finally {
      dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
      dispatch(expireCoinData(coinObj.id, API_GET_TRANSACTIONS));
      dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));
      inFlight.current = false;
      setSending(false);
    }
  };

  const notices = [
    facts.preconvert
      ? `${facts.convertToName} hasn’t launched yet. You receive the converted funds when it launches, or a refund if it does not.`
      : null,
    facts.noEstimate
      ? 'Could not calculate an estimated result for this conversion.'
      : null,
    facts.highSlippage
      ? 'The estimate changed a lot because of low liquidity. Check the amount you receive.'
      : null,
    // The old form alerted it after preparing; this form shows it here.
    facts.centralized
      ? `${facts.centralized} is a centralized currency. Its controller, ${facts.centralized}@, can mint new supply.`
      : null,
    facts.burn
      ? `${facts.sentAmount.toFixed()} ${facts.currencyName} will be removed from circulation. The burn output address does not receive it, and this cannot be reversed.`
      : null,
    statusUnknown
      ? 'The transfer may have been sent. Check your transaction history before you try again.'
      : null,
  ].filter(Boolean);

  const rows = [
    {label: facts.burn ? 'Burn output' : 'To', value: facts.recipient, copy: true, mono: !facts.recipient.includes('@')},
    {label: 'From', value: facts.source, copy: true, mono: true},
    facts.convertTo
      ? {label: facts.preconvert ? 'Preconvert to' : 'Convert to', value: facts.convertTo, copy: true}
      : null,
    facts.isConversion && facts.estimated
      ? {label: 'Estimated to receive', value: facts.estimated}
      : null,
    facts.toNetwork && review.networkName ? {label: 'From network', value: review.networkName} : null,
    facts.toNetwork ? {label: 'To network', value: facts.toNetwork, copy: true} : null,
    facts.via ? {label: 'Via', value: facts.via, copy: true} : null,
    facts.receiveAs ? {label: 'Receive as', value: facts.receiveAs, copy: true} : null,
    ...facts.alsoSent.map(item => ({
      label: 'Also sent',
      value: `${item.amount.toFixed()} ${item.name}`,
      copy: true,
    })),
    {
      label: facts.feesLabel,
      value: facts.fees.length
        ? facts.fees.map(item => `${item.amount.toFixed()} ${item.name}`).join('\n')
        : `0 ${ticker}`,
    },
    facts.conversionFee ? {label: 'Conversion fee', value: facts.conversionFee} : null,
    facts.arrives ? {label: 'Arrives', value: `In ${facts.arrives}`} : null,
    facts.remaining.length
      ? {
          label: 'Balance after',
          value: facts.remaining.map(item => `${item.amount.toFixed()} ${item.name}`).join('\n'),
        }
      : null,
  ].filter(Boolean);

  return (
    <WizardScreen scroll={false}>
      <FadedScrollView
        containerStyle={styles.scrollViewport}
        contentContainerStyle={[styles.content, smallDevice && styles.contentCompact]}
        fadeBackgroundColor={theme.colors.background}>
        <TransferNode
          amount={truncateDecimal(facts.sentAmount, 8)}
          coinId={coinObj.id}
          compact={smallDevice}
          copyValue={facts.sentAmount.toFixed()}
          label={facts.isConversion ? 'You pay' : 'You send'}
          ticker={ticker}
          {...loweredNodeProps(facts.enteredAmount, ticker)}
        />
        <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
          {rows.map(row => (
            <FlatRow
              copyValue={row.copy ? row.value : undefined}
              key={`${row.label}:${row.value}`}
              label={row.label}
              numberOfLines={0}
              value={row.value}
              valueStyle={row.mono ? styles.mono : undefined}
            />
          ))}
        </View>
      </FadedScrollView>
      <WizardFooter
        above={
          notices.length || sendError ? (
            <View style={styles.pinned}>
              {notices.map(message => (
                <ConfirmNotice key={message}>{message}</ConfirmNotice>
              ))}
              <ErrorMessage style={styles.pinnedError}>{sendError}</ErrorMessage>
            </View>
          ) : null
        }
        disabled={sending || statusUnknown}
        loading={sending}
        loadingText={facts.isConversion ? 'Converting…' : 'Sending…'}
        onPress={submit}
        slideToConfirm={!statusUnknown}>
        {statusUnknown
          ? 'Status unknown'
          : facts.burn
          ? 'Slide to burn'
          : facts.isConversion
          ? 'Slide to convert'
          : 'Slide to send'}
      </WizardFooter>
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  fallback: {paddingTop: WIZARD_CONTENT_TOP_INSET, paddingHorizontal: 16},
  scrollViewport: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 20},
  contentCompact: {paddingTop: 16, paddingBottom: 8},
  rows: {marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth},
  mono: {fontFamily: MONOSPACE, fontSize: 13, lineHeight: 18},
  pinned: {marginBottom: 4},
  pinnedError: {marginHorizontal: 0, marginVertical: 0, marginBottom: 8},
});

export default SendWizardAdvancedConfirm;
