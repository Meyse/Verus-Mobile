/*
  AuthenticationRequestInfo
  - 2026-02-07: Inline identity selection via bottom sheet.
    - Added identity loading, constraint filtering, and IdentityPickerSheet
    - Choose-identity card opens sheet; selection shown on card
    - Continue builds response in-place instead of navigating to separate screen
    - Fixed connector arrow to attach flush to top card
    - Changed selection accent from blue to verusGreenColor
    - Disabled Continue until identity is selected
    - Resolved constraint i-addresses to friendly names via getIdentity
  - 2026-03-11: Fixed auth constraint system resolution and offline parent derivation .
*/
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {CommonActions} from '@react-navigation/native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import {
  openLinkIdentityModal,
  openProvisionIdentityModal,
} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import {
  LINK_IDENTITY_SEND_MODAL,
  PROVISION_IDENTITY_SEND_MODAL,
  SEND_MODAL_IDENTITY_TO_LINK_FIELD,
} from '../../../utils/constants/sendModal';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {setUserCoins} from '../../../actions/actionCreators';
import {
  updateVerusIdWallet,
} from '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {linkVerusId} from '../../../actions/actions/services/dispatchers/verusid/verusid';
import {unixToDate} from '../../../utils/math';
import {
  AuthenticationRequestDetails,
  RecipientConstraint,
  AuthenticationResponseDetails,
  AuthenticationResponseOrdinalVDXFObject,
  CompactAddressObject,
  fqnToParentAddress,
  fqnToParentFqn,
  GenericResponse,
  ProvisionIdentityDetails,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  getFriendlyNameMap,
  getCurrency,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {requestServiceStoredData} from '../../../utils/auth/authBox';
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Check, Info} from 'lucide-react-native';
import {
  authenticationRequestInfoStyles as createAuthenticationRequestInfoStyles,
} from '../../../styles';
import IdentityPickerSheet, {
  VERUSID_SHEET_MODES,
} from './components/IdentityPickerSheet';
import { markPendingDeeplinkComplete } from '../../../utils/deeplink/pendingDeeplinkStorage';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';

const toAddressString = addressObj => {
  if (addressObj == null || typeof addressObj.toAddress !== 'function') {
    throw new Error('Expected compact address object');
  }

  return addressObj.toAddress();
};

const EMPTY_RECIPIENT_CONSTRAINTS = [];
const ROOT_CHAIN_BY_NETWORK = {
  mainnet: 'VRSC',
  testnet: 'VRSCTEST',
};

const getDisplaySystemName = fullyqualifiedname => {
  if (!fullyqualifiedname) return null;

  const displayName = convertFqnToDisplayFormat(fullyqualifiedname);
  return displayName.endsWith('@')
    ? displayName.slice(0, displayName.length - 1)
    : displayName;
};

const getOfflineSystemName = systemId => {
  if (!systemId) return null;

  try {
    return getSystemNameFromSystemId(systemId);
  } catch (e) {
    return null;
  }
};

const getUriDisplayHost = uri => {
  if (!uri || typeof uri.getUriString !== 'function') return null;

  const uriString = uri.getUriString();
  if (!uriString) return null;
  const hostMatch = uriString.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);

  return hostMatch ? hostMatch[1] : uriString;
};

const getRequestIdDisplay = details => {
  if (
    !details ||
    typeof details.hasRequestID !== 'function' ||
    !details.hasRequestID()
  ) {
    return null;
  }

  try {
    return typeof details.requestID?.toAddress === 'function'
      ? details.requestID.toAddress()
      : null;
  } catch (e) {
    return null;
  }
};

const AuthenticationRequestInfoContent = props => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createAuthenticationRequestInfoStyles(theme),
    [theme],
  );
  const {
    detailsBufferString,
    sigtime,
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    provisioningDetailsBufferString,
    provisioningDetailIndex,
    cancel,
    next,
    request,
    response,
    detailIndex,
  } = props;

  const [details, setDetails] = useState(new AuthenticationRequestDetails());
  const [sigDateString, setSigDateString] = useState(null);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] =
    useState(null);
  const [constraintFriendlyNames, setConstraintFriendlyNames] = useState({});
  const [passthroughHandled, setPassthroughHandled] = useState(false);
  const [requestDetailsSheetVisible, setRequestDetailsSheetVisible] =
    useState(false);
  const [resolvedSystemNames, setResolvedSystemNames] = useState({});
  const attemptedSystemNameLookupsRef = useRef(new Set());

  // Identity picker state
  const [linkedIds, setLinkedIds] = useState({});
  const [linkedIdsLoaded, setLinkedIdsLoaded] = useState(false);
  const [linkedIdentityParentIds, setLinkedIdentityParentIds] = useState({});
  const [linkedIdentityParentsLoaded, setLinkedIdentityParentsLoaded] =
    useState(false);
  const [sortedIds, setSortedIds] = useState({});
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [identitySheetInitialMode, setIdentitySheetInitialMode] = useState(
    VERUSID_SHEET_MODES.CHOOSE,
  );
  const [selectedIdentity, setSelectedIdentity] = useState(null); // { chainId, iAddress, friendlyName }
  const [openIdentityAfterUnlock, setOpenIdentityAfterUnlock] =
    useState(false);
  const [idProvisionSuccess, setIdProvisionSuccess] = useState(false);
  const launchedSendModalRef = useRef(null);
  const sendModalWasVisibleRef = useRef(false);
  const successfulSendModalTypeRef = useRef(null);
  const successNavigationStartedRef = useRef(false);

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const pendingDeeplinkId =
    passthrough?.pendingDeeplinkId ||
    passthrough?.pendingProvisioningDeeplinkId;
  const fromService = useSelector(state => state.deeplink.fromService);
  const sendModal = useObjectSelector(state => state.sendModal);
  const sendModalType = useSelector(state => state.sendModal.type);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const isTestAccount = accountIsTestnet(activeAccount);
  const encryptedIds = useObjectSelector(
    state => state.services.stored[VERUSID_SERVICE_ID],
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

  const requestIsTestnet = request != null && request.isTestnet();
  const activeAccountMatchesRequest =
    signedIn && activeAccount != null && isTestAccount === requestIsTestnet;
  const defaultRootChainId = requestIsTestnet
    ? ROOT_CHAIN_BY_NETWORK.testnet
    : ROOT_CHAIN_BY_NETWORK.mainnet;
  const defaultRootSystemId =
    CoinDirectory.getBasicCoinObj(defaultRootChainId).system_id;
  const requesterLabel = signerFqn || 'An app';

  // Identity constraint filtering (mirrored from AuthenticationRequestIdentity)
  const recipientConstraints =
    details && details.recipientConstraints
      ? details.recipientConstraints
      : EMPTY_RECIPIENT_CONSTRAINTS;
  const requiredSystemIds = useMemo(() => {
    return recipientConstraints
      .filter(x => x.type === RecipientConstraint.REQUIRED_SYSTEM)
      .map(x => {
        try {
          return toAddressString(x.identity);
        } catch (e) {
          return null;
        }
      })
      .filter(x => x != null);
  }, [recipientConstraints]);
  const systemIdsToResolve = useMemo(() => {
    return Array.from(
      new Set([signerSystemID, ...requiredSystemIds].filter(Boolean)),
    );
  }, [requiredSystemIds, signerSystemID]);
  const responseUris = useMemo(() => {
    if (request && request.responseURIs && request.responseURIs.length > 0) {
      return request.responseURIs;
    }

    return [];
  }, [request]);
  const websiteLabel = getUriDisplayHost(responseUris[0]);

  useEffect(() => {
    let cancelled = false;

    const resolveSystemNames = async () => {
      const pendingSystemIds = systemIdsToResolve.filter(
        systemId =>
          resolvedSystemNames[systemId] == null &&
          !attemptedSystemNameLookupsRef.current.has(
            `${defaultRootSystemId}:${systemId}`,
          ),
      );

      if (pendingSystemIds.length === 0) {
        return;
      }

      const resolvedNames = {};

      for (const systemId of pendingSystemIds) {
        if (cancelled) {
          return;
        }

        attemptedSystemNameLookupsRef.current.add(
          `${defaultRootSystemId}:${systemId}`,
        );
        const offlineName = getOfflineSystemName(systemId);

        if (offlineName) {
          resolvedNames[systemId] = offlineName;
          continue;
        }

        try {
          const currencyRes = await getCurrency(defaultRootSystemId, systemId);
          if (!currencyRes.error && currencyRes.result?.fullyqualifiedname) {
            resolvedNames[systemId] = getDisplaySystemName(
              currencyRes.result.fullyqualifiedname,
            );
          }
        } catch (e) {
          // leave unresolved systems empty rather than guessing the wrong chain.
        }
      }

      if (!cancelled && Object.keys(resolvedNames).length > 0) {
        setResolvedSystemNames(prev => ({...prev, ...resolvedNames}));
      }
    };

    resolveSystemNames();

    return () => {
      cancelled = true;
    };
  }, [defaultRootSystemId, resolvedSystemNames, systemIdsToResolve]);

  const allowedSystems = useMemo(() => {
    return new Set(
      requiredSystemIds
        .map(systemId => resolvedSystemNames[systemId])
        .filter(Boolean)
        .map(systemName => systemName.toLowerCase()),
    );
  }, [requiredSystemIds, resolvedSystemNames]);
  const requiredSystemsResolved = useMemo(() => {
    return requiredSystemIds.every(systemId => resolvedSystemNames[systemId]);
  }, [requiredSystemIds, resolvedSystemNames]);
  const signerChainId = resolvedSystemNames[signerSystemID] || signerSystemName;
  const canOpenSignerModal = signerChainId && signerIdentityID;
  const systemLabel = signerChainId || signerSystemID;

  const requiredIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === RecipientConstraint.REQUIRED_ID)
        .map(x => {
          try {
            return toAddressString(x.identity);
          } catch (e) {
            return null;
          }
        })
        .filter(x => x != null),
    );
  }, [recipientConstraints]);

  const requiredParentIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === RecipientConstraint.REQUIRED_PARENT)
        .map(x => {
          try {
            return toAddressString(x.identity);
          } catch (e) {
            return null;
          }
        })
        .filter(x => x != null),
    );
  }, [recipientConstraints]);
  const parentConstraintFriendlyNames = useMemo(() => {
    const names = {};

    if (requiredParentIds.size === 0) {
      return names;
    }

    for (const chainId of Object.keys(linkedIds)) {
      for (const fullyqualifiedname of Object.values(linkedIds[chainId] || {})) {
        if (!fullyqualifiedname) {
          continue;
        }

        try {
          const parentAddress = fqnToParentAddress(fullyqualifiedname, chainId);
          const parentFqn = fqnToParentFqn(fullyqualifiedname);

          if (
            parentAddress &&
            parentFqn &&
            requiredParentIds.has(parentAddress) &&
            names[parentAddress] == null
          ) {
            names[parentAddress] = convertFqnToDisplayFormat(parentFqn);
          }
        } catch (e) {
          // Ignore malformed FQNs and keep the address fallback below.
        }
      }
    }

    return names;
  }, [linkedIds, requiredParentIds]);

  const getKnownChainId = chainName => {
    if (!chainName) return chainName;

    const normalizedChainName = String(chainName).toLowerCase();
    const linkedChainId = Object.keys(linkedIds).find(
      key => key.toLowerCase() === normalizedChainName,
    );

    if (linkedChainId) return linkedChainId;

    const knownCoinId = Object.keys(CoinDirectory.coins || {}).find(
      key => key.toLowerCase() === normalizedChainName,
    );

    return knownCoinId || chainName;
  };

  const linkChainId =
    requiredSystemsResolved && requiredSystemIds.length > 0
      ? getKnownChainId(resolvedSystemNames[requiredSystemIds[0]])
      : defaultRootChainId;

  const isIdentityAllowed = (chainId, iAddr) => {
    if (requiredSystemIds.length > 0 && !requiredSystemsResolved) return false;
    if (requiredIds.size > 0 && !requiredIds.has(iAddr)) return false;
    if (
      allowedSystems.size > 0 &&
      !allowedSystems.has(String(chainId).toLowerCase())
    ) {
      return false;
    }

    if (requiredParentIds.size > 0) {
      if (!linkedIdentityParentsLoaded) return false;

      const identityParent =
        linkedIdentityParentIds[`${chainId}:${iAddr}`] || null;
      if (identityParent == null || !requiredParentIds.has(identityParent)) {
        return false;
      }
    }

    return true;
  };

  const isLinkedIdentityAllowed = useCallback(
    (sourceLinkedIds, chainId, iAddr) => {
      if (requiredSystemIds.length > 0 && !requiredSystemsResolved) {
        return false;
      }
      if (requiredIds.size > 0 && !requiredIds.has(iAddr)) return false;
      if (
        allowedSystems.size > 0 &&
        !allowedSystems.has(String(chainId).toLowerCase())
      ) {
        return false;
      }

      if (requiredParentIds.size > 0) {
        const friendlyName = sourceLinkedIds?.[chainId]?.[iAddr];

        if (!friendlyName) return false;

        try {
          const parentAddress = fqnToParentAddress(friendlyName, chainId);
          if (
            parentAddress == null ||
            !requiredParentIds.has(parentAddress)
          ) {
            return false;
          }
        } catch (e) {
          return false;
        }
      }

      return true;
    },
    [
      allowedSystems,
      requiredIds,
      requiredParentIds,
      requiredSystemIds.length,
      requiredSystemsResolved,
    ],
  );

  const getAllowedIdentityFromLinkedIds = useCallback(
    (sourceLinkedIds, preferredIAddress) => {
      const preferredKey = preferredIAddress
        ? preferredIAddress.toLowerCase()
        : null;
      const preferredDisplayKey = preferredIAddress
        ? convertFqnToDisplayFormat(preferredIAddress).toLowerCase()
        : null;
      const identities = Object.keys(sourceLinkedIds || {}).flatMap(chainId =>
        Object.keys(sourceLinkedIds[chainId] || {}).map(iAddress => ({
          chainId,
          iAddress,
          friendlyName: sourceLinkedIds[chainId][iAddress],
        })),
      );

      identities.sort((left, right) => {
        if (preferredKey) {
          const isPreferred = identity => {
            const friendlyName = (identity.friendlyName || '').toLowerCase();

            return (
              identity.iAddress.toLowerCase() === preferredKey ||
              friendlyName === preferredKey ||
              friendlyName === preferredDisplayKey
            );
          };
          const leftPreferred = isPreferred(left) ? 0 : 1;
          const rightPreferred = isPreferred(right) ? 0 : 1;

          if (leftPreferred !== rightPreferred) {
            return leftPreferred - rightPreferred;
          }
        }

        return (left.friendlyName || '').localeCompare(
          right.friendlyName || '',
        );
      });

      return (
        identities.find(identity =>
          isLinkedIdentityAllowed(
            sourceLinkedIds,
            identity.chainId,
            identity.iAddress,
          ),
        ) || null
      );
    },
    [isLinkedIdentityAllowed],
  );

  const isAutoLinkCandidateAllowed = useCallback(
    candidate => {
      const chainId = candidate?.chainId || linkChainId;
      const identityAddress = candidate?.identityAddress;
      const fullyQualifiedName = candidate?.fullyQualifiedName;

      if (!chainId || !identityAddress || !fullyQualifiedName) return false;

      return isLinkedIdentityAllowed(
        {
          [chainId]: {
            [identityAddress]: fullyQualifiedName,
          },
        },
        chainId,
        identityAddress,
      );
    },
    [isLinkedIdentityAllowed, linkChainId],
  );

  const reloadLinkedIdsAndSelect = useCallback(
    async ({preferredIAddress = null, reopenIdentitySheet = false} = {}) => {
      setLinkedIdsLoaded(false);

      const nextLinkedIds = await loadLinkedIds();
      const nextIdentity = getAllowedIdentityFromLinkedIds(
        nextLinkedIds,
        preferredIAddress,
      );

      if (nextIdentity) {
        setSelectedIdentity(nextIdentity);
        setIdentitySheetVisible(false);
        return true;
      }

      if (reopenIdentitySheet) {
        setIdentitySheetVisible(true);
      }

      return false;
    },
    [getAllowedIdentityFromLinkedIds, loadLinkedIds],
  );

  const getConstraintAddress = constraint => {
    if (constraint == null || constraint.identity == null) return null;
    return toAddressString(constraint.identity);
  };

  const getConstraintDisplayName = (constraintType, constraintAddress) => {
    if (constraintAddress && constraintFriendlyNames[constraintAddress]) {
      return constraintFriendlyNames[constraintAddress];
    }

    if (
      constraintType === RecipientConstraint.REQUIRED_SYSTEM &&
      constraintAddress
    ) {
      const systemName =
        resolvedSystemNames[constraintAddress] ||
        getOfflineSystemName(constraintAddress);
      if (systemName) return systemName;
      return 'Unknown system';
    }

    if (constraintAddress && constraintAddress.includes('@')) {
      return constraintAddress;
    }

    return constraintAddress || 'Unknown identity';
  };

  const getConstraintRowData = constraint => {
    const constraintAddress = getConstraintAddress(constraint);
    let constraintValue = getConstraintDisplayName(
      constraint.type,
      constraintAddress,
    );

    // Use resolved friendly name if available
    const friendlyName = constraintFriendlyNames[constraintValue];
    if (
      friendlyName &&
      constraint.type !== RecipientConstraint.REQUIRED_SYSTEM
    ) {
      constraintValue = friendlyName;
    }

    switch (constraint.type) {
      case RecipientConstraint.REQUIRED_ID:
        return {label: 'Required identity', value: constraintValue};
      case RecipientConstraint.REQUIRED_SYSTEM: {
        const systemValue = constraintValue.endsWith('@')
          ? constraintValue.substring(0, constraintValue.length - 1)
          : constraintValue;
        return {label: 'Required system', value: systemValue};
      }
      case RecipientConstraint.REQUIRED_PARENT:
        return {label: 'Required parent', value: constraintValue};
      default:
        return {label: 'Constraint', value: constraintValue};
    }
  };

  const getExpiryLabel = () => {
    if (!details || !details.hasExpiryTime()) return null;
    return unixToDate(details.expiryTime.toNumber());
  };

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity(
      CoinDirectory.getBasicCoinObj(chain).system_id,
      iAddrOrName,
    );

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  };

  const openVerusIdDetailsModal = (chain, iAddress) => {
    setVerusIdDetailsModalProps({
      loadVerusId: () => getVerusId(chain, iAddress),
      visible: true,
      animationType: 'slide',
      cancel: () => setVerusIdDetailsModalProps(null),
      loadFriendlyNames: async () => {
        try {
          const identityObj = await getVerusId(chain, iAddress);

          return getFriendlyNameMap(
            CoinDirectory.getBasicCoinObj(chain).system_id,
            identityObj,
          );
        } catch (e) {
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
      iAddress,
      chain,
    });
  };

  const getAllowList = () => {
    if (requestIsTestnet) {
      return accounts.filter(
        x => x.testnetOverrides && Object.keys(x.testnetOverrides).length > 0,
      );
    }
    return accounts.filter(
      x => !x.testnetOverrides || Object.keys(x.testnetOverrides).length === 0,
    );
  };

  const showContinueError = error => {
    createAlert(
      'Error',
      error?.message || 'Failed to continue authentication request.',
      [
        {
          text: 'Ok',
          onPress: () => {
            cancel();
            resolveAlert(true);
          },
        },
      ],
      {
        cancelable: false,
      },
    );
  };

  // Build response using selected identity and call next()
  const buildResponseAndContinue = async () => {
    const {chainId, iAddress} = selectedIdentity;
    const requestID =
      request && request.requestID ? request.requestID : details.requestID;
    if (!response) {
      throw new Error('Missing generic response');
    }

    const responseDetail = new AuthenticationResponseOrdinalVDXFObject({
      data: new AuthenticationResponseDetails({
        requestID,
      }),
    });

    const baseResponse = new GenericResponse();
    if (response.details && response.details.length > 0) {
      baseResponse.fromBuffer(response.toBuffer(), 0);
    } else {
      Object.assign(baseResponse, response);
      baseResponse.details = [];
    }
    if (baseResponse.details == null) baseResponse.details = [];
    baseResponse.details = [...baseResponse.details, responseDetail];
    baseResponse.setFlags();

    if (baseResponse.signature == null) {
      const coinObj = CoinDirectory.findCoinObj(chainId);
      baseResponse.signature = new VerifiableSignatureData({
        systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
        identityID: CompactAddressObject.fromIAddress(iAddress),
      });
      baseResponse.setSigned();
    }

    const handledIndices = [detailIndex];
    if (
      provisioningDetailIndex != null &&
      !handledIndices.includes(provisioningDetailIndex)
    ) {
      handledIndices.push(provisioningDetailIndex);
    }

    await next(baseResponse, handledIndices);
  };

  const handleContinue = async () => {
    if (activeAccountMatchesRequest) {
      if (!selectedIdentity) {
        handleOpenIdentitySheet();
        return;
      }

      try {
        await buildResponseAndContinue();
      } catch (e) {
        showContinueError(e);
      }

      return;
    }

    const allowList = getAllowList();

    if (allowList.length === 0) {
      createAlert(
        'Cannot continue',
        `No ${
          requestIsTestnet ? 'testnet' : 'mainnet'
        } profiles found, cannot respond to authentication request.`,
      );
      return;
    }

    try {
      setOpenIdentityAfterUnlock(false);
      await requestWalletUnlock({
        reason: 'authentication-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Authentication request',
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

  useEffect(() => {
    if (!idProvisionSuccess && sendModal.data?.success) {
      successfulSendModalTypeRef.current = sendModalType;
      setIdProvisionSuccess(true);
      return;
    }

    if (
      idProvisionSuccess &&
      !sendModal.visible &&
      sendModalType == null &&
      !successNavigationStartedRef.current
    ) {
      successNavigationStartedRef.current = true;

      const finishSuccessfulModal = async () => {
        launchedSendModalRef.current = null;

        if (
          successfulSendModalTypeRef.current === LINK_IDENTITY_SEND_MODAL &&
          pendingDeeplinkId
        ) {
          try {
            await markPendingDeeplinkComplete(pendingDeeplinkId);
          } catch (e) {
            console.warn('Unable to mark pending deeplink complete', e);
          }
        }

        props.navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'SignedInStack',
                params: {
                  screen: 'Home',
                  params: {
                    screen: 'IdentityTab',
                  },
                },
              },
            ],
          }),
        );
      };

      finishSuccessfulModal().catch(e => {
        console.warn('Unable to finish successful authentication modal', e);
        props.navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'SignedInStack'}],
          }),
        );
      });
    }
  }, [
    idProvisionSuccess,
    sendModal.data?.success,
    sendModal.visible,
    sendModalType,
    pendingDeeplinkId,
    props.navigation,
  ]);

  useEffect(() => {
    const sendModalClosed =
      sendModalWasVisibleRef.current && !sendModal.visible && sendModalType == null;

    sendModalWasVisibleRef.current = sendModal.visible;

    if (!sendModalClosed) return;

    const launchedModal = launchedSendModalRef.current;

    if (
      launchedModal?.type !== LINK_IDENTITY_SEND_MODAL ||
      !['user', 'passthrough'].includes(launchedModal.intent)
    ) {
      return;
    }

    launchedSendModalRef.current = null;

    reloadLinkedIdsAndSelect({
      preferredIAddress: launchedModal.identityAddress,
      reopenIdentitySheet: true,
    }).catch(e => {
      console.warn('Unable to reload linked identities after linking', e);
      setIdentitySheetVisible(true);
    });
  }, [reloadLinkedIdsAndSelect, sendModal.visible, sendModalType]);

  const expiryLabel = getExpiryLabel();
  const constraints =
    details && details.recipientConstraints ? details.recipientConstraints : [];
  const constraintRows = useMemo(() => {
    const rows = [];

    if (constraints.length > 0) {
      constraints.forEach((constraint, index) => {
        const rowData = getConstraintRowData(constraint);
        rows.push({
          key: `constraint-${index}`,
          ...rowData,
        });
      });
    }

    return rows;
  }, [constraints, constraintFriendlyNames]);

  const requestIdLabel = getRequestIdDisplay(details);

  useEffect(() => {
    if (detailsBufferString) {
      const det = new AuthenticationRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);

  useEffect(() => {
    if (sigtime != null) {
      setSigDateString(unixToDate(sigtime));
    } else {
      setSigDateString(null);
    }
  }, [sigtime]);

  useEffect(() => {
    let cancelled = false;

    const loadConstraintFriendlyNames = async () => {
      if (recipientConstraints.length === 0) {
        setConstraintFriendlyNames(prev =>
          Object.keys(prev).length > 0 ? {} : prev,
        );
        return;
      }

      const names = {
        ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
        ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
      };
      const lookupSystemId =
        requiredSystemIds.length === 1
          ? requiredSystemIds[0]
          : signerSystemID || defaultRootSystemId;

      for (const constraint of recipientConstraints) {
        const constraintAddress = getConstraintAddress(constraint);
        if (!constraintAddress) {
          continue;
        }

        if (constraint.type === RecipientConstraint.REQUIRED_SYSTEM) {
          const resolvedSystemName =
            resolvedSystemNames[constraintAddress] ||
            getOfflineSystemName(constraintAddress);

          if (resolvedSystemName) {
            names[constraintAddress] = resolvedSystemName;
          }

          continue;
        }

        if (constraint.type === RecipientConstraint.REQUIRED_PARENT) {
          if (parentConstraintFriendlyNames[constraintAddress]) {
            names[constraintAddress] =
              parentConstraintFriendlyNames[constraintAddress];
          }

          continue;
        }

        try {
          const identity = await getIdentity(lookupSystemId, constraintAddress);
          if (!identity.error && identity.result?.fullyqualifiedname) {
            names[constraintAddress] = convertFqnToDisplayFormat(
              identity.result.fullyqualifiedname,
            );
          }
        } catch (e) {
          // Keep i-address fallback when cross-chain resolution is unavailable.
        }
      }

      if (!cancelled) {
        setConstraintFriendlyNames(names);
      }
    };

    loadConstraintFriendlyNames();

    return () => {
      cancelled = true;
    };
  }, [
    defaultRootSystemId,
    recipientConstraints,
    requiredSystemIds,
    parentConstraintFriendlyNames,
    resolvedSystemNames,
    signerSystemID,
  ]);

  // Load linked identities when encrypted IDs change (user signs in / links ID)
  useEffect(() => {
    if (signedIn) {
      setLinkedIdsLoaded(false);
      loadLinkedIds();
    } else {
      setLinkedIds({});
      setLinkedIdsLoaded(false);
    }
  }, [encryptedIds, loadLinkedIds, signedIn]);

  // Sort identities alphabetically by friendly name per chain
  useEffect(() => {
    const sorted = {};
    for (const chainId of Object.keys(linkedIds)) {
      sorted[chainId] = linkedIds[chainId]
        ? Object.keys(linkedIds[chainId]).sort((a, b) => {
            const nameA = linkedIds[chainId][a] || '';
            const nameB = linkedIds[chainId][b] || '';
            return nameA.localeCompare(nameB);
          })
        : [];
    }
    setSortedIds(sorted);
  }, [linkedIds]);

  useEffect(() => {
    let cancelled = false;

    const loadLinkedIdentityParents = async () => {
      const parentMap = {};
      const identities = Object.keys(linkedIds).flatMap(chainId =>
        Object.keys(linkedIds[chainId] || {}).map(iAddress => ({
          chainId,
          iAddress,
          fullyqualifiedname: linkedIds[chainId][iAddress],
        })),
      );

      if (identities.length === 0) {
        if (!cancelled) {
          setLinkedIdentityParentIds({});
          setLinkedIdentityParentsLoaded(true);
        }
        return;
      }

      await Promise.all(
        identities.map(async ({chainId, iAddress, fullyqualifiedname}) => {
          const mapKey = `${chainId}:${iAddress}`;

          try {
            parentMap[mapKey] = fqnToParentAddress(fullyqualifiedname, chainId);
          } catch (e) {
            parentMap[mapKey] = null;
          }
        }),
      );

      if (!cancelled) {
        setLinkedIdentityParentIds(parentMap);
        setLinkedIdentityParentsLoaded(true);
      }
    };

    if (!signedIn) {
      setLinkedIdentityParentIds(prev =>
        Object.keys(prev).length > 0 ? {} : prev,
      );
      setLinkedIdentityParentsLoaded(false);
      return () => {
        cancelled = true;
      };
    }

    if (requiredParentIds.size === 0) {
      setLinkedIdentityParentIds(prev =>
        Object.keys(prev).length > 0 ? {} : prev,
      );
      setLinkedIdentityParentsLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setLinkedIdentityParentsLoaded(false);
    loadLinkedIdentityParents();

    return () => {
      cancelled = true;
    };
  }, [linkedIds, signedIn, requiredParentIds]);

  useEffect(() => {
    if (passthroughHandled) return;
    if (!signedIn) return;
    if (!activeAccountMatchesRequest) return;
    if (!(passthrough && passthrough.fqnToAutoLink)) return;
    if (requiredSystemIds.length > 0 && !requiredSystemsResolved) return;

    // Ready provisioning notifications resume this auth request after linking.
    const noLogin = false;
    const data = {
      [SEND_MODAL_IDENTITY_TO_LINK_FIELD]: passthrough.fqnToAutoLink,
      noLogin,
    };

    launchedSendModalRef.current = {
      type: LINK_IDENTITY_SEND_MODAL,
      intent: 'passthrough',
      identityAddress: passthrough.fqnToAutoLink,
    };
    openLinkIdentityModal(CoinDirectory.findCoinObj(linkChainId), data);
    setPassthroughHandled(true);
  }, [
    passthroughHandled,
    signedIn,
    activeAccountMatchesRequest,
    passthrough,
    linkChainId,
    requiredSystemIds,
    requiredSystemsResolved,
  ]);

  const handleOpenLinkExistingSheet = () => {
    if (!eligibilityReady) return;

    setIdentitySheetInitialMode(VERUSID_SHEET_MODES.LINK);
    setIdentitySheetVisible(true);
  };

  const openLinkIdentityModalFromChain = identityAddress => {
    const data = identityAddress
      ? {[SEND_MODAL_IDENTITY_TO_LINK_FIELD]: identityAddress}
      : undefined;

    launchedSendModalRef.current = {
      type: LINK_IDENTITY_SEND_MODAL,
      intent: 'user',
      identityAddress: identityAddress || null,
    };

    setIdentitySheetVisible(false);
    openLinkIdentityModal(CoinDirectory.findCoinObj(linkChainId), data);
  };

  const linkAutoFoundIdentity = useCallback(
    async candidate => {
      try {
        const candidateChainId = candidate?.chainId || linkChainId;
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
            'This VerusID does not match the request requirements.',
          );
        }

        const coinObj = CoinDirectory.findCoinObj(candidateChainId);

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

        const selectedLinkedIdentity = await reloadLinkedIdsAndSelect({
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
      linkChainId,
      reloadLinkedIdsAndSelect,
    ],
  );

  const openProvisionIdentityModalFromChain = () => {
    if (!provisioningDetailsBufferString) return;

    try {
      const provisioningDetails = new ProvisionIdentityDetails();
      provisioningDetails.fromBuffer(
        Buffer.from(provisioningDetailsBufferString, 'hex'),
        0,
      );

      const systemId = provisioningDetails.systemID
        ? provisioningDetails.systemID.toAddress()
        : null;
      const provisioningCoinObj = systemId
        ? CoinDirectory.findCoinObj(systemId, null, true)
        : CoinDirectory.findCoinObj(linkChainId);

      const requestId =
        request && request.requestID ? request.requestID.toAddress() : null;
      const requestSignerId =
        signerIdentityID ||
        (request && request.signature
          ? request.signature.identityID.toIAddress()
          : null);
      const requestBufferString = request
        ? request.toBuffer().toString('hex')
        : '';

      launchedSendModalRef.current = {
        type: PROVISION_IDENTITY_SEND_MODAL,
        intent: 'user',
        identityAddress: provisioningDetails.identityID
          ? provisioningDetails.identityID.toAddress()
          : null,
      };

      setIdentitySheetVisible(false);
      openProvisionIdentityModal(
        provisioningCoinObj,
        {
          provisioningDetailsBufferString,
          provisioningRequestID: requestId,
          provisioningSignerId: requestSignerId,
          provisioningRequestBufferString: requestBufferString,
          provisioningRequestType: 'generic',
          provisioningRequestHasResponseUris: responseUris.length > 0,
        },
        fromService,
      );
    } catch (e) {
      createAlert('Error', e.message);
    }
  };

  const canProvision = useMemo(() => {
    if (!provisioningDetailsBufferString) return false;

    try {
      const provisioningDetails = new ProvisionIdentityDetails();
      provisioningDetails.fromBuffer(
        Buffer.from(provisioningDetailsBufferString, 'hex'),
        0,
      );

      if (provisioningDetails.identityID) {
        const targetId = provisioningDetails.identityID.toAddress();
        for (const chainId of Object.keys(linkedIds)) {
          if (
            linkedIds[chainId] &&
            Object.keys(linkedIds[chainId]).includes(targetId)
          ) {
            return false;
          }
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }, [provisioningDetailsBufferString, linkedIds]);

  // Identity sheet handlers
  const handleOpenIdentitySheet = () => {
    if (!eligibilityReady) return;
    setIdentitySheetInitialMode(VERUSID_SHEET_MODES.CHOOSE);
    setIdentitySheetVisible(true);
  };

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    setSelectedIdentity({chainId, iAddress, friendlyName});
    setIdentitySheetVisible(false);
  };

  const hasRequirements = constraintRows.length > 0;
  const hasMatchingIdentity = useMemo(() => {
    for (const chainId of Object.keys(linkedIds)) {
      const chainIdentityAddresses = Object.keys(linkedIds[chainId] || {});
      for (const iAddress of chainIdentityAddresses) {
        if (isIdentityAllowed(chainId, iAddress)) {
          return true;
        }
      }
    }

    return false;
  }, [
    linkedIds,
    requiredIds,
    requiredSystemIds,
    requiredSystemsResolved,
    allowedSystems,
    requiredParentIds,
    linkedIdentityParentIds,
    linkedIdentityParentsLoaded,
  ]);
  const eligibilityReady =
    linkedIdsLoaded &&
    (requiredSystemIds.length === 0 || requiredSystemsResolved) &&
    (requiredParentIds.size === 0 || linkedIdentityParentsLoaded);

  useEffect(() => {
    if (!openIdentityAfterUnlock) return;
    if (!activeAccountMatchesRequest) return;
    if (!eligibilityReady) return;

    setOpenIdentityAfterUnlock(false);

    if (hasMatchingIdentity || canProvision) {
      setIdentitySheetInitialMode(VERUSID_SHEET_MODES.CHOOSE);
      setIdentitySheetVisible(true);
    } else {
      setIdentitySheetInitialMode(VERUSID_SHEET_MODES.LINK);
      setIdentitySheetVisible(true);
    }
  }, [
    activeAccountMatchesRequest,
    canProvision,
    eligibilityReady,
    hasMatchingIdentity,
    openIdentityAfterUnlock,
  ]);

  const shouldShowLinkAsPrimary =
    activeAccountMatchesRequest &&
    eligibilityReady &&
    !selectedIdentity &&
    !canProvision &&
    !hasMatchingIdentity;
  const primaryActionLabel = activeAccountMatchesRequest
    ? selectedIdentity
      ? 'Continue'
      : shouldShowLinkAsPrimary
      ? 'Link VerusID'
      : 'Choose VerusID'
    : signedIn
    ? 'Switch wallet'
    : 'Unlock wallet';
  const primaryActionHandler = activeAccountMatchesRequest
    ? selectedIdentity
      ? handleContinue
      : shouldShowLinkAsPrimary
      ? handleOpenLinkExistingSheet
      : handleOpenIdentitySheet
    : handleContinue;
  const linkExistingCoinObj = CoinDirectory.findCoinObj(linkChainId);
  const mainTitle = 'Sign in with VerusID';
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
    const sourceRows = [
      requesterLabel ? {label: 'Requester', value: requesterLabel} : null,
      signerIdentityID
        ? {label: 'Signer identity', value: signerIdentityID}
        : null,
      systemLabel ? {label: 'Network', value: systemLabel} : null,
      sigDateString ? {label: 'Signed', value: sigDateString} : null,
      websiteLabel ? {label: 'Website', value: websiteLabel} : null,
    ].filter(Boolean);
    const responseRows = [
      ...responseUris.map((uri, index) => ({
        label:
          responseUris.length > 1
            ? `Response URI ${index + 1}`
            : 'Response URI',
        value: uri.getUriString(),
      })),
      expiryLabel ? {label: 'Expires', value: expiryLabel} : null,
      requestIdLabel ? {label: 'Request ID', value: requestIdLabel} : null,
    ].filter(Boolean);
    const requirementRows = constraintRows.map(row => ({
      label: row.label,
      value: row.value,
    }));
    const walletRows = [
      {
        label: 'Wallet state',
        value: activeAccountMatchesRequest
          ? 'Ready for this request'
          : signedIn
          ? 'Switch wallet required'
          : 'Unlock wallet required',
      },
      selectedIdentity
        ? {
            label: 'Selected identity',
            value: selectedIdentity.friendlyName,
          }
        : {label: 'Selected identity', value: 'Not selected'},
    ];

    return [
      {title: 'Source', rows: sourceRows},
      {title: 'Response', rows: responseRows},
      {title: 'Requirements', rows: requirementRows},
      {title: 'Wallet', rows: walletRows},
    ].filter(section => section.rows.length > 0);
  }, [
    activeAccountMatchesRequest,
    constraintRows,
    expiryLabel,
    requestIdLabel,
    requesterLabel,
    responseUris,
    selectedIdentity,
    signedIn,
    sigDateString,
    signerIdentityID,
    systemLabel,
    websiteLabel,
  ]);
  const showRequestDetailsLink = requestDetailsSections.length > 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {verusIdDetailsModalProps != null && (
        <VerusIdDetailsModal {...verusIdDetailsModalProps} />
      )}
      <IdentityPickerSheet
        visible={identitySheetVisible}
        coinObj={linkExistingCoinObj}
        isCandidateAllowed={isAutoLinkCandidateAllowed}
        linkedIds={linkedIds}
        sortedIds={sortedIds}
        isIdentityAllowed={isIdentityAllowed}
        selectedIdentity={selectedIdentity}
        canProvision={canProvision}
        initialMode={identitySheetInitialMode}
        onClose={() => setIdentitySheetVisible(false)}
        onLinkCandidate={linkAutoFoundIdentity}
        onManualLink={() => openLinkIdentityModalFromChain()}
        onRequestVerusId={openProvisionIdentityModalFromChain}
        onSelect={handleSelectIdentity}
      />
      <RequestDetailsSheet
        visible={requestDetailsSheetVisible}
        onClose={() => setRequestDetailsSheetVisible(false)}
        sections={requestDetailsSections}
        styles={styles}
      />
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>{mainTitle}</Text>
        </View>

        {(signerFqn || sigDateString || systemLabel) && (
          <View style={styles.requesterCard}>
            <Text style={styles.requesterLabel}>Request from</Text>
            <TouchableOpacity
              accessibilityHint={
                canOpenSignerModal ? 'View identity details' : undefined
              }
              accessibilityLabel={`Request from ${requesterLabel}`}
              accessibilityRole="button"
              style={styles.requesterIdentityPanel}
              onPress={
                canOpenSignerModal
                  ? () =>
                      openVerusIdDetailsModal(signerChainId, signerIdentityID)
                  : undefined
              }
              activeOpacity={canOpenSignerModal ? 0.74 : 1}
              disabled={!canOpenSignerModal}>
              <View style={styles.requesterTextContainer}>
                <Text numberOfLines={1} style={styles.requesterName}>
                  {requesterLabel}
                </Text>
              </View>
              {canOpenSignerModal && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.colors.textSubtle}
                />
              )}
            </TouchableOpacity>
            {requesterMetadataRows.length > 0 && (
              <View style={styles.requesterDetailsList}>
                {requesterMetadataRows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[
                      styles.requesterDetailRow,
                      index > 0 && styles.requesterDetailRowDivider,
                    ]}>
                    <Text style={styles.requesterDetailLabel}>
                      {row.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={styles.requesterDetailValue}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {showRequestDetailsLink && (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => setRequestDetailsSheetVisible(true)}
                style={styles.requestDetailsLinkTouch}>
                <Text numberOfLines={1} style={styles.requestDetailsLinkText}>
                  View request details
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasRequirements && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialCommunityIcons
                  name="shield-account-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.sectionTitle}>Request requirements</Text>
              </View>
            </View>
            <View style={styles.sectionContent}>
              {constraintRows.map((row, index) => (
                <View
                  key={row.key}
                  style={[styles.detailRow, index > 0 && styles.detailRowBorder]}>
                  <Text style={styles.requirementLabel}>{row.label}</Text>
                  <Text style={styles.requirementValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!hasRequirements && !showRequestDetailsLink && (
          <View style={styles.simpleInfoRow}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={theme.colors.textSubtle}
            />
            <Text style={styles.simpleInfoText}>
              No additional data will be shared.
            </Text>
          </View>
        )}
        <View style={{height: 24}} />
      </ScrollView>

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
        {selectedIdentity && activeAccountMatchesRequest && (
          <View>
            <Text style={styles.selectedIdentityLabel}>Sign with</Text>
            <TouchableOpacity
              accessibilityHint="Open VerusID options"
              accessibilityLabel={`Selected identity ${selectedIdentity.friendlyName}`}
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={handleOpenIdentitySheet}
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
        <AppButton
          height={56}
          onPress={primaryActionHandler}
          themeMode={theme.mode}
          variant="primary">
          {primaryActionLabel}
        </AppButton>
        <AppButton
          buttonColor={theme.colors.surfaceMuted}
          height={56}
          onPress={() => cancel()}
          themeMode={theme.mode}
          textColor={
            theme.isDark ? theme.colors.textPrimary : theme.colors.primary
          }
          variant="secondary">
          {'Cancel'}
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

const RequestDetailsSheet = ({visible, onClose, sections, styles}) => (
  <BottomSheetModal visible={visible} onClose={onClose} maxHeight="78%">
    <View style={styles.requestDetailsSheetBody}>
      <Text style={styles.requestDetailsSheetTitle}>Request details</Text>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={styles.requestDetailsSheetContent}
        showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.title} style={styles.requestDetailsSection}>
            <Text style={styles.requestDetailsSectionTitle}>
              {section.title}
            </Text>
            {section.rows.map((row, index) => (
              <View
                key={`${section.title}-${row.label}-${index}`}
                style={styles.requestDetailsRow}>
                <Text style={styles.requestDetailsLabel}>{row.label}</Text>
                <Text selectable style={styles.requestDetailsValue}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  </BottomSheetModal>
);

const AuthenticationRequestInfo = props => (
  <OnboardingThemeProvider>
    <AuthenticationRequestInfoContent {...props} />
  </OnboardingThemeProvider>
);

export default AuthenticationRequestInfo;
