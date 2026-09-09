import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Keyboard, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../components/AppButton';
import AppTextInput from '../../components/AppTextInput';
import CopyAction from '../../components/CopyAction';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {ASSET_IDENTIFIER_ERROR, resolveAssetIdentifier} from '../../utils/CoinData/assetIdentifierService';
import {API_GET_BALANCES} from '../../utils/constants/intervalConstants';
import {assetNetworkKey, getManagedAssetBalance} from '../../utils/assets/assetIdentity';
import {getAssetLookupNetworks, getAssetPresentation, resolvedAssetCoin} from '../../utils/assets/assetPresentation';
import {
  addManagedAsset, assetContextIsCurrent, captureAssetContext, getNewAssetHoldings,
} from '../../utils/assets/assetManagementService';
import {
  AssetFooter, AssetLogo, AssetScreen, AssetScrollView, NetworkPicker, systemLabel,
} from './AssetManagementComponents';
import {createManageAssetsStyles} from './manageAssets.styles';

const lookupErrorMessage = error => {
  switch (error?.code) {
    case ASSET_IDENTIFIER_ERROR.DUPLICATE: return 'This asset is already managed. You can change its Home setting in Manage assets.';
    case ASSET_IDENTIFIER_ERROR.UNKNOWN_VERUS: return 'No currency was found. Check the name or i-address and network.';
    case ASSET_IDENTIFIER_ERROR.ETHEREUM_FORMAT:
    case ASSET_IDENTIFIER_ERROR.TYPE: return error.message;
    case ASSET_IDENTIFIER_ERROR.METADATA: return 'Asset details are unavailable. Check the identifier and try again.';
    default: return 'The network did not respond. Your entry is unchanged. Try again in a moment.';
  }
};

const ReviewRow = ({label, value, copy = false, styles}) => (
  <View style={styles.reviewRow}>
    <Text style={styles.rowDescription}>{label}</Text>
    <View style={styles.reviewValueLine}>
      <Text selectable style={[styles.reviewValue, copy && styles.identifier]}>{String(value)}</Text>
      {copy ? <CopyAction accessibilityLabel={`Copy ${label.toLowerCase()}`} value={value} /> : null}
    </View>
  </View>
);

const CustomAsset = ({navigation, route}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const account = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoins = useObjectSelector(state => state.coins.activeCoinsForUser || []);
  const discoveries = useObjectSelector(getNewAssetHoldings);
  const snapshots = useObjectSelector(state => state.assetManagement.snapshots);
  const showBalance = useObjectSelector(state => state.coins.showBalance);
  const initialParams = useRef(route?.params?.assetScope && assetContextIsCurrent(route.params.assetScope) ? route.params : {}).current;
  const found = useRef(discoveries.find(holding => holding.key === initialParams.holdingKey)).current;
  const [input, setInput] = useState(initialParams.identifier || '');
  const [kind, setKind] = useState(initialParams.identifier?.startsWith('0x') ? 'erc20' : 'pbaas');
  const [network, setNetwork] = useState(null);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [result, setResult] = useState(found?.result || null);
  const [review, setReview] = useState(Boolean(found));
  const [resolving, setResolving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const mounted = useRef(true);
  const addingRef = useRef(false);
  const allowLeave = useRef(false);
  const networks = useMemo(() => getAssetLookupNetworks(account, activeCoins, kind), [account, activeCoins, kind]);
  const selectedNetwork = networks.find(option => option.id === network) || networks[0];
  const context = useRef(captureAssetContext()).current;
  const canUpdate = () => mounted.current && assetContextIsCurrent(context);

  useEffect(() => () => { mounted.current = false; requestId.current += 1; }, []);
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (allowLeave.current) return;
    if (addingRef.current) { event.preventDefault(); return; }
    if (review && !found) { event.preventDefault(); setReview(false); setError(null); }
  }), [found, navigation, review]);
  useEffect(() => { navigation.setOptions({gestureEnabled: !adding}); }, [adding, navigation]);

  const editInput = value => {
    requestId.current += 1;
    setResolving(false);
    setError(null);
    setResult(null);
    setInput(value);
  };
  const changeKind = value => {
    requestId.current += 1;
    setKind(value);
    setNetwork(null);
    setResult(null);
    setError(null);
    setResolving(false);
  };
  const changeNetwork = value => {
    requestId.current += 1;
    setNetwork(value);
    setResult(null);
    setError(null);
    setResolving(false);
  };
  const lookUp = async () => {
    if (!input.trim() || !selectedNetwork || resolving) return;
    const id = ++requestId.current;
    Keyboard.dismiss();
    setResolving(true);
    setError(null);
    try {
      const resolved = await resolveAssetIdentifier({
        activeCoins,
        identifier: input.trim(),
        kind,
        pbaasCoin: kind === 'pbaas' ? selectedNetwork.coin : null,
        ethereumCoin: kind === 'erc20' ? selectedNetwork.coin : null,
      });
      if (canUpdate() && id === requestId.current) { setResult(resolved); setReview(true); }
    } catch (lookupError) {
      if (canUpdate() && id === requestId.current) setError({code: lookupError.code, message: lookupErrorMessage(lookupError)});
    } finally {
      if (canUpdate() && id === requestId.current) setResolving(false);
    }
  };
  const addAsset = async () => {
    if (!result || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    setError(null);
    try {
      await addManagedAsset({result, context});
      if (canUpdate()) {
        allowLeave.current = true;
        addingRef.current = false;
        navigation.navigate('ManageAssets');
      }
    } catch (_) {
      if (canUpdate()) setError({message: 'Couldn’t add this asset. Your entry is unchanged. Try again.'});
    } finally {
      addingRef.current = false;
      if (canUpdate()) setAdding(false);
    }
  };
  const goBack = () => {
    if (addingRef.current) return;
    if (review && !found) { setReview(false); setError(null); }
    else navigation.goBack();
  };
  const pbaas = result?.kind === 'pbaas';
  const presentation = result && getAssetPresentation(resolvedAssetCoin(result), {
    systemId: found?.systemId || (pbaas ? result.lookupSystemId : undefined),
  });
  const fullName = result && (pbaas ? result.currencyDefinition.fullyqualifiedname : result.name);
  const foundBalance = found && getManagedAssetBalance(
    {currency_id: found.currencyId, testnet: found.testnet},
    found.channels.map(channel => ({api_channels: {[API_GET_BALANCES]: channel}})), {}, snapshots).total;
  const duplicate = error?.code === ASSET_IDENTIFIER_ERROR.DUPLICATE;
  return (
    <AssetScreen title={review ? 'Review asset' : 'Add custom asset'} onBack={goBack} testID="add-asset-by-identifier-screen"
      header={!review ? <View style={styles.headerContent}><View style={styles.segment}>
        {[{id: 'pbaas', label: 'Verus currency'}, {id: 'erc20', label: 'ERC-20 token'}].map(type => (
          <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected: kind === type.id}} key={type.id} onPress={() => changeKind(type.id)} style={[styles.segmentOption, kind === type.id && styles.segmentSelected]}>
            <Text style={kind === type.id ? styles.tabLabelSelected : styles.tabLabel}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View></View> : null}
      footer={<AssetFooter styles={styles}><AppButton
        accessibilityState={{busy: adding || resolving}}
        disabled={review ? adding : (!input.trim() || !selectedNetwork || resolving)}
        loading={adding || resolving}
        onPress={duplicate ? () => navigation.navigate('ManageAssets') : review ? addAsset : lookUp}
        testID={review ? 'asset-identifier-add' : 'asset-identifier-lookup'}>
        {duplicate ? 'Manage assets' : review ? (adding ? 'Adding asset' : 'Add asset') : resolving ? 'Looking up asset' : error ? 'Try again' : 'Look up asset'}
      </AppButton></AssetFooter>}>
      <AssetScrollView styles={styles} contentContainerStyle={!review && styles.formContent} testID="asset-identifier-content">
        {!review ? <>
          <View style={styles.fieldGroup}>
            {networks.length > 1 ? <>
              <Text style={styles.fieldLabel}>Lookup network</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Lookup network: ${selectedNetwork?.label || 'Unavailable'}`} onPress={() => { Keyboard.dismiss(); setNetworkOpen(true); }} style={styles.networkInput} testID="asset-identifier-network">
                <Text style={styles.fieldValue}>{selectedNetwork?.label || 'Network unavailable'}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </> : <View style={styles.networkSummary} testID="asset-identifier-network-summary">
              <Text style={styles.fieldLabel}>Network</Text>
              <Text style={styles.networkSummaryValue}>{selectedNetwork?.label || 'Network unavailable'}</Text>
            </View>}
          </View>
          <AppTextInput
            label={kind === 'pbaas' ? 'Currency name or i-address' : 'Contract address'}
            inputShellStyle={styles.inputShell}
            inputStyle={styles.input}
            onChangeText={editInput}
            onSubmitEditing={lookUp}
            placeholder={kind === 'pbaas' ? 'Currency name or i-address' : '0x…'}
            returnKeyType="search"
            spellCheck={false}
            maxLength={256}
            testID="asset-identifier-input"
            value={input}
          />
          {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.lookupError} testID="asset-identifier-error">
            <Text style={styles.rowName}>{duplicate ? 'Already managed' : `Couldn’t look up this ${kind === 'pbaas' ? 'currency' : 'token'}`}</Text>
            <Text style={styles.formHelper}>{error.message}</Text>
          </View> : null}
        </> : result ? <>
          <View style={styles.reviewHeader}>
            <AssetLogo presentation={presentation} styles={styles} />
            <View style={styles.rowCopy}><Text style={styles.reviewName}>{presentation.name}</Text><Text style={styles.rowDescription}>{presentation.ticker} · {pbaas ? 'Verus currency' : 'ERC-20 token'}</Text></View>
          </View>
          {found ? <View style={styles.reviewBalance}>
            <Text style={styles.rowDescription}>Found in your wallet</Text>
            <Text style={styles.reviewAmount}>{!showBalance ? 'Balance hidden' : foundBalance == null ? 'Balance unavailable' : `${foundBalance.toFormat()} ${presentation.ticker}`}</Text>
          </View> : null}
          <ReviewRow label="Network" value={presentation.networkLabel} styles={styles} />
          {fullName && fullName !== presentation.name ? <ReviewRow label={pbaas ? 'Currency name' : 'Token name'} value={fullName} styles={styles} /> : null}
          <ReviewRow label={pbaas ? 'Currency ID' : 'Contract address'} value={pbaas ? result.currencyDefinition.currencyid : result.canonicalAddress} copy styles={styles} />
          <ReviewRow label={pbaas ? 'Launch system' : 'Decimals'} value={pbaas ? (result.launchSystem?.fullyqualifiedname || systemLabel(result.currencyDefinition.launchsystemid || result.currencyDefinition.systemid)) : result.decimals} styles={styles} />
          <Text style={styles.reviewCopy}>{pbaas ? 'Check that the currency ID matches the asset you want to add.' : 'Check the contract address against the asset issuer’s source.'}</Text>
          <Text style={styles.reviewHomeCopy}>This asset will appear on Home.</Text>
          {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.lookupError}><Text style={styles.formHelper}>{error.message}</Text></View> : null}
        </> : null}
      </AssetScrollView>
      <NetworkPicker visible={networkOpen} onClose={() => setNetworkOpen(false)} options={networks} selected={selectedNetwork?.id} onSelect={changeNetwork} />
    </AssetScreen>
  );
};

const AddAssetByIdentifier = props => {
  const key = useObjectSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch}:${assetNetworkKey(state.authentication.activeAccount)}`);
  return <CustomAsset key={key} {...props} />;
};
export default AddAssetByIdentifier;
