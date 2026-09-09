import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Switch, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../components/AppButton';
import AppSearchField from '../../components/AppSearchField';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  assetKey, assetNetworkKey, ethereumNetwork, getManagedAssetBalance,
  isAssetShown, isTestnetAccount,
} from '../../utils/assets/assetIdentity';
import {
  addManagedAsset, assetContextIsCurrent, captureAssetContext,
  getNewAssetHoldings, loadAssetManagement, setAssetHomeVisibility,
} from '../../utils/assets/assetManagementService';
import {buildAssetManagerData} from './assetManagerData';
import {
  AssetFooter, AssetLoadingRows, AssetLogo, AssetScreen, AssetScrollView,
  NetworkPicker, assetNetworkLabel, systemLabel,
} from './AssetManagementComponents';
import {createManageAssetsStyles} from './manageAssets.styles';

const FILTERS = [{id: 'all', label: 'All'}, {id: 'home', label: 'On Home'}, {id: 'hidden', label: 'Hidden'}];
const networkId = coin => coin.proto === 'eth' || coin.proto === 'erc20'
  ? `ethereum:${ethereumNetwork(coin)}` : coin.system_id || `${coin.proto}:${coin.id}`;
const matchesQuery = (query, values) => !query.trim() || values.filter(Boolean)
  .some(value => String(value).toLowerCase().includes(query.trim().toLowerCase()));

const useAssetData = () => {
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoins = useObjectSelector(state => state.coins.activeCoinsForUser || []);
  const management = useObjectSelector(state => state.assetManagement);
  const cards = useObjectSelector(state => state.coinMenus.allSubWallets);
  const balances = useObjectSelector(state => state.ledger.balances);
  const showBalance = useObjectSelector(state => state.coins.showBalance);
  const discoveries = useObjectSelector(getNewAssetHoldings);
  const data = useMemo(() => buildAssetManagerData({activeAccount, activeCoins,
    testAccount: isTestnetAccount(activeAccount)}), [activeAccount, activeCoins]);
  useEffect(() => {
    loadAssetManagement().catch(() => {});
  }, []);
  return {...data, cards, balances, management, discoveries, showBalance};
};

const useAssetAction = () => {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const pendingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const perform = useCallback(async (coin, shown) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const context = captureAssetContext();
    setPending(assetKey(coin));
    setError(null);
    try {
      if (shown == null) await addManagedAsset({coin, context});
      else await setAssetHomeVisibility(coin, shown, context);
    } catch (_) {
      if (mounted.current && assetContextIsCurrent(context)) {
        setError(shown == null ? 'Couldn’t add this asset. Try again.' : 'Couldn’t save the Home setting. Try again.');
      }
    } finally {
      pendingRef.current = false;
      if (mounted.current && assetContextIsCurrent(context)) setPending(null);
    }
  }, []);
  return {pending, error, perform};
};

const SectionHeader = ({title, detail, styles}) => (
  <View style={styles.sectionHeader}>
    <Text accessibilityRole="header" style={styles.sectionLabel}>{title}</Text>
    <Text style={styles.sectionDetail}>{detail}</Text>
  </View>
);

const ErrorMessage = ({error, styles}) => error ? (
  <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
    <Text style={styles.errorText}>{error}</Text>
  </View>
) : null;

const AssetRow = ({coin, description, action, styles}) => (
  <View style={styles.assetRow} testID={`manage-asset-row-${coin.id}`}>
    <AssetLogo coin={coin} styles={styles} />
    <View style={styles.rowCopy}>
      <Text numberOfLines={1} style={styles.rowName}>{coin.display_name}</Text>
      <Text numberOfLines={2} style={styles.rowDescription}>{description}</Text>
    </View>
    {action}
  </View>
);

const NetworkFilter = ({label, onPress, styles, theme}) => (
  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Filter by network: ${label}`} onPress={onPress} style={styles.networkFilter}>
    <Text numberOfLines={1} style={styles.networkFilterLabel}>{label}</Text>
    <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.textSecondary} />
  </TouchableOpacity>
);

const useNetworkFilter = coins => {
  const [network, setNetwork] = useState('all');
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    const choices = new Map(coins.map(coin => [networkId(coin), {id: networkId(coin), label: assetNetworkLabel(coin)}]));
    return [{id: 'all', label: 'All networks'}, ...choices.values()];
  }, [coins]);
  return {network, setNetwork, open, setOpen, options, label: options.find(item => item.id === network)?.label || 'All networks'};
};

const Manager = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const data = useAssetData();
  const {pending, error, perform} = useAssetAction();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const networks = useNetworkFilter(data.activeAssets);
  const assets = data.activeAssets.filter(coin => {
    const shown = isAssetShown(coin, data.management.preferences);
    return (filter === 'all' || (filter === 'home' ? shown : !shown)) &&
      (networks.network === 'all' || networkId(coin) === networks.network) &&
      matchesQuery(query, [coin.display_name, coin.display_ticker, coin.currency_id, assetNetworkLabel(coin)]);
  });
  const discoveries = filter === 'all' ? data.discoveries.filter(holding =>
    (networks.network === 'all' || networks.network === holding.systemId) &&
    matchesQuery(query, [holding.result.currencyDefinition.fullyqualifiedname, holding.currencyId, systemLabel(holding.systemId)])) : [];

  return (
    <AssetScreen title="Manage assets" onBack={() => navigation.goBack()} testID="manage-assets-screen"
      header={<View style={styles.headerContent}>
        <AppSearchField accessibilityLabel="Search your assets" placeholder="Search your assets" value={query} onChangeText={setQuery} testID="manage-assets-search" />
        <View style={styles.filters}>
          <View style={styles.tabs}>{FILTERS.map(item => (
            <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected: filter === item.id}} key={item.id} onPress={() => setFilter(item.id)} style={[styles.tab, filter === item.id && styles.tabSelected]}>
              <Text style={filter === item.id ? styles.tabLabelSelected : styles.tabLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}</View>
          <NetworkFilter label={networks.label} onPress={() => networks.setOpen(true)} styles={styles} theme={theme} />
        </View>
      </View>}
      footer={<AssetFooter styles={styles}><AppButton onPress={() => navigation.navigate('ManageAssetsDirectory')} testID="manage-assets-add-asset">Add asset</AppButton></AssetFooter>}>
      <ErrorMessage styles={styles} error={error || (data.management.loadError ? 'Couldn’t load your saved assets. Your Home settings are unchanged.' : null)} />
      <AssetScrollView styles={styles} testID="manage-assets-list">
        {!data.management.ready ? <AssetLoadingRows styles={styles} /> : <>
          <SectionHeader title="Your assets" detail="Show on Home" styles={styles} />
          {assets.map(coin => {
            const {total: balance, complete} = getManagedAssetBalance(coin, data.cards[coin.id], data.balances, data.management.snapshots);
            const amount = !data.showBalance ? 'Balance hidden' : balance == null ? 'Balance unavailable' : `${complete ? '' : '≥ '}${balance.toFormat()} ${coin.display_ticker}`;
            return <AssetRow key={assetKey(coin)} coin={coin} description={`${amount} · ${assetNetworkLabel(coin)}`} styles={styles}
              action={<TouchableOpacity style={styles.switchAction}
                accessibilityRole="switch"
                accessibilityLabel={`Show ${coin.display_name} on Home`}
                accessibilityState={{checked: isAssetShown(coin, data.management.preferences), busy: pending === assetKey(coin), disabled: pending != null}}
                disabled={pending != null}
                onPress={() => perform(coin, !isAssetShown(coin, data.management.preferences))}
                testID={`asset-home-switch-${coin.id}`}>
                <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Switch
                accessible={false}
                trackColor={{false: theme.colors.borderStrong, true: theme.colors.primary}}
                ios_backgroundColor={theme.colors.borderStrong}
                value={isAssetShown(coin, data.management.preferences)}
                /></View>
              </TouchableOpacity>} />;
          })}
          {assets.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{query ? 'No matching assets' : filter === 'hidden' ? 'No hidden assets' : filter === 'home' ? 'No assets on Home' : 'No managed assets'}</Text></View> : null}
          {discoveries.length > 0 ? <>
            <SectionHeader title="New assets found" detail={String(discoveries.length)} styles={styles} />
            {discoveries.map(holding => {
              const name = holding.result.currencyDefinition.fullyqualifiedname;
              return <View key={holding.key} style={styles.assetRow}>
                <AssetLogo styles={styles} />
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowName}>{name}</Text>
                  <Text numberOfLines={2} style={styles.rowDescription}>{data.showBalance ? holding.balance.toFormat() : 'Balance hidden'} · {systemLabel(holding.systemId)}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Review ${name}`} style={styles.rowAction}
                  onPress={() => navigation.navigate('AddAssetByIdentifier', {holdingKey: holding.key, assetScope: captureAssetContext()})}>
                  <Text style={styles.actionLabel}>Review</Text>
                </TouchableOpacity>
              </View>;
            })}
          </> : null}
        </>}
      </AssetScrollView>
      <NetworkPicker visible={networks.open} onClose={() => networks.setOpen(false)} options={networks.options} selected={networks.network} onSelect={networks.setNetwork} title="Networks" />
    </AssetScreen>
  );
};

const Directory = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const data = useAssetData();
  const {pending, error, perform} = useAssetAction();
  const [query, setQuery] = useState('');
  const networks = useNetworkFilter(data.catalogue);
  const active = new Set(data.activeAssets.map(assetKey));
  const assets = data.catalogue.filter(coin =>
    (networks.network === 'all' || networkId(coin) === networks.network) &&
    matchesQuery(query, [coin.display_name, coin.display_ticker, coin.currency_id, assetNetworkLabel(coin)]));
  return (
    <AssetScreen title="Add asset" onBack={() => navigation.goBack()} testID="manage-assets-directory"
      header={<View style={styles.headerContent}><AppSearchField accessibilityLabel="Search catalogue or paste identifier" placeholder="Search catalogue or paste identifier" value={query} onChangeText={setQuery} testID="manage-assets-directory-search" /></View>}>
      <ErrorMessage error={error} styles={styles} />
      <AssetScrollView styles={styles} testID="manage-assets-directory-list">
        <TouchableOpacity accessibilityRole="button" style={styles.customEntry} testID="manage-assets-add-custom"
          onPress={() => navigation.navigate('AddAssetByIdentifier', {identifier: query.trim(), assetScope: captureAssetContext()})}>
          <View style={styles.customEntryCopy}>
            <Text style={styles.rowName}>Add custom asset</Text>
            <Text style={styles.rowDescription}>Verus currency or ERC-20 token</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>{query.trim() ? 'Search results' : 'Common assets'}</Text>
          <NetworkFilter label={networks.label} onPress={() => networks.setOpen(true)} styles={styles} theme={theme} />
        </View>
        {assets.map(coin => {
          const added = active.has(assetKey(coin));
          return <AssetRow key={assetKey(coin)} coin={coin} styles={styles} description={`${coin.display_ticker} · ${assetNetworkLabel(coin)}`}
            action={<TouchableOpacity accessibilityRole="button" accessibilityLabel={`${added ? 'Added' : 'Add'} ${coin.display_name}`}
              accessibilityState={{disabled: added || pending != null || !data.management.ready, busy: pending === assetKey(coin)}}
              disabled={added || pending != null || !data.management.ready} onPress={() => perform(coin)} style={styles.rowAction}>
              <Text style={added ? styles.addedLabel : styles.actionLabel}>{added ? 'Added' : pending === assetKey(coin) ? 'Adding…' : 'Add'}</Text>
            </TouchableOpacity>} />;
        })}
        {assets.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No matching assets</Text><Text style={styles.rowDescription}>Try another name or add a custom asset.</Text></View> : null}
        <Text style={styles.helper}>Adding an asset shows it on Home.</Text>
      </AssetScrollView>
      <NetworkPicker visible={networks.open} onClose={() => networks.setOpen(false)} options={networks.options} selected={networks.network} onSelect={networks.setNetwork} title="Networks" />
    </AssetScreen>
  );
};

const useWalletViewKey = () => useObjectSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch}:${assetNetworkKey(state.authentication.activeAccount)}`);
const ManageAssets = props => <Manager key={useWalletViewKey()} {...props} />;
export const ManageAssetsDirectory = props => <Directory key={useWalletViewKey()} {...props} />;
export default ManageAssets;
