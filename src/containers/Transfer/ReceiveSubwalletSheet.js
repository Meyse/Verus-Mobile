import React, {useMemo} from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Text} from 'react-native-paper';
import BottomSheetModal from '../../components/BottomSheetModal';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {createReceiveSheetStyles} from './receive.styles';

const getNetworkDetails = wallet => {
  const networkId = wallet.network || wallet.channel?.split('.')?.[2] || 'unknown';

  try {
    const coin = CoinDirectory.findCoinObj(networkId, null, true);
    return {
      id: networkId,
      name: coin.display_name || coin.display_ticker || networkId,
      icon: coin.id,
    };
  } catch (e) {
    return {id: networkId, name: networkId === 'unknown' ? 'Other' : networkId, icon: 'VRSC'};
  }
};

const ReceiveSubwalletSheet = ({
  balanceMap = {},
  coinObj,
  onClose,
  onSelect,
  subWallets = [],
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createReceiveSheetStyles(theme), [theme]);
  const groups = useMemo(() => {
    const result = new Map();

    subWallets.forEach(wallet => {
      const network = getNetworkDetails(wallet);
      if (!result.has(network.id)) result.set(network.id, {...network, wallets: []});
      result.get(network.id).wallets.push(wallet);
    });

    return Array.from(result.values());
  }, [subWallets]);

  if (!coinObj) return null;

  return (
    <BottomSheetModal
      floating={false}
      maxHeight="70%"
      onClose={onClose}
      visible={visible}
      contentContainerStyle={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.sheetTitle}>Choose address</Text>
        <TouchableOpacity
          accessibilityLabel="Close Card selection"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.close}>
          <MaterialCommunityIcons
            color={theme.colors.textPrimary}
            name="close"
            size={18}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.description}>
        Your {coinObj.display_ticker} is available through multiple Cards. Choose
        the network and address context to receive with.
      </Text>
      <ScrollView style={{maxHeight: 400}}>
        <View style={styles.list}>
          {groups.map(group => (
            <View key={group.id} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={styles.groupLogo}>
                  {RenderSquareCoinLogo(group.icon, {}, 24, 24)}
                </View>
                <Text numberOfLines={1} style={styles.groupTitle}>
                  {group.name}
                </Text>
              </View>
              {group.wallets.map(wallet => (
                <TouchableOpacity
                  accessibilityLabel={`Receive with ${wallet.name || 'Card'}`}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  key={wallet.id}
                  onPress={() => onSelect(wallet)}
                  style={styles.card}>
                  <Text numberOfLines={1} style={styles.cardName}>
                    {wallet.name || wallet.id}
                  </Text>
                  <View style={styles.balance}>
                    <Text style={styles.balanceValue}>
                      {Number(balanceMap[wallet.id] || 0).toFixed(4)}
                    </Text>
                    <Text style={styles.balanceTicker}>{coinObj.display_ticker}</Text>
                  </View>
                  <MaterialCommunityIcons
                    color={theme.colors.textSubtle}
                    name="chevron-right"
                    size={20}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
};

export default ReceiveSubwalletSheet;
