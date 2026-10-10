import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import {Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Check, Info} from 'lucide-react-native';
import {GenericResponse} from 'verus-typescript-primitives';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {
  resetDeeplinkData,
  setConfigSection,
  setUserCoins,
} from '../../../actions/actionCreators';
import {
  updateVerusIdWallet,
} from '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  createAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {
  linkVerusId,
} from '../../../actions/actions/services/dispatchers/verusid/verusid';
import {unixToDate} from '../../../utils/math';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {requestServiceStoredData} from '../../../utils/auth/authBox';
import Store from '../../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../actions/actions/updates/sessionRequests';
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import {DLIGHT_PRIVATE} from '../../../utils/constants/intervalConstants';
import {
  ENABLE_SIGNED_IN_REDESIGN,
  VERUSID_NETWORK_DEFAULT,
} from '../../../../env/index';
import {PROFILE_SECURITY_SETTINGS_LABEL} from '../../../utils/settings/settingsLabels';
import {processAppEncryptionRequest} from '../../../utils/deeplink/handlers/appEncryptionRequestHandler';
import {ensureGenericResponseSigner} from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
} from '../../../utils/deeplink/genericRequestDelivery';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {
  identityLinkCandidateMatchesAccount,
  identityLinkOriginIsCurrent,
} from '../../../utils/verusid/verusIdFlowGuards';
import {
  appEncryptionRequestInfoStyles as createAppEncryptionRequestInfoStyles,
} from '../../../styles';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';
import IdentityPickerSheet, {
  VERUSID_SHEET_MODES,
} from '../components/VerusIdIdentityPickerSheet/IdentityPickerSheet';
import {
  DeepLinkRequestDetailsSheet,
  DeepLinkRequestSourceCard,
  DeepLinkReviewScrollView,
  DeepLinkVerusIdDetailsSheet,
} from '../components/RequestReview';

const ROOT_CHAIN_BY_NETWORK = {
  mainnet: VERUSID_NETWORK_DEFAULT,
  testnet: 'VRSCTEST',
};

const SESSION_CHANGED = 'SESSION_CHANGED';

const SHIELDED_SETUP_PROFILE_MESSAGE =
  `Set up the Z recovery secret in Settings > ${PROFILE_SECURITY_SETTINGS_LABEL}, then restart Verus Mobile and try again.`;

const SHIELDED_SETUP_RESTART_MESSAGE =
  'Restart Verus Mobile, unlock this wallet, and try again.';

const getOfflineSystemName = systemId => {
  if (!systemId) return null;

  try {
    return getSystemNameFromSystemId(systemId);
  } catch (e) {
    return null;
  }
};

const getUriString = uri => {
  if (!uri) return null;
  if (typeof uri.getUriString === 'function') return uri.getUriString();
  return String(uri);
};

const getRequestChainKey = (linkedIds, requestIdentityChainId) => {
  const normalizedRequestChainId = String(requestIdentityChainId).toLowerCase();
  return (
    Object.keys(linkedIds || {}).find(
      chainId => chainId.toLowerCase() === normalizedRequestChainId,
    ) || requestIdentityChainId
  );
};

const buildMatchingIdentities = (linkedIds, requestIdentityChainId) => {
  const linkedChainKey = getRequestChainKey(linkedIds, requestIdentityChainId);
  const chainIds = linkedIds?.[linkedChainKey] || {};

  return Object.keys(chainIds)
    .sort((left, right) =>
      (chainIds[left] || '').localeCompare(chainIds[right] || ''),
    )
    .map(iAddress => ({
      chainId: requestIdentityChainId,
      iAddress,
      friendlyName: chainIds[iAddress] || iAddress,
    }));
};

const buildPickerIdentityData = (linkedIds, requestIdentityChainId) => {
  const linkedChainKey = getRequestChainKey(linkedIds, requestIdentityChainId);
  const chainIds = linkedIds?.[linkedChainKey] || {};
  const sortedAddresses = Object.keys(chainIds).sort((left, right) =>
    (chainIds[left] || '').localeCompare(chainIds[right] || ''),
  );

  return {
    linkedIds: {
      [requestIdentityChainId]: chainIds,
    },
    sortedIds: {
      [requestIdentityChainId]: sortedAddresses,
    },
  };
};

const findPreferredIdentity = ({
  linkedIds,
  preferredIAddress,
  previousAddressSet,
  requestIdentityChainId,
}) => {
  const identities = buildMatchingIdentities(linkedIds, requestIdentityChainId);
  const preferredKey = preferredIAddress
    ? preferredIAddress.toLowerCase()
    : null;

  if (preferredKey) {
    const preferredIdentity = identities.find(
      identity => identity.iAddress.toLowerCase() === preferredKey,
    );

    if (preferredIdentity) return preferredIdentity;
  }

  if (previousAddressSet) {
    const newIdentity = identities.find(
      identity => !previousAddressSet.has(identity.iAddress.toLowerCase()),
    );

    if (newIdentity) return newIdentity;
  }

  return identities[0] || null;
};

const cloneGenericResponse = response => {
  const baseResponse = new GenericResponse();

  if (response?.details && response.details.length > 0) {
    baseResponse.fromBuffer(response.toBuffer(), 0);
    return baseResponse;
  }

  if (response) {
    Object.assign(baseResponse, response);
  }

  baseResponse.details = [];
  return baseResponse;
};

const AppEncryptionRequestInfoContent = props => {
  const {
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    sigtime,
    derivationNumber,
    derivationIdFqn,
    hasDerivationID,
    requestIdFqn,
    hasRequestID,
    encryptResponseToAddress,
    hasEncryptResponseToAddress,
    returnESK,
    cancel,
    next,
    response,
    request,
    detailIndex,
    navigation,
  } = props;

  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createAppEncryptionRequestInfoStyles(theme),
    [theme],
  );
  const dispatch = useDispatch();
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  // The account this screen rendered against. Link mutations must reject if the
  // store account changed in the same frame as the action.
  const renderedAccountHash = useObjectSelector(
    state => state.authentication.activeAccount?.accountHash || null,
  );
  const encryptedIds = useObjectSelector(
    state => state.services.stored[VERUSID_SERVICE_ID],
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const requestIsTestnet = request != null ? request.isTestnet() : false;
  const activeAccountMatchesRequest =
    signedIn &&
    activeAccount != null &&
    accountIsTestnet(activeAccount) === requestIsTestnet;
  const requestIdentityChainId = requestIsTestnet
    ? ROOT_CHAIN_BY_NETWORK.testnet
    : ROOT_CHAIN_BY_NETWORK.mainnet;
  const requestCoinObj = useMemo(
    () => CoinDirectory.findCoinObj(requestIdentityChainId),
    [requestIdentityChainId],
  );
  const requesterLabel = signerFqn || 'An application';
  const sigDateString = sigtime ? unixToDate(sigtime) : null;
  const systemLabel =
    signerSystemName || getOfflineSystemName(signerSystemID) || signerSystemID;
  const responseUris = useMemo(
    () => (request?.responseURIs && request.responseURIs.length > 0
      ? request.responseURIs
      : []),
    [request],
  );
  const deliveryInfo = useMemo(
    () => getGenericRequestDeliveryInfo(request),
    [request],
  );
  const deliveryMethod =
    deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.POST
      ? 'Secure POST'
      : deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT
      ? 'Redirect'
      : null;
  const [linkedIds, setLinkedIds] = useState({});
  const [linkedIdsLoaded, setLinkedIdsLoaded] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [requestDetailsSheetVisible, setRequestDetailsSheetVisible] =
    useState(false);
  const [verusIdDetailsSheetVisible, setVerusIdDetailsSheetVisible] =
    useState(false);
  const [processing, setProcessing] = useState(false);
  const [openIdentityAfterUnlock, setOpenIdentityAfterUnlock] =
    useState(false);
  const linkOperationRef = useRef(0);
  const zSeedConfigured = activeAccount?.seeds?.[DLIGHT_PRIVATE] != null;
  const shieldedKeyLoaded =
    requestCoinObj?.id != null &&
    activeAccount?.keys?.[requestCoinObj.id]?.[DLIGHT_PRIVATE] != null;
  const shieldedSetupBlocksResponse =
    activeAccountMatchesRequest &&
    requestCoinObj?.id != null &&
    !shieldedKeyLoaded;
  const shieldedSetupNeedsProfile =
    shieldedSetupBlocksResponse && !zSeedConfigured;
  const shieldedSetupNeedsRestart =
    shieldedSetupBlocksResponse && zSeedConfigured;
  const waitingForLinkedIds =
    activeAccountMatchesRequest &&
    !shieldedSetupBlocksResponse &&
    !linkedIdsLoaded;
  const showSelectedIdentityCard =
    selectedIdentity &&
    activeAccountMatchesRequest &&
    !shieldedSetupBlocksResponse;

  const matchingIdentities = useMemo(
    () => buildMatchingIdentities(linkedIds, requestIdentityChainId),
    [linkedIds, requestIdentityChainId],
  );
  const identityPickerData = useMemo(
    () => buildPickerIdentityData(linkedIds, requestIdentityChainId),
    [linkedIds, requestIdentityChainId],
  );
  const isRequestChainId = useCallback(
    chainId =>
      String(chainId).toLowerCase() ===
      String(requestIdentityChainId).toLowerCase(),
    [requestIdentityChainId],
  );
  const isIdentityAllowed = useCallback(
    chainId => isRequestChainId(chainId),
    [isRequestChainId],
  );
  const isAutoLinkCandidateAllowed = useCallback(
    candidate => {
      const chainId = candidate?.chainId || requestIdentityChainId;
      return Boolean(candidate?.identityAddress && isRequestChainId(chainId));
    },
    [isRequestChainId, requestIdentityChainId],
  );

  const loadLinkedIds = useCallback(async isCurrent => {
    const shouldApply = () =>
      typeof isCurrent === 'function' ? isCurrent() : true;

    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      const nextLinkedIds = verusIdServiceData.linked_ids || {};

      if (shouldApply()) setLinkedIds(nextLinkedIds);
      return nextLinkedIds;
    } catch (e) {
      if (shouldApply()) setLinkedIds({});
      return {};
    } finally {
      if (shouldApply()) setLinkedIdsLoaded(true);
    }
  }, []);

  const loadLinkedIdsAndSelect = useCallback(
    async ({
      preferredIAddress,
      previousAddressSet,
      reopenIdentitySheet,
      isCurrent,
    }) => {
      const shouldApply = () =>
        typeof isCurrent === 'function' ? isCurrent() : true;

      if (shouldApply()) setLinkedIdsLoaded(false);

      const nextLinkedIds = await loadLinkedIds(isCurrent);
      const nextIdentity = findPreferredIdentity({
        linkedIds: nextLinkedIds,
        preferredIAddress,
        previousAddressSet,
        requestIdentityChainId,
      });

      if (nextIdentity) {
        if (shouldApply()) {
          setSelectedIdentity(nextIdentity);
          setIdentitySheetVisible(false);
        }
        return nextIdentity;
      }

      if (reopenIdentitySheet && shouldApply()) {
        setIdentitySheetVisible(true);
      }

      return nextIdentity;
    },
    [loadLinkedIds, requestIdentityChainId],
  );

  useEffect(() => {
    if (signedIn) {
      setLinkedIdsLoaded(false);
      loadLinkedIds();
    } else {
      setLinkedIds({});
      setLinkedIdsLoaded(false);
      setSelectedIdentity(null);
    }
  }, [encryptedIds, loadLinkedIds, signedIn]);

  useEffect(() => {
    if (!activeAccountMatchesRequest) return;
    if (!linkedIdsLoaded) return;
    if (selectedIdentity) return;
    if (matchingIdentities.length === 0) return;

    setSelectedIdentity(matchingIdentities[0]);
  }, [
    activeAccountMatchesRequest,
    linkedIdsLoaded,
    matchingIdentities,
    selectedIdentity,
  ]);

  useEffect(() => {
    if (!selectedIdentity) return;
    if (selectedIdentity.chainId === requestIdentityChainId) return;

    setSelectedIdentity(null);
  }, [requestIdentityChainId, selectedIdentity]);

  useEffect(() => {
    if (!openIdentityAfterUnlock) return;
    if (!activeAccountMatchesRequest) return;
    if (!linkedIdsLoaded) return;

    setOpenIdentityAfterUnlock(false);
    setIdentitySheetVisible(true);
  }, [activeAccountMatchesRequest, linkedIdsLoaded, openIdentityAfterUnlock]);

  const canOpenSignerDetails = signerSystemName && signerIdentityID;

  const loadSignerVerusId = useCallback(async () => {
    if (!canOpenSignerDetails) {
      throw new Error('Signer identity is not available');
    }

    const coinObj = CoinDirectory.getBasicCoinObj(signerSystemName);
    if (!coinObj) throw new Error('Signer network is not available');

    const res = await getIdentity(coinObj.system_id, signerIdentityID);
    if (res.error) throw new Error(res.error.message);

    return res.result;
  }, [canOpenSignerDetails, signerIdentityID, signerSystemName]);
  const loadSignerFriendlyNames = useCallback(
    async identityObj => {
      try {
        const coinObj = CoinDirectory.getBasicCoinObj(signerSystemName);
        if (!coinObj) throw new Error('Signer network is not available');

        return getFriendlyNameMap(coinObj.system_id, identityObj);
      } catch (e) {
        return {
          ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
          ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        };
      }
    },
    [signerSystemName],
  );
  const openSignerDetailsSheet = useCallback(() => {
    if (!canOpenSignerDetails) return;

    setVerusIdDetailsSheetVisible(true);
  }, [canOpenSignerDetails]);

  const handleWalletUnlock = async () => {
    const allowList = (accounts || []).filter(
      account => accountIsTestnet(account) === requestIsTestnet,
    );

    if (allowList.length === 0) {
      createAlert(
        'Cannot continue',
        `No ${
          requestIsTestnet ? 'testnet' : 'mainnet'
        } wallets found, cannot respond to this encryption request.`,
      );
      return;
    }

    try {
      await requestWalletUnlock({
        reason: 'app-encryption-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Encryption request',
        accountHashes: allowList.map(account => account.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
      setOpenIdentityAfterUnlock(true);
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert(
          'Cannot continue',
          e?.message || 'Unable to unlock wallet.',
        );
      }
    }
  };

  const linkIdentityCandidate = useCallback(
    async (candidate, {showError = true, isCurrent: callerIsCurrent} = {}) => {
      const shouldApply = () =>
        typeof callerIsCurrent === 'function' ? callerIsCurrent() : true;
      const requestContext = {
        sessionScope: captureSessionScope(
          Store.getState(),
          renderedAccountHash,
        ),
      };
      const operationToken = linkOperationRef.current + 1;
      linkOperationRef.current = operationToken;
      const isOperationCurrent = () =>
        linkOperationRef.current === operationToken &&
        shouldApply() &&
        sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope);
      const assertSessionCurrent = () => {
        if (!isOperationCurrent()) {
          const error = new Error(
            'Account changed while the VerusID was being linked.',
          );
          error.code = SESSION_CHANGED;
          throw error;
        }
      };

      // The candidate belongs to the account this screen rendered. If the store
      // account already moved on, the link must not run against the new one.
      assertSessionCurrent();

      try {
        const candidateChainId = candidate?.chainId || requestIdentityChainId;
        const identityAddress = candidate?.identityAddress;
        const fullyQualifiedName = candidate?.fullyQualifiedName;
        const primaryAddresses =
          candidate?.identity?.primaryaddresses ||
          candidate?.identity?.primaryAddresses ||
          [];
        const displayName =
          candidate?.displayName ||
          (fullyQualifiedName
            ? convertFqnToDisplayFormat(fullyQualifiedName)
            : null);

        if (!activeAccount?.id) {
          throw new Error('You must be signed in to link VerusIDs.');
        }

        if (
          !candidate ||
          !identityAddress ||
          !fullyQualifiedName ||
          !displayName
        ) {
          throw new Error('Unable to link this VerusID.');
        }

        if (candidate.status !== 'active') {
          throw new Error('Only active VerusIDs can be linked.');
        }

        if (
          !candidate.primaryAddress ||
          !primaryAddresses.includes(candidate.primaryAddress)
        ) {
          throw new Error(
            'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
          );
        }

        if (!isAutoLinkCandidateAllowed(candidate)) {
          throw new Error(
            'This VerusID does not match the request network.',
          );
        }

        // The candidate's chosen primary R-address must belong to the account
        // that is scoped right now, not only to the identity's own primary
        // address list, and its origin session must still be live.
        const liveState = Store.getState();

        if (
          candidate?.origin &&
          !identityLinkOriginIsCurrent(liveState, candidate.origin)
        ) {
          const sessionError = new Error(
            'Account changed while the VerusID was being linked.',
          );
          sessionError.code = SESSION_CHANGED;
          throw sessionError;
        }

        if (!identityLinkCandidateMatchesAccount(liveState, candidate)) {
          throw new Error(
            'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
          );
        }

        const coinObj = CoinDirectory.findCoinObj(candidateChainId);

        if (!coinObj) {
          throw new Error('Unable to find the request network.');
        }

        await linkVerusId(
          identityAddress,
          displayName,
          coinObj.id,
          requestContext,
        );
        assertSessionCurrent();
        await updateVerusIdWallet(requestContext);
        assertSessionCurrent();
        clearChainLifecycle(coinObj.id);

        const setUserCoinsAction = setUserCoins(
          activeCoinList,
          activeAccount.id,
        );
        assertSessionCurrent();
        dispatch(setUserCoinsAction);
        refreshActiveChainLifecycles(
          setUserCoinsAction.payload.activeCoinsForUser,
        );

        assertSessionCurrent();
        const selectedLinkedIdentity = await loadLinkedIdsAndSelect({
          preferredIAddress: identityAddress,
          isCurrent: isOperationCurrent,
        });

        if (!isOperationCurrent()) return;

        if (!selectedLinkedIdentity) {
          setSelectedIdentity({
            chainId: coinObj.id,
            iAddress: identityAddress,
            friendlyName: displayName,
          });
          setIdentitySheetVisible(false);
        }
      } catch (e) {
        if (showError && isOperationCurrent()) {
          createAlert('Error', e?.message || 'Unable to link VerusID.');
        }
        throw e;
      }
    },
    [
      activeAccount,
      activeCoinList,
      dispatch,
      isAutoLinkCandidateAllowed,
      loadLinkedIdsAndSelect,
      renderedAccountHash,
      requestIdentityChainId,
    ],
  );

  const linkAutoFoundIdentity = useCallback(
    candidate => linkIdentityCandidate(candidate, {showError: false}),
    [linkIdentityCandidate],
  );

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    setSelectedIdentity({chainId, iAddress, friendlyName});
    setIdentitySheetVisible(false);
  };

  const buildResponseAndContinue = async () => {
    if (!selectedIdentity) {
      setIdentitySheetVisible(true);
      return;
    }

    setProcessing(true);

    try {
      const updatedResponse = cloneGenericResponse(response);
      const coinObj = CoinDirectory.findCoinObj(selectedIdentity.chainId);

      if (!coinObj) {
        throw new Error('Unable to find selected identity network.');
      }

      ensureGenericResponseSigner({
        response: updatedResponse,
        systemID: coinObj.system_id,
        identityID: selectedIdentity.iAddress,
      });

      const {responseDetail} = await processAppEncryptionRequest({
        request,
        detailIndex,
        responseSignerID: selectedIdentity.iAddress,
      });

      updatedResponse.details = updatedResponse.details || [];
      updatedResponse.details = [...updatedResponse.details, responseDetail];
      updatedResponse.setFlags();

      await next(updatedResponse, [detailIndex], {
        autoDeliverOnComplete: true,
      });
    } catch (e) {
      const isZSeedMissing =
        e.message && e.message.includes('No Z recovery secret');

      createAlert(
        isZSeedMissing ? 'Z recovery secret required' : 'Error',
        e.message || 'Failed to process encryption request.',
      );

      if (isZSeedMissing) {
        cancel();
      }
    } finally {
      setProcessing(false);
    }
  };

  const openProfileSettings = useCallback(() => {
    dispatch(setConfigSection('settings-profile'));
    dispatch(resetDeeplinkData());

    const settingsRoute = ENABLE_SIGNED_IN_REDESIGN
      ? {
          screen: 'Home',
          params: {
            screen: 'SettingsHome',
            params: {screen: 'ProfileSettings'},
          },
        }
      : {
          screen: 'MainStack',
          params: {
            screen: 'SettingsMenus',
            params: {title: 'Profile'},
          },
        };

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'SignedInStack',
            params: settingsRoute,
          },
        ],
      }),
    );
  }, [dispatch, navigation]);

  const primaryActionLabel = processing
    ? 'Preparing response'
    : !activeAccountMatchesRequest
    ? signedIn
      ? 'Switch wallet'
      : 'Unlock wallet'
    : shieldedSetupNeedsProfile
    ? `Open ${PROFILE_SECURITY_SETTINGS_LABEL}`
    : shieldedSetupNeedsRestart
    ? 'Restart required'
    : !linkedIdsLoaded
    ? 'Loading VerusIDs'
    : selectedIdentity
    ? returnESK
      ? 'Approve high-risk request'
      : 'Share encryption address'
    : 'Choose VerusID';
  const primaryActionDisabled =
    processing ||
    waitingForLinkedIds ||
    shieldedSetupNeedsRestart;
  const activeAccountInstruction = !activeAccountMatchesRequest
    ? signedIn
      ? 'Switch wallet first, then select identity.'
      : 'Unlock wallet first, then select identity.'
    : null;
  const requesterMetadataRows = [
    systemLabel ? {label: 'Network', value: systemLabel} : null,
    sigDateString ? {label: 'Signed', value: sigDateString} : null,
    deliveryInfo.destinationHost
      ? {
          label: 'Response destination',
          value: deliveryInfo.destinationHost,
        }
      : null,
    deliveryMethod ? {label: 'Delivery', value: deliveryMethod} : null,
  ].filter(Boolean);
  const requestDetailsSections = useMemo(() => {
    const responseRows = responseUris
      .map((uri, index) => {
        const uriString = getUriString(uri);
        if (!uriString) return null;

        return {
          label:
            responseUris.length > 1
              ? `Response URI ${index + 1}`
              : 'Response URI',
          value: uriString,
        };
      })
      .filter(Boolean);
    const encryptionRows = [
      {label: 'Key number', value: `#${derivationNumber}`},
      {
        label: 'Derive for',
        value: hasDerivationID
          ? derivationIdFqn || 'Specified identity'
          : 'This app only',
      },
      hasRequestID ? {label: 'Request ID', value: requestIdFqn} : null,
      hasEncryptResponseToAddress
        ? {label: 'Reply encrypted to', value: encryptResponseToAddress}
        : null,
      {label: 'Spending key', value: returnESK ? 'Requested' : 'Not requested'},
    ].filter(Boolean);
    const walletRows = [
      {
        label: 'Wallet state',
        value: activeAccountMatchesRequest
          ? shieldedSetupNeedsProfile
            ? 'Private address setup required'
            : shieldedSetupNeedsRestart
            ? 'Restart required'
            : 'Ready for this request'
          : signedIn
          ? 'Switch wallet required'
          : 'Unlock wallet required',
      },
      selectedIdentity
        ? {label: 'Selected identity', value: selectedIdentity.friendlyName}
        : {label: 'Selected identity', value: 'Not selected'},
    ];

    return [
      {title: 'Response', rows: responseRows},
      {title: 'Encryption', rows: encryptionRows},
      {title: 'Wallet', rows: walletRows},
    ].filter(section => section.rows.length > 0);
  }, [
    activeAccountMatchesRequest,
    derivationIdFqn,
    derivationNumber,
    encryptResponseToAddress,
    hasDerivationID,
    hasEncryptResponseToAddress,
    hasRequestID,
    requestIdFqn,
    responseUris,
    returnESK,
    selectedIdentity,
    shieldedSetupNeedsProfile,
    shieldedSetupNeedsRestart,
    signedIn,
  ]);

  const handlePrimaryAction = () => {
    if (!activeAccountMatchesRequest) {
      handleWalletUnlock();
      return;
    }

    if (shieldedSetupNeedsProfile) {
      openProfileSettings();
      return;
    }

    if (shieldedSetupNeedsRestart) {
      return;
    }

    if (!selectedIdentity) {
      setIdentitySheetVisible(true);
      return;
    }

    buildResponseAndContinue();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <IdentityPickerSheet
        visible={identitySheetVisible}
        coinObj={requestCoinObj}
        isCandidateAllowed={isAutoLinkCandidateAllowed}
        linkedIds={identityPickerData.linkedIds}
        sortedIds={identityPickerData.sortedIds}
        isIdentityAllowed={isIdentityAllowed}
        selectedIdentity={selectedIdentity}
        provisioningEnabled={false}
        initialMode={VERUSID_SHEET_MODES.CHOOSE}
        onClose={() => setIdentitySheetVisible(false)}
        onLinkCandidate={linkAutoFoundIdentity}
        onSelect={handleSelectIdentity}
      />
      <DeepLinkRequestDetailsSheet
        onClose={() => setRequestDetailsSheetVisible(false)}
        sections={requestDetailsSections}
        visible={requestDetailsSheetVisible}
      />
      <DeepLinkVerusIdDetailsSheet
        visible={verusIdDetailsSheetVisible}
        onClose={() => setVerusIdDetailsSheetVisible(false)}
        loadVerusId={loadSignerVerusId}
        loadFriendlyNames={loadSignerFriendlyNames}
      />
      <DeepLinkReviewScrollView>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Share encryption address</Text>
          <Text style={styles.mainSubtitle}>
            This creates an app-specific encryption address from the selected VerusID.
          </Text>
        </View>

        <DeepLinkRequestSourceCard
          metadataRows={requesterMetadataRows}
          onPressRequestDetails={() => setRequestDetailsSheetVisible(true)}
          onPressRequester={
            canOpenSignerDetails ? openSignerDetailsSheet : undefined
          }
          requesterAccessibilityHint="View VerusID details"
          requesterLabel={requesterLabel}
          showRequestDetailsLink
        />

        {returnESK && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons
                name="alert"
                size={21}
                color={theme.colors.warning}
              />
              <Text style={styles.warningTitle}>
                Extended spending key requested
              </Text>
            </View>
            <Text style={styles.warningText}>
              This app is also requesting the extended spending key for this
              derived address. That grants spending capability for this
              specific derived address.
            </Text>
            <Text style={styles.warningEmphasis}>
              Only approve if you fully trust this application.
            </Text>
          </View>
        )}

        <View style={{height: 24}} />
      </DeepLinkReviewScrollView>

      <SafeBottomActionStack
        gap={10}
        horizontalSpacing={24}
        style={styles.footer}>
        {activeAccountInstruction && (
          <View style={styles.footerInfoRow}>
            <View style={styles.footerInfoIcon}>
              <Info
                size={16}
                strokeWidth={2.1}
                color={theme.colors.textSubtle}
              />
            </View>
            <Text style={styles.footerInfoText}>
              {activeAccountInstruction}
            </Text>
          </View>
        )}
        {showSelectedIdentityCard && (
          <View>
            <Text style={styles.selectedIdentityLabel}>Respond as</Text>
            <TouchableOpacity
              accessibilityHint="Open VerusID options"
              accessibilityLabel={`Selected identity ${selectedIdentity.friendlyName}`}
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={() => setIdentitySheetVisible(true)}
              style={styles.selectedIdentityCard}>
              <View style={styles.selectedIdentityText}>
                <Text numberOfLines={1} style={styles.selectedIdentityName}>
                  {selectedIdentity.friendlyName}
                </Text>
              </View>
              <View style={styles.selectedIdentityCheck}>
                <Check color={theme.colors.success} size={22} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        )}
        {shieldedSetupBlocksResponse && (
          <View style={styles.footerWarningCard}>
            <Text style={styles.footerWarningTitle}>
              {shieldedSetupNeedsProfile
                ? 'Private address setup required'
                : 'Restart Verus Mobile'}
            </Text>
            <Text style={styles.footerWarningText}>
              {shieldedSetupNeedsProfile
                ? SHIELDED_SETUP_PROFILE_MESSAGE
                : SHIELDED_SETUP_RESTART_MESSAGE}
            </Text>
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
        <AppButton
          buttonColor={theme.colors.surfaceMuted}
          disabled={processing}
          height={56}
          onPress={cancel}
          themeMode={theme.mode}
          textColor={
            theme.isDark ? theme.colors.textPrimary : theme.colors.primary
          }
          variant="secondary">
          Cancel
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

const AppEncryptionRequestInfo = props => (
  <OnboardingThemeProvider>
    <AppEncryptionRequestInfoContent {...props} />
  </OnboardingThemeProvider>
);

export default AppEncryptionRequestInfo;
