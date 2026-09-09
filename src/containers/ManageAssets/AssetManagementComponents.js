import React, {useMemo, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, View, TouchableOpacity} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ServiceManagerHeader from '../../components/ServiceManagerHeader';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import AppButton from '../../components/AppButton';
import BottomSheetModal from '../../components/BottomSheetModal';
import {SignedInEdgeFade} from '../../components/SignedInActionBar';
import SkeletonLoader, {SkeletonBlock} from '../../components/SkeletonLoader';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {ethereumNetwork} from '../../utils/assets/assetIdentity';
import {useOnboardingTheme} from '../../theme/onboarding';
import {createSignedOutSheetStyles} from '../../styles/components/signedOutSheet.styles';
import {createManageAssetsStyles} from './manageAssets.styles';

export const systemLabel = systemId => {
  try { return CoinDirectory.findCoinObj(systemId).display_name; }
  catch (_) { return systemId; }
};

export const systemNetworkLabel = (systemId, testnet) => {
  const name = systemLabel(systemId);
  return /testnet|mainnet/i.test(name) ? name : `${name} ${testnet ? 'testnet' : 'mainnet'}`;
};

export const assetNetworkLabel = coin => {
  if (coin.proto === 'erc20' || coin.proto === 'eth') {
    return ethereumNetwork(coin) === 'homestead' ? 'Ethereum' : 'Goerli testnet';
  }
  return coin.system_id ? systemLabel(coin.system_id) : coin.display_name;
};

export const AssetScreen = ({children, footer, header, onBack, testID, title}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen} testID={testID}>
      <ServiceManagerHeader onBack={onBack} title={title} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoider}>
        {header}
        {children}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export const AssetFooter = ({children, styles}) => (
  <SafeBottomActionStack bottomSpacing={14} horizontalSpacing={20} safeAreaSpacing={12} style={styles.footer}>
    {children}
  </SafeBottomActionStack>
);

export const AssetScrollView = ({children, contentContainerStyle, styles, testID}) => {
  const theme = useOnboardingTheme();
  const [metrics, setMetrics] = useState({content: 0, viewport: 0, offset: 0});
  const update = next => setMetrics(current => {
    const merged = {...current, ...next};
    return Object.keys(merged).every(key => merged[key] === current[key]) ? current : merged;
  });
  const overflow = metrics.viewport > 0 && metrics.content > metrics.viewport + 8;
  const showCue = overflow && metrics.offset + metrics.viewport < metrics.content - 8;
  return (
    <View style={styles.scrollFrame}>
      <ScrollView
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(_, content) => update({content})}
        onLayout={event => update({viewport: event.nativeEvent.layout.height})}
        onScroll={event => update({offset: event.nativeEvent.contentOffset.y})}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={overflow}
        style={styles.scroll}
        testID={testID}>
        {children}
      </ScrollView>
      {showCue ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.scrollCue}>
          <SignedInEdgeFade height={46} style={styles.scrollCueFade} visible />
          <View style={styles.scrollCueChevron}>
            <MaterialCommunityIcons name="chevron-down" size={15} color={theme.colors.textSecondary} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

export const AssetLogo = ({coin, styles}) => (
  <View style={styles.rowLogo}>
    {coin ? <AssetCoinLogo coinId={coin.id} showBadge={false} size={38} /> : (
      <View style={styles.unknownLogo}><Text style={styles.unknownLabel}>?</Text></View>
    )}
  </View>
);

export const AssetLoadingRows = ({styles}) => (
  <SkeletonLoader accessibilityLabel="Loading your assets">
    {[0, 1, 2].map(row => (
      <View key={row} style={styles.skeletonRow}>
        <SkeletonBlock width={38} height={38} radius={19} />
        <View style={styles.rowCopy}><SkeletonBlock width="65%" height={16} /><SkeletonBlock width="80%" height={14} /></View>
      </View>
    ))}
  </SkeletonLoader>
);

export const NetworkPicker = ({onClose, onSelect, options, selected, title = 'Network', visible}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  return (
    <BottomSheetModal maxHeight="76%" onClose={onClose} visible={visible}>
      <View style={[sheetStyles.body, sheetStyles.bodyList]}>
        <Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">
          {options.map(option => (
            <TouchableOpacity
              accessibilityRole="radio"
              accessibilityState={{checked: selected === option.id}}
              key={option.id}
              onPress={() => { onSelect(option.id); onClose(); }}
              style={[styles.networkOption, selected === option.id && styles.networkOptionSelected]}>
              <Text style={styles.networkOptionLabel}>{option.label}</Text>
              {selected === option.id ? <MaterialCommunityIcons name="check" size={20} color={theme.colors.success} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <SafeBottomActionStack bottomSpacing={12} horizontalSpacing={20} includeBottomInset={false}>
        <AppButton onPress={onClose} variant="secondary">Done</AppButton>
      </SafeBottomActionStack>
    </BottomSheetModal>
  );
};
