import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';
import {GENERIC_REQUEST_DEEPLINK_VDXF_KEY} from 'verus-typescript-primitives';
import AppButton from '../../../../../components/AppButton';
import CopyAction from '../../../../../components/CopyAction';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../../globals/fonts';
import {useAppTheme} from '../../../../../theme/app';
import {SET_DEEPLINK_DATA} from '../../../../../utils/constants/storeType';
import {GIFT_CARD_SERVICE_ID} from '../../../../../utils/constants/services';
import {
  canDeleteGiftCard,
  getGiftCardPendingFundings,
  hasGiftCardClaims,
  hasPendingGiftCardFunding,
  normalizeGiftCardServiceData,
  refreshGiftCardStatus,
  removeGiftCard,
  upsertGiftCard,
} from '../../../../../utils/giftCard/giftCard';
import GiftCardShareSheet from '../GiftCardShareSheet';

const GIFT_CARD_REFRESH_INTERVAL_MS = 30000;
const STATUS_ALL = 'all';
const STATUS_READY = 'ready';
const STATUS_PENDING = 'pending';
const STATUS_NOT_FUNDED = 'not-funded';
const STATUS_REDEEMED = 'redeemed';

const formatCardDate = timestamp => {
  if (!timestamp) return '';

  try {
    return new Date(timestamp).toLocaleDateString();
  } catch (_) {
    return '';
  }
};

const getCardStatus = card => {
  if (card.status?.state === 'redeemed' || card.status?.redeemed) {
    return STATUS_REDEEMED;
  }

  if (hasPendingGiftCardFunding(card)) return STATUS_PENDING;
  if (card.status?.state === 'funded' || hasGiftCardClaims(card)) {
    return STATUS_READY;
  }

  return STATUS_NOT_FUNDED;
};

const getStatusLabel = card => {
  const status = getCardStatus(card);

  if (status === STATUS_REDEEMED) return 'Redeemed';
  if (status === STATUS_PENDING) return 'Pending';
  if (status === STATUS_READY) return 'Ready';
  return 'Not funded';
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
  const contents = getCardContents(card);

  if (contents.length === 0) {
    return hasPendingGiftCardFunding(card) ? 'Funding pending' : 'Empty';
  }
  if (contents.length <= 2) return contents.join(' · ');
  return `${contents.slice(0, 2).join(' · ')} +${contents.length - 2}`;
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
  const status = getCardStatus(card);
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
      accessibilityLabel={`Status: ${getStatusLabel(card)}`}
      style={[styles.statusBadge, {backgroundColor}]}>
      <Text style={[styles.statusBadgeText, {color}]}>{getStatusLabel(card)}</Text>
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
  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);
  const [shareCardTarget, setShareCardTarget] = useState(null);
  const [busyCardId, setBusyCardId] = useState(null);
  const [filter, setFilter] = useState(STATUS_ALL);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const refreshAllRunningRef = useRef(false);
  const normalizedData = normalizeGiftCardServiceData(serviceData);
  const cards = useMemo(
    () =>
      Object.values(normalizedData.cards || {}).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      ),
    [normalizedData.cards],
  );
  const selectedCard = cards.find(card => card.id === selectedCardId) || null;
  const visibleCards = useMemo(
    () =>
      filter === STATUS_ALL
        ? cards
        : cards.filter(card => getCardStatus(card) === filter),
    [cards, filter],
  );

  useEffect(() => {
    if (selectedCardId && !selectedCard) {
      setSelectedCardId(null);
    }
  }, [selectedCard, selectedCardId]);

  const saveCard = useCallback(
    async card => {
      await saveServiceData(upsertGiftCard(normalizedData, card));
    },
    [normalizedData, saveServiceData],
  );

  const refreshAllCards = useCallback(async () => {
    const cardList = Object.values(normalizedData.cards || {});

    if (cardList.length === 0 || refreshAllRunningRef.current) return;

    refreshAllRunningRef.current = true;

    try {
      let nextData = normalizedData;
      let changed = false;

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
            nextData = upsertGiftCard(nextData, refreshed);
            changed = true;
          }
        } catch (e) {
          console.warn(e.message);
        }
      }

      if (changed) {
        await saveServiceData(nextData);
      }
    } finally {
      refreshAllRunningRef.current = false;
    }
  }, [activeCoinsForUser, normalizedData, saveServiceData]);

  useEffect(() => {
    let refreshInterval = null;

    const stopRefreshInterval = () => {
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

    const unsubscribeFocus = navigation.addListener('focus', startRefreshInterval);
    const unsubscribeBlur = navigation.addListener('blur', stopRefreshInterval);

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

        await saveCard(refreshed);
        return refreshed;
      } catch (e) {
        console.error(e);
        Alert.alert('Network Error', e.message || 'Unable to refresh gift card.');
        throw e;
      } finally {
        setBusyCardId(null);
      }
    },
    [activeCoinsForUser, saveCard],
  );

  const openFunding = async (card, routeParams = {}) => {
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

      if (hasPendingGiftCardFunding(refreshed)) {
        Alert.alert(
          'Pending Funding',
          'Wait for pending funding transactions to confirm before adding more funds.',
        );
        return;
      }

      if (refreshed.status?.state === 'redeemed' || refreshed.status?.redeemed) {
        Alert.alert('Redeemed', 'Redeemed gift cards cannot be funded.');
        return;
      }

      navigation.navigate('GiftCardFund', {
        cardId: card.id,
        ...routeParams,
      });
    } catch (_) {}
  };

  const openCancelFlow = card => {
    Alert.alert(
      'Cancel Gift Card',
      'Redeem this gift card to your own wallet to cancel it and make the shared link unspendable.',
      [
        {text: 'Back', style: 'cancel'},
        {
          text: 'Redeem',
          onPress: () => {
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
          },
        },
      ],
    );
  };

  const cancelCard = async card => {
    if (hasPendingGiftCardFunding(card)) {
      Alert.alert(
        'Pending Funding',
        'Wait for pending funding transactions to confirm before canceling this gift card.',
      );
      return;
    }

    try {
      const refreshed = await refreshCard(card);

      if (hasPendingGiftCardFunding(refreshed)) {
        Alert.alert(
          'Pending Funding',
          'Wait for pending funding transactions to confirm before canceling this gift card.',
        );
        return;
      }

      if (!hasGiftCardClaims(refreshed)) {
        Alert.alert(
          'Empty Gift Card',
          'This gift card has no funds or VerusIDs to redeem.',
        );
        return;
      }

      openCancelFlow(refreshed);
    } catch (_) {}
  };

  const deleteCard = async card => {
    setBusyCardId(card.id);

    try {
      const refreshed = await refreshGiftCardStatus({
        card,
        activeCoinsForUser,
      });

      if (!canDeleteGiftCard(refreshed)) {
        await saveCard(refreshed);
        Alert.alert(
          'Cannot Delete',
          'This gift card still has funds, VerusIDs, or pending funding.',
        );
        return;
      }

      await saveServiceData(removeGiftCard(normalizedData, card.id));
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
      <View style={styles.listHeader}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            accessibilityLabel="Back to Services"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.headerBackAction}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="arrow-left"
              size={24}
            />
          </TouchableOpacity>
          <Text
            style={[
              theme.typography.headlineMd,
              styles.listTitle,
              {color: theme.colors.textPrimary},
            ]}>
            Gift cards
          </Text>
          <TouchableOpacity
            accessibilityLabel="Create gift card"
            accessibilityRole="button"
            onPress={() => navigation.navigate('GiftCardCreate')}
            style={styles.headerAction}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="plus"
              size={26}
            />
          </TouchableOpacity>
        </View>
        <Text
          style={[
            theme.typography.caption,
            styles.headerDescription,
            {color: theme.colors.textSecondary},
          ]}>
          Share funds or VerusIDs as a redeemable link, QR code, or NFC card.
        </Text>
        <ScrollView
          contentContainerStyle={styles.filters}
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
                      ? theme.colors.textPrimary
                      : theme.colors.surfaceMuted,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: selected
                        ? theme.colors.background
                        : theme.colors.textSecondary,
                    },
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {visibleCards.map((card, index) => {
          const busy = busyCardId === card.id;
          const accessibilityLabel = `${card.label}. ${getContentsSummary(
            card,
          )}. ${getStatusLabel(card)}.`;

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
                    style={[styles.rowTitle, {color: theme.colors.textPrimary}]}>
                    {card.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rowDescription,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {getContentsSummary(card)}
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
            <MaterialCommunityIcons
              accessible={false}
              color={theme.colors.textSubtle}
              name="gift-outline"
              size={42}
            />
            <Text
              style={[
                theme.typography.titleSheet,
                styles.emptyTitle,
                {color: theme.colors.textPrimary},
              ]}>
              {cards.length === 0 ? 'No gift cards yet' : 'No gift cards here'}
            </Text>
            <Text
              style={[
                theme.typography.caption,
                styles.emptyBody,
                {color: theme.colors.textSecondary},
              ]}>
              {cards.length === 0
                ? 'Create one to share funds or a VerusID.'
                : 'Choose another status to see your other gift cards.'}
            </Text>
            {cards.length > 0 ? (
              <AppButton
                onPress={() => setFilter(STATUS_ALL)}
                style={styles.emptyAction}
                variant="text">
                Show all gift cards
              </AppButton>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <SafeBottomActionStack horizontalSpacing={20}>
        <AppButton
          icon="plus"
          mode="contained"
          onPress={() => navigation.navigate('GiftCardCreate')}>
          Create gift card
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );

  const renderDetail = card => {
    const busy = busyCardId === card.id;
    const pendingFundings = getGiftCardPendingFundings(card);
    const hasClaims = hasGiftCardClaims(card);
    const pending = pendingFundings.length > 0;
    const deleteEnabled = canDeleteGiftCard(card);
    const status = getCardStatus(card);
    const addresses = Object.entries(card.addressesBySystem || {});
    const systemRows = getSystemRows(card);
    const fundDisabled = pending || status === STATUS_REDEEMED || busy;

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

        <ScrollView
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.detailIcon,
              {backgroundColor: theme.colors.surfaceMuted},
            ]}>
            <MaterialCommunityIcons
              accessible={false}
              color={theme.colors.primary}
              name="gift-outline"
              size={34}
            />
          </View>
          <Text
            style={[
              theme.typography.headlineCompact,
              styles.detailTitle,
              {color: theme.colors.textPrimary},
            ]}>
            {card.label}
          </Text>
          <GiftCardStatusBadge card={card} />

          <View
            style={[
              styles.detailSection,
              {borderColor: theme.colors.border},
            ]}>
            <View
              style={[
                styles.detailInfoRow,
                {borderBottomColor: theme.colors.border},
              ]}>
              <MaterialCommunityIcons
                color={theme.colors.primary}
                name="cash-multiple"
                size={22}
              />
              <View style={styles.detailInfoCopy}>
                <Text
                  style={[
                    styles.detailInfoLabel,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Contents
                </Text>
                <Text
                  style={[
                    styles.detailInfoValue,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {getContentsSummary(card)}
                </Text>
              </View>
            </View>
            <View style={styles.detailInfoRow}>
              <MaterialCommunityIcons
                color={theme.colors.primary}
                name="shield-key-outline"
                size={22}
              />
              <View style={styles.detailInfoCopy}>
                <Text
                  style={[
                    styles.detailInfoLabel,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Claim protection
                </Text>
                <Text
                  style={[
                    styles.detailInfoValue,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {card.encrypted ? 'Claim password required' : 'Spendable link'}
                  {formatCardDate(card.createdAt)
                    ? ` · Created ${formatCardDate(card.createdAt)}`
                    : ''}
                </Text>
              </View>
            </View>
          </View>

          {systemRows.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text
                style={[
                  styles.sectionLabel,
                  {color: theme.colors.textSecondary},
                ]}>
                CURRENT CONTENTS
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
                      {identity.fullyQualifiedName || identity.identityAddress}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text
              style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>
              FUNDING ADDRESSES
            </Text>
            {addresses.map(([systemId, address], index) => (
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
            ))}
          </View>

          {pendingFundings.length > 0 ? (
            <View
              style={[
              styles.pendingNotice,
              {
                  backgroundColor: theme.colors.warningBackground,
                },
              ]}>
              <View style={styles.pendingHeader}>
                <MaterialCommunityIcons
                  color={theme.colors.warning}
                  name="clock-outline"
                  size={21}
                />
                <Text
                  style={[
                    styles.pendingTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Pending funding
                </Text>
              </View>
              {pendingFundings.map((entry, entryIndex) => (
                <View key={`${entry.createdAt || entryIndex}`}>
                  {(entry.identities || []).map(identity => (
                    <Text
                      key={`${entryIndex}:${identity.identityAddress}`}
                      style={[
                        styles.pendingBody,
                        {color: theme.colors.textSecondary},
                      ]}>
                      Waiting for{' '}
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
                        accessibilityLabel="Copy pending funding transaction ID"
                        value={txid}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          <View
            style={[
              styles.lifecycleActions,
              {borderTopColor: theme.colors.border},
            ]}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setShareCardTarget(card)}
              style={styles.lifecycleRow}>
              <MaterialCommunityIcons
                color={theme.colors.primary}
                name="share-variant"
                size={22}
              />
              <Text
                style={[
                  styles.lifecycleLabel,
                  {color: theme.colors.textPrimary},
                ]}>
                Share gift card
              </Text>
              <MaterialCommunityIcons
                color={theme.colors.textSubtle}
                name="chevron-right"
                size={21}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy || pending || !hasClaims}
              onPress={() => cancelCard(card)}
              style={[styles.lifecycleRow, (busy || pending || !hasClaims) && styles.disabled]}>
              <MaterialCommunityIcons
                color={theme.colors.warning}
                name="close-circle-outline"
                size={22}
              />
              <Text
                style={[
                  styles.lifecycleLabel,
                  {color: theme.colors.textPrimary},
                ]}>
                Cancel by redeeming to this wallet
              </Text>
              <MaterialCommunityIcons
                color={theme.colors.textSubtle}
                name="chevron-right"
                size={21}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                deleteEnabled
                  ? confirmDeleteCard(card)
                  : explainDeleteUnavailable(card)
              }
              style={styles.lifecycleRow}>
              <MaterialCommunityIcons
                color={
                  deleteEnabled ? theme.colors.danger : theme.colors.textSubtle
                }
                name="delete-outline"
                size={22}
              />
              <Text
                style={[
                  styles.lifecycleLabel,
                  {
                    color: deleteEnabled
                      ? theme.colors.danger
                      : theme.colors.textSecondary,
                  },
                ]}>
                Delete from this device
              </Text>
              <MaterialCommunityIcons
                color={theme.colors.textSubtle}
                name="chevron-right"
                size={21}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <SafeBottomActionStack gap={8} horizontalSpacing={20}>
          <AppButton
            disabled={busy}
            icon={status === STATUS_NOT_FUNDED ? 'cash-plus' : 'share-variant'}
            mode="contained"
            onPress={() =>
              status === STATUS_NOT_FUNDED
                ? openFunding(card)
                : setShareCardTarget(card)
            }>
            {status === STATUS_NOT_FUNDED ? 'Add contents' : 'Share gift card'}
          </AppButton>
          {status !== STATUS_REDEEMED ? (
            <AppButton
              disabled={fundDisabled}
              onPress={() => openFunding(card, {startExternal: true})}
              variant="text">
              Fund from another wallet
            </AppButton>
          ) : null}
          {status === STATUS_READY ? (
            <AppButton
              disabled={fundDisabled}
              onPress={() => openFunding(card)}
              variant="text">
              Add more contents
            </AppButton>
          ) : null}
        </SafeBottomActionStack>
      </SafeAreaView>
    );
  };

  return (
    <>
      {selectedCard ? renderDetail(selectedCard) : renderList()}
      <GiftCardShareSheet
        card={shareCardTarget}
        onClose={() => setShareCardTarget(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackAction: {
    width: 44,
    height: 44,
    marginLeft: -8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: {
    minWidth: 0,
    flex: 1,
  },
  headerAction: {
    width: 44,
    height: 44,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerDescription: {
    maxWidth: 340,
    marginTop: 6,
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
    paddingHorizontal: 28,
    paddingVertical: 44,
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 7,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 10,
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
  detailContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },
  detailIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 21,
  },
  detailTitle: {
    marginTop: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  detailSection: {
    marginTop: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailInfoRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailInfoCopy: {
    minWidth: 0,
    flex: 1,
  },
  detailInfoLabel: {
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  detailInfoValue: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  sectionBlock: {
    marginTop: 26,
  },
  sectionLabel: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    ...fontStyle('semiBold'),
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
    marginTop: 24,
    padding: 14,
    borderRadius: 14,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  lifecycleActions: {
    marginTop: 28,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lifecycleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  lifecycleLabel: {
    minWidth: 0,
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  disabled: {
    opacity: 0.45,
  },
});

export default GiftCardServiceOverview;
