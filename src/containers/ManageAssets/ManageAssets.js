import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch} from 'react-redux';
import {toLowerCaseCLocale} from 'verus-typescript-primitives';
import {
  addCoin,
  addKeypairs,
  removeExistingCoin,
  setUserCoins,
} from '../../actions/actionCreators';
import {clearAllCoinIntervals} from '../../actions/actionDispatchers';
import {createAlert} from '../../actions/actions/alert/dispatchers/alert';
import {refreshActiveChainLifecycles} from '../../actions/actions/intervals/dispatchers/lifecycleManager';
import AppButton from '../../components/AppButton';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import {SignedInEdgeFade} from '../../components/SignedInActionBar';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {RenderPlainCoinLogo} from '../../utils/CoinData/Graphics';
import {
  ASSET_COLLECTIONS,
  buildAssetManagerData,
  getAssetDescription,
  getAssetsForCollection,
  getCollectionTitle,
} from './assetManagerData';
import {createManageAssetsStyles} from './manageAssets.styles';

const SCROLL_END_THRESHOLD = 8;
const COLLECTION_FILTERS = [
  ASSET_COLLECTIONS.ALL,
  ASSET_COLLECTIONS.PBAAS,
  ASSET_COLLECTIONS.BLOCKCHAINS,
  ASSET_COLLECTIONS.BRIDGE,
];

const getCollectionLabel = collection => {
  switch (collection) {
    case ASSET_COLLECTIONS.PBAAS:
      return 'PBaaS';
    case ASSET_COLLECTIONS.BLOCKCHAINS:
      return 'Blockchains';
    case ASSET_COLLECTIONS.BRIDGE:
      return 'Bridge';
    default:
      return 'All';
  }
};

const normalizeCollection = collection =>
  Object.values(ASSET_COLLECTIONS).includes(collection)
    ? collection
    : ASSET_COLLECTIONS.ALL;

const useAssetManagerData = () => {
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoins = useObjectSelector(
    state => state.coins.activeCoinsForUser || [],
  );
  const testAccount =
    Object.keys(activeAccount?.testnetOverrides || {}).length > 0;
  const data = useMemo(
    () =>
      buildAssetManagerData({
        activeAccount,
        activeCoins,
        testAccount,
      }),
    [activeAccount, activeCoins, testAccount],
  );

  return data;
};

const PlainAssetLogo = ({coinObj, size = 36}) =>
  RenderPlainCoinLogo(coinObj.id, {}, size, size);

const LogoStack = ({assets, small = false, styles, tiles = false}) => (
  <View style={tiles ? styles.logoStack : styles.walletLogos}>
    {assets.slice(0, 3).map((coinObj, index) => (
      <View
        key={coinObj.id}
        style={[
          tiles ? styles.logoTile : styles.overlappingLogo,
          tiles && small && styles.logoTileSmall,
          index > 0 &&
            (tiles
              ? styles.logoTileAfterFirst
              : styles.overlappingLogoAfterFirst),
          {zIndex: 3 - index},
        ]}>
        <PlainAssetLogo coinObj={coinObj} size={small ? 22 : 28} />
      </View>
    ))}
  </View>
);

const AssetRow = ({
  active,
  coinObj,
  description,
  disabled,
  loading,
  onToggle,
  styles,
}) => (
  <View style={styles.assetRow} testID={`manage-asset-row-${coinObj.id}`}>
    <View style={styles.rowLogo}>
      <PlainAssetLogo coinObj={coinObj} size={38} />
    </View>
    <View style={styles.rowCopy}>
      <View style={styles.rowTitleLine}>
        <Text numberOfLines={1} style={styles.rowName}>
          {coinObj.display_name}
        </Text>
        <Text numberOfLines={1} style={styles.rowTicker}>
          {coinObj.display_ticker}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.rowDescription}>
        {description}
      </Text>
    </View>
    <AppButton
      accessibilityLabel={`${active ? 'Remove' : 'Add'} ${
        coinObj.display_name
      } ${active ? 'from' : 'to'} wallet`}
      accessibilityState={{
        busy: loading,
        disabled,
        selected: active,
      }}
      compact
      disabled={disabled}
      height={32}
      loading={loading}
      onPress={onToggle}
      style={styles.rowButton}
      labelStyle={styles.rowButtonLabel}
      variant={active ? 'secondary' : 'primary'}>
      {active ? 'Added' : 'Add'}
    </AppButton>
  </View>
);

const ScrollCue = ({show, styles, theme}) =>
  show ? (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.scrollCue}>
      <SignedInEdgeFade height={46} style={styles.scrollCueFade} visible />
      <View style={styles.scrollCueChevron}>
        <MaterialCommunityIcons
          color={theme.colors.textSubtle}
          name="chevron-down"
          size={15}
        />
      </View>
    </View>
  ) : null;

const IdentifierFooter = ({navigation, styles}) => (
  <SafeBottomActionStack
    bottomSpacing={14}
    horizontalSpacing={20}
    safeAreaSpacing={12}
    style={styles.footer}>
    <AppButton
      accessibilityLabel="Add an asset by identifier"
      compact
      height={52}
      icon="link-variant"
      onPress={() => navigation.navigate('AddAssetByIdentifier')}
      style={styles.footerButton}
      testID="manage-assets-add-by-identifier"
      variant="secondary">
      Add by identifier
    </AppButton>
  </SafeBottomActionStack>
);

const useAssetMutation = () => {
  const dispatch = useDispatch();
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useObjectSelector(
    state => state.coins.activeCoinList || [],
  );
  const activeCoins = useObjectSelector(
    state => state.coins.activeCoinsForUser || [],
  );
  const [pendingAssetId, setPendingAssetId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const activeIds = useMemo(
    () => new Set(activeCoins.map(coinObj => coinObj.id)),
    [activeCoins],
  );

  const toggleAsset = useCallback(
    async coinObj => {
      if (pendingAssetId) return;

      const removing = activeIds.has(coinObj.id);
      setPendingAssetId(coinObj.id);
      setActionError(null);

      try {
        if (removing) {
          await removeExistingCoin(
            coinObj.id,
            activeAccount.id,
            dispatch,
            false,
          );
          clearAllCoinIntervals(coinObj.id);
          dispatch(setUserCoins(activeCoinList, activeAccount.id));
        } else {
          const fullCoinData = CoinDirectory.findCoinObj(coinObj.id);

          dispatch(
            await addKeypairs(
              fullCoinData,
              activeAccount.keys,
              activeAccount.keyDerivationVersion == null
                ? 0
                : activeAccount.keyDerivationVersion,
            ),
          );

          const addCoinAction = await addCoin(
            fullCoinData,
            activeCoinList,
            activeAccount.id,
            fullCoinData.compatible_channels || [],
          );

          if (!addCoinAction) throw new Error('Asset could not be activated');

          dispatch(addCoinAction);
          const setUserCoinsAction = setUserCoins(
            activeCoinList,
            activeAccount.id,
          );
          dispatch(setUserCoinsAction);
          refreshActiveChainLifecycles(
            setUserCoinsAction.payload.activeCoinsForUser,
          );
        }
      } catch (error) {
        const message = `There was a problem ${
          removing ? 'removing' : 'adding'
        } ${coinObj.display_ticker}.`;
        setActionError(message);
        createAlert(`Error ${removing ? 'Removing' : 'Adding'} Asset`, message);
        console.error(error);
      } finally {
        setPendingAssetId(null);
      }
    },
    [activeAccount, activeCoinList, activeIds, dispatch, pendingAssetId],
  );

  return {
    actionError,
    activeIds,
    pendingAssetId,
    toggleAsset,
  };
};

const ManageAssets = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const {compact} = useOnboardingSmallDeviceLayout();
  const data = useAssetManagerData();
  const {actionError, activeIds, pendingAssetId, toggleAsset} =
    useAssetMutation();
  const [scrollMetrics, setScrollMetrics] = useState({
    contentHeight: 0,
    layoutHeight: 0,
    offsetY: 0,
  });
  const mappedCurrencies = useMemo(
    () => data.pbaasCurrencies.filter(coinObj => coinObj.mapped_to).slice(0, 2),
    [data.pbaasCurrencies],
  );
  const isScrollable =
    scrollMetrics.layoutHeight > 0 &&
    scrollMetrics.contentHeight >
      scrollMetrics.layoutHeight + SCROLL_END_THRESHOLD;
  const showScrollCue =
    isScrollable &&
    scrollMetrics.offsetY + scrollMetrics.layoutHeight <
      scrollMetrics.contentHeight - SCROLL_END_THRESHOLD;

  const openDirectory = useCallback(
    collection => navigation.navigate('ManageAssetsDirectory', {collection}),
    [navigation],
  );

  const updateScrollMetrics = useCallback(nextMetrics => {
    setScrollMetrics(current => {
      const next = {...current, ...nextMetrics};
      const unchanged = Object.keys(next).every(
        key => next[key] === current[key],
      );

      return unchanged ? current : next;
    });
  }, []);

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={styles.screen}
      testID="manage-assets-screen">
      <View style={styles.scrollFrame}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.overviewContent,
            compact && styles.overviewContentCompact,
          ]}
          onContentSizeChange={(_, contentHeight) =>
            updateScrollMetrics({contentHeight})
          }
          onLayout={event =>
            updateScrollMetrics({
              layoutHeight: event.nativeEvent.layout.height,
            })
          }
          onScroll={event => {
            const {contentOffset, contentSize, layoutMeasurement} =
              event.nativeEvent;
            updateScrollMetrics({
              contentHeight: contentSize.height,
              layoutHeight: layoutMeasurement.height,
              offsetY: contentOffset.y,
            });
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={isScrollable}
          style={styles.scroll}>
          <TouchableOpacity
            accessibilityLabel="Find an asset"
            accessibilityRole="button"
            activeOpacity={0.72}
            onPress={() => openDirectory(ASSET_COLLECTIONS.ALL)}
            style={styles.searchButton}
            testID="manage-assets-search">
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="magnify"
              size={20}
            />
            <Text style={styles.searchButtonText}>Find an asset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={`Manage ${data.activeAssets.length} wallet assets`}
            accessibilityRole="button"
            activeOpacity={0.72}
            onPress={() => openDirectory(ASSET_COLLECTIONS.WALLET)}
            style={styles.walletCard}
            testID="manage-assets-wallet-card">
            <LogoStack assets={data.activeAssets} styles={styles} />
            <View style={styles.walletCopy}>
              <Text style={styles.walletTitle}>Your wallet</Text>
              <Text style={styles.walletDescription}>
                {data.activeAssets.length} assets visible on Home
              </Text>
            </View>
            <Text style={styles.walletAction}>Manage</Text>
          </TouchableOpacity>

          <Text
            accessibilityRole="header"
            style={[
              styles.sectionTitle,
              compact && styles.sectionTitleCompact,
            ]}>
            Explore by ecosystem
          </Text>

          <TouchableOpacity
            accessibilityLabel="Browse Verus ecosystem currencies"
            accessibilityRole="button"
            activeOpacity={0.76}
            onPress={() => openDirectory(ASSET_COLLECTIONS.PBAAS)}
            style={[
              styles.ecosystemCard,
              compact && styles.ecosystemCardCompact,
            ]}
            testID="manage-assets-verus-card">
            <View style={styles.ecosystemCopy}>
              <Text style={styles.ecosystemTitle}>Verus ecosystem</Text>
              <Text style={styles.ecosystemDescription}>
                Currencies created and mapped through Verus PBaaS.
              </Text>
              <Text style={styles.ecosystemAction}>Browse currencies</Text>
            </View>
            <LogoStack assets={data.pbaasCurrencies} styles={styles} tiles />
          </TouchableOpacity>

          <View style={styles.categoryRow}>
            <TouchableOpacity
              accessibilityLabel="Browse ecosystem blockchains"
              accessibilityRole="button"
              activeOpacity={0.76}
              onPress={() => openDirectory(ASSET_COLLECTIONS.BLOCKCHAINS)}
              style={[
                styles.categoryCard,
                styles.blockchainCard,
                compact && styles.categoryCardCompact,
              ]}
              testID="manage-assets-blockchains-card">
              <LogoStack
                assets={data.ecosystemBlockchains}
                small
                styles={styles}
                tiles
              />
              <Text style={styles.categoryTitle}>Blockchains</Text>
              <Text numberOfLines={1} style={styles.categoryDescription}>
                {data.ecosystemBlockchains
                  .map(coinObj => coinObj.display_ticker)
                  .join(' · ') || 'Verus ecosystem chains'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Browse supported bridged ERC-20 tokens"
              accessibilityRole="button"
              activeOpacity={0.76}
              onPress={() => openDirectory(ASSET_COLLECTIONS.BRIDGE)}
              style={[
                styles.categoryCard,
                styles.bridgeCard,
                compact && styles.categoryCardCompact,
              ]}
              testID="manage-assets-bridge-card">
              <LogoStack
                assets={data.bridgeErc20s}
                small
                styles={styles}
                tiles
              />
              <Text style={styles.categoryTitle}>Bridged ERC-20s</Text>
              <Text numberOfLines={1} style={styles.categoryDescription}>
                Supported by Verus
              </Text>
            </TouchableOpacity>
          </View>

          {mappedCurrencies.length > 0 ? (
            <>
              <View style={styles.popularHeader}>
                <View style={styles.popularCopy}>
                  <Text style={styles.popularTitle}>Popular assets</Text>
                  <Text style={styles.popularDescription}>
                    Commonly enabled bridge assets
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="View all assets"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  onPress={() => openDirectory(ASSET_COLLECTIONS.ALL)}>
                  <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
              </View>
              {actionError ? (
                <View
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                  style={[styles.errorBanner, styles.overviewErrorBanner]}>
                  <MaterialCommunityIcons
                    color={theme.colors.danger}
                    name="alert-circle-outline"
                    size={18}
                  />
                  <Text style={styles.errorText}>{actionError}</Text>
                </View>
              ) : null}
              <View style={styles.assetRows}>
                {mappedCurrencies.map(coinObj => (
                  <AssetRow
                    active={activeIds.has(coinObj.id)}
                    coinObj={coinObj}
                    description={getAssetDescription(coinObj, data)}
                    disabled={
                      pendingAssetId != null && pendingAssetId !== coinObj.id
                    }
                    key={coinObj.id}
                    loading={pendingAssetId === coinObj.id}
                    onToggle={() => toggleAsset(coinObj)}
                    styles={styles}
                  />
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
        <ScrollCue show={showScrollCue} styles={styles} theme={theme} />
      </View>
      <IdentifierFooter navigation={navigation} styles={styles} />
    </SafeAreaView>
  );
};

export const ManageAssetsDirectory = ({navigation, route}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const data = useAssetManagerData();
  const {actionError, activeIds, pendingAssetId, toggleAsset} =
    useAssetMutation();
  const [collection, setCollection] = useState(() =>
    normalizeCollection(route.params?.collection),
  );
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    setCollection(normalizeCollection(route.params?.collection));
  }, [route.params?.collection]);

  useLayoutEffect(() => {
    navigation.setOptions({title: getCollectionTitle(collection)});
  }, [collection, navigation]);

  const assets = useMemo(() => {
    const normalizedQuery = toLowerCaseCLocale(query.trim());

    return getAssetsForCollection(data, collection).filter(coinObj => {
      if (!normalizedQuery) return true;

      return [
        coinObj.display_name,
        coinObj.display_ticker,
        coinObj.id,
        getAssetDescription(coinObj, data),
      ]
        .filter(Boolean)
        .some(value => toLowerCaseCLocale(value).includes(normalizedQuery));
    });
  }, [collection, data, query]);

  const walletCollection = collection === ASSET_COLLECTIONS.WALLET;
  const pending = pendingAssetId != null;

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={styles.screen}
      testID="manage-assets-directory">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={68}
        style={styles.keyboardAvoider}>
        <View style={styles.directoryHeader}>
          <View
            style={[
              styles.searchField,
              searchFocused && styles.searchFieldFocused,
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="magnify"
              size={20}
            />
            <TextInput
              accessibilityLabel="Search assets"
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={() => setSearchFocused(false)}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search name, ticker or asset type"
              placeholderTextColor={theme.colors.textSubtle}
              returnKeyType="search"
              style={styles.searchInput}
              testID="manage-assets-directory-search"
              value={query}
            />
            {query ? (
              <TouchableOpacity
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                activeOpacity={0.7}
                onPress={() => setQuery('')}
                style={styles.clearSearch}>
                <MaterialCommunityIcons
                  color={theme.colors.textSubtle}
                  name="close"
                  size={18}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {walletCollection ? (
            <Text style={styles.walletHelper}>
              Removing an asset hides it from Home without affecting its
              balance.
            </Text>
          ) : (
            <ScrollView
              contentContainerStyle={styles.filtersContent}
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              style={styles.filters}>
              {COLLECTION_FILTERS.map(filter => {
                const selected = collection === filter;

                return (
                  <AppButton
                    accessibilityState={{selected}}
                    compact
                    height={34}
                    key={filter}
                    labelStyle={styles.filterLabel}
                    onPress={() => setCollection(filter)}
                    style={styles.filterButton}
                    variant={selected ? 'secondary' : 'text'}>
                    {getCollectionLabel(filter)}
                  </AppButton>
                );
              })}
            </ScrollView>
          )}
        </View>

        {actionError ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.errorBanner}>
            <MaterialCommunityIcons
              color={theme.colors.danger}
              name="alert-circle-outline"
              size={18}
            />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        <View style={styles.directoryMeta}>
          <Text style={styles.resultCount}>
            {walletCollection ? 'Visible assets' : `${assets.length} results`}
          </Text>
          {!walletCollection ? (
            <Text style={styles.activeCount}>
              {data.activeAssets.length} in wallet
            </Text>
          ) : null}
        </View>

        <FlatList
          contentContainerStyle={[
            styles.directoryList,
            assets.length === 0 && styles.directoryListEmpty,
          ]}
          data={assets}
          extraData={{activeIds, pendingAssetId}}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={coinObj => coinObj.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No matching assets</Text>
              <Text style={styles.emptyDescription}>
                {query
                  ? 'Try another name, ticker or ecosystem.'
                  : 'No assets are available in this collection.'}
              </Text>
            </View>
          }
          renderItem={({item}) => (
            <AssetRow
              active={activeIds.has(item.id)}
              coinObj={item}
              description={getAssetDescription(item, data)}
              disabled={pending && pendingAssetId !== item.id}
              loading={pendingAssetId === item.id}
              onToggle={() => toggleAsset(item)}
              styles={styles}
            />
          )}
          showsVerticalScrollIndicator
          testID="manage-assets-directory-list"
        />

        <IdentifierFooter navigation={navigation} styles={styles} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ManageAssets;
