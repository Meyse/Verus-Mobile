import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Image,
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
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import {GENERIC_REQUEST_DEEPLINK_VDXF_KEY} from 'verus-typescript-primitives';
import AppButton from '../../../../../components/AppButton';
import CopyAction from '../../../../../components/CopyAction';
import FadedScrollView from '../../../../../components/FadedScrollView';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import ServiceManagerHeader from '../../../../../components/ServiceManagerHeader';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../../../../components/SkeletonLoader';
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
  getGiftCardClaimInfo,
  getGiftCardIdentityLookupErrors,
  getGiftCardPendingFundings,
  hasGiftCardBeenShared,
  hasGiftCardClaims,
  hasGiftCardShareInProgress,
  hasGiftCardShareReservation,
  hasPendingGiftCardFunding,
  normalizeGiftCardServiceData,
  refreshGiftCardStatus,
  removeGiftCard,
  upsertGiftCard,
  upsertGiftCardIfUnchanged,
} from '../../../../../utils/giftCard/giftCard';
import {
  GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED,
  GIFT_CARD_DISPLAY_STATUS_PENDING,
  GIFT_CARD_DISPLAY_STATUS_READY,
  GIFT_CARD_DISPLAY_STATUS_REDEEMED,
  getGiftCardDisplayStatus,
  getGiftCardDisplayStatusLabel,
  getGiftCardPresentation,
} from '../../../../../utils/giftCard/giftCardPresentation';
import GiftCardFlipCard from '../GiftCardFlipCard';
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
const STATUS_REDEEMED = GIFT_CARD_DISPLAY_STATUS_REDEEMED;
const emptyGiftCardImage = require('../../../../../images/customIcons/empty-gift-card.png');
const INITIAL_CANCEL_PREPARATION = {
  status: GIFT_CARD_CANCEL_STATUS.IDLE,
  card: null,
};

const getSystemRows = card => {
  return (card.status?.systems || []).filter(system => {
    return (
      (system.currencies || []).length > 0 ||
      (system.identities || []).length > 0
    );
  });
};

const getCardContents = card => {
  const contents = [];

  for (const system of getSystemRows(card)) {
    for (const currency of system.currencies || []) {
      contents.push(
        `${currency.amount} ${currency.display?.name || currency.currencyId}`,
      );
    }

    for (const identity of system.identities || []) {
      contents.push(identity.fullyQualifiedName || identity.identityAddress);
    }
  }

  return contents;
};

const getContentsSummary = card => {
  if (getGiftCardCapabilities(card).isRedeemed) {
    return 'Claim completed';
  }

  const contents = getCardContents(card);

  if (contents.length === 0) {
    return hasPendingGiftCardFunding(card) ? 'Funding pending' : 'Empty';
  }
  if (contents.length <= 2) return contents.join(' · ');
  return `${contents.slice(0, 2).join(' · ')} +${contents.length - 2}`;
};

const getListSummary = card => {
  const contentsSummary = getContentsSummary(card);

  return hasGiftCardBeenShared(card)
    ? `Shared · ${contentsSummary}`
    : contentsSummary;
};

const formatCardDateTime = timestamp => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);

    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  } catch (_) {
    return '';
  }
};

const truncateAddress = address => {
  if (!address || address.length <= 22) return address || '';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};

const getClaimedByLabel = claimInfo => {
  const addresses = claimInfo?.claimedByAddresses || [];

  if (addresses.length === 0) return 'recipient unavailable';
  if (addresses.length === 1) return truncateAddress(addresses[0]);

  return `${truncateAddress(addresses[0])} +${addresses.length - 1} more`;
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

const getSystemName = (systemId, card, activeCoinsForUser) => {
  const statusSystem = (card.status?.systems || []).find(
    system => system.systemId === systemId,
  );
  const activeCoin = (activeCoinsForUser || []).find(
    coin => coin.system_id === systemId && coin.currency_id === systemId,
  );
  const coinObj = statusSystem?.coinObj || activeCoin;

  return coinObj?.display_ticker || coinObj?.id || systemId;
};

const GiftCardStatusBadge = ({card}) => {
  const theme = useAppTheme();
  const status = getGiftCardDisplayStatus(card);
  let backgroundColor = theme.colors.surfaceMuted;
  let color = theme.colors.textSecondary;

  if (status === STATUS_READY) {
    backgroundColor = theme.colors.successBackground;
    color = theme.colors.success;
  } else if (status === STATUS_PENDING) {
    backgroundColor = theme.colors.warningBackground;
    color = theme.colors.warning;
  } else if (status === STATUS_REDEEMED) {
    backgroundColor = theme.colors.dangerBackground;
    color = theme.colors.danger;
  }

  return (
    <View
      accessibilityLabel={`Status: ${getGiftCardDisplayStatusLabel(card)}`}
      style={[styles.statusBadge, {backgroundColor}]}>
      <Text style={[styles.statusBadgeText, {color}]}>
        {getGiftCardDisplayStatusLabel(card)}
      </Text>
    </View>
  );
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
  const {nfcStatus, shareNative, shareNfc} = useGiftCardSharing(selectedCard);
  useFocusEffect(
    useCallback(() => {
      qrNavigationPendingRef.current = false;
    }, []),
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

      if (!hasGiftCardClaims(latestCard)) {
        throw new Error(
          'Fund this gift card and wait for confirmation before sharing it.',
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

          if (!hasGiftCardClaims(currentCard)) {
            throw new Error(
              'Fund this gift card and wait for confirmation before sharing it.',
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

  const openFunding = async (card, routeParams = {}) => {
    if (hasGiftCardBeenShared(card)) {
      Alert.alert(
        'Already shared',
        'Shared gift cards cannot be funded. Create a new gift card instead.',
      );
      return;
    }

    if (hasGiftCardShareReservation(card)) {
      Alert.alert('Sharing in progress', GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
      return;
    }

    if (hasPendingGiftCardFunding(card)) {
      Alert.alert(
        'Pending Funding',
        'Wait for pending funding transactions to confirm before adding more funds.',
      );
      return;
    }

    if (card.status?.state === 'redeemed' || card.status?.redeemed) {
      Alert.alert('Redeemed', 'Redeemed gift cards cannot be funded.');
      return;
    }

    try {
      const refreshed = await refreshCard(card);

      if (hasGiftCardBeenShared(refreshed)) {
        Alert.alert(
          'Already shared',
          'Shared gift cards cannot be funded. Create a new gift card instead.',
        );
        return;
      }

      if (hasGiftCardShareReservation(refreshed)) {
        Alert.alert('Sharing in progress', GIFT_CARD_SHARE_IN_PROGRESS_MESSAGE);
        return;
      }

      if (hasPendingGiftCardFunding(refreshed)) {
        Alert.alert(
          'Pending Funding',
          'Wait for pending funding transactions to confirm before adding more funds.',
        );
        return;
      }

      if (
        refreshed.status?.state === 'redeemed' ||
        refreshed.status?.redeemed
      ) {
        Alert.alert('Redeemed', 'Redeemed gift cards cannot be funded.');
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
          'This gift card still has funds, VerusIDs, or pending funding.',
        );
        return;
      }

      await saveServiceData(currentData =>
        removeGiftCard(currentData, card.id),
      );
      setSelectedCardId(null);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setBusyCardId(null);
    }
  };

  const confirmDeleteCard = card => {
    if (!canDeleteGiftCard(card)) return;

    Alert.alert(
      'Delete Gift Card',
      'Are you sure you want to delete this gift card from this device?',
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
        'This gift card still has funds or VerusIDs. Redeem or empty it, then refresh before deleting it.',
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
              [STATUS_REDEEMED, 'Redeemed'],
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
          const shared = hasGiftCardBeenShared(card);
          const accessibilityLabel = `${card.label}. ${
            shared ? 'Shared from this wallet. ' : ''
          }${getContentsSummary(card)}. ${getGiftCardDisplayStatusLabel(card)}.`;

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
                    {getListSummary(card)}
                  </Text>
                </View>
                <GiftCardStatusBadge card={card} />
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
    const pendingFundings = getGiftCardPendingFundings(card);
    const capabilities = getGiftCardCapabilities(card);
    const pending = pendingFundings.length > 0;
    const deleteEnabled = canDeleteGiftCard(card);
    const status = getGiftCardDisplayStatus(card);
    const addresses = Object.entries(card.addressesBySystem || {});
    const systemRows = capabilities.isRedeemed ? [] : getSystemRows(card);
    const presentation = getGiftCardPresentation(card);
    const claimInfo = getGiftCardClaimInfo(card);
    const claimedAt = formatCardDateTime(claimInfo?.claimedAt);
    const identityLookupErrors = getGiftCardIdentityLookupErrors(card);
    const shared = hasGiftCardBeenShared(card);
    const sharedAt = shared ? formatCardDateTime(card.sharedAt) : '';
    const sharedNoticeBody = sharedAt
      ? `This wallet exposed the redeemable link on ${sharedAt}. This gift card cannot be funded again.`
      : 'This wallet exposed the redeemable link. This gift card cannot be funded again.';
    let contentsSummary = 'No confirmed contents';
    let emptyContentsMessage = pending
      ? 'There are no confirmed contents yet. Pending funding is listed separately below.'
      : 'There are no confirmed contents yet.';

    if (capabilities.isRedeemed) {
      contentsSummary = 'No contents remain';
      emptyContentsMessage =
        'This gift card has been claimed. No contents remain.';
    } else if (presentation.confirmedItemCount > 0) {
      contentsSummary = `${presentation.confirmedItemCount} confirmed ${
        presentation.confirmedItemCount === 1 ? 'item' : 'items'
      }`;
    }
    const fundingSummary = `${addresses.length} funding ${
      addresses.length === 1 ? 'address' : 'addresses'
    }`;
    const pendingTitle = capabilities.isRedeemed
      ? 'Funding verification incomplete'
      : 'Pending funding';
    const pendingBody = capabilities.isRedeemed
      ? 'One or more saved funding transactions could not be verified. This gift card has already been redeemed.'
      : 'These items are not available to the recipient until they confirm.';
    const pendingIdentityPrefix = capabilities.isRedeemed
      ? 'Unverified record for '
      : 'Waiting for ';
    const pendingTransactionCopyLabel = capabilities.isRedeemed
      ? 'Copy unverified funding transaction ID'
      : 'Copy pending funding transaction ID';
    const optionActions = [];

    if (capabilities.canFund) {
      optionActions.push(
        {
          key: 'add-contents',
          disabled: busy,
          IconComponent: CirclePlus,
          label:
            status === STATUS_NOT_FUNDED
              ? 'Add contents'
              : 'Add more contents',
          onPress: () => openFunding(card),
        },
        {
          key: 'external-funding',
          disabled: busy,
          IconComponent: ArrowDownToLine,
          label: 'Fund from another wallet',
          onPress: () => openFunding(card, {startExternal: true}),
        },
      );
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
          <Text
            style={[
              theme.typography.titleSheet,
              styles.detailHeaderTitle,
              {color: theme.colors.textPrimary},
            ]}>
            Gift card
          </Text>
          <TouchableOpacity
            accessibilityLabel="Refresh gift card"
            accessibilityRole="button"
            disabled={busy}
            onPress={() => refreshCard(card)}
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
        </View>

        <FadedScrollView
          containerStyle={styles.detailViewport}
          contentContainerStyle={styles.detailContent}
          fadeBackgroundColor={theme.colors.background}
          fadeLength={42}
          showsVerticalScrollIndicator={false}>
          <GiftCardFlipCard
            busy={busy}
            canShare={capabilities.canShare}
            card={card}
            onOpenQr={() => runShareAction(card, navigateToQr)}
            onShareNative={() => runShareAction(card, shareNative)}
            onWriteNfc={() => runShareAction(card, shareNfc)}
            presentation={presentation}
          />

          {shared ? (
            <View
              accessible
              accessibilityLabel={`Shared from this wallet. ${sharedNoticeBody}`}
              style={[
                styles.sharedNotice,
                {
                  backgroundColor: theme.colors.warningBackground,
                  borderColor: theme.colors.warning,
                },
              ]}>
              <MaterialCommunityIcons
                accessible={false}
                color={theme.colors.warning}
                name="shield-alert-outline"
                size={19}
              />
              <View style={styles.sharedNoticeCopy}>
                <Text
                  style={[
                    styles.sharedNoticeTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Shared from this wallet
                </Text>
                <Text
                  style={[
                    styles.sharedNoticeBody,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {sharedNoticeBody}
                </Text>
              </View>
            </View>
          ) : null}

          {status === STATUS_REDEEMED ? (
            <View style={styles.statusGuidance}>
              <Text
                style={[
                  styles.statusGuidanceText,
                  {color: theme.colors.textSecondary},
                ]}>
                This gift card has been redeemed and cannot be funded again.
              </Text>
            </View>
          ) : null}

          {claimInfo != null ? (
            <View
              style={[
                styles.claimNotice,
                {
                  backgroundColor: theme.colors.successBackground,
                  borderColor: theme.colors.success,
                },
              ]}>
              <MaterialCommunityIcons
                color={theme.colors.success}
                name="account-check-outline"
                size={19}
              />
              <View style={styles.claimNoticeCopy}>
                <Text
                  style={[
                    styles.claimNoticeTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Claimed by {getClaimedByLabel(claimInfo)}
                </Text>
                <Text
                  style={[
                    styles.claimNoticeBody,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {claimedAt
                    ? `Claimed at ${claimedAt}`
                    : claimInfo.height
                    ? `Claimed at block ${claimInfo.height}`
                    : 'Claim time unavailable'}
                </Text>
              </View>
            </View>
          ) : null}

          {claimInfo == null &&
          systemRows.length === 0 &&
          identityLookupErrors.length > 0 ? (
            <View
              style={[
                styles.lookupWarning,
                {
                  backgroundColor: theme.colors.warningBackground,
                  borderColor: theme.colors.warning,
                },
              ]}>
              <MaterialCommunityIcons
                color={theme.colors.warning}
                name="database-alert-outline"
                size={19}
              />
              <Text
                style={[
                  styles.lookupWarningText,
                  {color: theme.colors.textSecondary},
                ]}>
                VerusID lookup is unavailable on this endpoint. Identity-only
                cards funded outside this wallet require an endpoint started
                with -idindex=1.
              </Text>
            </View>
          ) : null}

          <View style={styles.flatSections}>
            <View style={styles.flatSection}>
              <View style={styles.sectionHeadingRow}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Contents
                </Text>
                <Text
                  style={[
                    styles.sectionSummary,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {contentsSummary}
                </Text>
              </View>
              {systemRows.length > 0 ? (
                <>
                  <Text
                    style={[
                      styles.sectionIntro,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Only confirmed contents are available to the recipient.
                  </Text>
                  {systemRows.map((system, index) => (
                    <View
                      key={system.systemId}
                      style={[
                        styles.systemBlock,
                        index < systemRows.length - 1 && {
                          borderBottomColor: theme.colors.border,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.systemTitle,
                          {color: theme.colors.textPrimary},
                        ]}>
                        {system.coinObj?.display_ticker ||
                          system.coinObj?.id ||
                          system.systemId}
                      </Text>
                      {(system.currencies || []).map(currency => (
                        <Text
                          key={currency.currencyId}
                          style={[
                            styles.systemValue,
                            {color: theme.colors.textSecondary},
                          ]}>
                          {currency.amount}{' '}
                          {currency.display?.name || currency.currencyId}
                        </Text>
                      ))}
                      {(system.identities || []).map(identity => (
                        <Text
                          key={identity.identityAddress}
                          style={[
                            styles.systemValue,
                            {color: theme.colors.textSecondary},
                          ]}>
                          {identity.fullyQualifiedName ||
                            identity.identityAddress}
                        </Text>
                      ))}
                    </View>
                  ))}
                </>
              ) : (
                <Text
                  style={[
                    styles.emptySectionText,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {emptyContentsMessage}
                </Text>
              )}
            </View>

            {capabilities.showFundingAddresses ? (
              <View
                style={[
                  styles.flatSection,
                  styles.flatSectionDivider,
                  {borderTopColor: theme.colors.border},
                ]}>
                <View style={styles.sectionHeadingRow}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      {color: theme.colors.textPrimary},
                    ]}>
                    Funding addresses
                  </Text>
                  <Text
                    style={[
                      styles.sectionSummary,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {fundingSummary}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.sectionIntro,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Send from another wallet using the address for the matching
                  system.
                </Text>
                {addresses.length > 0 ? (
                  addresses.map(([systemId, address], index) => (
                    <View
                      key={systemId}
                      style={[
                        styles.addressRow,
                        index < addresses.length - 1 && {
                          borderBottomColor: theme.colors.border,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}>
                      <View style={styles.addressCopy}>
                        <Text
                          style={[
                            styles.addressSystem,
                            {color: theme.colors.textPrimary},
                          ]}>
                          {getSystemName(systemId, card, activeCoinsForUser)}
                        </Text>
                        <Text
                          numberOfLines={2}
                          selectable
                          style={[
                            styles.addressValue,
                            {color: theme.colors.textSecondary},
                          ]}>
                          {address}
                        </Text>
                      </View>
                      <CopyAction
                        accessibilityLabel={`Copy ${getSystemName(
                          systemId,
                          card,
                          activeCoinsForUser,
                        )} gift card address`}
                        value={address}
                      />
                    </View>
                  ))
                ) : (
                  <Text
                    style={[
                      styles.emptySectionText,
                      {color: theme.colors.textSecondary},
                    ]}>
                    No funding addresses are available.
                  </Text>
                )}
              </View>
            ) : null}
          </View>

          {pendingFundings.length > 0 ? (
            <View
              style={[
                styles.pendingNotice,
                {borderColor: theme.colors.warning},
              ]}>
              <View style={styles.pendingHeader}>
                <Text
                  style={[
                    styles.pendingTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  {pendingTitle}
                </Text>
              </View>
              <Text
                style={[
                  styles.pendingBody,
                  {color: theme.colors.textSecondary},
                ]}>
                {pendingBody}
              </Text>
              {pendingFundings.map((entry, entryIndex) => (
                <View key={`${entry.createdAt || entryIndex}`}>
                  {(entry.identities || []).map(identity => (
                    <Text
                      key={`${entryIndex}:${identity.identityAddress}`}
                      style={[
                        styles.pendingBody,
                        {color: theme.colors.textSecondary},
                      ]}>
                      {pendingIdentityPrefix}
                      {identity.fullyQualifiedName || identity.identityAddress}
                    </Text>
                  ))}
                  {(entry.txids || []).map(txid => (
                    <View
                      key={`${entryIndex}:${txid}`}
                      style={styles.transactionRow}>
                      <Text
                        numberOfLines={1}
                        selectable
                        style={[
                          styles.transactionValue,
                          {color: theme.colors.textSecondary},
                        ]}>
                        {txid}
                      </Text>
                      <CopyAction
                        accessibilityLabel={pendingTransactionCopyLabel}
                        value={txid}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

        </FadedScrollView>

        <SafeBottomActionStack horizontalSpacing={20} safeAreaSpacing={0}>
          <AppButton
            disabled={busy}
            mode="contained"
            onPress={() => setActionsVisible(true)}>
            Gift card options
          </AppButton>
        </SafeBottomActionStack>

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
      </SafeAreaView>
    );
  };

  return (
    <>
      {selectedCard ? renderDetail(selectedCard) : renderList()}
      <GiftCardNfcProgressModal nfcStatus={nfcStatus} />
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
    flexShrink: 0,
    marginRight: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    ...fontStyle('semiBold'),
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
    paddingHorizontal: 12,
  },
  detailHeaderAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  detailHeaderTitle: {
    flex: 1,
    textAlign: 'center',
  },
  detailViewport: {
    flex: 1,
  },
  detailContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },
  statusGuidance: {
    marginTop: 18,
    paddingVertical: 12,
  },
  statusGuidanceText: {
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  sharedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  sharedNoticeCopy: {
    minWidth: 0,
    flex: 1,
  },
  sharedNoticeTitle: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  sharedNoticeBody: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    ...fontStyle('regular'),
  },
  claimNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  claimNoticeCopy: {
    minWidth: 0,
    flex: 1,
  },
  claimNoticeTitle: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  claimNoticeBody: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    ...fontStyle('regular'),
  },
  lookupWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  lookupWarningText: {
    minWidth: 0,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  flatSections: {
    marginTop: 28,
  },
  flatSection: {
    paddingBottom: 18,
  },
  flatSectionDivider: {
    paddingTop: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    minWidth: 0,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  sectionSummary: {
    flexShrink: 0,
    maxWidth: '48%',
    marginLeft: 12,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'right',
    ...fontStyle('regular'),
  },
  sectionIntro: {
    paddingTop: 7,
    paddingBottom: 1,
    fontSize: 12,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  emptySectionText: {
    paddingVertical: 14,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  systemBlock: {
    paddingVertical: 12,
  },
  systemTitle: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  systemValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  addressRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 10,
  },
  addressSystem: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  addressValue: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    ...fontStyle('regular'),
  },
  pendingNotice: {
    marginTop: 8,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pendingHeader: {
    minHeight: 19,
  },
  pendingTitle: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  pendingBody: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    ...fontStyle('regular'),
  },
  transactionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionValue: {
    minWidth: 0,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    ...fontStyle('regular'),
  },
});

export default GiftCardServiceOverview;
