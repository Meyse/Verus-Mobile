import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {API_GET_BALANCES} from '../../utils/constants/intervalConstants';

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
  preflightResult: null,
  txResult: null,
  broadcastError: null,
};

const SendWizardContext = createContext(null);

export const SendWizardProvider = ({children, initialState, mode}) => {
  const [state, setState] = useState(() => ({
    ...initialWizardState,
    ...(initialState || {}),
  }));
  const sourceBalance = useSelector(ledgerState => {
    const balanceChannel = state.sourceSubWallet?.api_channels?.[API_GET_BALANCES];
    return ledgerState.ledger.balances[balanceChannel]?.[state.sourceCoin?.id]?.total ?? '0';
  });

  const setSource = useCallback((source, target = null, route = null) => {
    setState(current => ({
      ...initialWizardState,
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
      state: {...state, sourceBalance: String(sourceBalance)},
      setSource,
      setTarget,
      setAmount,
      setEstimate,
      setMarketPrice,
      setRecipient,
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
      setRecipient,
      setRoute,
      setSource,
      setTarget,
      setTxResult,
      setBroadcastError,
      state,
      sourceBalance,
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
