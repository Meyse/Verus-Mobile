// Wizard state container: shared send wizard selections, estimates, and preflight
import React, { createContext, useState, useContext, useCallback } from 'react';

const WizardStateContext = createContext(null);

export const WizardStateProvider = ({ children }) => {
  const [wizardState, setWizardState] = useState({
    sourceCoin: null,
    sourceSubWallet: null,
    destCurrency: null,
    destNetwork: null,
    amount: '',
    isFiat: false,
    selectedPath: null,
    availablePaths: [], // New field to store alternatives
    recipient: null,
    memo: '',
    estimates: {}, // Cache key: `${pathId}-${amount}`
    preflightResult: null,
  });

  const updateWizardState = useCallback((updates) => {
    setWizardState((prevState) => ({
      ...prevState,
      ...updates,
    }));
  }, []);

  const clearWizardState = useCallback(() => {
    setWizardState({
      sourceCoin: null,
      sourceSubWallet: null,
      destCurrency: null,
      destNetwork: null,
      amount: '',
      isFiat: false,
      selectedPath: null,
      availablePaths: [],
      recipient: null,
      memo: '',
      estimates: {},
      preflightResult: null,
    });
  }, []);

  return (
    <WizardStateContext.Provider value={{ wizardState, updateWizardState, clearWizardState }}>
      {children}
    </WizardStateContext.Provider>
  );
};

export const useWizardState = () => {
  const context = useContext(WizardStateContext);
  if (!context) {
    throw new Error('useWizardState must be used within a WizardStateProvider');
  }
  return context;
};
