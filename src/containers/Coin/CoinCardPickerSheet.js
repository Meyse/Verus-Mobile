import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSelector} from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import AppSearchField from '../../components/AppSearchField';
import BottomSheetModal from '../../components/BottomSheetModal';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CONNECTION_ERROR} from '../../utils/api/errors/errorMessages';
import {API_GET_BALANCES} from '../../utils/constants/intervalConstants';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import {truncateDecimal} from '../../utils/math';
import {
  getLedgerConfirmed,
  getNetworkTicker,
  getSubWalletCardType,
  getSubWalletDisplayIdentifier,
  getSubWalletNetworkLabel,
  isVerusIdWallet,
  sortSubWalletsByBalance,
  truncateMiddle,
} from '../../utils/subwallet/cardPresentation';

const TYPE_FILTERS = [
  {id: 'all', label: 'All'},
  {id: 'addresses', label: 'Addresses'},
  {id: 'verusids', label: 'VerusIDs'},
];
const ALL_CHAINS = 'all';
const ROW_HEIGHT = 72;
const ROW_GAP = 8;
const ITEM_STRIDE = ROW_HEIGHT + ROW_GAP;
const SCROLL_CUE_HEIGHT = 42;
const SCROLL_END_THRESHOLD = 8;
const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const CoinCardPickerSheet = ({
  visible,
  coin,
  subWallets = [],
  selectedSubWalletId,
  onSelect,
  onClose,
  onClosed,
}) => {
  const theme = useOnboardingTheme();
  const {height: screenHeight} = useWindowDimensions();
  const listRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const chainTicker = coin?.id;
  const displayTicker = coin?.display_ticker || '';
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const showBalance = useSelector(state => state.coins.showBalance);
  const balances = useObjectSelector(state =>
    chainTicker
      ? extractLedgerData(state, 'balances', API_GET_BALANCES, chainTicker)
      : {},
  );
  const balanceErrors = useObjectSelector(state =>
    chainTicker ? extractErrorData(state, API_GET_BALANCES, chainTicker) : {},
  );
  const [frozenSubWallets, setFrozenSubWallets] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState(ALL_CHAINS);
  const [showBottomScrollCue, setShowBottomScrollCue] = useState(false);
  const [showTopScrollCue, setShowTopScrollCue] = useState(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      didInitialScrollRef.current = false;
      setFrozenSubWallets(sortSubWalletsByBalance(subWallets, balances));
      setQuery('');
      setTypeFilter('all');
      setChainFilter(ALL_CHAINS);
    }

    if (!visible) didInitialScrollRef.current = false;

    wasVisibleRef.current = visible;
  }, [balances, subWallets, visible]);

  useEffect(() => {
    if (visible && frozenSubWallets.length === 0 && subWallets.length > 0) {
      setFrozenSubWallets(sortSubWalletsByBalance(subWallets, balances));
    }
  }, [balances, frozenSubWallets.length, subWallets, visible]);

  const items = useMemo(
    () =>
      frozenSubWallets.map(wallet => {
        const verusId = isVerusIdWallet(wallet);
        const identifier = getSubWalletDisplayIdentifier(
          wallet,
          activeAccount,
          chainTicker,
          false,
        );
        const type = getSubWalletCardType(wallet);
        const networkLabel = getSubWalletNetworkLabel(wallet, coin);
        const confirmed = getLedgerConfirmed(balances?.[wallet.id]);
        const hasBalanceError = Boolean(balanceErrors?.[wallet.id]);
        let amountText =
          confirmed == null ? '—' : truncateDecimal(confirmed, 8);
        let balanceAccessibilityLabel =
          confirmed == null
            ? 'Balance unavailable'
            : `${amountText} ${displayTicker}`.trim();

        if (!showBalance) {
          amountText = '*****';
          balanceAccessibilityLabel = 'Balance hidden';
        } else if (hasBalanceError) {
          amountText = CONNECTION_ERROR;
          balanceAccessibilityLabel = 'Connection error';
        }

        return {
          wallet,
          identifier,
          displayIdentifier: verusId
            ? identifier
            : identifier === '-'
              ? 'Address unavailable'
              : truncateMiddle(identifier, 6, 6, '…'),
          verusId,
          type,
          networkLabel,
          amountText,
          balanceAccessibilityLabel,
          searchText: [
            identifier,
            wallet.name,
            type,
            networkLabel,
            wallet.network,
            getNetworkTicker(wallet.network),
            displayTicker,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase(),
        };
      }),
    [
      activeAccount,
      balanceErrors,
      balances,
      chainTicker,
      coin,
      displayTicker,
      frozenSubWallets,
      showBalance,
    ],
  );
  const chainOptions = useMemo(
    () =>
      items.reduce((options, item) => {
        if (item.networkLabel && !options.includes(item.networkLabel)) {
          options.push(item.networkLabel);
        }

        return options;
      }, []),
    [items],
  );
  const showChainFilters = chainOptions.length > 1;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        const matchesQuery =
          !normalizedQuery || item.searchText.includes(normalizedQuery);
        const matchesType =
          typeFilter === 'all' ||
          (typeFilter === 'verusids' && item.verusId) ||
          (typeFilter === 'addresses' && !item.verusId);
        const matchesChain =
          chainFilter === ALL_CHAINS || item.networkLabel === chainFilter;

        return matchesQuery && matchesType && matchesChain;
      }),
    [chainFilter, items, normalizedQuery, typeFilter],
  );
  const filtersActive =
    normalizedQuery.length > 0 ||
    typeFilter !== 'all' ||
    chainFilter !== ALL_CHAINS;
  const subtitle = filtersActive
    ? `${filteredItems.length} of ${items.length} cards`
    : `${items.length} ${items.length === 1 ? 'card' : 'cards'} available`;
  const sheetChromeHeight = showChainFilters ? 278 : 226;
  const maximumListHeight = Math.max(
    ITEM_STRIDE,
    screenHeight * 0.76 - sheetChromeHeight,
  );
  const listHeight = Math.min(
    Math.max(filteredItems.length, 1) * ITEM_STRIDE,
    maximumListHeight,
  );
  const listContentHeight = filteredItems.length * ITEM_STRIDE;
  const listScrollable =
    listContentHeight > listHeight + SCROLL_END_THRESHOLD;

  useEffect(() => {
    if (!visible) {
      setShowBottomScrollCue(false);
      setShowTopScrollCue(false);
      return;
    }

    listRef.current?.scrollToOffset({animated: false, offset: 0});
    setShowTopScrollCue(false);
    setShowBottomScrollCue(listScrollable);
  }, [
    chainFilter,
    filteredItems.length,
    listHeight,
    listScrollable,
    normalizedQuery,
    typeFilter,
    visible,
  ]);

  useEffect(() => {
    if (
      !visible ||
      frozenSubWallets.length === 0 ||
      didInitialScrollRef.current
    ) {
      return undefined;
    }

    didInitialScrollRef.current = true;

    const selectedIndex = frozenSubWallets.findIndex(
      wallet => wallet.id === selectedSubWalletId,
    );
    if (selectedIndex < 0) return undefined;

    const offset = Math.min(
      selectedIndex * ITEM_STRIDE,
      Math.max(listContentHeight - listHeight, 0),
    );

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        animated: false,
        offset,
      });
      setShowTopScrollCue(
        listScrollable && offset > SCROLL_END_THRESHOLD,
      );
      setShowBottomScrollCue(
        listScrollable &&
          offset + listHeight < listContentHeight - SCROLL_END_THRESHOLD,
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [
    frozenSubWallets,
    listContentHeight,
    listHeight,
    listScrollable,
    selectedSubWalletId,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !listScrollable || filteredItems.length === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      listRef.current?.flashScrollIndicators?.();
    }, 260);

    return () => clearTimeout(timeout);
  }, [filteredItems.length, listScrollable, normalizedQuery, visible]);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({animated: false, offset: 0});
  }, []);

  const handleQueryChange = useCallback(
    value => {
      setQuery(value);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleTypeFilter = useCallback(
    filter => {
      setTypeFilter(filter);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleChainFilter = useCallback(
    filter => {
      setChainFilter(filter);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleSelect = useCallback(
    wallet => {
      Keyboard.dismiss();
      onSelect(wallet);
    },
    [onSelect],
  );

  const handleListScroll = useCallback(event => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    const isAtTop = contentOffset.y <= SCROLL_END_THRESHOLD;
    const isAtEnd =
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - SCROLL_END_THRESHOLD;

    setShowTopScrollCue(!isAtTop);
    setShowBottomScrollCue(!isAtEnd);
  }, []);

  const handleClosed = useCallback(() => {
    setFrozenSubWallets([]);
    setQuery('');
    setTypeFilter('all');
    setChainFilter(ALL_CHAINS);
    setShowBottomScrollCue(false);
    setShowTopScrollCue(false);

    if (typeof onClosed === 'function') onClosed();
  }, [onClosed]);

  const renderFilter = useCallback(
    (filter, selected, onPress) => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{selected}}
        activeOpacity={0.74}
        key={filter.id}
        onPress={() => onPress(filter.id)}
        style={[
          styles.filterPill,
          selected && styles.filterPillSelected,
        ]}>
        <Text
          style={[
            styles.filterLabel,
            selected && styles.filterLabelSelected,
          ]}>
          {filter.label}
        </Text>
      </TouchableOpacity>
    ),
    [styles],
  );

  const renderItem = useCallback(
    ({item}) => {
      const current = item.wallet.id === selectedSubWalletId;
      const fullIdentifier =
        item.identifier === '-' ? item.displayIdentifier : item.identifier;
      const accessibilityLabel = [
        fullIdentifier,
        item.type,
        item.networkLabel,
        item.balanceAccessibilityLabel,
        current ? 'Current card' : null,
      ]
        .filter(Boolean)
        .join('. ');

      return (
        <TouchableOpacity
          accessibilityHint="Selects this card and closes the sheet."
          accessibilityLabel={`${accessibilityLabel}.`}
          accessibilityRole="button"
          accessibilityState={{selected: current}}
          activeOpacity={0.74}
          onPress={() => handleSelect(item.wallet)}
          style={[
            styles.cardRow,
            current && styles.cardRowCurrent,
          ]}>
          <View style={styles.identifierColumn}>
            <Text
              ellipsizeMode="middle"
              numberOfLines={1}
              style={[
                styles.identifier,
                !item.verusId && styles.addressIdentifier,
              ]}>
              {item.displayIdentifier}
            </Text>
            <Text numberOfLines={1} style={styles.metadata}>
              {item.networkLabel || displayTicker}
            </Text>
          </View>
          <View style={styles.balanceColumn}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={styles.balance}>
              {item.amountText}
            </Text>
            <Text numberOfLines={1} style={styles.balanceTicker}>
              {displayTicker}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [displayTicker, handleSelect, selectedSubWalletId, styles],
  );

  return (
    <BottomSheetModal
      avoidKeyboard
      maxHeight="76%"
      onClose={onClose}
      onClosed={handleClosed}
      visible={visible}>
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          Choose a card
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <AppSearchField
          accessibilityLabel="Search cards"
          onChangeText={handleQueryChange}
          onClear={() => handleQueryChange('')}
          placeholder="Search cards"
          resultCount={filteredItems.length}
          style={styles.searchFieldSpacing}
          themeMode={theme.mode}
          value={query}
        />

        <ScrollView
          horizontal
          bounces={false}
          contentContainerStyle={styles.filterContent}
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}>
          {TYPE_FILTERS.map(filter =>
            renderFilter(
              filter,
              typeFilter === filter.id,
              handleTypeFilter,
            ),
          )}
        </ScrollView>

        {showChainFilters ? (
          <ScrollView
            horizontal
            bounces={false}
            contentContainerStyle={styles.filterContent}
            showsHorizontalScrollIndicator={false}
            style={styles.chainFilterRow}>
            {[
              {id: ALL_CHAINS, label: 'All chains'},
              ...chainOptions.map(chain => ({id: chain, label: chain})),
            ].map(filter =>
              renderFilter(
                filter,
                chainFilter === filter.id,
                handleChainFilter,
              ),
            )}
          </ScrollView>
        ) : null}

        {filteredItems.length > 0 ? (
          <View style={[styles.listFrame, {height: listHeight}]}>
            <FlatList
              ref={listRef}
              alwaysBounceVertical={false}
              bounces={false}
              contentContainerStyle={styles.listContent}
              data={filteredItems}
              getItemLayout={(_, index) => ({
                index,
                length: ITEM_STRIDE,
                offset: ITEM_STRIDE * index,
              })}
              ItemSeparatorComponent={() => (
                <View style={styles.rowSeparator} />
              )}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              keyExtractor={item => String(item.wallet.id)}
              onScroll={handleListScroll}
              renderItem={renderItem}
              scrollEnabled={listScrollable}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={listScrollable}
              style={styles.list}
            />
            {showTopScrollCue ? (
              <CardPickerScrollCue
                position="top"
                styles={styles}
                theme={theme}
              />
            ) : null}
            {showBottomScrollCue ? (
              <CardPickerScrollCue
                position="bottom"
                styles={styles}
                theme={theme}
              />
            ) : null}
          </View>
        ) : (
          <View style={[styles.emptyState, {height: listHeight}]}>
            <Text style={styles.emptyText}>
              No cards match your search and filters.
            </Text>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
};

const CardPickerScrollCue = ({position, styles, theme}) => {
  const top = position === 'top';
  const gradientId = `coinCardPicker${top ? 'Top' : 'Bottom'}ScrollCue`;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrollCue,
        top ? styles.scrollCueTop : styles.scrollCueBottom,
      ]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop
              offset="0"
              stopColor={theme.colors.sheet}
              stopOpacity={top ? 1 : 0}
            />
            <Stop
              offset={top ? '0.28' : '0.72'}
              stopColor={theme.colors.sheet}
              stopOpacity="0.92"
            />
            <Stop
              offset="1"
              stopColor={theme.colors.sheet}
              stopOpacity={top ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      {!top ? (
        <View style={styles.scrollCueChevron}>
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name="chevron-down"
            size={15}
          />
        </View>
      ) : null}
    </View>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 18,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      lineHeight: 26,
      ...fontStyle('semiBold'),
    },
    subtitle: {
      marginTop: 4,
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    searchFieldSpacing: {
      marginTop: 14,
    },
    filterRow: {
      marginTop: 12,
      flexGrow: 0,
    },
    chainFilterRow: {
      marginTop: 8,
      flexGrow: 0,
    },
    filterContent: {
      paddingRight: 2,
      gap: 8,
    },
    filterPill: {
      minHeight: 36,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
    },
    filterPillSelected: {
      backgroundColor: theme.colors.primary,
    },
    filterLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      ...fontStyle('semiBold'),
    },
    filterLabelSelected: {
      color: theme.colors.onPrimary,
    },
    listFrame: {
      marginTop: 12,
      width: '100%',
      overflow: 'hidden',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 2,
    },
    rowSeparator: {
      height: ROW_GAP,
    },
    scrollCue: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: SCROLL_CUE_HEIGHT,
    },
    scrollCueTop: {
      top: 0,
    },
    scrollCueBottom: {
      bottom: 0,
    },
    scrollCueChevron: {
      position: 'absolute',
      bottom: 2,
      alignSelf: 'center',
      width: 20,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardRow: {
      height: ROW_HEIGHT,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
    },
    cardRowCurrent: {
      backgroundColor: theme.colors.successBackground,
    },
    identifierColumn: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    identifier: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    addressIdentifier: {
      fontFamily: MONOSPACE_FONT,
    },
    metadata: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 16,
      ...fontStyle('regular'),
    },
    balanceColumn: {
      width: 108,
      alignItems: 'flex-end',
    },
    balance: {
      maxWidth: '100%',
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    balanceTicker: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 10,
      lineHeight: 13,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    emptyState: {
      marginTop: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
  });

export default CoinCardPickerSheet;
