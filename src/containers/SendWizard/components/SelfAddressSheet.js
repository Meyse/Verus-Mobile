import React from 'react';
import { View, ScrollView } from 'react-native';
import { Portal, List, Button, Text } from 'react-native-paper';
import Colors from '../../../globals/colors';
import SemiModal from '../../../components/SemiModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SelfAddressSheet = ({
  visible,
  addresses = [], // [{ label, address, coinTicker, networkId }]
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
        flexHeight={0.6}
        contentContainerStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
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
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Send to Myself</Text>
            <View style={{ width: 64 }} />
          </View>

          <ScrollView style={{ paddingHorizontal: 12 }}>
            {addresses.length === 0 ? (
               <View style={{ padding: 20, alignItems: 'center' }}>
                 <Text style={{ color: '#888' }}>No addresses found for this network.</Text>
               </View>
            ) : (
                addresses.map((item, index) => (
                  <View
                    key={`${item.address}-${index}`}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#F0F0F0'
                    }}
                  >
                    <List.Item
                      title={item.label || "My Wallet"}
                      description={item.address}
                      onPress={() => onSelect(item.address)}
                      left={(props) => <List.Icon {...props} icon="account-circle-outline" color={Colors.primaryColor} />}
                      right={(props) => <List.Icon {...props} icon="chevron-right" color="#ccc" />}
                      style={{ paddingVertical: 8 }}
                      titleStyle={{ fontSize: 16, fontWeight: '600', color: 'black' }}
                      descriptionStyle={{ fontSize: 12, color: '#666' }}
                    />
                  </View>
                ))
            )}
             <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </SemiModal>
    </Portal>
  );
};

export default SelfAddressSheet;



