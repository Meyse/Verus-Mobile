import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import CopyAction from '../../../components/CopyAction';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../../components/SkeletonLoader';
import signedInCopy from '../../../copy/signedIn';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {RenderPlainCoinLogo} from '../../../utils/CoinData/Graphics';
import {
  loadAddressBook,
  saveAddressBook,
} from '../../../utils/addressBook/addressBook';
import AddressBookEditSheet from './AddressBookEditSheet';

const EMPTY_RECORD = {
  id: '',
  label: '',
  address: '',
  asset: '',
  network: '',
  verusId: '',
};

const FILTERS = [
  {id: 'all', label: 'All'},
  {id: 'verus', label: 'Verus'},
  {id: 'ethereum', label: 'Ethereum'},
  {id: 'bitcoin', label: 'Bitcoin'},
];

const ICON_HIT_SLOP = {top: 10, right: 10, bottom: 10, left: 10};

const truncateAddress = address => {
  if (!address || address.length <= 19) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

const getRecordGroup = record => {
  const address = record.address?.toLowerCase() || '';
  const metadata = [record.asset, record.network, record.verusId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    address.startsWith('0x') ||
    metadata.includes('ethereum') ||
    /(^|\s)eth($|\s)/.test(metadata)
  ) {
    return 'ethereum';
  }

  if (
    address.startsWith('bc1') ||
    address.startsWith('1') ||
    address.startsWith('3') ||
    metadata.includes('bitcoin') ||
    /(^|\s)btc($|\s)/.test(metadata)
  ) {
    return 'bitcoin';
  }

  return 'verus';
};

const getRecordTicker = record => {
  const address = record.address?.toLowerCase() || '';
  if (address.startsWith('0x')) return 'ETH';
  if (
    address.startsWith('bc1') ||
    address.startsWith('1') ||
    address.startsWith('3')
  ) {
    return 'BTC';
  }
  return (record.asset || record.network || 'VRSC').toUpperCase();
};

const AddressBook = () => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const accountHash = useSelector(
    state => state.authentication.activeAccount.accountHash,
  );
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showHeaderDivider, setShowHeaderDivider] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await loadAddressBook());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...records]
      .filter(
        record => activeFilter === 'all' || getRecordGroup(record) === activeFilter,
      )
      .filter(record => {
        if (!query) return true;
        return [
          record.label,
          record.address,
          record.asset,
          record.network,
          record.verusId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activeFilter, records, search]);

  const openEditor = useCallback(record => {
    setEditing({...record});
    setSheetVisible(true);
  }, []);

  const closeEditor = useCallback(() => {
    setSheetVisible(false);
    setEditing(null);
  }, []);

  const persist = async nextRecords => {
    setRecords(await saveAddressBook(nextRecords, accountHash));
    closeEditor();
  };

  const saveEditing = async nextEditing => {
    const record = {
      ...nextEditing,
      label: nextEditing.label.trim(),
      address: nextEditing.address.trim(),
      id:
        nextEditing.id ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const nextRecords = records.some(item => item.id === record.id)
      ? records.map(item => (item.id === record.id ? record : item))
      : [...records, record];
    try {
      await persist(nextRecords);
    } catch (saveError) {
      Alert.alert('Error', saveError.message || 'Failed to save address');
      throw saveError;
    }
  };

  const removeRecord = record => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${record.label}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await persist(records.filter(item => item.id !== record.id));
            } catch (deleteError) {
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ],
    );
  };

  const showSearchAndFilters = records.length >= 6;
  const hasRecords = records.length > 0;
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.header, showHeaderDivider && styles.headerScrolled]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Address book</Text>
          <TouchableOpacity
            accessibilityLabel="Add address"
            accessibilityRole="button"
            hitSlop={ICON_HIT_SLOP}
            onPress={() => openEditor(EMPTY_RECORD)}
            style={styles.headerIconButton}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="plus"
              size={20}
            />
          </TouchableOpacity>
        </View>

        {showSearchAndFilters && (
          <>
            <View style={styles.filterContainer}>
              {FILTERS.map(filter => {
                const selected = activeFilter === filter.id;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={filter.id}
                    onPress={() => setActiveFilter(filter.id)}
                    style={[styles.filterPill, selected && styles.filterPillActive]}>
                    <Text
                      style={[
                        styles.filterLabel,
                        selected && styles.filterLabelActive,
                      ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View
              style={[
                styles.searchContainer,
                searchFocused && styles.searchContainerFocused,
              ]}>
              <RNTextInput
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => setSearchFocused(false)}
                onChangeText={setSearch}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search addresses"
                placeholderTextColor={theme.colors.textSubtle}
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
              <View style={styles.searchIcon}>
                <MaterialCommunityIcons
                  color={theme.colors.textSubtle}
                  name="magnify"
                  size={20}
                />
              </View>
            </View>
          </>
        )}
      </View>

      {loading ? (
        <SkeletonLoader
          accessibilityLabel="Loading Address Book"
          style={styles.skeletonLoader}>
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.skeletonRow}>
              <SkeletonBlock height={28} radius={14} width={28} />
              <View style={styles.skeletonText}>
                <SkeletonText height={16} width="42%" />
                <SkeletonText height={14} style={styles.skeletonAddress} width="72%" />
              </View>
            </View>
          ))}
        </SkeletonLoader>
      ) : error ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIllustration}>
            <MaterialCommunityIcons
              color={theme.colors.borderStrong}
              name="book-alert-outline"
              size={80}
            />
          </View>
          <Text style={styles.emptyTitle}>Address Book unavailable</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={refresh}
            style={styles.emptyPrimaryButton}>
            <Text style={styles.emptyPrimaryLabel}>{signedInCopy.actions.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : !hasRecords ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIllustration}>
            <MaterialCommunityIcons
              color={theme.colors.borderStrong}
              name="book-open-variant"
              size={80}
            />
          </View>
          <Text style={styles.emptyTitle}>No saved addresses</Text>
          <Text style={styles.emptyDescription}>
            Save frequently used addresses for quick access when sending
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => openEditor(EMPTY_RECORD)}
            style={styles.emptyPrimaryButton}>
            <Text style={styles.emptyPrimaryLabel}>Add your first address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 80},
          ]}
          keyboardShouldPersistTaps="handled"
          onScroll={event =>
            setShowHeaderDivider(event.nativeEvent.contentOffset.y > 1)
          }
          scrollEventThrottle={16}>
          {filteredRecords.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                {search.trim()
                  ? 'No addresses match your search'
                  : 'No addresses in this category'}
              </Text>
            </View>
          ) : (
            filteredRecords.map(record => (
              <View key={record.id} style={styles.addressRow}>
                <View style={styles.coinIcon}>
                  {RenderPlainCoinLogo(getRecordTicker(record), {}, 28, 28)}
                </View>
                <View style={styles.addressContent}>
                  <Text numberOfLines={1} style={styles.addressLabel}>
                    {record.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.addressText}>
                    {truncateAddress(record.address)}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <CopyAction
                    accessibilityLabel={`Copy ${record.label}`}
                    iconSize={18}
                    style={styles.actionButton}
                    value={record.address}
                  />
                  <TouchableOpacity
                    accessibilityLabel={`Edit ${record.label}`}
                    accessibilityRole="button"
                    hitSlop={ICON_HIT_SLOP}
                    onPress={() => openEditor(record)}
                    style={styles.actionButton}>
                    <MaterialCommunityIcons
                      color={theme.colors.textSecondary}
                      name="pencil-outline"
                      size={18}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel={`Remove ${record.label}`}
                    accessibilityRole="button"
                    hitSlop={ICON_HIT_SLOP}
                    onPress={() => removeRecord(record)}
                    style={styles.actionButton}>
                    <MaterialCommunityIcons
                      color={theme.colors.textSecondary}
                      name="trash-can-outline"
                      size={18}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <AddressBookEditSheet
        editing={editing}
        onClose={closeEditor}
        onSave={saveEditing}
        visible={sheetVisible && Boolean(editing)}
      />
    </SafeAreaView>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: theme.colors.background,
    },
    headerScrolled: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 10,
    },
    headerTitle: {
      ...fontStyle('bold'),
      color: theme.colors.textPrimary,
      fontSize: 28,
      lineHeight: 34,
    },
    headerIconButton: {
      padding: 6,
    },
    filterContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
      marginBottom: 16,
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary,
    },
    filterLabel: {
      ...fontStyle('semiBold'),
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 18,
    },
    filterLabelActive: {
      color: theme.colors.onPrimary,
    },
    searchContainer: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: theme.colors.input,
    },
    searchContainerFocused: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.inputFocused,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: {width: 0, height: 2},
    },
    searchInput: {
      ...fontStyle('regular'),
      flex: 1,
      height: 48,
      paddingHorizontal: 16,
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
    searchIcon: {
      height: '100%',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    addressRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    coinIcon: {
      width: 28,
      height: 28,
      marginRight: 12,
    },
    addressContent: {
      flex: 1,
      minWidth: 0,
    },
    addressLabel: {
      ...fontStyle('semiBold'),
      marginBottom: 2,
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 20,
    },
    addressText: {
      ...fontStyle('regular'),
      color: theme.colors.textSubtle,
      fontSize: 14,
      lineHeight: 18,
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 24,
      paddingBottom: 60,
      paddingHorizontal: 32,
    },
    emptyIllustration: {
      width: 170,
      height: 140,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    emptyTitle: {
      ...fontStyle('bold'),
      marginBottom: 8,
      color: theme.colors.textPrimary,
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },
    emptyDescription: {
      ...fontStyle('regular'),
      marginBottom: 32,
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    emptyPrimaryButton: {
      width: 240,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
    },
    emptyPrimaryLabel: {
      ...fontStyle('bold'),
      color: theme.colors.onPrimary,
      fontSize: 16,
      lineHeight: 20,
    },
    noResults: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    noResultsText: {
      ...fontStyle('regular'),
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    skeletonLoader: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    skeletonRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonText: {
      flex: 1,
      marginLeft: 12,
    },
    skeletonAddress: {
      marginTop: 8,
    },
  });

export default AddressBook;
