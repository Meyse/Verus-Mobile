import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

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
  recipientAddress: '',
  preflightResult: null,
  txResult: null,
};

const SendWizardContext = createContext(null);

export const SendWizardProvider = ({children, initialSource}) => {
  const [state, setState] = useState(() => ({
    ...initialWizardState,
    ...(initialSource || {}),
  }));

  const setSource = useCallback(source => {
    setState(current => ({
      ...initialWizardState,
      ...source,
      txResult: current.txResult,
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
      recipientAddress: '',
      preflightResult: null,
    }));
  }, []);

  const setRoute = useCallback(route => {
    setState(current => ({
      ...current,
      route,
      estimate: null,
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

  const setRecipient = useCallback(recipientAddress => {
    setState(current => ({...current, recipientAddress, preflightResult: null}));
  }, []);

  const setPreflight = useCallback(preflightResult => {
    setState(current => ({...current, preflightResult}));
  }, []);

  const setTxResult = useCallback(txResult => {
    setState(current => ({...current, txResult}));
  }, []);

  const reset = useCallback(() => setState({...initialWizardState}), []);

  const value = useMemo(
    () => ({
      state,
      setSource,
      setTarget,
      setAmount,
      setEstimate,
      setRecipient,
      setRoute,
      setPreflight,
      setTxResult,
      reset,
    }),
    [
      reset,
      setAmount,
      setEstimate,
      setPreflight,
      setRecipient,
      setRoute,
      setSource,
      setTarget,
      setTxResult,
      state,
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
