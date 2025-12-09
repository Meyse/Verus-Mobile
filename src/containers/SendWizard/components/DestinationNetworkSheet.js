import React from 'react';
import { View, ScrollView } from 'react-native';
import { Portal, List, Button, Text } from 'react-native-paper';
import Colors from '../../../globals/colors';
import SemiModal from '../../../components/SemiModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenderSquareCoinLogo } from '../../../utils/CoinData/Graphics';

const DestinationNetworkSheet = ({
  visible,
  options = [], // [{ networkName, networkId, pathId, ... }]
  currencyName,
  onClose,
  onSelect,
}) => {
  if (!visible) return null;

  const insets = useSafeAreaInsets();
  const paddingBottom = 20 + insets.bottom;

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        flexHeight={0.01}
        contentContainerStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          flex: 0,
          width: '100%',
          alignSelf: 'flex-end',
          paddingBottom,
        }}
      >
        <View>
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
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Choose Network</Text>
            <View style={{ width: 64 }} />
          </View>
          
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
               Sending {currencyName} to...
            </Text>
          </View>

          <View style={{ paddingHorizontal: 12 }}>
            {options.map((option) => (
              <View
                key={option.pathId || option.networkId}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#F0F0F0'
                }}
              >
                <List.Item
                  title={option.networkName}
                  description={option.description || `Send via ${option.networkName}`}
                  onPress={() => onSelect(option)}
                  left={() => (
                     <View style={{ justifyContent: 'center', marginRight: 12, marginLeft: 8 }}>
                       {RenderSquareCoinLogo(option.networkId, {}, 32, 32)}
                     </View>
                  )}
                  right={(props) => <List.Icon {...props} icon="chevron-right" color="#ccc" />}
                  style={{ paddingVertical: 8 }}
                  titleStyle={{ fontSize: 16, fontWeight: '600', color: 'black' }}
                />
              </View>
            ))}
             <View style={{ height: 20 }} />
          </View>
        </View>
      </SemiModal>
    </Portal>
  );
};

export default DestinationNetworkSheet;
