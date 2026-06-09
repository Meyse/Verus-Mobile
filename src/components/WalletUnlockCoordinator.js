import React, {useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {
  cancelWalletUnlock,
  resolveWalletUnlock,
} from '../actions/actionDispatchers';
import {useObjectSelector} from '../hooks/useObjectSelector';
import ChooseWalletSheet from '../containers/Login/components/ChooseWalletSheet';
import UnlockWalletSheet from '../containers/Login/components/UnlockWalletSheet';
import {
  normalizeLastOpenedAccountTimestamps,
  sortAccountsByLoginPriority,
} from '../utils/account/accountActivity';
import {
  getAccountNetworkKey,
  getDefaultAccountForNetwork,
} from '../utils/account/accountNetwork';
import {getSupportedBiometryType} from '../utils/keychain/keychain';

const WalletUnlockCoordinator = () => {
  const walletUnlock = useObjectSelector(state => state.walletUnlock);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const generalWalletSettings = useObjectSelector(
    state => state.settings.generalWalletSettings,
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const [chooseWalletVisible, setChooseWalletVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [pendingUnlockAccount, setPendingUnlockAccount] = useState(null);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);

  const lastOpenedAccountTimestamps = useMemo(
    () =>
      normalizeLastOpenedAccountTimestamps(
        generalWalletSettings.lastOpenedAccountTimestamps,
      ),
    [generalWalletSettings.lastOpenedAccountTimestamps],
  );
  const eligibleAccounts = useMemo(() => {
    const accountHashes = walletUnlock.accountHashes;

    if (!Array.isArray(accountHashes) || accountHashes.length === 0) {
      return accounts;
    }

    return accountHashes
      .map(accountHash =>
        accounts.find(account => account.accountHash === accountHash),
      )
      .filter(Boolean);
  }, [accounts, walletUnlock.accountHashes]);
  const preferredAccount = useMemo(() => {
    if (!walletUnlock.preferredAccountHash) {
      return null;
    }

    return (
      eligibleAccounts.find(
        account => account.accountHash === walletUnlock.preferredAccountHash,
      ) || null
    );
  }, [eligibleAccounts, walletUnlock.preferredAccountHash]);
  const walletNetworkKey = selectedAccount
    ? getAccountNetworkKey(selectedAccount)
    : eligibleAccounts.length > 0
    ? getAccountNetworkKey(eligibleAccounts[0])
    : null;
  const defaultAccount = walletNetworkKey
    ? getDefaultAccountForNetwork(
        accounts,
        generalWalletSettings,
        walletNetworkKey,
      )
    : null;
  const defaultAccountHash = defaultAccount ? defaultAccount.accountHash : null;
  const sortedEligibleAccounts = useMemo(
    () =>
      sortAccountsByLoginPriority(
        eligibleAccounts,
        preferredAccount ? preferredAccount.accountHash : defaultAccountHash,
        lastOpenedAccountTimestamps,
      ),
    [
      defaultAccountHash,
      eligibleAccounts,
      lastOpenedAccountTimestamps,
      preferredAccount,
    ],
  );
  const useRefreshAccountData = !!(
    signedIn &&
    activeAccount &&
    selectedAccount &&
    activeAccount.accountHash !== selectedAccount.accountHash
  );

  useEffect(() => {
    let active = true;

    getSupportedBiometryType()
      .then(result => {
        if (active) {
          setSupportedBiometryType(result);
        }
      })
      .catch(() => {
        if (active) {
          setSupportedBiometryType(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!walletUnlock.visible) {
      setChooseWalletVisible(false);
      setSelectedAccount(null);
      setPendingUnlockAccount(null);
      return;
    }

    if (sortedEligibleAccounts.length === 1) {
      setChooseWalletVisible(false);
      setSelectedAccount(sortedEligibleAccounts[0]);
      return;
    }

    if (sortedEligibleAccounts.length > 1) {
      setSelectedAccount(null);
      setChooseWalletVisible(true);
      return;
    }

    cancelWalletUnlock(walletUnlock.requestId);
  }, [
    sortedEligibleAccounts,
    walletUnlock.requestId,
    walletUnlock.visible,
  ]);

  const handleCancelUnlock = () => {
    if (walletUnlock.requestId) {
      cancelWalletUnlock(walletUnlock.requestId);
    }
  };

  const handleChooseWalletAccount = account => {
    setPendingUnlockAccount(account);
    setChooseWalletVisible(false);
  };

  const handleChooseWalletClosed = () => {
    if (pendingUnlockAccount != null) {
      setSelectedAccount(pendingUnlockAccount);
      setPendingUnlockAccount(null);
    }
  };

  const handleUnlocked = account => {
    if (walletUnlock.requestId) {
      resolveWalletUnlock(walletUnlock.requestId, account);
    }
  };

  return (
    <>
      <ChooseWalletSheet
        visible={walletUnlock.visible && chooseWalletVisible}
        onClose={handleCancelUnlock}
        onClosed={handleChooseWalletClosed}
        accounts={sortedEligibleAccounts}
        defaultAccountHash={defaultAccountHash}
        lastOpenedAccountTimestamps={lastOpenedAccountTimestamps}
        supportedBiometryType={supportedBiometryType}
        networkLabel={walletUnlock.networkLabel || 'matching'}
        onSelectAccount={handleChooseWalletAccount}
      />
      <UnlockWalletSheet
        visible={walletUnlock.visible && selectedAccount != null}
        account={selectedAccount}
        isDefaultAccount={
          selectedAccount != null &&
          selectedAccount.accountHash === defaultAccountHash
        }
        title={walletUnlock.title}
        requestLabel={walletUnlock.requestLabel}
        loadingTitle={walletUnlock.loadingTitle}
        loadingSubtitle={walletUnlock.loadingSubtitle || undefined}
        makeDefaultAllowed={walletUnlock.makeDefaultAllowed}
        useRefreshAccountData={useRefreshAccountData}
        closeOnUnlocked={false}
        onClose={handleCancelUnlock}
        onUnlocked={handleUnlocked}
      />
    </>
  );
};

export default WalletUnlockCoordinator;
