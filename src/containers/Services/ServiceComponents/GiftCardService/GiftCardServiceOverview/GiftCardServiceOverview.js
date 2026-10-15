import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
  ArrowDownToLine,
  CirclePlus,
  Nfc,
  QrCode,
  RotateCcw,
  Share as ShareIcon,
  Trash2,
} from 'lucide-react-native';
import {GENERIC_REQUEST_DEEPLINK_VDXF_KEY} from 'verus-typescript-primitives';
import AcknowledgeSheet from '../../../../../components/AcknowledgeSheet';
import AppButton from '../../../../../components/AppButton';
import CopyAction from '../../../../../components/CopyAction';
import FadedScrollView from '../../../../../components/FadedScrollView';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import ServiceManagerHeader from '../../../../../components/ServiceManagerHeader';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../../../../components/SkeletonLoader';
import StatusBadge from '../../../../../components/StatusBadge';
import {fontStyle} from '../../../../../globals/fonts';
import {useAppTheme} from '../../../../../theme/app';
import {SET_DEEPLINK_DATA} from '../../../../../utils/constants/storeType';
import {GIFT_CARD_SERVICE_ID} from '../../../../../utils/constants/services';
import {
  beginGiftCardShare,
  canDeleteGiftCard,
  cancelGiftCardShare,
  completeGiftCardShare,
  GIFT_CARD_REDEEMED_SHARE_MESSAGE,
  GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE,
  getGiftCardCapabilities,
  canStartGiftCardFunding,
  getGiftCardClaimInfo,
  getGiftCardIdentityLookupErrors,
  getGiftCardPendingFundings,
  getRetryableGiftCardFunding,
  hasGiftCardBeenShared,
  hasGiftCardClaims,
  hasGiftCardShareInProgress,
  hasGiftCardShareReservation,
  hasGiftCardMempoolTransactions,
  hasPendingGiftCardFunding,
  normalizeGiftCardServiceData,
  refreshGiftCardStatus,
  removeGiftCardIfUnchangedAndDeletable,
  upsertGiftCard,
  upsertGiftCardIfUnchanged,
} from '../../../../../utils/giftCard/giftCard';
import {
  GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED,
  GIFT_CARD_DISPLAY_STATUS_PENDING,
  GIFT_CARD_DISPLAY_STATUS_READY,
  GIFT_CARD_DISPLAY_STATUS_REDEEMED,
  GIFT_CARD_DISPLAY_STATUS_SHARED,
  getGiftCardContentText,
  getGiftCardDisplayStatus,
  getGiftCardPresentation,
} from '../../../../../utils/giftCard/giftCardPresentation';
import GiftCardFixedCard from '../GiftCardFixedCard';
import {
  GiftCardNfcProgressModal,
  useGiftCardSharing,
} from '../GiftCardShareController';
import GiftCardOptionsSheet, {
  GIFT_CARD_CANCEL_STATUS,
} from '../GiftCardOptionsSheet';

const GIFT_CARD_REFRESH_INTERVAL_MS = 30000;
const STATUS_ALL = 'all';
const STATUS_READY = GIFT_CARD_DISPLAY_STATUS_READY;
const STATUS_PENDING = GIFT_CARD_DISPLAY_STATUS_PENDING;
const STATUS_NOT_FUNDED = GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED;
const STATUS_SHARED = GIFT_CARD_DISPLAY_STATUS_SHARED;
const STATUS_REDEEMED = GIFT_CARD_DISPLAY_STATUS_REDEEMED;
const SHARE_METHOD = {
  NATIVE: 'native',
  QR: 'qr',
  NFC: 'nfc',
};
const MONOSPACE_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const emptyGiftCardImage = require('../../../../../images/customIcons/empty-gift-card.png');
const INITIAL_CANCEL_PREPARATION = {
  status: GIFT_CARD_CANCEL_STATUS.IDLE,
  card: null,
};

const getContentsSummary = presentation => {
  const {primaryContent, otherContents} = presentation;

  if (
    primaryContent.type !== 'currency' &&
    primaryContent.type !== 'identity'
  ) {
    return primaryContent.value;
  }

  const contents = [primaryContent, ...otherContents].map(
    getGiftCardContentText,
  );

  if (contents.length <= 2) return contents.join(' · ');
  return `${contents.slice(0, 2).join(' · ')} +${contents.length - 2}`;
};

const toValidDate = timestamp => {
  if (!timestamp) return null;

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatFactDateTime = timestamp => {
  const date = toValidDate(timestamp);

  if (date == null) return '';

  const options = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = 'numeric';
  }

  try {
    return date.toLocaleString(undefined, options);
  } catch (_) {
    return date.toLocaleString();
  }
};

const formatFactDate = timestamp => {
  const date = toValidDate(timestamp);

  if (date == null) return '';

  try {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (_) {
    return date.toLocaleDateString();
  }
};

const shortenAddress = address => {
  if (!address || address.length <= 16) return address || '';
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
};

const getClaimedByText = addresses => {
  if (addresses.length === 1) return shortenAddress(addresses[0]);

  return `${shortenAddress(addresses[0])} +${addresses.length - 1}`;
};

const getRefreshComparableCard = card => {
  const status = card.status
    ? {
        ...card.status,
        lastCheckedAt: null,
      }
    : null;

  return JSON.stringify({
    fundingHistory: card.fundingHistory || [],
    status,
  });
};

const GiftCardServiceOverview = ({
  navigation,
  serviceData,
  saveServiceData,
}) => {
  const dispatch = useDispatch();
  const theme = useAppTheme();
  const activeCoinsForUser = useSelector(
    state => state.coins.activeCoinsForUser,
  );
  const [busyCardId, setBusyCardId] = useState(null);
  const [filter, setFilter] = useState(STATUS_ALL);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  // The content stays while the sheet closes; visibility is separate.
  const [shareConfirmation, setShareConfirmation] = useState(null);
  const [shareConfirmationVisible, setShareConfirmationVisible] =
    useState(false);
  const [cancelPreparation, setCancelPreparation] = useState(
    INITIAL_CANCEL_PREPARATION,
  );
  const [showListHeaderDivider, setShowListHeaderDivider] = useState(false);
  const cancelRequestGenerationRef = useRef(0);
  const qrNavigationPendingRef = useRef(false);
  const refreshAllRunningRef = useRef(false);
  const refreshGenerationRef = useRef(0);
  const normalizedData = normalizeGiftCardServiceData(serviceData);
  const cards = useMemo(
    () =>
      Object.values(normalizedData.cards || {}).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      ),
    [normalizedData.cards],
  );
  const selectedCard = cards.find(card => card.id === selectedCardId) || null;
  const {nfcTap, shareNative, shareNfc} = useGiftCardSharing(selectedCard);
  useFocusEffect(
    useCallback(() => {
      qrNavigationPendingRef.current = false;
    }, []),
  );
  const detailShown = selectedCard != null;
  // The detail is local state, so Android Back must close it like the arrow.
  useFocusEffect(
    useCallback(() => {
      if (!detailShown) return undefined;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          setSelectedCardId(null);
          return true;
        },
      );

      return () => subscription.remove();
    }, [detailShown]),
  );
  const navigateToQr = useCallback(cardToShare => {
    if (!cardToShare?.id || qrNavigationPendingRef.current) return;

    qrNavigationPendingRef.current = true;
    navigation.navigate('GiftCardQr', {cardId: cardToShare.id});
  }, [navigation]);
  const visibleCards = useMemo(
    () =>
      filter === STATUS_ALL
        ? cards
        : cards.filter(card => getGiftCardDisplayStatus(card) === filter),
    [cards, filter],
  );

  useEffect(() => {
    if (selectedCardId && !selectedCard) {
      setSelectedCardId(null);
    }
  }, [selectedCard, selectedCardId]);

  useEffect(() => {
    cancelRequestGenerationRef.current += 1;
    setCancelPreparation(INITIAL_CANCEL_PREPARATION);
    setActionsVisible(false);
    setShareConfirmationVisible(false);
  }, [selectedCardId]);

  const saveCard = useCallback(
    async (card, expectedCard = null) => {
      const savedData = await saveServiceData(currentData => {
        return expectedCard == null
          ? upsertGiftCard(currentData, card)
          : upsertGiftCardIfUnchanged(currentData, expectedCard, card);
      });

      return savedData.cards?.[card.id] || null;
    },
    [saveServiceData],
  );

  const refreshAllCards = useCallback(async () => {
    const cardList = Object.values(normalizedData.cards || {});
    const refreshGeneration = refreshGenerationRef.current;

    if (cardList.length === 0 || refreshAllRunningRef.current) return;

    refreshAllRunningRef.current = true;

    try {
      const refreshes = [];

      for (const card of cardList) {
        try {
          const refreshed = await refreshGiftCardStatus({
            card,
            activeCoinsForUser,
          });

          if (
            getRefreshComparableCard(refreshed) !==
            getRefreshComparableCard(card)
          ) {
            refreshes.push({
              expectedCard: card,
              refreshedCard: refreshed,
            });
          }
        } catch (e) {
          console.warn(e.message);
        }
      }

      if (
        refreshes.length > 0 &&
        refreshGeneration === refreshGenerationRef.current
      ) {
        await saveServiceData(currentData =>
          refreshes.reduce(
            (nextData, refresh) =>
              upsertGiftCardIfUnchanged(
                nextData,
                refresh.expectedCard,
                refresh.refreshedCard,
              ),
            currentData,
          ),
        );
      }
    } finally {
      refreshAllRunningRef.current = false;
    }
  }, [activeCoinsForUser, normalizedData, saveServiceData]);

  useEffect(() => {
    let refreshInterval = null;

    const stopRefreshInterval = () => {
      refreshGenerationRef.current += 1;

      if (refreshInterval != null) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    };

    const startRefreshInterval = () => {
      stopRefreshInterval();
      refreshAllCards();
      refreshInterval = setInterval(
        refreshAllCards,
        GIFT_CARD_REFRESH_INTERVAL_MS,
      );
    };

    const unsubscribeFocus = navigation.addListener(
      'focus',
      startRefreshInterval,
    );
    const handleBlur = () => {
      stopRefreshInterval();
      cancelRequestGenerationRef.current += 1;
      setCancelPreparation(INITIAL_CANCEL_PREPARATION);
      setActionsVisible(false);
      setShareConfirmationVisible(false);
    };
    const unsubscribeBlur = navigation.addListener('blur', handleBlur);

    if (navigation.isFocused == null || navigation.isFocused()) {
      startRefreshInterval();
    }

    return () => {
      stopRefreshInterval();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, refreshAllCards]);

  const refreshCard = useCallback(
    async card => {
      setBusyCardId(card.id);

      try {
        const refreshed = await refreshGiftCardStatus({
          card,
          activeCoinsForUser,
        });

        const savedCard = await saveCard(refreshed, card);
        return savedCard || refreshed;
      } catch (e) {
        console.error(e);
        Alert.alert(
          'Network Error',
          e.message || 'Unable to refresh gift card.',
        );
        throw e;
      } finally {
        setBusyCardId(null);
      }
    },
    [activeCoinsForUser, saveCard],
  );

  const prepareCardForSharing = useCallback(
    async card => {
      if (getGiftCardCapabilities(card).isRedeemed) {
        throw new Error(GIFT_CARD_REDEEMED_SHARE_MESSAGE);
      }

      if (hasGiftCardShareInProgress(card)) {
        throw new Error(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      }

      const refreshed = await refreshGiftCardStatus({
        card,
        activeCoinsForUser,
      });
      const savedCard = await saveCard(refreshed, card);
      const latestCard = savedCard || refreshed;
      const latestCapabilities = getGiftCardCapabilities(latestCard);

      if (latestCapabilities.isRedeemed) {
        throw new Error(GIFT_CARD_REDEEMED_SHARE_MESSAGE);
      }

      if (hasGiftCardShareInProgress(latestCard)) {
        throw new Error(GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      }

      if (hasGiftCardBeenShared(latestCard)) return latestCard;

      if (hasPendingGiftCardFunding(latestCard)) {
        throw new Error(
          'Wait for funding transactions to confirm before sharing this gift card.',
        );
      }

      return latestCard;
    },
    [activeCoinsForUser, saveCard],
  );

  const runShareAction = useCallback(
    async (card, action) => {
      if (!card) return false;

      let actionCompleted = false;
      let shareAttemptId = null;
      const rollbackShareAttempt = async () => {
        if (!shareAttemptId) return;

        try {
          await saveServiceData(currentData => {
            const normalized = normalizeGiftCardServiceData(currentData);
            const currentCard = normalized.cards?.[card.id];

            return currentCard
              ? upsertGiftCard(
                  normalized,
                  cancelGiftCardShare(currentCard, shareAttemptId),
                )
              : normalized;
          });
        } catch (rollbackError) {
          console.warn(
            'Unable to clear gift card share attempt',
            rollbackError,
          );
        }
      };
      setBusyCardId(card.id);

      try {
        const preparedCard = await prepareCardForSharing(card);
        const startedData = await saveServiceData(currentData => {
          const normalized = normalizeGiftCardServiceData(currentData);
          const currentCard = normalized.cards?.[preparedCard.id];

          if (!currentCard) {
            throw new Error('Gift card is no longer available.');
          }

          if (getGiftCardCapabilities(currentCard).isRedeemed) {
            throw new Error(GIFT_CARD_REDEEMED_SHARE_MESSAGE);
          }

          if (hasGiftCardBeenShared(currentCard)) {
            return normalized;
          }

          if (hasPendingGiftCardFunding(currentCard)) {
            throw new Error(
              'Wait for funding transactions to confirm before sharing this gift card.',
            );
          }

          const startedCard = beginGiftCardShare(currentCard);
          shareAttemptId = startedCard.shareAttempt?.id || null;
          return upsertGiftCard(normalized, startedCard);
        });
        const actionCard = startedData.cards?.[preparedCard.id];

        if (!actionCard) {
          throw new Error('Gift card is no longer available.');
        }

        const actionResult = await action(actionCard);

        if (actionResult === false) {
          await rollbackShareAttempt();
          return false;
        }

        actionCompleted = true;

        if (shareAttemptId) {
          const completedData = await saveServiceData(currentData => {
            const normalized = normalizeGiftCardServiceData(currentData);
            const currentCard = normalized.cards?.[preparedCard.id];

            if (!currentCard) {
              throw new Error('Gift card is no longer available.');
            }

            return upsertGiftCard(
              normalized,
              completeGiftCardShare(currentCard, shareAttemptId),
            );
          });

          if (!hasGiftCardBeenShared(completedData.cards?.[preparedCard.id])) {
            throw new Error(
              'Gift card state changed before sharing could be recorded.',
            );
          }
        }

        return true;
      } catch (e) {
        if (!actionCompleted) await rollbackShareAttempt();

        console.error(e);
        Alert.alert(
          'Unable to share',
          e.message || 'Unable to share gift card.',
        );
        return false;
      } finally {
        setBusyCardId(null);
      }
    },
    [prepareCardForSharing, saveServiceData],
  );

  const shareActions = {
    [SHARE_METHOD.NATIVE]: shareNative,
    [SHARE_METHOD.QR]: navigateToQr,
    [SHARE_METHOD.NFC]: shareNfc,
  };

  // The first share exposes the key, so an unshared card asks first.
  const requestShare = (card, method) => {
    if (hasGiftCardBeenShared(card)) {
      runShareAction(card, shareActions[method]);
      return;
    }

    setShareConfirmation({
      cardId: card.id,
      funded: hasGiftCardClaims(card),
      method,
    });
    setShareConfirmationVisible(true);
  };

  const startConfirmedShare = () => {
    if (
      shareConfirmation == null ||
      selectedCard?.id !== shareConfirmation.cardId
    ) {
      return;
    }

    runShareAction(selectedCard, shareActions[shareConfirmation.method]);
  };

  const openFunding = async (card, routeParams = {}) => {

    if (hasGiftCardShareReservation(card)) {
      Alert.alert('Sharing in progress', GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      return;
    }

    if (hasPendingGiftCardFunding(card)) {
      const retryableFunding = getRetryableGiftCardFunding(card);

      if (retryableFunding != null) {
        navigation.navigate('GiftCardFund', {
          cardId: card.id,
          pendingFundingId: retryableFunding.id,
        });
      } else {
        Alert.alert(
          'Pending Funding',
          'Wait for pending funding transactions to confirm before adding more funds.',
        );
      }
      return;
    }

    if (card.status?.state === 'redeemed' || card.status?.redeemed) {
      Alert.alert('Claimed', 'Claimed gift cards cannot be funded.');
      return;
    }

    if (hasGiftCardBeenShared(card) && !canStartGiftCardFunding(card)) {
      Alert.alert(
        'Single-use Gift Card',
        'This shared gift card already has funds or a recorded funding attempt. Create a new gift card instead of funding it again.',
      );
      return;
    }

    try {
      const refreshed = await refreshCard(card);


      if (hasGiftCardShareReservation(refreshed)) {
        Alert.alert('Sharing in progress', GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
        return;
      }

      if (hasPendingGiftCardFunding(refreshed)) {
        const retryableFunding = getRetryableGiftCardFunding(refreshed);

        if (retryableFunding != null) {
          navigation.navigate('GiftCardFund', {
            cardId: refreshed.id,
            pendingFundingId: retryableFunding.id,
          });
        } else {
          Alert.alert(
            'Pending Funding',
            'Wait for pending funding transactions to confirm before adding more funds.',
          );
        }
        return;
      }

      if (
        refreshed.status?.state === 'redeemed' ||
        refreshed.status?.redeemed
      ) {
        Alert.alert('Claimed', 'Claimed gift cards cannot be funded.');
        return;
      }

      if (!canStartGiftCardFunding(refreshed)) {
        Alert.alert('Single-use gift card', 'This shared gift card already has funds or a recorded funding attempt. Create a new gift card instead of funding it again.');
        return;
      }
      navigation.navigate('GiftCardFund', {
        cardId: card.id,
        ...routeParams,
      });
    } catch (_) {}
  };

  const prepareCancellation = async card => {
    const requestGeneration = cancelRequestGenerationRef.current + 1;
    cancelRequestGenerationRef.current = requestGeneration;
    setCancelPreparation({
      status: GIFT_CARD_CANCEL_STATUS.CHECKING,
      card: null,
    });

    try {
      const refreshed = await refreshGiftCardStatus({
        card,
        activeCoinsForUser,
      });

      const savedCard = await saveCard(refreshed, card);
      const latestCard = savedCard || refreshed;

      if (requestGeneration !== cancelRequestGenerationRef.current) return;

      if (hasPendingGiftCardFunding(latestCard)) {
        setCancelPreparation({
          status: GIFT_CARD_CANCEL_STATUS.PENDING,
          card: null,
        });
        return;
      }

      if (!hasGiftCardClaims(latestCard)) {
        setCancelPreparation({
          status: GIFT_CARD_CANCEL_STATUS.EMPTY,
          card: null,
        });
        return;
      }

      setCancelPreparation({
        status: GIFT_CARD_CANCEL_STATUS.READY,
        card: latestCard,
      });
    } catch (e) {
      console.error(e);

      if (requestGeneration === cancelRequestGenerationRef.current) {
        setCancelPreparation({
          status: GIFT_CARD_CANCEL_STATUS.ERROR,
          card: null,
        });
      }
    }
  };

  const resetCancellation = () => {
    cancelRequestGenerationRef.current += 1;
    setCancelPreparation(INITIAL_CANCEL_PREPARATION);
  };

  const continueCancellation = () => {
    if (
      cancelPreparation.status !== GIFT_CARD_CANCEL_STATUS.READY ||
      cancelPreparation.card == null
    ) {
      return;
    }

    const card = cancelPreparation.card;
    resetCancellation();
    dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id: GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid,
        data: card.requestBufferString,
        fromService: GIFT_CARD_SERVICE_ID,
        passthrough: {
          skipWalletBackupRequests: true,
        },
      },
    });
    navigation.navigate('DeepLink');
  };

  const deleteCard = async card => {
    setBusyCardId(card.id);

    try {
      const refreshed = await refreshGiftCardStatus({
        card,
        activeCoinsForUser,
      });

      if (!canDeleteGiftCard(refreshed)) {
        await saveCard(refreshed, card);
        Alert.alert(
          'Cannot Delete',
          'This gift card still has funds, VerusIDs, pending funding, or could not be fully checked.',
        );
        return;
      }

      if (await hasGiftCardMempoolTransactions(refreshed)) {
        await saveCard(refreshed, card);
        Alert.alert(
          'Cannot Delete',
          'This gift card has a pending transaction in the mempool. Wait for it to confirm, then refresh the card before deleting it.',
        );
        return;
      }

      const savedData = await saveServiceData(currentData =>
        removeGiftCardIfUnchangedAndDeletable(currentData, card),
      );
      if (savedData.cards?.[card.id] == null) setSelectedCardId(null);

      if (savedData.cards?.[card.id] != null) {
        Alert.alert(
          'Cannot Delete',
          'This gift card changed while deletion checks were running. Refresh it and try again.',
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Unable to Delete',
        e.message || 'Unable to verify that this gift card can be deleted.',
      );
    } finally {
      setBusyCardId(null);
    }
  };

  const confirmDeleteCard = card => {
    if (!canDeleteGiftCard(card)) return;

    const hasBeenClaimed =
      card.status?.state === 'redeemed' || card.status?.redeemed;
    const message = hasBeenClaimed
      ? 'Are you sure you want to delete this gift card from this device?'
      : 'Are you sure you want to delete this gift card from this device? If there are any pending funds coming to the card, they will be permanently lost if the card is deleted.';

    Alert.alert(
      'Delete Gift Card',
      message,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCard(card),
        },
      ],
    );
  };

  const explainDeleteUnavailable = card => {
    if (hasPendingGiftCardFunding(card)) {
      Alert.alert(
        'Cannot Delete',
        'This gift card has pending funding transactions. Refresh after they confirm before deleting it.',
      );
      return;
    }

    if (hasGiftCardClaims(card)) {
      Alert.alert(
        'Cannot Delete',
        'This gift card still has funds or VerusIDs. Cancel it or wait until it is claimed, then refresh before deleting it.',
      );
      return;
    }

    Alert.alert(
      'Cannot Delete',
      'Refresh the gift card status before deleting it.',
    );
  };

  const renderList = () => (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <ServiceManagerHeader
        addAccessibilityLabel="Create gift card"
        onAdd={() => navigation.navigate('GiftCardCreate')}
        onBack={() => navigation.goBack()}
        showDivider={showListHeaderDivider}
        title="Gift cards">
        {cards.length > 0 ? (
          <FadedScrollView
            contentContainerStyle={styles.filters}
            fadeBackgroundColor={theme.colors.background}
            fadeLength={28}
            horizontal
            showsHorizontalScrollIndicator={false}>
            {[
              [STATUS_ALL, 'All'],
              [STATUS_READY, 'Ready'],
              [STATUS_PENDING, 'Pending'],
              [STATUS_NOT_FUNDED, 'Not funded'],
              [STATUS_SHARED, 'Shared'],
              [STATUS_REDEEMED, 'Claimed'],
            ].map(([value, label]) => {
              const selected = filter === value;

              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[
                    styles.filter,
                    {
                      backgroundColor: selected
                        ? theme.colors.primary
                        : theme.colors.surfaceMuted,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: selected
                          ? theme.colors.onPrimary
                          : theme.colors.textSecondary,
                      },
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </FadedScrollView>
        ) : null}
      </ServiceManagerHeader>

      <FadedScrollView
        containerStyle={styles.listViewport}
        contentContainerStyle={styles.listContent}
        fadeBackgroundColor={theme.colors.background}
        fadeLength={42}
        onScroll={event =>
          setShowListHeaderDivider(event.nativeEvent.contentOffset.y > 1)
        }
        showsVerticalScrollIndicator={false}>
        {visibleCards.map((card, index) => {
          const busy = busyCardId === card.id;
          const presentation = getGiftCardPresentation(card, {
            activeCoinsForUser,
          });
          const contentsSummary = getContentsSummary(presentation);
          const accessibilityLabel = `${card.label}. ${contentsSummary}. ${presentation.statusLabel}.`;

          return (
            <View key={card.id} style={styles.rowContainer}>
              <TouchableOpacity
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => setSelectedCardId(card.id)}
                style={styles.cardRow}>
                <View
                  style={[
                    styles.iconLane,
                    {backgroundColor: theme.colors.surfaceMuted},
                  ]}>
                  {busy ? (
                    <ActivityIndicator
                      animating
                      color={theme.colors.primary}
                      size="small"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      accessible={false}
                      color={theme.colors.primary}
                      name="gift-outline"
                      size={25}
                    />
                  )}
                </View>
                <View style={styles.rowCopy}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rowTitle,
                      {color: theme.colors.textPrimary},
                    ]}>
                    {card.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rowDescription,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {contentsSummary}
                  </Text>
                </View>
                <StatusBadge
                  label={presentation.statusLabel}
                  style={styles.statusBadge}
                  tone={presentation.statusTone}
                />
                <MaterialCommunityIcons
                  accessible={false}
                  color={theme.colors.textSubtle}
                  name="chevron-right"
                  size={21}
                />
              </TouchableOpacity>
              {index < visibleCards.length - 1 ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.divider,
                    {backgroundColor: theme.colors.border},
                  ]}
                />
              ) : null}
            </View>
          );
        })}

        {visibleCards.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              accessible={false}
              resizeMode="contain"
              source={emptyGiftCardImage}
              style={styles.emptyImage}
            />
            <Text
              style={[
                styles.emptyTitle,
                {color: theme.colors.textSecondary},
              ]}>
              {cards.length === 0 ? 'No gift cards yet' : 'No gift cards here'}
            </Text>
            <AppButton
              onPress={() =>
                cards.length === 0
                  ? navigation.navigate('GiftCardCreate')
                  : setFilter(STATUS_ALL)
              }
              style={styles.emptyPrimaryButton}>
              {cards.length === 0
                ? 'Create gift card'
                : 'Show all gift cards'}
            </AppButton>
          </View>
        ) : null}
      </FadedScrollView>
    </SafeAreaView>
  );

  const renderDetail = card => {
    const busy = busyCardId === card.id;
    const capabilities = getGiftCardCapabilities(card);
    const presentation = getGiftCardPresentation(card, {activeCoinsForUser});
    const status = presentation.status;
    const retryableFunding = getRetryableGiftCardFunding(card);
    const deleteEnabled = canDeleteGiftCard(card);
    const claimInfo = getGiftCardClaimInfo(card);
    const shared = hasGiftCardBeenShared(card);
    const hasClaims = hasGiftCardClaims(card);
    const pendingFunding = hasPendingGiftCardFunding(card);
    const pendingTxids = capabilities.isRedeemed
      ? []
      : [
          ...new Set(
            getGiftCardPendingFundings(card).flatMap(entry => entry.txids || []),
          ),
        ];
    // Tiles stay in place during a share attempt, but are disabled.
    const showShareTiles =
      !capabilities.isRedeemed && (shared || (hasClaims && !pendingFunding));
    const shareDisabled = busy || !capabilities.canShare;
    // Like the tiles, the footer stays during a share attempt; openFunding
    // still refuses to fund while the share is reserved.
    const showFundingFooter =
      !hasClaims && !pendingFunding && canStartGiftCardFunding(card);
    const showLookupNote =
      claimInfo == null &&
      !hasClaims &&
      getGiftCardIdentityLookupErrors(card).length > 0;
    const claimedByAddresses = claimInfo?.claimedByAddresses || [];
    const claimedText =
      formatFactDateTime(claimInfo?.claimedAt) ||
      (claimInfo?.height ? `Block ${claimInfo.height}` : '');
    const facts = [
      shared && {
        key: 'shared',
        label: 'Shared',
        value: formatFactDateTime(card.sharedAt),
      },
      claimedByAddresses.length > 0 && {
        key: 'claimed-by',
        label: 'Claimed by',
        value: getClaimedByText(claimedByAddresses),
        copyLabel: 'Copy claiming address',
        copyValue: claimedByAddresses.join('\n'),
        monospace: true,
      },
      capabilities.isRedeemed && {
        key: 'claimed',
        label: 'Claimed',
        value: claimedText,
      },
      !capabilities.isRedeemed && {
        key: 'protection',
        label: 'Claim protection',
        value: card.encrypted ? 'Password' : 'None',
      },
      {key: 'created', label: 'Created', value: formatFactDate(card.createdAt)},
    ].filter(fact => fact && fact.value);
    const shareTiles = [
      {
        accessibilityLabel: 'Share gift card link',
        IconComponent: ShareIcon,
        label: 'Share',
        method: SHARE_METHOD.NATIVE,
      },
      {
        accessibilityLabel: 'Show gift card QR code',
        IconComponent: QrCode,
        label: 'QR code',
        method: SHARE_METHOD.QR,
      },
      {
        accessibilityLabel: 'Write gift card to an NFC card',
        IconComponent: Nfc,
        label: 'NFC',
        method: SHARE_METHOD.NFC,
      },
    ];
    const tileIconColor = theme.isDark
      ? theme.colors.textPrimary
      : theme.colors.primary;
    const optionActions = [];

    if (status === STATUS_NOT_FUNDED && capabilities.canShare) {
      optionActions.push({
        key: 'share-before-funding',
        disabled: busy,
        IconComponent: ShareIcon,
        label: 'Share before funding',
        onPress: () => requestShare(card, SHARE_METHOD.NATIVE),
      });
    }

    if (capabilities.canFund || retryableFunding != null) {
      optionActions.push({
        key: 'add-contents',
        disabled: busy,
        IconComponent: CirclePlus,
        label:
          retryableFunding != null
            ? 'Retry pending funding'
            : hasClaims
            ? 'Add more contents'
            : 'Add contents',
        onPress: () => openFunding(card),
      });

      if (capabilities.canFund) {
        optionActions.push({
          key: 'external-funding',
          disabled: busy,
          IconComponent: ArrowDownToLine,
          label: 'Fund from another wallet',
          onPress: () => openFunding(card, {startExternal: true}),
        });
      }
    }

    if (!capabilities.isRedeemed) {
      optionActions.push({
        key: 'cancel',
        danger: true,
        disabled: busy || !capabilities.canCancel,
        IconComponent: RotateCcw,
        label: 'Cancel gift card',
        nextMode: 'cancel',
      });
    }

    optionActions.push({
      key: 'remove',
      disabled: busy,
      IconComponent: Trash2,
      label: 'Remove from this device',
      onPress: () =>
        deleteEnabled
          ? confirmDeleteCard(card)
          : explainDeleteUnavailable(card),
    });

    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.screen, {backgroundColor: theme.colors.background}]}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            accessibilityLabel="Back to gift cards"
            accessibilityRole="button"
            onPress={() => setSelectedCardId(null)}
            style={styles.detailHeaderAction}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="arrow-left"
              size={24}
            />
          </TouchableOpacity>
          <View style={styles.detailHeaderSpacer} />
          <TouchableOpacity
            accessibilityLabel="Refresh gift card"
            accessibilityRole="button"
            disabled={busy}
            onPress={() => refreshCard(card).catch(() => {})}
            style={styles.detailHeaderAction}>
            {busy ? (
              <ActivityIndicator
                animating
                color={theme.colors.primary}
                size="small"
              />
            ) : (
              <MaterialCommunityIcons
                color={theme.colors.textPrimary}
                name="refresh"
                size={23}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Gift card options"
            accessibilityRole="button"
            accessibilityState={{disabled: busy}}
            disabled={busy}
            onPress={() => setActionsVisible(true)}
            style={[styles.detailHeaderAction, busy && styles.disabled]}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="dots-horizontal"
              size={24}
            />
          </TouchableOpacity>
        </View>

        <FadedScrollView
          containerStyle={styles.detailViewport}
          contentContainerStyle={styles.detailContent}
          fadeBackgroundColor={theme.colors.background}
          fadeLength={42}
          showsVerticalScrollIndicator={false}>
          <GiftCardFixedCard presentation={presentation} />

          {showLookupNote ? (
            <Text
              style={[
                theme.typography.caption,
                styles.lookupNote,
                {color: theme.colors.textSecondary},
              ]}>
              This server cannot look up VerusIDs. VerusIDs sent from another
              wallet may not show here.
            </Text>
          ) : null}

          {showShareTiles ? (
            <View style={styles.shareTiles}>
              {shareTiles.map(tile => (
                <TouchableOpacity
                  accessibilityLabel={tile.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{disabled: shareDisabled}}
                  activeOpacity={0.74}
                  disabled={shareDisabled}
                  key={tile.method}
                  onPress={() => requestShare(card, tile.method)}
                  style={[
                    styles.shareTile,
                    {backgroundColor: theme.colors.surfaceMuted},
                    shareDisabled && styles.disabled,
                  ]}>
                  <tile.IconComponent color={tileIconColor} size={22} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.shareTileLabel,
                      {color: theme.colors.textPrimary},
                    ]}>
                    {tile.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {pendingTxids.length > 0 ? (
            <View style={styles.pendingSection}>
              <Text
                accessibilityRole="header"
                style={[
                  theme.typography.titleRow,
                  {color: theme.colors.textPrimary},
                ]}>
                {pendingTxids.length === 1
                  ? 'Funding transaction'
                  : 'Funding transactions'}
              </Text>
              {pendingTxids.map(txid => (
                <View key={txid} style={styles.transactionRow}>
                  {/* Not selectable: Android does not ellipsize selectable
                      text. CopyAction copies the full ID. */}
                  <Text
                    ellipsizeMode="middle"
                    numberOfLines={1}
                    style={[
                      styles.monospaceValue,
                      styles.transactionValue,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {txid}
                  </Text>
                  <CopyAction
                    accessibilityLabel="Copy funding transaction ID"
                    style={styles.trailingCopy}
                    value={txid}
                  />
                </View>
              ))}
              {!shared ? (
                <Text
                  style={[
                    theme.typography.caption,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {pendingTxids.length === 1
                    ? 'Sharing unlocks after it confirms.'
                    : 'Sharing unlocks after they confirm.'}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.facts}>
            {facts.map((fact, index) => (
              <View
                key={fact.key}
                style={[
                  styles.factRow,
                  index > 0 && {
                    borderTopColor: theme.colors.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}>
                <Text
                  style={[
                    theme.typography.bodySm,
                    styles.factLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {fact.label}
                </Text>
                <View style={styles.factValue}>
                  <Text
                    numberOfLines={1}
                    style={[
                      fact.monospace
                        ? styles.monospaceValue
                        : theme.typography.labelMd,
                      styles.factValueText,
                      {color: theme.colors.textPrimary},
                    ]}>
                    {fact.value}
                  </Text>
                  {fact.copyValue ? (
                    <CopyAction
                      accessibilityLabel={fact.copyLabel}
                      style={styles.trailingCopy}
                      value={fact.copyValue}
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </FadedScrollView>

        {showFundingFooter ? (
          <SafeBottomActionStack horizontalSpacing={20} safeAreaSpacing={0}>
            <AppButton
              disabled={busy}
              onPress={() => openFunding(card)}
              variant="primary">
              Add contents
            </AppButton>
            <AppButton
              disabled={busy}
              onPress={() => openFunding(card, {startExternal: true})}
              variant="text">
              Fund from another wallet
            </AppButton>
          </SafeBottomActionStack>
        ) : null}

        <GiftCardOptionsSheet
          actions={optionActions}
          cancelStep={{
            onContinue: continueCancellation,
            onEnter: () => prepareCancellation(card),
            onReset: resetCancellation,
            onRetry: () => prepareCancellation(card),
            status: cancelPreparation.status,
          }}
          onClose={() => setActionsVisible(false)}
          visible={actionsVisible}
        />

        <AcknowledgeSheet
          confirmLabel="Share"
          dismissLabel="Not now"
          message={
            shareConfirmation?.funded
              ? 'Anyone with the link, QR code, or NFC card can claim it. You cannot add contents after you share.'
              : 'The card is empty. Anyone with the key can take funds sent to it later. Fund it only once.'
          }
          onAcknowledged={startConfirmedShare}
          onClose={() => setShareConfirmationVisible(false)}
          testID="giftCard.shareConfirmation"
          title="Share this gift card?"
          visible={shareConfirmationVisible}
        />
      </SafeAreaView>
    );
  };

  return (
    <>
      {selectedCard ? renderDetail(selectedCard) : renderList()}
      <GiftCardNfcProgressModal nfcTap={nfcTap} />
    </>
  );
};

export const GiftCardServiceOverviewSkeleton = ({navigation}) => {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <ServiceManagerHeader
        onBack={() => navigation.goBack()}
        title="Gift cards"
      />
      <SkeletonLoader
        accessibilityLabel="Loading gift cards"
        style={styles.skeletonLoader}>
        {[0, 1, 2].map(index => (
          <View
            key={index}
            style={[
              styles.skeletonRow,
              {borderBottomColor: theme.colors.border},
            ]}>
            <SkeletonBlock height={44} radius={14} width={44} />
            <View style={styles.skeletonText}>
              <SkeletonText height={16} width="42%" />
              <SkeletonText
                height={13}
                style={styles.skeletonDescription}
                width="68%"
              />
            </View>
            <SkeletonBlock height={22} radius={11} width={58} />
          </View>
        ))}
      </SkeletonLoader>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  filters: {
    gap: 8,
    paddingTop: 18,
    paddingBottom: 2,
  },
  filter: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 999,
  },
  filterText: {
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  skeletonLoader: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skeletonRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  skeletonText: {
    minWidth: 0,
    flex: 1,
    marginLeft: 16,
    paddingRight: 12,
  },
  skeletonDescription: {
    marginTop: 8,
  },
  listViewport: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  rowContainer: {
    position: 'relative',
    width: '100%',
  },
  cardRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconLane: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  rowCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 16,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 21,
    ...fontStyle('semiBold'),
  },
  rowDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  divider: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 60,
    height: StyleSheet.hairlineWidth,
  },
  statusBadge: {
    marginRight: 4,
  },
  emptyState: {
    minHeight: 300,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  emptyImage: {
    width: 170,
    height: 140,
    marginBottom: 32,
    opacity: 0.35,
  },
  emptyTitle: {
    ...fontStyle('regular'),
    marginBottom: 32,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyPrimaryButton: {
    width: 240,
  },
  detailHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 8,
  },
  detailHeaderAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  detailHeaderSpacer: {
    flex: 1,
  },
  detailViewport: {
    flex: 1,
  },
  // The top inset leaves room for the card shadow inside the scroll view.
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  lookupNote: {
    marginTop: 16,
  },
  shareTiles: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
  },
  shareTile: {
    minWidth: 0,
    flex: 1,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    borderRadius: 18,
  },
  shareTileLabel: {
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  pendingSection: {
    marginTop: 26,
  },
  transactionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionValue: {
    minWidth: 0,
    flex: 1,
  },
  monospaceValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    lineHeight: 17,
  },
  trailingCopy: {
    marginRight: -12,
  },
  facts: {
    marginTop: 22,
  },
  factRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  factLabel: {
    flexShrink: 0,
  },
  factValue: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  factValueText: {
    minWidth: 0,
    flexShrink: 1,
    textAlign: 'right',
  },
  disabled: {
    opacity: 0.45,
  },
});

export default GiftCardServiceOverview;
