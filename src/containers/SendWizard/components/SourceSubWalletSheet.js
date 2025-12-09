import React from 'react';
import { View, ScrollView } from 'react-native';
import { Portal, List, Button, Text } from 'react-native-paper';
import Colors from '../../../globals/colors';
import SemiModal from '../../../components/SemiModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenderSquareCoinLogo } from '../../../utils/CoinData/Graphics';
import { normalizeNum } from '../../../utils/normalizeNum';

const SourceSubWalletSheet = ({
  visible,
  groupedSources = [],
  coinObj,
  onClose,
  onSelect,
}) => {
  if (!visible || !coinObj) return null;

  const insets = useSafeAreaInsets();
  const paddingBottom = 20 + insets.bottom;
  const displayTicker = coinObj?.display_ticker || '';
  const decimals = coinObj?.decimals || 8;

  const formatBalance = (amount) => {
    const normalized = normalizeNum(amount, Math.min(decimals, 8));
    if (Array.isArray(normalized) && normalized.length > 3) return normalized[3];
    return normalized.toString();
  };

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        flexHeight={0.6} // Allow more space for grouped list
        contentContainerStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          flex: 0,
          width: '100%',
          alignSelf: 'flex-end',
          paddingBottom,
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingBottom: 12,
            }}
          >
            <Button onPress={onClose} textColor={Colors.primaryColor}>
              Close
            </Button>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Select Source</Text>
            <View style={{ width: 64 }} />
          </View>

          <ScrollView style={{ paddingHorizontal: 12 }}>
            {groupedSources.map((group) => (
              <View key={group.networkId} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
                  {/* Network Icon would go here if available, for now just text */}
                   <View style={{ width: 24, height: 24, marginRight: 8, justifyContent: 'center', alignItems: 'center' }}>
                      {RenderSquareCoinLogo(group.networkId, {}, 20, 20)}
                   </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#666' }}>
                    {group.networkName}
                  </Text>
                </View>

                {group.rows.map((wallet) => (
                   <View
                    key={wallet.subWalletId}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#F0F0F0'
                    }}
                  >
                    <List.Item
                      title={() => (
                        <View>
                           <Text style={{ fontSize: 16, fontWeight: '500', color: 'black' }}>
                            {wallet.label}
                          </Text>
                        </View>
                      )}
                      description={() => (
                         <View style={{ marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: '#888' }} numberOfLines={1} ellipsizeMode="middle">
                              {wallet.address}
                            </Text>
                             <Text style={{ fontSize: 13, color: '#333', marginTop: 4, fontWeight: '500' }}>
                              {formatBalance(wallet.balance)} {displayTicker}
                            </Text>
                         </View>
                      )}
                      onPress={() => onSelect(wallet)}
                      left={(props) => <List.Icon {...props} icon="wallet-outline" color={'#444'} />}
                      right={(props) => <List.Icon {...props} icon="chevron-right" color="#ccc" />}
                      style={{ paddingVertical: 8 }}
                    />
                  </View>
                ))}
              </View>
            ))}
             <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </SemiModal>
    </Portal>
  );
};

export default SourceSubWalletSheet;




