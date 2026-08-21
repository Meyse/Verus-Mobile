import BigNumber from 'bignumber.js';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ActivityIndicator, Switch} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import {modifyServiceStoredDataForUser} from '../../../../../actions/actions/services/dispatchers/services';
import AppButton from '../../../../../components/AppButton';
import AppTextInput from '../../../../../components/AppTextInput';
import CopyAction from '../../../../../components/CopyAction';
import FadedScrollView from '../../../../../components/FadedScrollView';
import ProgressHeader from '../../../../../components/ProgressHeader';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../../globals/fonts';
import {useAppTheme} from '../../../../../theme/app';
import {requestServiceStoredData} from '../../../../../utils/auth/authBox';
import {CoinDirectory} from '../../../../../utils/CoinData/CoinDirectory';
import {
  GIFT_CARD_SERVICE_ID,
  VERUSID_SERVICE_ID,
} from '../../../../../utils/constants/services';
import {VRPC} from '../../../../../utils/constants/intervalConstants';
import {
  addGiftCardPendingFunding,
  beginGiftCardShare,
  broadcastGiftCardFunding,
  cancelGiftCardShare,
  completeGiftCardShare,
  createGiftCard,
  discoverGiftCardIdentityFunds,
  GIFT_CARD_REDEEMED_SHARE_MESSAGE,
  GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE,
  getGiftCardCapabilities,
  getGiftCardFundingTopups,
  getSubmittedGiftCardFundingIdentities,
  hasGiftCardBeenShared,
  hasGiftCardClaims,
  hasGiftCardShareInProgress,
  hasGiftCardShareReservation,
  hasPendingGiftCardFunding,
  normalizeGiftCardServiceData,
  preflightGiftCardFunding,
  refreshGiftCardStatus,
  unlinkGiftCardFundingIdentitiesFromVerusIdData,
  upsertGiftCard,
  upsertGiftCardIfUnchanged,
} from '../../../../../utils/giftCard/giftCard';
import {truncateDecimal} from '../../../../../utils/math';
import {SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS} from '../../../../../utils/spendableKey/spendableKey';
import GiftCardCurrencyPickerSheet from '../GiftCardCurrencyPickerSheet';
import GiftCardShareSheet from '../GiftCardShareSheet';

const STEP_DETAILS = 'details';
const STEP_CONTENTS = 'contents';
const STEP_REVIEW = 'review';
const STEP_PROCESSING = 'processing';
const STEP_RESULT = 'result';
const STEP_EXTERNAL = 'external';

const PAGE_CONTENT_ANIMATION_DURATION = 320;
const KEYBOARD_FOOTER_SPACING = 8;

const GiftCardPageContent = ({children}) => {
  const contentProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

        contentProgress.stopAnimation();

        if (reduceMotionEnabled) {
          contentProgress.setValue(1);
          return;
        }

        contentProgress.setValue(0);
        animation = Animated.timing(contentProgress, {
          toValue: 1,
          duration: PAGE_CONTENT_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          contentProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      contentProgress.stopAnimation();
    };
  }, [contentProgress]);

  return (
    <Animated.View
      style={{
        opacity: contentProgress,
        transform: [
          {
            translateY: contentProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
          {
            scale: contentProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.985, 1],
            }),
          },
        ],
      }}>
      {children}
    </Animated.View>
  );
};

const hasAmount = amount => {
  try {
    return BigNumber(amount || 0).isGreaterThan(0);
  } catch (_) {
    return false;
  }
};

const getSourceAddressForCoin = (coinObj, activeAccount) =>
  activeAccount?.keys?.[coinObj.id]?.[VRPC]?.addresses?.[0];

const getFundingCoinKey = coinObj =>
  `${coinObj.system_id}:${coinObj.currency_id}`;

const getCoinBalance = (coinObj, activeAccount, ledgerBalances) => {
  const sourceAddress = getSourceAddressForCoin(coinObj, activeAccount);

  if (!sourceAddress) return null;

  const channelId = `${VRPC}.${sourceAddress}.${coinObj.system_id}`;
  const balance = ledgerBalances?.[channelId]?.[coinObj.id];

  if (balance == null) return null;
  if (balance.confirmed != null) return balance.confirmed;
  if (balance.total != null) return balance.total;

  return balance;
};

const formatAmount = amount => {
  try {
    return truncateDecimal(amount, 8);
  } catch (_) {
    return String(amount);
  }
};

const getCurrencyName = (systemId, currencyId, activeCoinsForUser) => {
  const activeCoin = (activeCoinsForUser || []).find(
    coinObj =>
      coinObj.system_id === systemId &&
      coinObj.currency_id === currencyId,
  );

  if (activeCoin) {
    return activeCoin.display_ticker || activeCoin.id || currencyId;
  }

  try {
    const directoryCoin = CoinDirectory.findCoinObj(currencyId);

    if (directoryCoin) {
      return directoryCoin.display_ticker || directoryCoin.id || currencyId;
    }
  } catch (_) {}

  return currencyId;
};

const getSystemName = (systemId, activeCoinsForUser) => {
  const systemCoin = (activeCoinsForUser || []).find(
    coinObj =>
      coinObj.system_id === systemId &&
      coinObj.currency_id === systemId,
  );

  return (
    systemCoin?.display_name ||
    systemCoin?.display_ticker ||
    systemCoin?.id ||
    systemId
  );
};

const getMaxFundAmount = (coinObj, balance) => {
  if (balance == null) return null;

  const rawBalance = BigNumber(balance || 0);
  const nativeFundingFee =
    coinObj.currency_id === coinObj.system_id
      ? BigNumber(SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS)
      : BigNumber(0);
  const maxAmount = rawBalance.minus(nativeFundingFee);

  return maxAmount.isGreaterThan(0) ? maxAmount : BigNumber(0);
};

const getProgress = (step, createMode) => {
  if (step === STEP_DETAILS) return 0.2;
  if (step === STEP_CONTENTS) return createMode ? 0.4 : 0.25;
  if (step === STEP_REVIEW) return createMode ? 0.6 : 0.5;
  if (step === STEP_PROCESSING || step === STEP_EXTERNAL) {
    return createMode ? 0.8 : 0.75;
  }

  return 1;
};

const getStepAnnouncement = (step, createMode, operationText) => {
  if (step === STEP_DETAILS) return 'Gift card details.';
  if (step === STEP_CONTENTS) return 'Card contents.';
  if (step === STEP_REVIEW) return 'Review before funding.';
  if (step === STEP_EXTERNAL) return 'Fund from another wallet.';
  if (step === STEP_PROCESSING) {
    const title = createMode
      ? 'Creating and funding gift card.'
      : 'Funding gift card.';

    return operationText ? `${title} ${operationText}` : title;
  }

  return null;
};

const getCreateOperationText = (phase, encrypted) => {
  if (phase === 'deriving-addresses') {
    return 'Creating gift card addresses...';
  }

  return encrypted
    ? 'Protecting your gift card with its claim password...'
    : 'Creating your gift card...';
};

const getPreflightOperationText = (phase, encrypted, current, total) => {
  if (phase === 'calculating-fees') {
    return `Calculating fees for network ${current} of ${total}...`;
  }

  return encrypted
    ? 'Checking the protected gift card...'
    : 'Checking gift card addresses...';
};

const getTxids = fundingResult =>
  (fundingResult?.results || [])
    .map(item => item.txid)
    .filter(txid => typeof txid === 'string' && txid.length > 0);

const getNoticeBackground = (isError, theme) => {
  if (!isError) return theme.colors.successBackground;

  return theme.colors.dangerBackground;
};

const getResultPresentation = (kind, theme) => {
  if (kind === 'success') {
    return {
      accent: theme.colors.success,
      icon: 'check-circle-outline',
    };
  }

  if (kind === 'partial') {
    return {
      accent: theme.colors.warning,
      icon: 'progress-alert',
    };
  }

  return {
    accent: theme.colors.danger,
    icon: 'alert-circle-outline',
  };
};

const GiftCardFund = props => {
  const createMode = props.createMode === true;
  const routeCardId = props.route?.params?.cardId;
  const startExternal = props.route?.params?.startExternal === true;
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinsForUser = useSelector(
    state => state.coins.activeCoinsForUser,
  );
  const ledgerBalances = useSelector(state => state.ledger.balances);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [serviceData, setServiceData] = useState(null);
  const [linkedIds, setLinkedIds] = useState({});
  const [draftCard, setDraftCard] = useState(null);
  const [step, setStep] = useState(
    createMode ? STEP_DETAILS : STEP_CONTENTS,
  );
  const [label, setLabel] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [claimPassword, setClaimPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showClaimPassword, setShowClaimPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fundAmounts, setFundAmounts] = useState({});
  const [selectedFundingCoinKeys, setSelectedFundingCoinKeys] = useState([]);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState({});
  const [identityFunding, setIdentityFunding] = useState([]);
  const [identityFundingLoading, setIdentityFundingLoading] = useState(false);
  const [identityFundingError, setIdentityFundingError] = useState(null);
  const [preflightPlan, setPreflightPlan] = useState(null);
  const [pendingFundingBroadcast, setPendingFundingBroadcast] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [operationText, setOperationText] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [result, setResult] = useState(null);
  const [shareCard, setShareCard] = useState(null);
  const reopenShareCardIdRef = useRef(null);
  const qrNavigationActiveRef = useRef(false);
  const operationAnnouncementRef = useRef(null);
  const pendingRouteInitializedRef = useRef(false);
  const [selectedSystemId, setSelectedSystemId] = useState(null);
  const [externalReturnStep, setExternalReturnStep] = useState(
    STEP_CONTENTS,
  );
  const scrollViewRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const focusedPasswordFieldRef = useRef(null);
  const revealPasswordScrollRef = useRef(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const pendingFundingId = props.route?.params?.pendingFundingId || null;

  const storedCard = routeCardId
    ? serviceData?.cards?.[routeCardId]
    : null;
  const card = draftCard || storedCard;
  const savedPendingFunding =
    pendingFundingId == null
      ? null
      : (card?.fundingHistory || []).find(
          entry => entry?.id === pendingFundingId,
        ) || null;
  const pendingFunding = pendingFundingBroadcast || savedPendingFunding;

  const scrollPasswordFieldsIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: !reduceMotionEnabled,
      });
    });
  }, [reduceMotionEnabled]);

  useFocusEffect(
    useCallback(() => {
      if (!qrNavigationActiveRef.current) return undefined;

      const reopenCardId = reopenShareCardIdRef.current;
      const cardToShare =
        result?.card?.id === reopenCardId
          ? result.card
          : serviceData?.cards?.[reopenCardId];

      qrNavigationActiveRef.current = false;
      reopenShareCardIdRef.current = null;

      if (cardToShare) {
        setShareCard(cardToShare);
      }

      return undefined;
    }, [result?.card, serviceData?.cards]),
  );

  const openShareQr = useCallback(
    cardId => {
      if (!cardId || qrNavigationActiveRef.current) return;

      reopenShareCardIdRef.current = cardId;
      qrNavigationActiveRef.current = true;
      props.navigation.navigate('GiftCardQr', {cardId});
    },
    [props.navigation],
  );

  useEffect(() => {
    props.navigation.setOptions({headerShown: false});
  }, [props.navigation]);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotionEnabled(enabled);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);

      if (focusedPasswordFieldRef.current) {
        scrollPasswordFieldsIntoView();
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollPasswordFieldsIntoView]);

  useEffect(() => {
    if (step !== STEP_RESULT || !result?.title) return;

    AccessibilityInfo.announceForAccessibility(
      `${result.title}. ${result.message || ''}`,
    );
  }, [result?.message, result?.title, step]);

  const stepOperationText =
    step === STEP_PROCESSING ? operationText : null;

  useEffect(() => {
    const announcesInlineOperation =
      step === STEP_DETAILS || step === STEP_REVIEW;

    if (!busy || !operationText || !announcesInlineOperation) {
      operationAnnouncementRef.current = null;
      return;
    }

    if (operationAnnouncementRef.current === operationText) return;

    operationAnnouncementRef.current = operationText;
    AccessibilityInfo.announceForAccessibility(operationText);
  }, [busy, operationText, step]);

  useEffect(() => {
    if (initialLoading || step === STEP_RESULT) return;

    const announcement = getStepAnnouncement(
      step,
      createMode,
      stepOperationText,
    );

    if (announcement) {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [createMode, initialLoading, step, stepOperationText]);

  const loadData = useCallback(async () => {
    setInitialLoading(true);
    setLoadError(null);

    try {
      const giftCardData = normalizeGiftCardServiceData(
        await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
      );
      const verusIdData = await requestServiceStoredData(VERUSID_SERVICE_ID);

      setServiceData(giftCardData);
      setLinkedIds(verusIdData.linked_ids || {});

      if (!createMode && !giftCardData.cards?.[routeCardId]) {
        setLoadError('This gift card could not be found.');
      } else if (
        !createMode &&
        hasGiftCardBeenShared(giftCardData.cards?.[routeCardId])
      ) {
        setLoadError(
          'Shared gift cards cannot be funded. Create a new gift card instead.',
        );
      } else if (
        !createMode &&
        hasGiftCardShareReservation(giftCardData.cards?.[routeCardId])
      ) {
        setLoadError(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      }
    } catch (e) {
      setLoadError(e.message || 'Unable to load gift card data.');
    } finally {
      setInitialLoading(false);
    }
  }, [createMode, routeCardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (
      initialLoading ||
      pendingFundingId == null ||
      card == null ||
      pendingRouteInitializedRef.current
    ) {
      return;
    }

    pendingRouteInitializedRef.current = true;

    if (savedPendingFunding == null) {
      setResult({
        kind: 'error',
        title: 'Pending funding unavailable',
        message:
          'This saved funding attempt no longer exists. Refresh the gift card before trying again.',
        pendingFundingId,
      });
    } else {
      setResult({
        kind: 'partial',
        title: 'Retry pending funding',
        message:
          'These exact signed transactions were saved before broadcast. Retrying rebroadcasts only transactions not already marked submitted.',
        card,
        pendingFundingId,
        pendingRetry: true,
        txids: getTxids({results: savedPendingFunding.transactions}),
      });
    }

    setStep(STEP_RESULT);
  }, [
    card,
    initialLoading,
    pendingFundingId,
    savedPendingFunding,
  ]);

  useEffect(() => {
    if (!card || !startExternal || createMode) return;

    const systemIds = Object.keys(card.addressesBySystem || {});

    setSelectedSystemId(current => current || systemIds[0] || null);
    setStep(STEP_EXTERNAL);
  }, [card, createMode, startExternal]);

  const activeFundingCoins = useMemo(() => {
    const seen = new Set();

    return (activeCoinsForUser || [])
      .filter(coinObj => {
        const key = getFundingCoinKey(coinObj);

        if (seen.has(key)) return false;
        seen.add(key);

        return (
          Array.isArray(coinObj.compatible_channels) &&
          coinObj.compatible_channels.includes(VRPC) &&
          getSourceAddressForCoin(coinObj, activeAccount) &&
          card?.addressesBySystem?.[coinObj.system_id]
        );
      })
      .sort((a, b) =>
        (a.display_ticker || a.id).localeCompare(
          b.display_ticker || b.id,
        ),
      );
  }, [activeAccount, activeCoinsForUser, card]);

  const selectedFundingCoinKeySet = useMemo(
    () => new Set(selectedFundingCoinKeys),
    [selectedFundingCoinKeys],
  );
  const selectedFundingCoins = useMemo(
    () =>
      activeFundingCoins.filter(coinObj =>
        selectedFundingCoinKeySet.has(getFundingCoinKey(coinObj)),
      ),
    [activeFundingCoins, selectedFundingCoinKeySet],
  );
  const fundingCurrencyOptions = useMemo(
    () =>
      activeFundingCoins.map(coinObj => {
        const ticker = coinObj.display_ticker || coinObj.id;
        const name = coinObj.display_name || ticker;
        const systemName = getSystemName(
          coinObj.system_id,
          activeCoinsForUser,
        );
        const balance = getCoinBalance(
          coinObj,
          activeAccount,
          ledgerBalances,
        );

        return {
          key: getFundingCoinKey(coinObj),
          coinObj,
          ticker,
          name,
          systemName,
          balanceText: balance == null ? '—' : formatAmount(balance),
          searchText: [ticker, name, systemName]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase(),
        };
      }),
    [
      activeAccount,
      activeCoinsForUser,
      activeFundingCoins,
      ledgerBalances,
    ],
  );

  const linkedIdentityOptions = useMemo(() => {
    const options = [];

    for (const chain of Object.keys(linkedIds || {})) {
      let coinObj;

      try {
        coinObj = CoinDirectory.findCoinObj(chain);
      } catch (_) {
        continue;
      }

      if (!card?.addressesBySystem?.[coinObj.system_id]) continue;

      for (const iAddress of Object.keys(linkedIds[chain] || {})) {
        options.push({
          key: `${coinObj.system_id}:${iAddress}`,
          chain,
          systemId: coinObj.system_id,
          identityAddress: iAddress,
          fullyQualifiedName: linkedIds[chain][iAddress],
        });
      }
    }

    return options.sort((a, b) =>
      (a.fullyQualifiedName || a.identityAddress).localeCompare(
        b.fullyQualifiedName || b.identityAddress,
      ),
    );
  }, [card, linkedIds]);

  const selections = useMemo(
    () => ({
      funds: activeFundingCoins
        .filter(coinObj => {
          const key = getFundingCoinKey(coinObj);

          return (
            selectedFundingCoinKeySet.has(key) &&
            hasAmount(fundAmounts[key])
          );
        })
        .map(coinObj => ({
          systemId: coinObj.system_id,
          currencyId: coinObj.currency_id,
          amount: fundAmounts[getFundingCoinKey(coinObj)],
          coinObj,
        })),
      identities: linkedIdentityOptions.filter(
        identity => selectedIds[identity.key],
      ),
    }),
    [
      activeFundingCoins,
      fundAmounts,
      linkedIdentityOptions,
      selectedFundingCoinKeySet,
      selectedIds,
    ],
  );
  const hasSelections =
    selections.funds.length > 0 || selections.identities.length > 0;
  const applyFundingCurrencies = useCallback(
    nextSelectedKeys => {
      const availableKeySet = new Set(
        activeFundingCoins.map(getFundingCoinKey),
      );
      const availableSelectedKeys = nextSelectedKeys.filter(key =>
        availableKeySet.has(key),
      );
      const nextSelectedKeySet = new Set(availableSelectedKeys);

      setSelectedFundingCoinKeys(availableSelectedKeys);
      setFundAmounts(current =>
        Object.fromEntries(
          Object.entries(current).filter(([key]) =>
            nextSelectedKeySet.has(key),
          ),
        ),
      );
    },
    [activeFundingCoins],
  );
  const removeFundingCurrency = useCallback(key => {
    setSelectedFundingCoinKeys(current =>
      current.filter(currentKey => currentKey !== key),
    );
    setFundAmounts(current => {
      const next = {...current};
      delete next[key];
      return next;
    });
  }, []);
  const selectedIdentityKeys = useMemo(
    () => selections.identities.map(identity => identity.key).join('|'),
    [selections.identities],
  );
  const topups = useMemo(
    () => getGiftCardFundingTopups(selections, {identityFunding}),
    [identityFunding, selections],
  );
  const identityFeeFundingTransactions = useMemo(
    () =>
      (preflightPlan?.transactions || []).filter(
        tx => tx.type === 'identity' && tx.usesIdentityFeeFunds,
      ),
    [preflightPlan],
  );
  const preflightFees = useMemo(() => {
    const feesBySystem = {};

    for (const transaction of preflightPlan?.transactions || []) {
      const feeSats =
        transaction.feeSats ??
        transaction.validation?.fees?.[transaction.systemId];

      if (feeSats == null) continue;

      feesBySystem[transaction.systemId] = BigNumber(
        feesBySystem[transaction.systemId] || 0,
      )
        .plus(feeSats)
        .toString();
    }

    return Object.entries(feesBySystem).map(([systemId, satoshis]) => ({
      amount: BigNumber(satoshis).dividedBy(100000000).toString(),
      systemId,
    }));
  }, [preflightPlan]);
  const systemIds = useMemo(
    () => Object.keys(card?.addressesBySystem || {}),
    [card],
  );
  const selectedExternalAddress =
    card?.addressesBySystem?.[selectedSystemId] || '';

  const handleEncryptedChange = value => {
    revealPasswordScrollRef.current = value;

    if (!value) {
      setShowClaimPassword(false);
      setShowConfirmPassword(false);
    }

    setEncrypted(value);
  };

  const handlePasswordFocus = field => {
    focusedPasswordFieldRef.current = field;
    scrollPasswordFieldsIntoView();
  };

  const handlePasswordBlur = field => {
    if (focusedPasswordFieldRef.current === field) {
      focusedPasswordFieldRef.current = null;
    }
  };

  const handleScrollViewportLayout = () => {
    if (focusedPasswordFieldRef.current) {
      scrollPasswordFieldsIntoView();
    }
  };

  const handleScrollContentSizeChange = () => {
    if (revealPasswordScrollRef.current) {
      revealPasswordScrollRef.current = false;
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          animated: !reduceMotionEnabled,
          y: 120,
        });
      });
      return;
    }

    if (focusedPasswordFieldRef.current) {
      scrollPasswordFieldsIntoView();
    }
  };

  useEffect(() => {
    setPreflightPlan(null);
    setResult(current => (step === STEP_RESULT ? current : null));
  }, [
    claimPassword,
    confirmPassword,
    encrypted,
    fundAmounts,
    label,
    selectedIds,
    step,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadIdentityFunding = async () => {
      if (step !== STEP_REVIEW || selections.identities.length === 0) {
        setIdentityFunding([]);
        setIdentityFundingError(null);
        setIdentityFundingLoading(false);
        return;
      }

      setIdentityFundingLoading(true);
      setIdentityFundingError(null);

      try {
        const fundedIdentities = await discoverGiftCardIdentityFunds({
          identities: selections.identities,
        });

        if (!cancelled) setIdentityFunding(fundedIdentities);
      } catch (e) {
        if (!cancelled) {
          setIdentityFunding([]);
          setIdentityFundingError(
            e.message ||
              'Unable to check funds held by selected VerusIDs.',
          );
        }
      } finally {
        if (!cancelled) setIdentityFundingLoading(false);
      }
    };

    loadIdentityFunding();

    return () => {
      cancelled = true;
    };
  }, [selectedIdentityKeys, selections.identities, step]);

  const saveCard = useCallback(
    async (nextCard, expectedCard = null) => {
      const savedData = await modifyServiceStoredDataForUser(
        currentData => {
          const normalized = normalizeGiftCardServiceData(currentData);
          const currentCard = normalized.cards?.[nextCard.id];
          const nextData =
            currentCard == null
              ? upsertGiftCard(normalized, nextCard)
              : upsertGiftCardIfUnchanged(
                  normalized,
                  expectedCard || nextCard,
                  nextCard,
                );

          return {
            ...nextData,
            introSeen: true,
          };
        },
        GIFT_CARD_SERVICE_ID,
        activeAccount.accountHash,
      );

      setServiceData(savedData);
      const savedCard = savedData.cards?.[nextCard.id] || nextCard;

      if (hasGiftCardBeenShared(savedCard)) {
        throw new Error(
          'Shared gift cards cannot be funded. Create a new gift card instead.',
        );
      }

      if (hasGiftCardShareReservation(savedCard)) {
        throw new Error(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      }

      return savedCard;
    },
    [activeAccount],
  );

  const updateStoredCard = useCallback(
    async (cardId, updater) => {
      const savedData = await modifyServiceStoredDataForUser(
        currentData => {
          const normalized = normalizeGiftCardServiceData(currentData);
          const currentCard = normalized.cards?.[cardId];

          if (!currentCard) {
            throw new Error('Gift card is no longer available.');
          }

          return {
            ...updater(normalized, currentCard),
            introSeen: true,
          };
        },
        GIFT_CARD_SERVICE_ID,
        activeAccount.accountHash,
      );

      setServiceData(savedData);
      return savedData.cards?.[cardId] || null;
    },
    [activeAccount],
  );

  const loadLatestFundableCard = useCallback(async () => {
    if (createMode) {
      if (!card) throw new Error('Gift card is not ready.');
      const latestData = normalizeGiftCardServiceData(
        await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
      );
      const latestCard = latestData.cards?.[card.id] || card;

      if (hasGiftCardBeenShared(latestCard)) {
        throw new Error(
          'Shared gift cards cannot be funded. Create a new gift card instead.',
        );
      }

      if (hasGiftCardShareReservation(latestCard)) {
        throw new Error(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      }

      setServiceData(latestData);
      return latestCard;
    }

    const latestData = normalizeGiftCardServiceData(
      await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
    );
    const latestCard = latestData.cards?.[routeCardId];

    if (!latestCard) {
      throw new Error('Gift card is no longer available.');
    }

    if (hasGiftCardBeenShared(latestCard)) {
      throw new Error(
        'Shared gift cards cannot be funded. Create a new gift card instead.',
      );
    }

    if (hasGiftCardShareReservation(latestCard)) {
      throw new Error(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
    }

    setServiceData(latestData);
    return latestCard;
  }, [card, createMode, routeCardId]);

  const prepareShareCard = useCallback(
    async cardToShare => {
      if (getGiftCardCapabilities(cardToShare).isRedeemed) {
        throw new Error(GIFT_CARD_REDEEMED_SHARE_MESSAGE);
      }

      if (hasGiftCardShareInProgress(cardToShare)) {
        throw new Error(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      }

      const refreshed = await refreshGiftCardStatus({
        card: cardToShare,
        activeCoinsForUser,
      });
      const latestCard = await updateStoredCard(
        cardToShare.id,
        currentData =>
          upsertGiftCardIfUnchanged(
            currentData,
            cardToShare,
            refreshed,
          ),
      );

      if (getGiftCardCapabilities(latestCard).isRedeemed) {
        throw new Error(GIFT_CARD_REDEEMED_SHARE_MESSAGE);
      }

      if (hasGiftCardBeenShared(latestCard)) return latestCard;

      if (hasPendingGiftCardFunding(latestCard)) {
        throw new Error(
          'Wait for funding transactions to confirm before sharing this gift card.',
        );
      }

      if (hasGiftCardShareInProgress(latestCard)) {
        throw new Error(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      }

      if (!hasGiftCardClaims(latestCard)) {
        throw new Error(
          'Fund this gift card and wait for confirmation before sharing it.',
        );
      }

      return latestCard;
    },
    [activeCoinsForUser, updateStoredCard],
  );

  const openShareOptions = useCallback(
    async cardToShare => {
      setBusy(true);
      setOperationText('Checking gift card status...');

      try {
        const preparedCard = await prepareShareCard(cardToShare);
        setShareCard(preparedCard);
      } catch (e) {
        Alert.alert(
          'Unable to share',
          e.message || 'Unable to prepare gift card.',
        );
      } finally {
        setBusy(false);
        setOperationText('');
      }
    },
    [prepareShareCard],
  );

  const runShareAction = useCallback(
    async (cardToShare, action) => {
      let actionCompleted = false;
      let shareAttemptId = null;
      const rollbackShareAttempt = async () => {
        if (!shareAttemptId) return;

        try {
          await updateStoredCard(
            cardToShare.id,
            (currentData, currentCard) =>
              upsertGiftCard(
                currentData,
                cancelGiftCardShare(currentCard, shareAttemptId),
              ),
          );
        } catch (rollbackError) {
          console.warn(
            'Unable to clear gift card share attempt',
            rollbackError,
          );
        }
      };
      setBusy(true);
      setOperationText('Securing gift card for sharing...');

      try {
        const preparedCard = await prepareShareCard(cardToShare);
        const actionCard = await updateStoredCard(
          preparedCard.id,
          (currentData, currentCard) => {
            if (getGiftCardCapabilities(currentCard).isRedeemed) {
              throw new Error(GIFT_CARD_REDEEMED_SHARE_MESSAGE);
            }

            if (hasGiftCardBeenShared(currentCard)) {
              return currentData;
            }

            if (hasPendingGiftCardFunding(currentCard)) {
              throw new Error(
                'Wait for funding transactions to confirm before sharing this gift card.',
              );
            }

            if (!hasGiftCardClaims(currentCard)) {
              throw new Error(
                'Fund this gift card and wait for confirmation before sharing it.',
              );
            }

            const startedCard = beginGiftCardShare(currentCard);
            shareAttemptId = startedCard.shareAttempt?.id || null;
            return upsertGiftCard(
              currentData,
              startedCard,
            );
          },
        );

        if (!actionCard) {
          throw new Error('Gift card is no longer available.');
        }

        const actionResult = await action(actionCard);

        if (actionResult === false) {
          await rollbackShareAttempt();
          return null;
        }

        actionCompleted = true;

        const sharedCard = shareAttemptId
          ? await updateStoredCard(
              preparedCard.id,
              (currentData, currentCard) =>
                upsertGiftCard(
                  currentData,
                  completeGiftCardShare(currentCard, shareAttemptId),
                ),
            )
          : actionCard;

        if (!hasGiftCardBeenShared(sharedCard)) {
          throw new Error(
            'Gift card state changed before sharing could be recorded.',
          );
        }

        setResult(current =>
          current ? {...current, card: sharedCard} : current,
        );
        setShareCard(sharedCard);
        return sharedCard;
      } catch (e) {
        if (!actionCompleted) await rollbackShareAttempt();

        Alert.alert(
          'Unable to share',
          e.message || 'Unable to share gift card.',
        );
        return null;
      } finally {
        setBusy(false);
        setOperationText('');
      }
    },
    [prepareShareCard, updateStoredCard],
  );

  const unlinkFundedIdentities = async identities => {
    if (!identities || identities.length === 0) return;

    const savedData = await modifyServiceStoredDataForUser(
      currentData =>
        unlinkGiftCardFundingIdentitiesFromVerusIdData(
          currentData,
          identities,
        ),
      VERUSID_SERVICE_ID,
      activeAccount.accountHash,
    );
    setLinkedIds(savedData.linked_ids || {});
  };

  const createDraft = async () => {
    if (encrypted && !claimPassword) {
      setResult({
        kind: 'error',
        title: 'Claim password required',
        message: 'Enter a claim password before continuing.',
      });
      AccessibilityInfo.announceForAccessibility(
        'Claim password required. Enter a claim password before continuing.',
      );
      return;
    }

    if (encrypted && claimPassword !== confirmPassword) {
      setResult({
        kind: 'error',
        title: 'Passwords do not match',
        message: 'Check the claim password confirmation and try again.',
      });
      AccessibilityInfo.announceForAccessibility(
        'Passwords do not match. Check the claim password confirmation and try again.',
      );
      return;
    }

    setBusy(true);
    setOperationText(getCreateOperationText('protecting', encrypted));
    setResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 0));

      const requestIsTestnet =
        activeAccount?.testnetOverrides != null &&
        Object.keys(activeAccount.testnetOverrides).length > 0;
      const nextCard = await createGiftCard({
        label,
        password: encrypted ? claimPassword : undefined,
        requestIsTestnet,
        activeCoinsForUser,
        onProgress: ({phase}) =>
          setOperationText(getCreateOperationText(phase, encrypted)),
      });

      setDraftCard(nextCard);
      setStep(STEP_CONTENTS);
    } catch (e) {
      setResult({
        kind: 'error',
        title: 'Gift card not created',
        message: e.message,
      });
    } finally {
      setBusy(false);
      setOperationText('');
    }
  };

  const buildPreflight = async () => {
    if (!card || !hasSelections) return;

    setBusy(true);
    setOperationText(
      getPreflightOperationText(
        'checking-protected-card',
        card.encrypted,
      ),
    );

    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      const fundingCard = await loadLatestFundableCard();

      const plan = await preflightGiftCardFunding({
        card: fundingCard,
        password: fundingCard.encrypted ? claimPassword : undefined,
        selections,
        identityFunding,
        activeCoinsForUser,
        activeAccount,
        onProgress: ({phase, current, total}) =>
          setOperationText(
            getPreflightOperationText(
              phase,
              fundingCard.encrypted,
              current,
              total,
            ),
          ),
      });

      setPreflightPlan(plan);
      setResult(null);
    } catch (e) {
      setPreflightPlan(null);
      setResult({
        kind: 'error',
        title: 'Funding could not be verified',
        message: e.message,
      });
    } finally {
      setBusy(false);
      setOperationText('');
    }
  };

  const persistFundingResult = async (fundingCard, fundingResult) => {
    setOperationText('Saving submitted transactions...');
    const pendingCard = await updateStoredCard(
      fundingCard.id,
      (currentData, currentCard) =>
        upsertGiftCard(
          currentData,
          addGiftCardPendingFunding(currentCard, fundingResult),
        ),
    );
    const submittedIdentities =
      getSubmittedGiftCardFundingIdentities(fundingResult);
    let unlinkError = null;
    let finalCard = pendingCard;

    if (submittedIdentities.length > 0) {
      setOperationText('Unlinking transferred VerusIDs...');

      try {
        await unlinkFundedIdentities(submittedIdentities);
      } catch (e) {
        unlinkError = e;
      }
    }

    setOperationText('Refreshing gift card status...');

    try {
      finalCard = await refreshGiftCardStatus({
        card: pendingCard,
        activeCoinsForUser,
      });
      finalCard = await updateStoredCard(
        pendingCard.id,
        currentData =>
          upsertGiftCardIfUnchanged(
            currentData,
            pendingCard,
            finalCard,
          ),
      );
    } catch (_) {
      finalCard = pendingCard;
    }

    return {
      card: finalCard,
      submittedIdentities,
      unlinkError,
    };
  };

  const persistFundingBroadcast = async (fundingCard, pendingBroadcast) => {
    const updatedCard = await updateStoredCard(
      fundingCard.id,
      (currentData, currentCard) =>
        upsertGiftCard(
          currentData,
          addGiftCardPendingFunding(currentCard, {
            pendingBroadcast,
            results: pendingBroadcast.transactions,
          }),
        ),
    );

    setPendingFundingBroadcast(pendingBroadcast);
    return updatedCard;
  };

  const broadcast = async () => {
    if (!card || (!preflightPlan && !pendingFunding)) return;

    let cardSaved = false;
    let fundingCard = card;

    setBusy(true);
    setOperationText('Saving gift card before funding...');
    setResult(null);
    setStep(STEP_PROCESSING);

    try {
      fundingCard = createMode
        ? await saveCard(await loadLatestFundableCard())
        : await loadLatestFundableCard();
      cardSaved = true;
      setOperationText('Submitting signed gift card funding transactions...');

      const fundingResult = await broadcastGiftCardFunding({
        preflightPlan,
        pendingBroadcast: pendingFunding,
        persistPendingBroadcast: pendingBroadcast =>
          persistFundingBroadcast(fundingCard, pendingBroadcast),
      });
      const persisted = await persistFundingResult(
        fundingCard,
        fundingResult,
      );
      const unlinkMessage = persisted.unlinkError
        ? ` Funding succeeded, but one or more transferred VerusIDs could not be unlinked locally: ${persisted.unlinkError.message}`
        : '';

      setResult({
        kind: 'success',
        title: 'Funding submitted',
        message:
          `Your gift card is saved. Submitted transactions will update automatically as they confirm.${unlinkMessage}`,
        card: persisted.card,
        txids: getTxids(fundingResult),
      });
      setStep(STEP_RESULT);
    } catch (e) {
      if (Array.isArray(e.results) && e.results.length > 0) {
        const partialResult = {
          preflightPlan: e.preflightPlan || preflightPlan,
          pendingBroadcast: e.pendingBroadcast,
          results: e.results,
        };

        try {
          const persisted = await persistFundingResult(
            fundingCard,
            partialResult,
          );
          const count = e.results.length;
          const unlinkMessage = persisted.unlinkError
            ? ` One or more transferred VerusIDs could not be unlinked locally: ${persisted.unlinkError.message}`
            : '';

          setResult({
            kind: 'partial',
            title: 'Partially funded',
            message:
              `${count} transaction${count === 1 ? '' : 's'} ${
                count === 1 ? 'was' : 'were'
              } submitted before an error occurred. Review the card to see what is pending. ${e.message}${unlinkMessage}`,
            card: persisted.card,
            txids: getTxids(partialResult),
          });
        } catch (saveError) {
          setResult({
            kind: 'error',
            title: 'Submitted, but not saved',
            message:
              `Some transactions were submitted, but their pending history could not be saved locally: ${saveError.message}`,
            card: fundingCard,
            txids: getTxids(partialResult),
          });
        }
      } else {
        const hasSavedBroadcast =
          e?.pendingBroadcast != null || pendingFunding != null;

        setResult({
          kind: 'error',
          title: hasSavedBroadcast
            ? 'Funding not confirmed'
            : 'Funding not completed',
          message: hasSavedBroadcast
            ? `${e.message}\n\nThe exact signed transaction was saved and can be retried safely.`
            : e.message,
          card: cardSaved ? fundingCard : null,
          pendingRetry: hasSavedBroadcast,
          retryable: !hasSavedBroadcast,
          txids: getTxids({
            results:
              e?.pendingBroadcast?.transactions ||
              pendingFunding?.transactions ||
              [],
          }),
        });
      }

      setStep(STEP_RESULT);
    } finally {
      setBusy(false);
      setOperationText('');
    }
  };

  const openExternalFunding = async () => {
    if (!card) return;

    setBusy(true);
    setOperationText('Saving gift card...');

    try {
      const fundingCard = createMode
        ? await saveCard(await loadLatestFundableCard())
        : await loadLatestFundableCard();
      const nextSystemId =
        selectedSystemId ||
        Object.keys(fundingCard.addressesBySystem || {})[0] ||
        null;

      if (!nextSystemId) {
        throw new Error('No supported funding system is available.');
      }

      setSelectedSystemId(nextSystemId);
      setExternalReturnStep(step);
      setStep(STEP_EXTERNAL);
      setResult(null);
    } catch (e) {
      setResult({
        kind: 'error',
        title: 'Gift card not saved',
        message: e.message,
      });
    } finally {
      setBusy(false);
      setOperationText('');
    }
  };

  const handleBack = () => {
    if (busy || step === STEP_PROCESSING) return;

    if (step === STEP_RESULT) {
      props.navigation.goBack();
    } else if (step === STEP_EXTERNAL) {
      if (createMode || startExternal) {
        props.navigation.goBack();
      } else {
        setStep(externalReturnStep);
      }
    } else if (step === STEP_REVIEW) {
      setPreflightPlan(null);
      setResult(null);
      setStep(STEP_CONTENTS);
    } else if (step === STEP_CONTENTS && createMode) {
      setResult(null);
      setStep(STEP_DETAILS);
    } else {
      props.navigation.goBack();
    }
  };

  const renderInlineResult = () => {
    if (!result || step === STEP_RESULT) return null;

    const isError = result.kind === 'error';

    return (
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.inlineNotice,
          {
            backgroundColor: getNoticeBackground(isError, theme),
            borderColor: isError
              ? theme.colors.danger
              : theme.colors.success,
          },
        ]}>
        <MaterialCommunityIcons
          color={isError ? theme.colors.danger : theme.colors.success}
          name={isError ? 'alert-circle-outline' : 'check-circle-outline'}
          size={20}
        />
        <View style={styles.noticeCopy}>
          <Text style={[styles.noticeTitle, {color: theme.colors.textPrimary}]}>
            {result.title}
          </Text>
          <Text style={[styles.noticeText, {color: theme.colors.textSecondary}]}>
            {result.message}
          </Text>
        </View>
      </View>
    );
  };

  const claimPasswordError =
    result?.kind === 'error' && result.title === 'Claim password required'
      ? result.message
      : null;
  const confirmPasswordError =
    result?.kind === 'error' && result.title === 'Passwords do not match'
      ? result.message
      : null;
  const hasPasswordFieldError =
    claimPasswordError != null || confirmPasswordError != null;

  const renderDetails = () => (
    <>
      <AppTextInput
        autoCapitalize="sentences"
        label="Gift card name"
        onChangeText={setLabel}
        placeholder="Summer trip"
        value={label}
      />

      <View style={[styles.switchRow, {borderBottomColor: theme.colors.border}]}>
        <View style={styles.switchCopy}>
          <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
            Require claim password
          </Text>
          <Text style={[styles.helper, {color: theme.colors.textSecondary}]}>
            Adds a separate secret the recipient must enter.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Require claim password"
          color={theme.colors.primary}
          onValueChange={handleEncryptedChange}
          value={encrypted}
        />
      </View>

      {encrypted ? (
        <>
          <View
            style={[
              styles.warning,
              {backgroundColor: theme.colors.warningBackground},
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.warning}
              name="shield-alert-outline"
              size={21}
            />
            <Text style={[styles.warningText, {color: theme.colors.textSecondary}]}>
              The password cannot be recovered. If it is lost, this gift card
              and its funds cannot be claimed.
            </Text>
          </View>
          <AppTextInput
            blurOnSubmit={false}
            enablesReturnKeyAutomatically
            errorText={claimPasswordError}
            label="Claim password"
            onBlur={() => handlePasswordBlur('claim')}
            onChangeText={setClaimPassword}
            onFocus={() => handlePasswordFocus('claim')}
            onRightPress={() => setShowClaimPassword(value => !value)}
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            returnKeyType="next"
            rightAccessibilityLabel={
              showClaimPassword
                ? 'Hide claim password'
                : 'Show claim password'
            }
            rightIcon={showClaimPassword ? 'eye-off' : 'eye'}
            secureTextEntry={!showClaimPassword}
            value={claimPassword}
          />
          <AppTextInput
            blurOnSubmit={false}
            enablesReturnKeyAutomatically
            errorText={confirmPasswordError}
            label="Confirm claim password"
            onBlur={() => handlePasswordBlur('confirm')}
            onChangeText={setConfirmPassword}
            onFocus={() => handlePasswordFocus('confirm')}
            onRightPress={() => setShowConfirmPassword(value => !value)}
            onSubmitEditing={busy ? undefined : createDraft}
            ref={confirmPasswordInputRef}
            returnKeyType="done"
            rightAccessibilityLabel={
              showConfirmPassword
                ? 'Hide confirm claim password'
                : 'Show confirm claim password'
            }
            rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
          />
        </>
      ) : null}

      {hasPasswordFieldError ? null : renderInlineResult()}
    </>
  );

  const renderFunds = () => (
    <View style={styles.composerSection}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
          Add funds
        </Text>
        <Text style={[styles.helper, {color: theme.colors.textSecondary}]}>
          Choose currencies, then enter the amount for each.
        </Text>
      </View>

      {activeFundingCoins.length === 0 ? (
        <Text style={[styles.emptyCopy, {color: theme.colors.textSecondary}]}>
          No compatible VRPC balances are available for this card.
        </Text>
      ) : selectedFundingCoins.length === 0 ? (
        <TouchableOpacity
          accessibilityHint="Opens a searchable currency picker."
          accessibilityRole="button"
          activeOpacity={0.74}
          disabled={busy}
          onPress={() => setCurrencyPickerVisible(true)}
          style={styles.currencyPickerLauncher}>
          <View
            style={[
              styles.currencyPickerLauncherIcon,
              {backgroundColor: theme.colors.surfaceMuted},
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="plus"
              size={23}
            />
          </View>
          <View style={styles.currencyPickerLauncherCopy}>
            <Text
              style={[
                styles.assetTitle,
                {color: theme.colors.textPrimary},
              ]}>
              Choose currencies
            </Text>
            <Text
              style={[
                styles.assetMeta,
                {color: theme.colors.textSecondary},
              ]}>
              {activeFundingCoins.length}{' '}
              {activeFundingCoins.length === 1
                ? 'currency'
                : 'currencies'}{' '}
              available
            </Text>
          </View>
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name="chevron-right"
            size={22}
          />
        </TouchableOpacity>
      ) : (
        <>
          {selectedFundingCoins.map(coinObj => {
            const key = getFundingCoinKey(coinObj);
            const balance = getCoinBalance(
              coinObj,
              activeAccount,
              ledgerBalances,
            );
            const maxAmount = getMaxFundAmount(coinObj, balance);
            const ticker = coinObj.display_ticker || coinObj.id;

            return (
              <View
                key={key}
                style={[
                  styles.assetRow,
                  {borderTopColor: theme.colors.border},
                ]}>
                <View style={styles.assetCopy}>
                  <View style={styles.assetTitleRow}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.assetTitle,
                        styles.assetTitleFlexible,
                        {color: theme.colors.textPrimary},
                      ]}>
                      {ticker}
                    </Text>
                    <TouchableOpacity
                      accessibilityLabel={`Remove ${ticker}`}
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      disabled={busy}
                      hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}
                      onPress={() => removeFundingCurrency(key)}
                      style={styles.removeCurrencyButton}>
                      <MaterialCommunityIcons
                        color={theme.colors.textSubtle}
                        name="close"
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.assetMeta,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Balance: {balance == null ? '—' : formatAmount(balance)}{' '}
                    {ticker}
                  </Text>
                </View>
                <View style={styles.amountEditor}>
                  <AppTextInput
                    accessibilityLabel={`Amount of ${ticker}`}
                    containerStyle={styles.amountInput}
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    onChangeText={value =>
                      setFundAmounts(current => ({
                        ...current,
                        [key]: value,
                      }))
                    }
                    placeholder="0"
                    size="compact"
                    inputStyle={styles.amountInputText}
                    value={fundAmounts[key] || ''}
                  />
                  <TouchableOpacity
                    accessibilityLabel={`Use maximum ${ticker} balance`}
                    accessibilityRole="button"
                    disabled={maxAmount == null || !hasAmount(maxAmount)}
                    onPress={() =>
                      setFundAmounts(current => ({
                        ...current,
                        [key]: formatAmount(maxAmount),
                      }))
                    }
                    style={styles.maxButton}>
                    <Text
                      style={[
                        styles.maxLabel,
                        {
                          color:
                            maxAmount == null || !hasAmount(maxAmount)
                              ? theme.colors.disabledText
                              : theme.colors.primary,
                        },
                      ]}>
                      Max
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            accessibilityHint="Opens the currency picker with current selections."
            accessibilityRole="button"
            activeOpacity={0.74}
            disabled={busy}
            onPress={() => setCurrencyPickerVisible(true)}
            style={[
              styles.editCurrenciesRow,
              {borderTopColor: theme.colors.border},
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="plus-circle-outline"
              size={20}
            />
            <Text
              style={[
                styles.editCurrenciesLabel,
                {color: theme.colors.primary},
              ]}>
              Add or remove currencies
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderIdentities = () => (
    <View style={styles.composerSection}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
          Add VerusID
        </Text>
        <Text style={[styles.helper, {color: theme.colors.textSecondary}]}>
          Move one or more linked identities into the gift card.
        </Text>
      </View>

      {linkedIdentityOptions.map(identity => {
        const selected = selectedIds[identity.key] === true;

        return (
          <TouchableOpacity
            accessibilityLabel={
              identity.fullyQualifiedName || identity.identityAddress
            }
            accessibilityRole="checkbox"
            accessibilityState={{checked: selected}}
            key={identity.key}
            onPress={() =>
              setSelectedIds(current => ({
                ...current,
                [identity.key]: !current[identity.key],
              }))
            }
            style={[
              styles.identityRow,
              {borderTopColor: theme.colors.border},
            ]}>
            <MaterialCommunityIcons
              color={
                selected
                  ? theme.colors.primary
                  : theme.colors.textSubtle
              }
              name={
                selected
                  ? 'checkbox-marked-circle'
                  : 'checkbox-blank-circle-outline'
              }
              size={24}
            />
            <View style={styles.identityCopy}>
              <Text
                numberOfLines={1}
                style={[styles.assetTitle, {color: theme.colors.textPrimary}]}>
                {identity.fullyQualifiedName || identity.identityAddress}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.assetMeta, {color: theme.colors.textSecondary}]}>
                {getSystemName(identity.systemId, activeCoinsForUser)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderContents = () => (
    <>
      <View style={styles.stepCopy}>
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
          Build the gift
        </Text>
      </View>

      {renderFunds()}
      {linkedIdentityOptions.length > 0 ? renderIdentities() : null}

      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy}
        onPress={openExternalFunding}
        style={[
          styles.externalBranch,
          {
            backgroundColor: theme.colors.surfaceMuted,
          },
        ]}>
        <View style={styles.externalBranchCopy}>
          <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
            Fund from another wallet
          </Text>
          <Text style={[styles.helper, {color: theme.colors.textSecondary}]}>
            Save this card and choose the receiving system address.
          </Text>
        </View>
        <MaterialCommunityIcons
          color={theme.colors.textSubtle}
          name="chevron-right"
          size={22}
        />
      </TouchableOpacity>

      {renderInlineResult()}
    </>
  );

  const renderReview = () => (
    <>
      <View style={styles.stepCopy}>
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
          Review before funding
        </Text>
      </View>

      <View style={[styles.reviewGroup, {borderColor: theme.colors.border}]}>
        <Text style={[styles.reviewHeading, {color: theme.colors.textPrimary}]}>
          Contents
        </Text>
        {selections.funds.map(fund => (
          <View
            key={`${fund.systemId}:${fund.currencyId}`}
            style={styles.reviewRow}>
            <Text style={[styles.reviewLabel, {color: theme.colors.textSecondary}]}>
              {fund.coinObj.display_ticker || fund.coinObj.id}
            </Text>
            <Text style={[styles.reviewValue, {color: theme.colors.textPrimary}]}>
              {formatAmount(fund.amount)}
            </Text>
          </View>
        ))}
        {selections.identities.map(identity => (
          <View key={identity.key} style={styles.reviewRow}>
            <Text
              numberOfLines={1}
              style={[styles.reviewLabel, {color: theme.colors.textSecondary}]}>
              VerusID
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.reviewValue, {color: theme.colors.textPrimary}]}>
              {identity.fullyQualifiedName || identity.identityAddress}
            </Text>
          </View>
        ))}
      </View>

      {identityFundingLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator
            animating
            color={theme.colors.primary}
            size="small"
          />
          <Text style={[styles.helper, {color: theme.colors.textSecondary}]}>
            Checking funds held by selected VerusIDs…
          </Text>
        </View>
      ) : null}

      {identityFundingError ? (
        <View
          style={[
            styles.warning,
            {backgroundColor: theme.colors.dangerBackground},
          ]}>
          <MaterialCommunityIcons
            color={theme.colors.warning}
            name="alert-outline"
            size={21}
          />
          <Text style={[styles.warningText, {color: theme.colors.textSecondary}]}>
            {identityFundingError}
          </Text>
        </View>
      ) : null}

      {!identityFundingLoading && identityFunding.length > 0 ? (
        <View
          style={[
            styles.reviewGroup,
            {
              borderColor: theme.colors.warning,
              backgroundColor: theme.colors.warningBackground,
            },
          ]}>
          <Text style={[styles.reviewHeading, {color: theme.colors.textPrimary}]}>
            Funds held by VerusIDs
          </Text>
          <Text style={[styles.helper, {color: theme.colors.textSecondary}]}>
            These balances move with the identity.
          </Text>
          {identityFunding.map(identity => (
            <View key={identity.key} style={styles.identityFundingBlock}>
              <Text style={[styles.assetTitle, {color: theme.colors.textPrimary}]}>
                {identity.fullyQualifiedName || identity.identityAddress}
              </Text>
              {(identity.currencies || []).map(currency => (
                <Text
                  key={`${identity.key}:${currency.currencyId}`}
                  style={[styles.assetMeta, {color: theme.colors.textSecondary}]}>
                  {formatAmount(currency.amount)}{' '}
                  {currency.display?.name ||
                    getCurrencyName(
                      identity.systemId,
                      currency.currencyId,
                      activeCoinsForUser,
                    )}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {Object.keys(topups).length > 0 ? (
        <View style={[styles.reviewGroup, {borderColor: theme.colors.border}]}>
          <Text style={[styles.reviewHeading, {color: theme.colors.textPrimary}]}>
            Native fee reserve
          </Text>
          {Object.values(topups).map(topup => (
            <View key={topup.systemId} style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, {color: theme.colors.textSecondary}]}>
                {getSystemName(topup.systemId, activeCoinsForUser)}
              </Text>
              <Text style={[styles.reviewValue, {color: theme.colors.textPrimary}]}>
                {formatAmount(topup.amount)}{' '}
                {getCurrencyName(
                  topup.systemId,
                  topup.systemId,
                  activeCoinsForUser,
                )}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {preflightFees.length > 0 ? (
        <View style={[styles.reviewGroup, {borderColor: theme.colors.border}]}>
          <Text style={[styles.reviewHeading, {color: theme.colors.textPrimary}]}>
            Network fees
          </Text>
          {preflightFees.map(fee => (
            <View key={fee.systemId} style={styles.reviewRow}>
              <Text
                style={[styles.reviewLabel, {color: theme.colors.textSecondary}]}>
                {getSystemName(fee.systemId, activeCoinsForUser)}
              </Text>
              <Text
                style={[styles.reviewValue, {color: theme.colors.textPrimary}]}>
                {formatAmount(fee.amount)}{' '}
                {getCurrencyName(
                  fee.systemId,
                  fee.systemId,
                  activeCoinsForUser,
                )}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {card?.encrypted && !createMode ? (
        <AppTextInput
          label="Gift card claim password"
          onChangeText={setClaimPassword}
          secureTextEntry
          value={claimPassword}
        />
      ) : null}

      {!preflightPlan ? (
        <View
          style={[
            styles.reviewAssurance,
            {backgroundColor: theme.colors.surfaceMuted},
          ]}>
          <Text style={[styles.noticeTitle, {color: theme.colors.textPrimary}]}>
            Address verification
          </Text>
          <Text style={[styles.noticeText, {color: theme.colors.textSecondary}]}>
            The card address is re-derived before any transaction is built.
          </Text>
        </View>
      ) : null}

      {preflightPlan ? (
        <View
          style={[
            styles.verified,
            {backgroundColor: theme.colors.successBackground},
          ]}>
          <MaterialCommunityIcons
            color={theme.colors.success}
            name="shield-check-outline"
            size={22}
          />
          <View style={styles.noticeCopy}>
            <Text style={[styles.noticeTitle, {color: theme.colors.textPrimary}]}>
              Ready to fund
            </Text>
            <Text style={[styles.noticeText, {color: theme.colors.textSecondary}]}>
              {preflightPlan.transactions.length} transaction
              {preflightPlan.transactions.length === 1 ? '' : 's'} verified.
            </Text>
          </View>
        </View>
      ) : null}

      {identityFeeFundingTransactions.length > 0 ? (
        <View
          style={[
            styles.warning,
            {backgroundColor: theme.colors.warningBackground},
          ]}>
          <MaterialCommunityIcons
            color={theme.colors.warning}
            name="information-outline"
            size={21}
          />
          <Text style={[styles.warningText, {color: theme.colors.textSecondary}]}>
            Wallet fee funds were unavailable for one or more transfers, so
            the native fee will be paid from the VerusID being moved.
          </Text>
        </View>
      ) : null}

      {renderInlineResult()}
    </>
  );

  const renderExternal = () => (
    <>
      <View style={styles.stepCopy}>
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
          Fund from another wallet
        </Text>
      </View>

      <Text style={[styles.fieldLabel, {color: theme.colors.textSecondary}]}>
        Funding system
      </Text>
      <Text style={[styles.fieldHelper, {color: theme.colors.textSecondary}]}>
        Choose the same system as the sending wallet. Each system has its own
        derived address.
      </Text>
      <FadedScrollView
        contentContainerStyle={styles.systemPills}
        fadeBackgroundColor={theme.colors.background}
        fadeLength={28}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {systemIds.map(systemId => {
          const selected = selectedSystemId === systemId;

          return (
            <TouchableOpacity
              accessibilityRole="radio"
              accessibilityState={{checked: selected}}
              key={systemId}
              onPress={() => setSelectedSystemId(systemId)}
              style={[
                styles.systemPill,
                {
                  backgroundColor: selected
                    ? theme.colors.primary
                    : theme.colors.surfaceMuted,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}>
              <Text
                style={[
                  styles.systemPillText,
                  {
                    color: selected
                      ? theme.colors.onPrimary
                      : theme.colors.textPrimary,
                  },
                ]}>
                {getSystemName(systemId, activeCoinsForUser)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </FadedScrollView>

      <View
        style={[
          styles.addressPanel,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}>
        <View style={styles.addressHeading}>
          <Text style={[styles.fieldLabel, {color: theme.colors.textSecondary}]}>
            {getSystemName(selectedSystemId, activeCoinsForUser)} address
          </Text>
          <CopyAction
            accessibilityLabel="Copy selected system funding address"
            copiedAccessibilityLabel="Funding address copied"
            color={theme.colors.primary}
            value={selectedExternalAddress}
          />
        </View>
        <Text
          selectable
          style={[styles.address, {color: theme.colors.textPrimary}]}>
          {selectedExternalAddress}
        </Text>
      </View>

      <View
        style={[
          styles.verified,
          {backgroundColor: theme.colors.successBackground},
        ]}>
        <MaterialCommunityIcons
          color={theme.colors.success}
          name="refresh"
          size={22}
        />
        <View style={styles.noticeCopy}>
          <Text style={[styles.noticeTitle, {color: theme.colors.textPrimary}]}>
            The card is saved
          </Text>
          <Text style={[styles.noticeText, {color: theme.colors.textSecondary}]}>
            Gift Cards refresh when opened and every 30 seconds while
            visible. Confirmed external funds appear automatically.
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.warning,
          {backgroundColor: theme.colors.warningBackground},
        ]}>
        <MaterialCommunityIcons
          color={theme.colors.warning}
          name="alert-outline"
          size={21}
        />
        <Text style={[styles.warningText, {color: theme.colors.textSecondary}]}>
          Only send assets supported by the selected system. Sending through a
          different network may not fund this gift card.
        </Text>
      </View>
    </>
  );

  const renderProcessing = () => (
    <View
      accessibilityLiveRegion="polite"
      style={styles.processing}>
      <View
        style={[
          styles.processingIcon,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name="gift-outline"
          size={50}
        />
      </View>
      <ActivityIndicator
        animating
        color={theme.colors.primary}
        size="large"
        style={styles.processingSpinner}
      />
      <Text style={[styles.resultTitle, {color: theme.colors.textPrimary}]}>
        {createMode ? 'Creating and funding' : 'Funding gift card'}
      </Text>
      <Text style={[styles.resultCopy, {color: theme.colors.textSecondary}]}>
        {operationText || 'Preparing your gift card…'}
      </Text>
      <Text style={[styles.processingNote, {color: theme.colors.textSubtle}]}>
        Keep Verus Mobile open until this finishes.
      </Text>
    </View>
  );

  const renderResult = () => {
    const kind = result?.kind || 'error';
    const {accent, icon} = getResultPresentation(kind, theme);

    return (
      <View style={styles.result}>
        <View
          style={[
            styles.resultIcon,
            {backgroundColor: theme.colors.surfaceMuted},
          ]}>
          <MaterialCommunityIcons color={accent} name={icon} size={58} />
        </View>
        <Text style={[styles.resultTitle, {color: theme.colors.textPrimary}]}>
          {result?.title || 'Funding not completed'}
        </Text>
        <Text style={[styles.resultCopy, {color: theme.colors.textSecondary}]}>
          {result?.message}
        </Text>

        {(result?.txids || []).length > 0 ? (
          <View
            style={[
              styles.txidGroup,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}>
            <Text style={[styles.fieldLabel, {color: theme.colors.textSecondary}]}>
              Submitted transactions
            </Text>
            {result.txids.map(txid => (
              <View key={txid} style={styles.txidRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.txid, {color: theme.colors.textPrimary}]}>
                  {txid}
                </Text>
                <CopyAction
                  accessibilityLabel="Copy transaction ID"
                  color={theme.colors.primary}
                  value={txid}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderStep = () => {
    if (step === STEP_DETAILS) return renderDetails();
    if (step === STEP_CONTENTS) return renderContents();
    if (step === STEP_REVIEW) return renderReview();
    if (step === STEP_EXTERNAL) return renderExternal();
    if (step === STEP_PROCESSING) return renderProcessing();
    return renderResult();
  };

  const renderActions = () => {
    if (step === STEP_PROCESSING) return null;

    if (step === STEP_DETAILS) {
      return (
        <SafeBottomActionStack
          bottomSpacing={
            keyboardVisible ? KEYBOARD_FOOTER_SPACING : 30
          }
          gap={8}
          horizontalSpacing={20}
          includeBottomInset={!keyboardVisible}
          safeAreaSpacing={0}>
          <AppButton
            accessibilityLabel={busy ? operationText : 'Continue'}
            accessibilityState={{busy, disabled: busy}}
            disabled={busy}
            loading={busy}
            onPress={createDraft}>
            {busy ? 'Protecting gift card...' : 'Continue'}
          </AppButton>
        </SafeBottomActionStack>
      );
    }

    if (step === STEP_CONTENTS) {
      return (
        <SafeBottomActionStack
          gap={8}
          horizontalSpacing={20}
          safeAreaSpacing={0}>
          <AppButton
            disabled={!hasSelections || busy}
            onPress={() => {
              setResult(null);
              setStep(STEP_REVIEW);
            }}>
            Review gift card
          </AppButton>
        </SafeBottomActionStack>
      );
    }

    if (step === STEP_REVIEW) {
      return (
        <SafeBottomActionStack
          gap={8}
          horizontalSpacing={20}
          safeAreaSpacing={0}>
          {preflightPlan ? (
            <AppButton
              disabled={busy}
              onPress={broadcast}>
              {createMode ? 'Create and fund' : 'Fund gift card'}
            </AppButton>
          ) : (
            <AppButton
              accessibilityLabel={busy ? operationText : undefined}
              accessibilityState={{
                busy,
                disabled:
                  busy ||
                  identityFundingLoading ||
                  (card?.encrypted && !claimPassword),
              }}
              disabled={
                busy ||
                identityFundingLoading ||
                (card?.encrypted && !claimPassword)
              }
              loading={busy}
              onPress={buildPreflight}>
              {busy ? 'Verifying...' : 'Verify fees and addresses'}
            </AppButton>
          )}
        </SafeBottomActionStack>
      );
    }

    if (step === STEP_EXTERNAL) {
      return (
        <SafeBottomActionStack
          gap={8}
          horizontalSpacing={20}
          safeAreaSpacing={0}>
          <AppButton onPress={() => props.navigation.goBack()}>
            Done
          </AppButton>
        </SafeBottomActionStack>
      );
    }

    return (
      <SafeBottomActionStack
        gap={8}
        horizontalSpacing={20}
        safeAreaSpacing={0}>
        {result?.pendingRetry ? (
          <AppButton disabled={busy} onPress={broadcast}>
            Retry exact transactions
          </AppButton>
        ) : null}
        {result?.retryable ? (
          <AppButton
            onPress={() => {
              setResult(null);
              setStep(STEP_REVIEW);
            }}>
            Return to review
          </AppButton>
        ) : null}
        {result?.card && !result?.pendingRetry ? (
          <AppButton
            disabled={busy}
            onPress={() => openShareOptions(result.card)}>
            Share gift card
          </AppButton>
        ) : null}
        <AppButton
          onPress={() => props.navigation.goBack()}
          variant={result?.card || result?.retryable ? 'secondary' : 'primary'}>
          View gift cards
        </AppButton>
      </SafeBottomActionStack>
    );
  };

  if (initialLoading) {
    return (
      <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
        <ProgressHeader
          onBack={() => props.navigation.goBack()}
          progress={0.1}
          title={createMode ? 'Create gift card' : 'Fund gift card'}
        />
        <View style={styles.loadingScreen}>
          <ActivityIndicator
            animating
            color={theme.colors.primary}
            size="large"
          />
          <Text style={[styles.loadingText, {color: theme.colors.textSecondary}]}>
            Loading gift card…
          </Text>
        </View>
      </View>
    );
  }

  if (loadError || serviceData == null || (!createMode && !card)) {
    return (
      <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
        <ProgressHeader
          onBack={() => props.navigation.goBack()}
          progress={0}
          title="Gift card"
        />
        <View style={styles.loadingScreen}>
          <MaterialCommunityIcons
            color={theme.colors.danger}
            name="alert-circle-outline"
            size={48}
          />
          <Text style={[styles.resultTitle, {color: theme.colors.textPrimary}]}>
            Gift card unavailable
          </Text>
          <Text style={[styles.resultCopy, {color: theme.colors.textSecondary}]}>
            {loadError || 'This gift card could not be loaded.'}
          </Text>
          <AppButton onPress={loadData} style={styles.retryButton}>
            Try again
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
      <ProgressHeader
        backDisabled={busy || step === STEP_PROCESSING}
        onBack={handleBack}
        progress={getProgress(step, createMode)}
        title={card?.label || (createMode ? 'Create gift card' : 'Fund gift card')}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.content}>
        <FadedScrollView
          bounces={false}
          containerStyle={styles.scrollViewport}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingLeft: 20 + insets.left,
              paddingRight: 20 + insets.right,
            },
            step === STEP_PROCESSING && styles.processingScrollContent,
          ]}
          key={step}
          fadeBackgroundColor={theme.colors.background}
          fadeLength={42}
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleScrollContentSizeChange}
          onLayout={handleScrollViewportLayout}
          ref={scrollViewRef}
          showStartFade={false}>
          <GiftCardPageContent key={step}>{renderStep()}</GiftCardPageContent>
        </FadedScrollView>
        {renderActions()}
      </KeyboardAvoidingView>
      <GiftCardCurrencyPickerSheet
        onApply={applyFundingCurrencies}
        onClose={() => setCurrencyPickerVisible(false)}
        options={fundingCurrencyOptions}
        selectedKeys={selectedFundingCoinKeys}
        visible={currencyPickerVisible}
      />
      <GiftCardShareSheet
        card={shareCard}
        onClose={() => setShareCard(null)}
        onOpenQr={openShareQr}
        onShareAction={runShareAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollViewport: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  processingScrollContent: {
    justifyContent: 'center',
  },
  stepCopy: {
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.65,
    ...fontStyle('semiBold'),
  },
  switchRow: {
    minHeight: 76,
    marginTop: 8,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  switchCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 16,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  helper: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  warning: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
  },
  warningText: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  inlineNotice: {
    marginTop: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
  },
  noticeCopy: {
    minWidth: 0,
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  noticeText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  composerSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    marginBottom: 12,
  },
  emptyCopy: {
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  currencyPickerLauncher: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPickerLauncherIcon: {
    width: 38,
    height: 38,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  currencyPickerLauncherCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 12,
  },
  assetRow: {
    minHeight: 76,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  assetCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 12,
  },
  assetTitleRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetTitle: {
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('semiBold'),
  },
  assetTitleFlexible: {
    minWidth: 0,
    flex: 1,
  },
  assetMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  removeCurrencyButton: {
    width: 32,
    height: 32,
    marginRight: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountEditor: {
    width: 172,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    width: 112,
  },
  amountInputText: {
    paddingHorizontal: 12,
    textAlign: 'right',
  },
  maxButton: {
    width: 52,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxLabel: {
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  editCurrenciesRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  editCurrenciesLabel: {
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('semiBold'),
  },
  identityRow: {
    minHeight: 64,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  identityCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 12,
  },
  externalBranch: {
    minHeight: 78,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  externalBranchCopy: {
    minWidth: 0,
    flex: 1,
    marginRight: 12,
  },
  reviewGroup: {
    marginBottom: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  reviewHeading: {
    marginBottom: 10,
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('semiBold'),
  },
  reviewRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewLabel: {
    minWidth: 0,
    flex: 1,
    paddingRight: 12,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  reviewValue: {
    maxWidth: '62%',
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  identityFundingBlock: {
    marginTop: 12,
  },
  loadingRow: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verified: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
  },
  reviewAssurance: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  fieldHelper: {
    marginTop: -4,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  systemPills: {
    paddingBottom: 20,
    gap: 8,
  },
  systemPill: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 21,
  },
  systemPillText: {
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  addressPanel: {
    marginBottom: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  addressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  address: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    ...fontStyle('medium'),
  },
  processing: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  processingIcon: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 52,
  },
  processingSpinner: {
    marginTop: 28,
  },
  processingNote: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  result: {
    alignItems: 'center',
    paddingTop: 20,
  },
  resultIcon: {
    width: 112,
    height: 112,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 56,
  },
  resultTitle: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 31,
    ...fontStyle('semiBold'),
  },
  resultCopy: {
    maxWidth: 360,
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  txidGroup: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  txidRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  txid: {
    minWidth: 0,
    flex: 1,
    marginRight: 8,
    fontSize: 12,
    lineHeight: 18,
    ...fontStyle('medium'),
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingText: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('regular'),
  },
  retryButton: {
    minWidth: 180,
    marginTop: 24,
  },
});

export default GiftCardFund;
