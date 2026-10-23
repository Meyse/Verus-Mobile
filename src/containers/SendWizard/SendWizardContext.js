import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {API_GET_BALANCES} from '../../utils/constants/intervalConstants';
import {coinsToSats} from '../../utils/math';
import {isPrivateChannel} from '../../utils/subwallet/privateWallet';

const initialWizardState = {
  sourceCoin: null,
  sourceSubWallet: null,
  sourceBalance: '0',
  channel: null,
  target: null,
  route: null,
  amount: '',
  amountInput: '',
  amountSats: null,
  fiatMode: false,
  estimate: null,
  // Output per input unit for a small trade on the selected route. It is the
  // reference that price impact is measured against.
  marketPrice: null,
  recipientAddress: '',
  // Sent inside a private output: from the private card to a private address.
  memo: '',
  // A scanned payment request: {address, amount, note, notice, coinId}. Its
  // recipient is fixed, so the Recipient step is skipped.
  scanRequest: null,
  // A VerusPay invoice paid through these screens: its facts for Confirm and
  // Sent (InvoicePayFlow). The flow's options live in InvoiceFlowContext.
  invoice: null,
  // A Send from the VerusID page: {iAddress, name}. Select asset then shows
  // only the assets on that VerusID's cards.
  sourceIdentity: null,
  // The card a payment comes from, when the asset is on more than one.
  payFromLabel: null,
  // A currency to convert to, chosen before the wizard opened ("Pre-convert"
  // on a pre-launch asset). Convert to selects it once its routes load.
  presetTargetId: null,
  preflightResult: null,
  txResult: null,
  broadcastError: null,
};

// The wizard fields a scanned request fills in. They survive a change of
// source, so choosing a card does not lose the recipient or the amount.
export const getScanRequestFields = scanRequest => {
  if (!scanRequest) return {};
  const amount = scanRequest.amount ? BigNumber(scanRequest.amount) : null;
  return {
    scanRequest,
    recipientAddress: scanRequest.address || '',
    ...(amount?.isGreaterThan(0)
      ? {
          amount: amount.toFixed(),
          amountInput: amount.toFixed(),
          amountSats: coinsToSats(amount).toString(),
        }
      : {}),
  };
};

const SendWizardContext = createContext(null);

export const SendWizardProvider = ({children, initialState, mode}) => {
  const [state, setState] = useState(() => ({
    ...initialWizardState,
    ...(initialState || {}),
  }));
  // The private card spends only confirmed funds, as its preflight does.
  // Funds that still confirm show apart on Amount.
  const balanceChannel = state.sourceSubWallet?.api_channels?.[API_GET_BALANCES];
  const privateSource = isPrivateChannel(balanceChannel);
  const sourceBalance = useSelector(ledgerState => {
    const entry = ledgerState.ledger.balances[balanceChannel]?.[state.sourceCoin?.id];
    return (privateSource ? entry?.confirmed : entry?.total) ?? '0';
  });
  const sourcePending = useSelector(ledgerState =>
    privateSource
      ? ledgerState.ledger.balances[balanceChannel]?.[state.sourceCoin?.id]?.pending ?? null
      : null,
  );

  const setSource = useCallback((source, target = null, route = null) => {
    setState(current => ({
      ...initialWizardState,
      ...getScanRequestFields(current.scanRequest),
      invoice: current.invoice,
      sourceIdentity: current.sourceIdentity,
      presetTargetId: current.presetTargetId,
      ...source,
      target,
      route,
      txResult: current.txResult,
      broadcastError: current.broadcastError,
    }));
  }, []);

  const setTarget = useCallback((target, route) => {
    setState(current => ({
      ...current,
      target,
      route,
      amount: '',
      amountInput: '',
      amountSats: null,
      fiatMode: false,
      estimate: null,
      marketPrice: null,
      recipientAddress: '',
      memo: '',
      preflightResult: null,
    }));
  }, []);

  const setRoute = useCallback(route => {
    setState(current => ({
      ...current,
      route,
      estimate: null,
      // The market price belongs to a route. Choosing the same route again
      // (the Amount step re-chooses the best one) must not lose it.
      marketPrice: current.route?.key === route?.key ? current.marketPrice : null,
      preflightResult: null,
    }));
  }, []);

  const setAmount = useCallback((
    amount,
    amountSats,
    estimate = null,
    amountInput = amount,
    fiatMode = false,
  ) => {
    setState(current => ({
      ...current,
      amount,
      amountInput,
      amountSats,
      estimate,
      fiatMode,
      preflightResult: null,
    }));
  }, []);

  const setEstimate = useCallback(estimate => {
    setState(current => ({...current, estimate}));
  }, []);

  const setMarketPrice = useCallback(marketPrice => {
    setState(current =>
      current.marketPrice === marketPrice ? current : {...current, marketPrice},
    );
  }, []);

  const setRecipient = useCallback(recipientAddress => {
    setState(current => ({...current, recipientAddress, preflightResult: null}));
  }, []);

  const setMemo = useCallback(memo => {
    setState(current => ({...current, memo, preflightResult: null}));
  }, []);

  const setPreflight = useCallback(preflightResult => {
    setState(current => ({...current, preflightResult}));
  }, []);

  const setTxResult = useCallback(txResult => {
    setState(current => ({...current, txResult}));
  }, []);

  const setBroadcastError = useCallback(broadcastError => {
    setState(current => ({...current, broadcastError}));
  }, []);

  const reset = useCallback(() => setState({...initialWizardState}), []);

  const value = useMemo(
    () => ({
      mode,
      state: {
        ...state,
        sourceBalance: String(sourceBalance),
        sourcePending: sourcePending == null ? null : String(sourcePending),
      },
      setSource,
      setTarget,
      setAmount,
      setEstimate,
      setMarketPrice,
      setRecipient,
      setMemo,
      setRoute,
      setPreflight,
      setTxResult,
      setBroadcastError,
      reset,
    }),
    [
      mode,
      reset,
      setAmount,
      setEstimate,
      setMarketPrice,
      setPreflight,
      setMemo,
      setRecipient,
      setRoute,
      setSource,
      setTarget,
      setTxResult,
      setBroadcastError,
      state,
      sourceBalance,
      sourcePending,
    ],
  );

  return (
    <SendWizardContext.Provider value={value}>
      {children}
    </SendWizardContext.Provider>
  );
};

export const useSendWizard = () => {
  const value = useContext(SendWizardContext);
  if (!value) throw new Error('useSendWizard must be used within SendWizardProvider');
  return value;
};
