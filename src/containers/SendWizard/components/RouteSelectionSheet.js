import React from 'react';
import { View, ScrollView } from 'react-native';
import { Portal, List, Button, Text } from 'react-native-paper';
import Colors from '../../../globals/colors';
import SemiModal from '../../../components/SemiModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenderSquareCoinLogo } from '../../../utils/CoinData/Graphics';
import BigNumber from 'bignumber.js';

const RouteSelectionSheet = ({
  visible,
  paths = [], 
  destTicker,
  onClose,
  onSelect,
}) => {
  if (!visible) return null;

  const insets = useSafeAreaInsets();
  const paddingBottom = 20 + insets.bottom;

  const formatAmount = (amount) => {
    if (!amount) return '0';
    return BigNumber(amount).toFormat(6, BigNumber.ROUND_HALF_UP);
  };

  console.log("RouteSelectionSheet rendered, paths:", paths.length, "destTicker:", destTicker);

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
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Select Route</Text>
            <View style={{ width: 64 }} />
          </View>

          <View style={{ paddingHorizontal: 12 }}>
            {paths.map((path, index) => {
              const isBest = index === 0; // First one is best (already sorted)
              const estimate = path.estimation?.estimatedReceive;
              
              return (
                <View
                  key={path.pathId}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    marginBottom: 8,
                    borderWidth: isBest ? 2 : 1,
                    borderColor: isBest ? Colors.verusGreenColor : '#F0F0F0'
                  }}
                >
                  <List.Item
                    title={`via ${path.viaName || path.networkName || 'Direct'}`}
                    description={() => (
                      <View>
                        {estimate ? (
                          <Text style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>
                            ≈ {formatAmount(estimate)} {destTicker}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 12, color: '#888' }}>
                            Estimating...
                          </Text>
                        )}
                         {path.gateway && (
                           <Text style={{ fontSize: 10, color: Colors.warningColor, marginTop: 2 }}>
                             Gateway
                           </Text>
                         )}
                      </View>
                    )}
                    onPress={() => onSelect(path)}
                    left={() => (
                       <View style={{ justifyContent: 'center', marginRight: 12, marginLeft: 8 }}>
                          {RenderSquareCoinLogo(path.networkId, {}, 32, 32)}
                       </View>
                    )}
                    right={(props) => (
                      <View style={{ justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }}>
                         {isBest && <Text style={{ fontSize: 10, color: Colors.verusGreenColor, fontWeight: 'bold', marginRight: 8 }}>BEST</Text>}
                         <List.Icon {...props} icon={path.isBest ? "check-circle" : "circle-outline"} color={path.isBest ? Colors.verusGreenColor : "#ccc"} />
                      </View>
                    )}
                    style={{ paddingVertical: 8 }}
                    titleStyle={{ fontSize: 16, fontWeight: '600', color: 'black' }}
                  />
                </View>
              );
            })}
             <View style={{ height: 20 }} />
          </View>
        </View>
      </SemiModal>
    </Portal>
  );
};

export default RouteSelectionSheet;
