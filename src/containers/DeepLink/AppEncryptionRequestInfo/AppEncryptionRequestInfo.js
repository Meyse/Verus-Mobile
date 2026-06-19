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
import LottieView from 'lottie-react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Check, Info} from 'lucide-react-native';
import {
  CompactAddressObject,
  GenericResponse,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {
  openLinkIdentityModal,
} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import {
  LINK_IDENTITY_SEND_MODAL,
} from '../../../utils/constants/sendModal';
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
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import {DLIGHT_PRIVATE} from '../../../utils/constants/intervalConstants';
import {VERUSID_NETWORK_DEFAULT} from '../../../../env/index';
import {processAppEncryptionRequest} from '../../../utils/deeplink/handlers/appEncryptionRequestHandler';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
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

const SHIELDED_SETUP_PROFILE_MESSAGE =
  'Set up the shielded-address seed in Settings > Profile, then restart Verus Mobile and try again.';

const SHIELDED_SETUP_RESTART_MESSAGE =
  'Restart Verus Mobile, unlock this profile, and try again.';

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

const getUriDisplayHost = uri => {
  const uriString = getUriString(uri);
  if (!uriString) return null;

  const hostMatch = uriString.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
  return hostMatch ? hostMatch[1] : uriString;
};

const getLinkedAddressSet = linkedIds => {
  const addresses = new Set();

  for (const chainId of Object.keys(linkedIds || {})) {
    for (const iAddress of Object.keys(linkedIds[chainId] || {})) {
      addresses.add(iAddress.toLowerCase());
    }
  }

  return addresses;
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

const LoadingSheet = ({styles, visible}) => (
  <BottomSheetModal
    closeDisabled
    contentContainerStyle={styles.loadingSheetContainer}
    maxHeight={190}
    onClose={() => {}}
    visible={visible}>
    <View
      accessibilityLabel="Preparing encrypted reply"
      accessibilityRole="progressbar"
      style={styles.loadingSheetBody}>
      <LottieView
        autoPlay
        loop
        source={require('../../../animations/loading_7bars.json')}
        style={styles.loadingAnimation}
      />
      <Text style={styles.loadingTitle}>Preparing encrypted reply</Text>
      <Text style={styles.loadingSubtitle}>
        Deriving the encrypted response for this app.
      </Text>
    </View>
  </BottomSheetModal>
);

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
  const encryptedIds = useObjectSelector(
    state => state.services.stored[VERUSID_SERVICE_ID],
  );
  const sendModal = useObjectSelector(state => state.sendModal);
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
  const websiteLabel = getUriDisplayHost(responseUris[0]);
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
  const sendModalWasVisibleRef = useRef(false);
  const launchedLinkModalRef = useRef(null);
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

  const loadLinkedIds = useCallback(async () => {
    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      const nextLinkedIds = verusIdServiceData.linked_ids || {};

      setLinkedIds(nextLinkedIds);
      return nextLinkedIds;
    } catch (e) {
      setLinkedIds({});
      return {};
    } finally {
      setLinkedIdsLoaded(true);
    }
  }, []);

  const loadLinkedIdsAndSelect = useCallback(
    async ({preferredIAddress, previousAddressSet, reopenIdentitySheet}) => {
      setLinkedIdsLoaded(false);

      const nextLinkedIds = await loadLinkedIds();
      const nextIdentity = findPreferredIdentity({
        linkedIds: nextLinkedIds,
        preferredIAddress,
        previousAddressSet,
        requestIdentityChainId,
      });

      if (nextIdentity) {
        setSelectedIdentity(nextIdentity);
        setIdentitySheetVisible(false);
        return nextIdentity;
      }

      if (reopenIdentitySheet) {
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

  useEffect(() => {
    const sendModalClosed =
      sendModalWasVisibleRef.current &&
      !sendModal.visible &&
      sendModal.type == null;

    sendModalWasVisibleRef.current = sendModal.visible;

    if (!sendModalClosed) return;
    if (launchedLinkModalRef.current?.type !== LINK_IDENTITY_SEND_MODAL) {
      return;
    }

    const launchedModal = launchedLinkModalRef.current;
    launchedLinkModalRef.current = null;

    loadLinkedIdsAndSelect({
      previousAddressSet: launchedModal.previousAddressSet,
      reopenIdentitySheet: true,
    }).catch(e => {
      console.warn('Unable to reload linked identities after linking', e);
      setIdentitySheetVisible(true);
    });
  }, [loadLinkedIdsAndSelect, sendModal.type, sendModal.visible]);

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
        } profiles found, cannot respond to this encryption request.`,
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
        makeDefaultAllowed: true,
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

  const handleManualLinkExisting = useCallback(() => {
    if (!requestCoinObj) {
      createAlert('Cannot link VerusID', 'Unable to find the request network.');
      return;
    }

    launchedLinkModalRef.current = {
      type: LINK_IDENTITY_SEND_MODAL,
      previousAddressSet: getLinkedAddressSet(linkedIds),
    };
    setIdentitySheetVisible(false);
    openLinkIdentityModal(requestCoinObj);
  }, [linkedIds, requestCoinObj]);

  const linkIdentityCandidate = useCallback(
    async candidate => {
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

        const coinObj = CoinDirectory.findCoinObj(candidateChainId);

        if (!coinObj) {
          throw new Error('Unable to find the request network.');
        }

        await linkVerusId(identityAddress, displayName, coinObj.id);
        await updateVerusIdWallet();
        clearChainLifecycle(coinObj.id);

        const setUserCoinsAction = setUserCoins(
          activeCoinList,
          activeAccount.id,
        );
        dispatch(setUserCoinsAction);
        refreshActiveChainLifecycles(
          setUserCoinsAction.payload.activeCoinsForUser,
        );

        const selectedLinkedIdentity = await loadLinkedIdsAndSelect({
          preferredIAddress: identityAddress,
        });

        if (!selectedLinkedIdentity) {
          setSelectedIdentity({
            chainId: coinObj.id,
            iAddress: identityAddress,
            friendlyName: displayName,
          });
          setIdentitySheetVisible(false);
        }
      } catch (e) {
        createAlert('Error', e?.message || 'Unable to link VerusID.');
        throw e;
      }
    },
    [
      activeAccount,
      activeCoinList,
      dispatch,
      isAutoLinkCandidateAllowed,
      loadLinkedIdsAndSelect,
      requestIdentityChainId,
    ],
  );

  const linkAutoFoundIdentity = useCallback(
    candidate => linkIdentityCandidate(candidate),
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
      const {responseDetail} = await processAppEncryptionRequest({
        request,
        detailIndex,
        responseSignerID: selectedIdentity.iAddress,
      });
      const updatedResponse = cloneGenericResponse(response);

      updatedResponse.details = updatedResponse.details || [];
      updatedResponse.details = [...updatedResponse.details, responseDetail];
      if (typeof updatedResponse.setFlags === 'function') {
        updatedResponse.setFlags();
      }

      if (updatedResponse.signature == null) {
        const coinObj = CoinDirectory.findCoinObj(selectedIdentity.chainId);

        if (!coinObj) {
          throw new Error('Unable to find selected identity network.');
        }

        updatedResponse.signature = new VerifiableSignatureData({
          systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
          identityID: CompactAddressObject.fromIAddress(
            selectedIdentity.iAddress,
          ),
        });
        updatedResponse.setSigned();
      }

      await next(updatedResponse, [detailIndex], {
        autoDeliverOnComplete: true,
      });
    } catch (e) {
      const isZSeedMissing =
        e.message && e.message.includes('No Z (shielded address) seed');

      createAlert(
        isZSeedMissing ? 'Z seed required' : 'Error',
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

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'SignedInStack',
            params: {
              screen: 'MainStack',
              params: {
                screen: 'SettingsMenus',
                params: {title: 'Profile'},
              },
            },
          },
        ],
      }),
    );
  }, [dispatch, navigation]);

  const primaryActionLabel = !activeAccountMatchesRequest
    ? signedIn
      ? 'Switch wallet'
      : 'Unlock wallet'
    : shieldedSetupNeedsProfile
    ? 'Open Profile settings'
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
    websiteLabel ? {label: 'Website', value: websiteLabel} : null,
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
        onManualLink={handleManualLinkExisting}
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
      <LoadingSheet styles={styles} visible={processing} />
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
