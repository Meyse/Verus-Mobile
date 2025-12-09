import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { List, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useWizardState } from './state/WizardStateContext';
import { getPathCatalog } from './utils/pathCatalog';
import { API_SEND } from '../../utils/constants/intervalConstants';
import Colors from '../../globals/colors';
import { RenderSquareCoinLogo, RenderPlainCoinLogo } from '../../utils/CoinData/Graphics';
import DestinationNetworkSheet from './components/DestinationNetworkSheet';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory'; // Import CoinDirectory

const SendDestination = () => {
  const navigation = useNavigation();
  const { wizardState, updateWizardState } = useWizardState();
  const { sourceCoin, sourceSubWallet } = wizardState;

  const [loading, setLoading] = useState(true);
  const [conversionPaths, setConversionPaths] = useState({});
  const [networkSheetVisible, setNetworkSheetVisible] = useState(false);
  const [selectedCurrencyNetworks, setSelectedCurrencyNetworks] = useState(null); // { currencyDef, networks: [] }
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPaths = async () => {
      if (!sourceCoin || !sourceSubWallet) return;

      try {
        setLoading(true);
        const channel = sourceSubWallet.api_channels && sourceSubWallet.api_channels[API_SEND] 
          ? sourceSubWallet.api_channels[API_SEND] 
          : null;

        if (channel) {
          const catalog = await getPathCatalog(sourceCoin, channel, { src: sourceCoin.currency_id });
          if (!cancelled) {
            setConversionPaths(catalog);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch conversion paths:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPaths();

    return () => {
      cancelled = true;
    };
  }, [sourceCoin, sourceSubWallet]);

  const handleSelectNetwork = useCallback((network, currencyDef) => {
    // network contains { networkId, networkName, paths: [...] }
    // We select the first path as default, but pass ALL paths to the next screen
    const defaultPath = network.paths[0];

    // Normalize destNetwork to a wallet-recognized chain id when possible
    let destNetworkId = network.networkId;
    try {
      // If networkId is an i-address but CoinDirectory has a matching system/coin, use that id
      if (!CoinDirectory.coinExistsInDirectory(destNetworkId)) {
        // keep as-is
      } else {
        const sys = CoinDirectory.getBasicCoinObj(destNetworkId);
        destNetworkId = sys.system_id || sys.id || destNetworkId;
      }
    } catch (e) {
      // fallback: leave destNetworkId as provided
    }
    
    updateWizardState({
      destCurrency: currencyDef || sourceCoin,
      destNetwork: destNetworkId,
      selectedPath: defaultPath, // Default
      availablePaths: network.paths, // Pass all options for this network
      amount: '',
      recipient: null,
      estimates: {},
    });
    navigation.navigate('SendAmount');
  }, [updateWizardState, sourceCoin, navigation]);

  const handleSameCurrencyPress = () => {
    const networkId = sourceCoin.system_id || sourceCoin.id;
    const networkName = sourceCoin.display_ticker;
    
    const sameNetworkPath = {
      networkId,
      networkName,
      pathId: 'same-network',
      destination: sourceCoin,
      price: 1,
      mapping: false,
      gateway: false
    };

    handleSelectNetwork({
      networkId,
      networkName,
      paths: [sameNetworkPath]
    }, sourceCoin);
  };

  const handleConversionPress = (currencyId) => {
    const entry = conversionPaths[currencyId];
    if (!entry) return;

    // entry.networks is an array of available networks for this currency
    if (entry.networks.length === 1) {
      // Only one network (even if multiple routes), auto select
      handleSelectNetwork(entry.networks[0], entry.currencyDef);
    } else {
      // Multiple networks (e.g. Verus vs Ethereum), open sheet
      setSelectedCurrencyNetworks({
        currencyDef: entry.currencyDef,
        displayTicker: entry.displayTicker,
        networks: entry.networks
      });
      setNetworkSheetVisible(true);
    }
  };

  const renderConversionItem = (currencyId, entry) => {
    const { displayName, displayTicker, networks } = entry;
    const hasMultipleNetworks = networks.length > 1;
    // Show network icons
    const networkIcons = networks.slice(0, 3).map(n => n.networkId);

    return (
      <List.Item
        key={currencyId}
          title={displayName}
          description={`${displayTicker}${hasMultipleNetworks ? ` • ${networks.length} networks` : ` • on ${networks[0].networkName}`}`}
          left={() => (
           <View style={styles.leftContainer}>
              {RenderSquareCoinLogo(currencyId, {}, 38, 38)}
             </View>
          )}
          right={(props) => (
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {hasMultipleNetworks && networkIcons.map((nid, i) => (
                  <View key={i} style={{ marginLeft: -10, zIndex: 3-i }}>
                      {RenderSquareCoinLogo(nid, {}, 16, 16)}
                  </View>
                ))}
             </View>
          )}
          onPress={() => handleConversionPress(currencyId)}
        style={styles.listItem}
        titleStyle={styles.title}
        />
    );
  };

  const otherNetworkOptions = useMemo(() => {
    if (!sourceCoin || !conversionPaths) return [];
    
    // We want to combine the source coin options with any mapped coin options (e.g. USDC on Eth)
    // into the "Same Currency" section.
    
    // 1. Get networks for the source coin itself (e.g. vUSDC on other chains)
    let options = [];
    const sourceEntry = conversionPaths[sourceCoin.currency_id];
    
    if (sourceEntry && sourceEntry.networks.length > 0) {
      options = [...sourceEntry.networks.map(net => ({
        ...net,
        currencyDef: sourceEntry.currencyDef,
        displayName: sourceEntry.displayName,
        displayTicker: sourceEntry.displayTicker,
        isSourceEntry: true
      }))];
    }
    
    // 2. Check if source coin is mapped to another coin (e.g. vUSDC -> USDC)
    const mappedId = sourceCoin.mapped_to;
    let _mappedCoinObj = null; // Renamed to avoid confusion, though this is inside useMemo

    if (mappedId && mappedId !== 'VRSC') { // Ignore self-mapping if any
      try {
         // Resolve the ID (e.g. 'USDC') to the full object (which might have ID=contract_address)
         // using the same robust logic as ReceiveAssetDetails.js
         if (CoinDirectory.coinExistsInDirectory(mappedId)) {
           _mappedCoinObj = CoinDirectory.getBasicCoinObj(mappedId);
         }
      } catch (e) {
         console.warn("Failed to resolve mapped coin", mappedId, e);
      }
    }
    
    let mappedEntry = null;
    let mappedEntryKey = null;

    if (_mappedCoinObj) {
      // Priority 1: Check by the resolved object's official ID (e.g. contract address)
      if (conversionPaths[_mappedCoinObj.id]) {
         mappedEntry = conversionPaths[_mappedCoinObj.id];
         mappedEntryKey = _mappedCoinObj.id;
      } 
      // Priority 2: Check by the mapped_to string itself (e.g. 'USDC')
      else if (conversionPaths[mappedId]) {
         mappedEntry = conversionPaths[mappedId];
         mappedEntryKey = mappedId;
      }
      else {
         // Priority 3: Fallback search by values (ticker/name match)
         for (const [key, entry] of Object.entries(conversionPaths)) {
             if (entry.displayTicker === _mappedCoinObj.display_ticker || 
                 entry.currencyDef.currencyid === _mappedCoinObj.id ||
                 entry.currencyDef.fullyqualifiedname === _mappedCoinObj.id) {
                 mappedEntry = entry;
                 mappedEntryKey = key;
                 break;
             }
         }
      }
    } else if (mappedId) {
       // Fallback for when CoinDirectory lookup fails but we have a mappedId string
       if (conversionPaths[mappedId]) {
          mappedEntry = conversionPaths[mappedId];
          mappedEntryKey = mappedId;
       } else {
          for (const [key, entry] of Object.entries(conversionPaths)) {
             if (entry.displayTicker === mappedId) {
                 mappedEntry = entry;
                 mappedEntryKey = key;
                 break;
             }
          }
       }
    }

    if (mappedEntry && mappedEntry.networks.length > 0) {
       options = [...options, ...mappedEntry.networks.map(net => ({
          ...net,
         currencyDef: mappedEntry.currencyDef,
         displayName: mappedEntry.displayName || mappedEntry.displayTicker || 'Cross-chain',
         displayTicker: mappedEntry.displayTicker,
         isSourceEntry: false,
         mappedEntryKey, // Store key to exclude later
         mappedCoinObj: _mappedCoinObj // Pass the full coin object along with the option
       }))];
    }
    
    return options;
  }, [sourceCoin, conversionPaths]);

  const conversionKeys = useMemo(() => {
    // Exclude source coin AND its mapped coin from the conversions list
    const excludedIds = [sourceCoin?.currency_id];
    if (sourceCoin?.mapped_to) excludedIds.push(sourceCoin.mapped_to);
    
    // Also exclude the key found for the mapped entry (since it might differ from mapped_to)
    // We can re-derive it or inspect the result of otherNetworkOptions, but otherNetworkOptions 
    // is structured differently.
    // Let's iterate and check.
    
    let keys = Object.keys(conversionPaths).filter(id => {
      if (excludedIds.includes(id)) return false;
      
      const entry = conversionPaths[id];
      // If this entry was already included in otherNetworkOptions (via the heuristic match), exclude it
      if (sourceCoin?.mapped_to && (
          entry.displayTicker === sourceCoin.mapped_to || 
          entry.currencyDef.currencyid === sourceCoin.mapped_to)) {
          return false;
      }
      return true;
    });
    
    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.trim().toLowerCase();
      keys = keys.filter(key => {
        const entry = conversionPaths[key];
        const name = entry.displayName || '';
        const ticker = entry.displayTicker || '';
        return (
          name.toLowerCase().includes(lowerQuery) ||
          ticker.toLowerCase().includes(lowerQuery)
        );
      });
    }
    
    return keys;
  }, [conversionPaths, sourceCoin, searchTerm]);

  const crossChainOptions = useMemo(() => {
    return otherNetworkOptions.filter(x => !x.isSourceEntry);
  }, [otherNetworkOptions]);

  const handleCrossChainPress = useCallback(() => {
    if (crossChainOptions.length === 0) return;

    if (crossChainOptions.length === 1) {
       handleSelectNetwork(crossChainOptions[0], crossChainOptions[0].currencyDef);
    } else {
       // Open sheet if multiple options
       setSelectedCurrencyNetworks({
         currencyDef: crossChainOptions[0].currencyDef,
         displayTicker: crossChainOptions[0].displayTicker,
         networks: crossChainOptions
       });
       setNetworkSheetVisible(true);
    }
  }, [crossChainOptions, handleSelectNetwork]);

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={styles.mainTitle}>Receive as</Text>
        <RNTextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search destination currency"
          placeholderTextColor="#999"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            height: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: searchFocused ? Colors.primaryColor : '#E0E0E0',
            paddingHorizontal: 14,
            fontSize: 15,
            color: '#1A1A1A',
            backgroundColor: '#F5F5F5',
          }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Same Currency (Standard & Cross-Chain) */}
        {(!searchTerm || sourceCoin?.display_ticker.toLowerCase().includes(searchTerm.toLowerCase())) && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>STANDARD TRANSACTION</Text>
            
            <View style={{ marginBottom: 8 }}>
              {/* Option 1: On-Chain (Same Network) */}
              <List.Item
                title={sourceCoin?.display_name || sourceCoin?.display_ticker}
                description={sourceCoin?.display_ticker}
                left={() => (
                   <View style={styles.leftContainer}>
                      {RenderSquareCoinLogo(sourceCoin?.id, {}, 38, 38)}
                   </View>
                )}
                onPress={handleSameCurrencyPress}
                style={styles.listItem}
                titleStyle={styles.title}
              />
              
              {/* Option 2: Cross-Chain Mapped Options (Single Button) */}
              {crossChainOptions.length > 0 && (() => {
                 const firstOption = crossChainOptions[0];
                 const isMulti = crossChainOptions.length > 1;
                 
                 // If single option, show specific name (e.g. "Send to Ethereum")
                 // If multiple, show generic "Send to another network"
                 let label = "Send to another network";
                 let iconId = null;

                 if (!isMulti) {
                   const net = firstOption;
                   const networkName = (net.networkName === 'vETH' || net.networkId === 'ETH' || net.networkId === '.eth') ? 'Ethereum' : net.networkName;
                   label = `Send to ${networkName}`;
                   
                   // Use plain logo (no badges) for the network
                   // If networkId implies ETH, explicitly use ETH ticker for clean logo
                   if (networkName === 'Ethereum') {
                     iconId = 'ETH'; 
                   } else {
                     iconId = net.networkId;
                   }
                 } else {
                   // For multiple, use the first one's icon
                   iconId = firstOption.networkId;
                 }
                 
                 // Prepare the target network object. If we identified it as Ethereum, ensure networkId is 'ETH'
                 // so the next screen displays "Ethereum". Also use the mappedCoinObj if available for better metadata.
                 const handlePress = () => {
                   if (isMulti) {
                     handleCrossChainPress();
                   } else {
                     const net = firstOption;
                     const isEth = net.networkName === 'vETH' || net.networkId === 'ETH' || net.networkId === '.eth';
                     
                     const targetNetwork = isEth ? { ...net, networkId: 'ETH', networkName: 'Ethereum' } : net;
                     // Use the mappedCoinObj attached to the option object if available, otherwise currencyDef
                     const targetCurrency = net.mappedCoinObj || net.currencyDef;
                     
                     handleSelectNetwork(targetNetwork, targetCurrency);
                   }
                 };
                 
                 return (
                   <TouchableOpacity 
                     style={styles.crossChainButton}
                     onPress={handlePress}
                     activeOpacity={0.7}
                   >
                     <View style={styles.crossChainContent}>
                       <View style={styles.crossChainIcon}>
                          {iconId ? RenderPlainCoinLogo(iconId, {}, 24, 24) : <MaterialCommunityIcons name="earth" size={24} color={Colors.primaryColor} />}
                       </View>
                       <Text style={styles.crossChainText}>{label}</Text>
                     </View>
                     <MaterialCommunityIcons name={isMulti ? "dots-horizontal" : "arrow-right"} size={16} color="#666" />
                   </TouchableOpacity>
                 );
              })()}
            </View>

            {/* Option 3: Source Coin on other networks (rare, but keep if needed) */}
            {otherNetworkOptions.filter(x => x.isSourceEntry).map((net, index) => (
                 <List.Item
                  key={`${net.networkId}-${index}`}
                  title={net.displayName}
                  description={`Send to ${net.networkName}`}
                  left={() => (
                     <View style={styles.leftContainer}>
                        {RenderSquareCoinLogo(net.currencyDef.currencyid, {}, 38, 38)}
                     </View>
                  )}
                  onPress={() => handleSelectNetwork(net, net.currencyDef)}
                  style={styles.listItem}
                  titleStyle={styles.title}
                />
            ))}
          </View>
        )}

        {/* Section 2: Conversions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>CONVERT TO ANOTHER CURRENCY</Text>
          
          {loading ? (
             <ActivityIndicator size="small" color={Colors.primaryColor} style={{ marginTop: 20 }} />
          ) : conversionKeys.length === 0 ? (
             <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>
               {searchTerm ? 'No matching currencies found.' : 'No conversion paths available.'}
             </Text>
          ) : (
            conversionKeys.map(key => renderConversionItem(key, conversionPaths[key]))
          )}
        </View>
      </ScrollView>

      {/* Network Selection Sheet for Conversions (Used only if multiple NETWORKS exist) */}
      <DestinationNetworkSheet
        visible={networkSheetVisible}
        options={selectedCurrencyNetworks?.networks || []}
        currencyName={selectedCurrencyNetworks?.displayTicker}
        onClose={() => {
          setNetworkSheetVisible(false);
          setSelectedCurrencyNetworks(null);
        }}
        onSelect={(network) => {
          setNetworkSheetVisible(false);
          handleSelectNetwork(network, selectedCurrencyNetworks?.currencyDef);
          setSelectedCurrencyNetworks(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 16,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
  },
  listItem: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  leftContainer: {
    paddingRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  crossChainButton: {
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  crossChainContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crossChainIcon: {
    marginRight: 10,
  },
  crossChainText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'black',
  }
});

export default SendDestination;
