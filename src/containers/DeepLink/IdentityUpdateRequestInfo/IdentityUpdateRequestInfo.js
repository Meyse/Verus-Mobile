/*
  IdentityUpdateRequestInfo
  - 2026-02-02: Complete UI overhaul to match Wallet/Identity/SendWizard patterns.
  - 2026-02-05: Removed the separate Encrypted Uploads section.
    Content-multimap updates now carry encrypted flags for inline badges.
  - 2026-02-05: Refactored into a multi-step stepper that consolidates the entire
    identity update flow into a single screen. Bypasses IdentityUpdatePaymentConfiguration
    and the UpdateIdentity SendModal entirely.
  - 2026-02-05: Split into 4 steps: Overview -> Content Changes -> High-Risk Ack ->
    Confirm+Pay. Content changes got their own dedicated step with full-screen
    VerusIdObjectData. Fund source selection moved to a SemiModal sheet inside
    the Confirm step instead of a separate screen.
  - 2026-02-06: High-risk step shows primary-address deltas (add/remove) and
    flags new addresses not in wallet.
  - 2026-02-06: Fixed wallet address derivation ordering so "in wallet" matching
    is reliable during the High-risk step.
  - 2026-03-06: Clarified current-content removal copy  and added remove-action
    detail content that explains historical on-chain visibility.
  - 2026-06-17: High-risk acknowledgement moved from inline checkbox to a
    bottom sheet, with row-level detail sheets for primary/recovery/revocation.
*/
import React, {useMemo, useState, useEffect, useCallback} from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {primitives} from 'verusid-ts-client';
import {Portal, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import CopyAction from '../../../components/CopyAction';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {blocksToTime, unixToDate} from '../../../utils/math';
import {useSelector} from 'react-redux';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {
  createAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import {copyToClipboard} from '../../../utils/clipboard/clipboard';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {getVerusIdStatus} from '../../../utils/verusid/getVerusIdStatus';
import {
  VERUSID_AUTH_INFO,
  VERUSID_BASE_INFO,
  VERUSID_CMM_DATA,
  VERUSID_CMM_INFO,
  VERUSID_PRIMARY_ADDRESS,
  VERUSID_PRIVATE_ADDRESS,
  VERUSID_PRIVATE_INFO,
  VERUSID_RECOVERY_AUTH,
  VERUSID_REVOCATION_AUTH,
  VERUSID_STATUS,
} from '../../../utils/constants/verusidObjectData';
import {getCmmDataLabel} from '../../../utils/vdxf/cmmDataLabel';
import {getVDXFKeyLabel} from '../../../utils/vdxf/vdxfTypeLabels';
import {capitalizeString} from '../../../utils/stringUtils';
import {
  ContentMultiMapRemoveKey,
  DATA_TYPE_DEFINEDKEY,
  GenericRequest,
  IDENTITY_CREDENTIAL,
  IdentityUpdateRequestDetails,
  KvMap,
} from 'verus-typescript-primitives';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';

import ReviewStep from './steps/ReviewStep';
import ContentStep from './steps/ContentStep';
import HighRiskStep from './steps/HighRiskStep';
import ConfirmPayStep from './steps/ConfirmPayStep';
import {classifyChanges} from './utils/classifyChanges';
import {buildContentMultiMapRemoveUi} from './utils/contentMultiMapRemoveUi';
import {
  identityUpdateRequestInfoStyles as createIdentityUpdateRequestInfoStyles,
} from '../../../styles';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';

// Step identifiers
const STEP_REVIEW = 0;
const STEP_CONTENT = 1;
const STEP_HIGH_RISK = 2;
const STEP_CONFIRM_PAY = 3;
const CMM_CLEAR_MAP_SENTINEL = '__CMM_CLEAR__';

const formatRawData = value => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const RawDataSheet = ({
  visible,
  title,
  rawData,
  onClose,
  onClosed,
  styles,
  theme,
}) => {
  const rawText = useMemo(
    () => (rawData != null ? formatRawData(rawData) : ''),
    [rawData],
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      maxHeight="70%">
      <View style={styles.rawDataSheetContent}>
        <Text style={styles.rawDataSheetTitle}>{title || 'Raw data'}</Text>
        <View style={styles.rawDataSheetHeader}>
          <Text style={styles.rawDataSheetLabel}>Raw data</Text>
          <CopyAction
            accessibilityLabel="Copy raw data"
            copiedAccessibilityLabel="Raw data copied"
            color={theme.colors.textSubtle}
            copiedColor={theme.colors.success}
            style={styles.rawDataSheetCopyButton}
            value={rawText}
          />
        </View>
        <ScrollView
          style={styles.rawDataSheetScroll}
          contentContainerStyle={styles.rawDataSheetScrollContent}>
          <Text selectable style={styles.rawDataSheetValue}>
            {rawText}
          </Text>
        </ScrollView>
        <AppButton
          height={56}
          onPress={onClose}
          style={styles.rawDataSheetDone}
          themeMode={theme.mode}
          variant="secondary">
          Done
        </AppButton>
      </View>
    </BottomSheetModal>
  );
};

const buildChangeSummaryItems = (highRiskCount, contentCount) => {
  const items = [];

  if (highRiskCount > 0) {
    items.push({
      key: 'high-risk',
      tone: 'danger',
      label: `${highRiskCount} high-risk ${
        highRiskCount === 1 ? 'change' : 'changes'
      }`,
    });
  }

  if (contentCount > 0) {
    items.push({
      key: 'content',
      tone: 'normal',
      label: `${contentCount} content ${
        contentCount === 1 ? 'change' : 'changes'
      }`,
    });
  }

  return items;
};

const IdentityUpdateRequestInfoContent = props => {
  const {
    detailsBufferString,
    requestBufferString,
    responseBufferString,
    sigtime,
    cancel,
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    coinObj,
    chainInfo,
    subjectIdentity,
    subjectIdentityContent,
    identityUpdates,
    friendlyNames,
    cmmDataKeys,
    detailIndex,
    deliverIdentityUpdateResponse,
    identityUpdateDeliveryInfo,
    completeIdentityUpdateWithoutDelivery,
    next,
    subjectIdTxHex,
    updateIdTxHex,
    hasEncryptedKeys,
  } = props;
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createIdentityUpdateRequestInfoStyles(theme),
    [theme],
  );

  const {fullyqualifiedname, identity} = subjectIdentity;
  const activeContentMultiMap = useMemo(
    () =>
      subjectIdentityContent && subjectIdentityContent.identity
        ? subjectIdentityContent.identity.contentmultimap || {}
        : {},
    [subjectIdentityContent],
  );
  const activeContentSubjectIdentity = useMemo(
    () => ({
      ...subjectIdentity,
      identity: {
        ...(subjectIdentity.identity || {}),
        contentmultimap: activeContentMultiMap,
      },
    }),
    [activeContentMultiMap, subjectIdentity],
  );

  // --- Core state ---
  const [subject] = useState(
    primitives.Identity.fromJson(subjectIdentity),
  );
  const [details, setDetails] = useState(new IdentityUpdateRequestDetails());
  const [stepIndex, setStepIndex] = useState(STEP_REVIEW);
  const [acknowledged, setAcknowledged] = useState(false);
  const [highRiskAckSheetVisible, setHighRiskAckSheetVisible] =
    useState(false);
  const [confirmBroadcasting, setConfirmBroadcasting] = useState(false);

  // --- Modal state ---
  const [rawDataSheet, setRawDataSheet] = useState({
    visible: false,
    title: 'Raw data',
    rawData: null,
  });
  const [isListSelectionModalVisible, setIsListSelectionModalVisible] =
    useState(false);
  const [listData, setListData] = useState([]);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] =
    useState(null);

  // --- Derived values ---
  const friendlyNameMap = new Map(Object.entries(friendlyNames));
  const chainId =
    signerSystemName ||
    (signerSystemID ? getSystemNameFromSystemId(signerSystemID) : null);
  const canOpenSignerModal = Boolean(chainId && signerIdentityID);

  const request = useMemo(() => {
    if (!requestBufferString) return null;
    const req = new GenericRequest();
    req.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return req;
  }, [requestBufferString]);
  const requestIsTestnet =
    request != null ? request.isTestnet() : !!coinObj?.testnet;

  // --- Helper functions ---
  const getVerusId = async (chain, iAddrOrName) => {
    const id = await getIdentity(
      CoinDirectory.getBasicCoinObj(chain).system_id,
      iAddrOrName,
    );
    if (id.error) throw new Error(id.error.message);
    return id.result;
  };

  const displayIdentityAddress = addr => {
    if (friendlyNameMap.has(addr)) return friendlyNameMap.get(addr);
    return addr;
  };

  const getSignDataLabel = signData => {
    if (!signData) return 'Sign data';
    const trim = (value, maxLen = 60) => {
      if (value == null) return '';
      const str = String(value);
      return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
    };
    const dataJson = signData.toCLIJson();
    if (signData.isVdxfData()) return 'VDXF data';
    if (signData.isMMRData()) return 'MMR data';
    if (dataJson.filename) return `Filename: ${trim(dataJson.filename)}`;
    if (dataJson.message) return `Message: ${trim(dataJson.message)}`;
    if (dataJson.messagehex) return `Hex message: ${trim(dataJson.messagehex)}`;
    if (dataJson.messagebase64)
      return `Base64 message: ${trim(dataJson.messagebase64)}`;
    if (dataJson.datahash) return `Data hash: ${trim(dataJson.datahash)}`;
    return 'Sign data';
  };

  const getSignDataRawValue = signData => {
    if (!signData || typeof signData.toCLIJson !== 'function') {
      return null;
    }

    return signData.toCLIJson();
  };

  const getCmmDataKey = iAddr => {
    const keyLabel = getVDXFKeyLabel(iAddr, true);
    if (keyLabel == null) {
      if (cmmDataKeys && cmmDataKeys[iAddr]) return cmmDataKeys[iAddr].label;
      return iAddr.substring(0, 4) + '...' + iAddr.substring(iAddr.length - 4);
    }
    return capitalizeString(keyLabel);
  };

  const normalizeCmmUpdates = updates => {
    if (Array.isArray(updates)) return updates;
    if (updates == null) return [];
    return [updates];
  };

  const extractContentMultiMapRemoveMeta = value => {
    if (value == null || typeof value !== 'object' || Array.isArray(value))
      return null;

    const topLevel = value[ContentMultiMapRemoveKey.vdxfid];
    if (
      topLevel == null ||
      typeof topLevel !== 'object' ||
      Array.isArray(topLevel)
    )
      return null;

    const nested = topLevel[ContentMultiMapRemoveKey.vdxfid];
    const payload =
      nested != null && typeof nested === 'object' && !Array.isArray(nested)
        ? nested
        : topLevel;

    const parsedAction = Number(payload.action);
    if (!Number.isFinite(parsedAction)) return null;

    return {
      action: parsedAction,
      entryKey: typeof payload.entrykey === 'string' ? payload.entrykey : null,
      valueHash:
        typeof payload.valuehash === 'string' ? payload.valuehash : null,
    };
  };

  // --- Display updates ---
  const getDisplayUpdates = () => {
    const signDataMap = details.signDataMap || new KvMap();
    const getSignDataForKey = lookupKey => {
      if (signDataMap.hasAddress(lookupKey)) {
        return signDataMap.getByAddress(lookupKey);
      }

      for (const [signDataKey, value] of signDataMap.entries()) {
        if (signDataKey.toString() === lookupKey) {
          return value;
        }
      }

      return null;
    };
    const displayUpdates = {
      [VERUSID_AUTH_INFO.key]: {
        [VERUSID_RECOVERY_AUTH.key]:
          identityUpdates.recoveryauthority &&
          identityUpdates.recoveryauthority !== identity.recoveryauthority
            ? {
                data: displayIdentityAddress(identityUpdates.recoveryauthority),
                rawData: identityUpdates.recoveryauthority,
                onPress: () =>
                  openVerusIdDetailsModal(
                    coinObj.system_id,
                    identityUpdates.recoveryauthority,
                  ),
              }
            : null,
        [VERUSID_REVOCATION_AUTH.key]:
          identityUpdates.revocationauthority &&
          identityUpdates.revocationauthority !== identity.revocationauthority
            ? {
                data: displayIdentityAddress(
                  identityUpdates.revocationauthority,
                ),
                rawData: identityUpdates.revocationauthority,
                onPress: () =>
                  openVerusIdDetailsModal(
                    coinObj.system_id,
                    identityUpdates.revocationauthority,
                  ),
              }
            : null,
      },
      [VERUSID_PRIVATE_INFO.key]: {
        [VERUSID_PRIVATE_ADDRESS.key]:
          identityUpdates.privateaddress &&
          identityUpdates.privateaddress !== identity.privateaddress
            ? {
                data: displayIdentityAddress(identityUpdates.privateaddress),
                rawData: identityUpdates.privateaddress,
                onPress: () =>
                  copyToClipboard(identityUpdates.privateaddress, {
                    message: `${identityUpdates.privateaddress} copied to clipboard.`,
                  }),
              }
            : null,
      },
      [VERUSID_BASE_INFO.key]: {},
      [VERUSID_CMM_INFO.key]: {},
    };

    if (
      identityUpdates.primaryaddresses &&
      identityUpdates.primaryaddresses.join(',') !==
        identity.primaryaddresses.join(',')
    ) {
      for (let i = 0; i < identityUpdates.primaryaddresses.length; i++) {
        displayUpdates[VERUSID_AUTH_INFO.key][
          `${VERUSID_PRIMARY_ADDRESS.key}:${i}`
        ] = {
          data: displayIdentityAddress(identityUpdates.primaryaddresses[i]),
          rawData: identityUpdates.primaryaddresses[i],
          onPress: () =>
            copyToClipboard(identityUpdates.primaryaddresses[i], {
              message: `${identityUpdates.primaryaddresses[i]} copied to clipboard.`,
            }),
        };
      }
    }

    if (identityUpdates.flags && identityUpdates.flags !== identity.flags) {
      if (subject.isRevoked() !== details.identity.isRevoked()) {
        displayUpdates[VERUSID_BASE_INFO.key][VERUSID_STATUS.key] = {
          data: getVerusIdStatus(identityUpdates, chainInfo, coinObj),
        };
      }
    }

    if (identityUpdates.contentmultimap) {
      for (const key in identityUpdates.contentmultimap) {
        const updates = identityUpdates.contentmultimap[key];
        const signData = details.containsSignData()
          ? getSignDataForKey(key)
          : null;

        if (signData != null) {
          displayUpdates[VERUSID_CMM_INFO.key][
            `${VERUSID_CMM_DATA.key}:${key}`
          ] = {
            data: getSignDataLabel(signData),
            isEncrypted: true,
            onPress: () =>
              openRawDataSheet(
                getSignDataRawValue(signData),
                getCmmDataKey(key),
              ),
          };
        } else {
          const normalizedUpdates = normalizeCmmUpdates(updates);
          const removeEntries = normalizedUpdates
            .map((update, index) => ({
              update,
              index,
              removeMeta: extractContentMultiMapRemoveMeta(update),
            }))
            .filter(entry => entry.removeMeta != null);
          const nonRemoveUpdates = normalizedUpdates.filter(
            update => extractContentMultiMapRemoveMeta(update) == null,
          );

          if (removeEntries.length > 0) {
            removeEntries.forEach(({update, removeMeta, index}) => {
              const removeUi = buildContentMultiMapRemoveUi({
                removeMeta,
                fallbackKey: key,
                currentContentMultiMap: activeContentMultiMap,
                getKeyLabel: getCmmDataKey,
                definedKeyVdxfId: DATA_TYPE_DEFINEDKEY.vdxfid,
              });
              const targetKey =
                removeMeta.action === 4
                  ? CMM_CLEAR_MAP_SENTINEL
                  : removeMeta.entryKey || key;
              const baseUpdateKey = `${VERUSID_CMM_DATA.key}:${targetKey}`;
              const updateKey = `${baseUpdateKey}:remove:${key}:${index}`;

              // derive remove-action copy from the current identity state, not from chain permanence.
              displayUpdates[VERUSID_CMM_INFO.key][updateKey] = {
                data: removeUi.summary,
                rawData: [update],
                removeMeta: {
                  ...removeMeta,
                  entryLabel: removeUi.targetLabel,
                },
                ackRows: [
                  ['Action', removeUi.summary],
                  ['Target', removeUi.targetLabel],
                  ['Active content keys', String(removeUi.currentKeyCount)],
                  ['Active content values', String(removeUi.currentValueCount)],
                ],
                highRisk: removeMeta.action === 4,
                highRiskType:
                  removeMeta.action === 4 ? 'content-clear' : undefined,
                highRiskTitle:
                  removeMeta.action === 4
                    ? 'Clear active identity content'
                    : undefined,
                highRiskWarning:
                  removeMeta.action === 4
                    ? removeUi.highRiskWarning
                    : undefined,
                displayTitle: removeUi.displayTitle,
                onPress: () =>
                  openRawDataSheet([update], removeUi.modalTitle),
              };
            });
          }

          if (nonRemoveUpdates.length > 0) {
            const dataLabel = getCmmDataLabel(nonRemoveUpdates);
            const isCredentialKey =
              hasEncryptedKeys && key === IDENTITY_CREDENTIAL.vdxfid;
            displayUpdates[VERUSID_CMM_INFO.key][
              `${VERUSID_CMM_DATA.key}:${key}`
            ] = {
              data: dataLabel,
              rawData: nonRemoveUpdates,
              isEncryptedKey: isCredentialKey,
              onPress: () =>
                openRawDataSheet(
                  nonRemoveUpdates.length === 1
                    ? nonRemoveUpdates[0]
                    : nonRemoveUpdates,
                  getCmmDataKey(key),
                ),
            };
          }
        }
      }
    }

    return displayUpdates;
  };

  const getExpiryLabel = () => {
    if (!details.expires()) return '';
    return blocksToTime(
      details.expiryHeight.toNumber() - chainInfo.longestchain,
      coinObj.seconds_per_block,
    );
  };

  // --- Modal helpers ---
  const loadSignerVerusId = useCallback(async () => {
    if (!canOpenSignerModal) {
      throw new Error('Signer identity is not available');
    }

    return getVerusId(chainId, signerIdentityID);
  }, [canOpenSignerModal, chainId, signerIdentityID]);

  const loadSignerFriendlyNames = useCallback(
    async identityObj => {
      try {
        return getFriendlyNameMap(
          CoinDirectory.getBasicCoinObj(chainId).system_id,
          identityObj,
        );
      } catch (e) {
        return {
          ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
          ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        };
      }
    },
    [chainId],
  );

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

  const openRawDataSheet = (rawData, title) => {
    setRawDataSheet({
      visible: true,
      title: title || 'Raw data',
      rawData,
    });
  };

  const closeRawDataSheet = () => {
    setRawDataSheet(previous => ({
      ...previous,
      visible: false,
    }));
  };

  const clearRawDataSheet = () => {
    setRawDataSheet({
      visible: false,
      title: 'Raw data',
      rawData: null,
    });
  };

  // --- Computed state ---
  const [expiryLabel, setExpiryLabel] = useState(getExpiryLabel());
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime));
  const [displayUpdates, setDisplayUpdates] = useState(getDisplayUpdates());

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const activeAccountMatchesRequest =
    signedIn &&
    activeAccount != null &&
    accountIsTestnet(activeAccount) === requestIsTestnet;

  const walletAddresses = useMemo(() => {
    const normalize = addresses => {
      if (!Array.isArray(addresses)) return [];
      return addresses
        .map(entry => (typeof entry === 'string' ? entry : entry?.address))
        .filter(Boolean);
    };

    if (!activeAccount || !coinObj) return [];

    const primaryKey = coinObj.id;
    const fallbackKey = coinObj.mainnet_id;
    const primary = normalize(
      activeAccount?.keys?.[primaryKey]?.vrpc?.addresses,
    );
    if (primary.length > 0) return primary;
    return normalize(activeAccount?.keys?.[fallbackKey]?.vrpc?.addresses);
  }, [activeAccount, coinObj]);

  const primaryAddressAfterUpdateInfo = useMemo(() => {
    if (!Array.isArray(identityUpdates?.primaryaddresses)) return null;

    const updated = identityUpdates.primaryaddresses;
    const walletSet = new Set(walletAddresses);

    const addresses = updated.map(addr => ({
      address: addr,
      displayAddress: displayIdentityAddress(addr),
      inWallet: walletSet.has(addr),
    }));

    const walletCount = addresses.reduce(
      (acc, item) => acc + (item.inWallet ? 1 : 0),
      0,
    );
    return {
      addresses,
      walletCount,
      externalCount: addresses.length - walletCount,
    };
  }, [identityUpdates, walletAddresses, friendlyNames]);

  // --- Classify changes ---
  const {highRiskChanges: baseHighRiskChanges, contentChanges} = useMemo(
    () => classifyChanges(displayUpdates),
    [displayUpdates],
  );

  const primaryAddressChanges = useMemo(() => {
    if (!Array.isArray(identityUpdates?.primaryaddresses)) return [];

    const current = Array.isArray(identity?.primaryaddresses)
      ? identity.primaryaddresses
      : [];
    const updated = identityUpdates.primaryaddresses;
    const currentSet = new Set(current);
    const updatedSet = new Set(updated);
    const added = updated.filter(addr => !currentSet.has(addr));
    const removed = current.filter(addr => !updatedSet.has(addr));

    if (added.length === 0 && removed.length === 0) return [];

    const walletSet = new Set(walletAddresses);
    const hasWalletPrimaryAfterUpdate = updated.some(addr =>
      walletSet.has(addr),
    );
    const changes = [];

    added.forEach(addr => {
      const inWallet = walletSet.has(addr);
      changes.push({
        key: `${VERUSID_PRIMARY_ADDRESS.key}:add:${addr}`,
        title: 'Add primary address',
        warning: inWallet
          ? 'Adding a primary address makes this ID multisig.'
          : hasWalletPrimaryAfterUpdate
          ? 'This address is not in your wallet. Adding it shares control of this ID with someone else. Your wallet will still control this ID.'
          : 'This address is not in your wallet. After this update, none of the primary addresses are in your wallet. You will lose control of this ID.',
        data: displayIdentityAddress(addr),
        rawData: addr,
        valueLabel: 'New value',
        type: 'primary-add',
        walletMatch: inWallet,
      });
    });

    removed.forEach(addr => {
      changes.push({
        key: `${VERUSID_PRIMARY_ADDRESS.key}:remove:${addr}`,
        title: 'Remove primary address',
        warning: 'Removing a primary address changes who can control this ID.',
        data: displayIdentityAddress(addr),
        rawData: addr,
        valueLabel: 'Removed value',
        type: 'primary-remove',
      });
    });

    return changes;
  }, [identity, identityUpdates, walletAddresses, friendlyNames]);

  const nonPrimaryHighRiskChanges = useMemo(
    () =>
      baseHighRiskChanges.filter(
        change => !change.key.startsWith(VERUSID_PRIMARY_ADDRESS.key),
      ),
    [baseHighRiskChanges],
  );

  const highRiskChanges = useMemo(
    () => [...primaryAddressChanges, ...nonPrimaryHighRiskChanges],
    [primaryAddressChanges, nonPrimaryHighRiskChanges],
  );

  const hasHighRisk = highRiskChanges.length > 0;
  const contentReviewCount = useMemo(() => {
    const highRiskContentCount = highRiskChanges.reduce((count, change) => {
      if (
        change.groupKey !== VERUSID_CMM_INFO.key &&
        change.groupKey !== VERUSID_PRIVATE_INFO.key
      ) {
        return count;
      }

      if (change.highRiskType === 'content-clear') {
        return count + Math.max(Object.keys(activeContentMultiMap).length, 1);
      }

      return count + 1;
    }, 0);

    return contentChanges.length + highRiskContentCount;
  }, [activeContentMultiMap, contentChanges, highRiskChanges]);

  const hasContent = contentReviewCount > 0;
  const requesterLabel = signerFqn || signerIdentityID || 'Unknown signer';
  const requesterMetadataRows = [
    chainId ? {label: 'Network', value: chainId} : null,
    sigDateString ? {label: 'Signed', value: sigDateString} : null,
    details.expires() && expiryLabel
      ? {label: 'Expires', value: expiryLabel}
      : null,
  ].filter(Boolean);
  const reviewChangeItems = buildChangeSummaryItems(
    highRiskChanges.length,
    contentReviewCount,
  );

  // --- Stepper navigation ---
  // Build the ordered list of steps (skip content/high-risk if none)
  const steps = useMemo(() => {
    const s = [STEP_REVIEW];
    if (hasContent) s.push(STEP_CONTENT);
    if (hasHighRisk) s.push(STEP_HIGH_RISK);
    s.push(STEP_CONFIRM_PAY);
    return s;
  }, [hasContent, hasHighRisk]);

  const currentStepId = steps[stepIndex] ?? STEP_REVIEW;

  useEffect(() => {
    if (currentStepId !== STEP_CONFIRM_PAY && confirmBroadcasting) {
      setConfirmBroadcasting(false);
    }
  }, [confirmBroadcasting, currentStepId]);

  const goNext = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
  }, [stepIndex, steps]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  const closeHighRiskAckSheet = useCallback(() => {
    setHighRiskAckSheetVisible(false);
  }, []);

  const understandHighRiskChanges = useCallback(() => {
    setAcknowledged(true);
    setHighRiskAckSheetVisible(false);
    goNext();
  }, [goNext]);

  // --- Wallet unlock handling ---
  const handleContinue = async () => {
    if (activeAccountMatchesRequest) {
      goNext();
      return;
    }

    const allowList = (accounts || []).filter(
      account => accountIsTestnet(account) === requestIsTestnet,
    );

    if (allowList.length === 0) {
      createAlert(
        'Cannot continue',
        `No ${
          requestIsTestnet ? 'testnet' : 'mainnet'
        } profiles found, cannot respond to this VerusID update request.`,
      );
      return;
    }

    try {
      await requestWalletUnlock({
        reason: 'identity-update-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'VerusID update request',
        accountHashes: allowList.map(account => account.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
      goNext();
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert(
          'Cannot continue',
          e?.message || 'Unable to unlock wallet.',
        );
      }
    }
  };

  // --- Effects ---
  useEffect(() => {
    setExpiryLabel(getExpiryLabel());
  }, [details]);

  useEffect(() => {
    setDisplayUpdates(getDisplayUpdates());
  }, [details, identityUpdates, friendlyNames, cmmDataKeys, activeContentMultiMap]);

  useEffect(() => {
    if (detailsBufferString) {
      const det = new IdentityUpdateRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime));
  }, [sigtime]);

  // --- Footer button logic ---
  const getFooterButtonLabel = () => {
    if (currentStepId === STEP_REVIEW) {
      return activeAccountMatchesRequest
        ? 'Review changes'
        : signedIn
        ? 'Switch wallet'
        : 'Unlock wallet';
    }

    return 'Next';
  };

  const handleFooterRight = () => {
    if (currentStepId === STEP_REVIEW) {
      handleContinue();
    } else if (currentStepId === STEP_HIGH_RISK) {
      if (acknowledged) {
        goNext();
      } else {
        setHighRiskAckSheetVisible(true);
      }
    } else if (currentStepId === STEP_CONTENT) {
      goNext();
    }
    // For STEP_CONFIRM_PAY, the ConfirmPayStep handles its own buttons
  };

  // --- Render ---
  const showFooter = currentStepId !== STEP_CONFIRM_PAY;
  const showTopBackButton =
    stepIndex > 0 &&
    !(currentStepId === STEP_CONFIRM_PAY && confirmBroadcasting);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        {isListSelectionModalVisible && (
          <ListSelectionModal
            visible={isListSelectionModalVisible}
            data={listData}
            onSelect={() => setIsListSelectionModalVisible(false)}
            cancel={() => setIsListSelectionModalVisible(false)}
            title="Supported Payment Networks"
            flexHeight={1}
          />
        )}
      </Portal>
      <RawDataSheet
        visible={rawDataSheet.visible}
        title={rawDataSheet.title}
        rawData={rawDataSheet.rawData}
        onClose={closeRawDataSheet}
        onClosed={clearRawDataSheet}
        styles={styles}
        theme={theme}
      />

      {showTopBackButton && (
        <View style={styles.stepHeader}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.74}
            onPress={goBack}
            style={styles.backButton}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="arrow-left"
              size={24}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Step content */}
      {currentStepId === STEP_REVIEW && (
        <ReviewStep
          canOpenSignerDetails={canOpenSignerModal}
          loadSignerFriendlyNames={loadSignerFriendlyNames}
          loadSignerVerusId={loadSignerVerusId}
          requesterLabel={requesterLabel}
          requesterMetadataRows={requesterMetadataRows}
          styles={styles}
        />
      )}

      {currentStepId === STEP_CONTENT && (
        <ContentStep
          subjectIdentity={activeContentSubjectIdentity}
          friendlyNames={friendlyNames}
          displayUpdates={displayUpdates}
          chainInfo={chainInfo}
          coinObj={coinObj}
          cmmDataKeys={cmmDataKeys}
          styles={styles}
        />
      )}

      {currentStepId === STEP_HIGH_RISK && (
        <HighRiskStep
          highRiskChanges={highRiskChanges}
          primaryAddressAfterUpdateInfo={
            primaryAddressChanges.length > 0
              ? primaryAddressAfterUpdateInfo
              : null
          }
          ackSheetVisible={highRiskAckSheetVisible}
          onCloseAckSheet={closeHighRiskAckSheet}
          onUnderstandAck={understandHighRiskChanges}
          currentAuthorities={{
            revocation: identity.revocationauthority
              ? {
                  display: displayIdentityAddress(identity.revocationauthority),
                  raw: identity.revocationauthority,
                }
              : null,
            recovery: identity.recoveryauthority
              ? {
                  display: displayIdentityAddress(identity.recoveryauthority),
                  raw: identity.recoveryauthority,
                }
              : null,
          }}
          styles={styles}
        />
      )}

      {currentStepId === STEP_CONFIRM_PAY && (
        <ConfirmPayStep
          details={details}
          requestIsTestnet={requestIsTestnet}
          subjectIdentity={subjectIdentity}
          subjectIdTxHex={subjectIdTxHex}
          updateIdTxHex={updateIdTxHex}
          friendlyNames={friendlyNames}
          coinObj={coinObj}
          responseBufferString={responseBufferString}
          detailIndex={detailIndex}
          deliverIdentityUpdateResponse={deliverIdentityUpdateResponse}
          identityUpdateDeliveryInfo={identityUpdateDeliveryInfo}
          completeIdentityUpdateWithoutDelivery={completeIdentityUpdateWithoutDelivery}
          next={next}
          cancel={cancel}
          highRiskCount={highRiskChanges.length}
          contentCount={contentReviewCount}
          hasEncryptedKeys={hasEncryptedKeys}
          onBroadcastingChange={setConfirmBroadcasting}
          styles={styles}
        />
      )}

      {/* Footer - hidden on ConfirmPayStep (it has its own buttons) */}
      {showFooter && (
        <SafeBottomActionStack
          gap={10}
          horizontalSpacing={24}
          style={styles.footer}>
          {currentStepId === STEP_REVIEW && (
            <View style={styles.footerDetailsList}>
              <View style={styles.footerDetailRow}>
                <Text style={styles.footerDetailLabel}>Updating identity</Text>
                <Text
                  numberOfLines={1}
                  style={styles.footerDetailValue}>
                  {fullyqualifiedname}
                </Text>
              </View>
              <View
                style={[
                  styles.footerDetailRow,
                  styles.footerDetailRowDivider,
                ]}>
                <Text style={styles.footerDetailLabel}>Changes</Text>
                <View style={styles.footerChangeValueStack}>
                  {reviewChangeItems.map(item => (
                    <Text
                      key={item.key}
                      numberOfLines={1}
                      style={[
                        styles.footerStackedDetailValue,
                        item.tone === 'danger' &&
                          styles.footerDetailValueDanger,
                      ]}>
                      {item.label}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          )}
          <AppButton
            height={56}
            onPress={handleFooterRight}
            themeMode={theme.mode}
            variant="primary">
            {getFooterButtonLabel()}
          </AppButton>
          {currentStepId === STEP_REVIEW && (
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
          )}
        </SafeBottomActionStack>
      )}
    </SafeAreaView>
  );
};

const IdentityUpdateRequestInfo = props => (
  <OnboardingThemeProvider>
    <IdentityUpdateRequestInfoContent {...props} />
  </OnboardingThemeProvider>
);

export default IdentityUpdateRequestInfo;
