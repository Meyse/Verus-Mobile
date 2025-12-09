// Wizard amount step: estimates routes, selects best path, shows networks clearly
import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useWizardState } from './state/WizardStateContext';
import NumericKeypad from '../../components/Keypad/NumericKeypad';
import { routeEstimator } from './utils/routeEstimator';
import Colors from '../../globals/colors';
import RouteSelectionSheet from './components/RouteSelectionSheet';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { extractLedgerData } from '../../utils/ledger/extractLedgerData';
import { API_GET_BALANCES, API_SEND } from '../../utils/constants/intervalConstants';
import BigNumber from 'bignumber.js';
import GradientButton from '../../components/GradientButton';
import { RenderPlainCoinLogo } from '../../utils/CoinData/Graphics';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';

const SendOverviewWidget = ({ sourceCoin, destCurrency, destNetwork }) => {
  const sourceName = sourceCoin?.display_ticker;
  const sourceNetwork = sourceCoin?.display_name?.includes('on Verus') ? 'Verus' : sourceCoin?.display_name;
  
  // Determine destination info
  // If destNetwork is 'ETH' or 'vETH', show 'Ethereum'
  // If destNetwork is the Verus system ID or VRSC, show 'Verus'
  // Fallback to destNetwork, but check if it matches source system ID
  
  let destNetName = destNetwork;
  const isEth = destNetwork === 'ETH' || destNetwork === '.eth' || destNetwork === 'vETH';
  
  if (isEth) {
    destNetName = 'Ethereum';
  } else if (
    destNetwork === 'VRSC' || 
    destNetwork === 'VRSCTEST' ||
    (sourceCoin && destNetwork === sourceCoin.system_id) ||
    (sourceCoin && destNetwork === sourceCoin.id)
  ) {
    destNetName = 'Verus';
  } else {
    // Try CoinDirectory lookup for nicer names when networkId is a currencyid/i-address
    try {
      if (CoinDirectory.coinExistsInDirectory(destNetwork)) {
        const sys = CoinDirectory.getBasicCoinObj(destNetwork);
        destNetName = sys.display_name || destNetName;
      } else if (destCurrency?.currency_id === destNetwork) {
        destNetName = destCurrency.display_ticker || destCurrency.name || destNetName;
      }
    } catch (e) {}
  }
  
  // For destination ticker, if it's a cross-chain send of same asset (e.g. vUSDC -> USDC),
  // we might want to show the unwrapped ticker if available, or just the dest currency ticker
  let destTicker = destCurrency?.display_ticker || destCurrency?.name || destCurrency?.fullyqualifiedname;
  
  return (
    <View style={styles.overviewWidget}>
      <View style={styles.overviewRow}>
        <View style={styles.overviewItem}>
           <View style={styles.overviewIconContainer}>
             {RenderPlainCoinLogo(sourceCoin?.id, {}, 20, 20)}
           </View>
           <View>
             <Text style={styles.overviewTicker}>{sourceName}</Text>
             <Text style={styles.overviewNetwork}>on Verus</Text> 
           </View>
        </View>
        
        <MaterialCommunityIcons name="arrow-right" size={20} color="#CCC" style={{ marginHorizontal: 12 }} />
        
        <View style={styles.overviewItem}>
           <View style={styles.overviewIconContainer}>
             {/* If cross-chain, show network icon. If same chain, show coin icon? 
                 User said "from what chain/currency to what chain/currency".
                 Let's show the destination coin icon.
             */}
             {destCurrency && (destCurrency.currency_id || destCurrency.id) 
                ? RenderPlainCoinLogo(destCurrency.currency_id || destCurrency.id, {}, 20, 20)
                : <MaterialCommunityIcons name="help-circle" size={20} color="#CCC" />
             }
           </View>
           <View>
             <Text style={styles.overviewTicker}>{destTicker || '---'}</Text>
             <Text style={styles.overviewNetwork}>on {destNetName || '---'}</Text> 
           </View>
        </View>
      </View>
    </View>
  );
};

const SendAmount = () => {
  const navigation = useNavigation();
  const { height, width } = Dimensions.get('window');
  const isSmall = height <= 667 || width <= 375;

  const { wizardState, updateWizardState } = useWizardState();
  const { sourceCoin, sourceSubWallet, destCurrency, destNetwork, selectedPath, availablePaths, amount: savedAmount } = wizardState;

  const [amount, setAmount] = useState(savedAmount || '');
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState(null);
  const [pathEstimates, setPathEstimates] = useState({}); // Map of pathId -> estimate
  const [routeSheetVisible, setRouteSheetVisible] = useState(false);
  const userManuallySelectedPath = useRef(false); // Track if user manually chose a path
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerBackTitle: 'Back',
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: 'white',
        elevation: 0,
        shadowOpacity: 0,
      },
    });
  }, [navigation]);

  // Fetch balances for Max calculation
  const balances = useObjectSelector((state) => extractLedgerData(state, 'balances', API_GET_BALANCES));
  
  const availableBalance = useMemo(() => {
    if (!sourceCoin || !sourceSubWallet || !balances) return 0;
    const coinBalances = balances[sourceCoin.id];
    if (!coinBalances) return 0;
    
    const walletBalance = coinBalances[sourceSubWallet.id];
    if (!walletBalance || walletBalance.total == null) return 0;
    
    return Number(walletBalance.total);
  }, [sourceCoin, sourceSubWallet, balances]);

  const handleMax = useCallback(() => {
    if (availableBalance > 0) {
      const max = BigNumber(availableBalance).toFixed(8, BigNumber.ROUND_DOWN);
      setAmount(max);
    }
  }, [availableBalance]);

  // Get display ticker (handle both formats)
  const getDisplayTicker = (currencyObj) => {
    if (!currencyObj) return '';
    return currencyObj.display_ticker || currencyObj.name || currencyObj.fullyqualifiedname || '';
  };

  // Validation state
  const getValidationState = useCallback(() => {
    const amountNum = Number(amount || 0);
    if (amountNum > availableBalance) return 'exceeds';
    return 'valid';
  }, [amount, availableBalance]);

  const validationState = getValidationState();

  // Estimate ALL available paths
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        setPathEstimates({});
        setEstimateError(null);
        return;
      }

      const destId = destCurrency.currency_id || destCurrency.currencyid || destCurrency.id;
      
      const isDirect = sourceCoin.currency_id === destId && 
                       (destNetwork === sourceCoin.system_id || 
                        destNetwork === sourceCoin.id || 
                        selectedPath?.pathId === 'same-network');
      
      if (isDirect) {
        setPathEstimates({
          [selectedPath.pathId]: {
            estimatedReceive: amount,
            isDirect: true
          }
        });
        setEstimateError(null);
        return;
      }

      if (!availablePaths || availablePaths.length === 0) return;

      try {
        setEstimating(true);
        setEstimateError(null);

        if (!destId) {
           throw new Error("Destination currency ID not defined");
        }

        // Estimate ALL paths in parallel
        const channelId = sourceSubWallet?.api_channels?.[API_SEND];

        const estimatePromises = availablePaths.map(async (path) => {
          try {
            const params = {
              systemId: sourceCoin.system_id,
              currencyId: sourceCoin.currency_id,
              converttoId: destId,
              amount: parseFloat(amount),
              viaId: path.via ? path.via.currencyid : null,
              preconvert: path.preconvert,
              pathId: path.pathId,
              channelHint: channelId ? channelId.split('.')[0] : undefined,
            };

            const res = await routeEstimator(params);
            return { pathId: path.pathId, estimate: res };
          } catch (e) {
            console.warn(`Estimation failed for path ${path.pathId}:`, e);
            return { pathId: path.pathId, estimate: null, error: e.message };
          }
        });

        const results = await Promise.all(estimatePromises);
        
        // Build estimates map
        const estimates = {};
        results.forEach(({ pathId, estimate }) => {
          if (estimate) estimates[pathId] = estimate;
        });

        setPathEstimates(estimates);

        // Find the best path (highest estimatedReceive)
        let bestPath = null;
        let bestAmount = 0;

        availablePaths.forEach(path => {
          const est = estimates[path.pathId];
          if (est && est.estimatedReceive) {
            const receiveAmount = Number(est.estimatedReceive);
            if (receiveAmount > bestAmount) {
              bestAmount = receiveAmount;
              bestPath = path;
            }
          }
        });

        // Only auto-select best path if user hasn't manually chosen one
        if (bestPath && !userManuallySelectedPath.current) {
          console.log(`Auto-selecting best path: ${bestPath.pathId} with ${bestAmount}`);
          updateWizardState({ 
            selectedPath: bestPath,
            amount,
            estimates
          });
        } else {
          // User manually selected, just update estimates
          updateWizardState({ 
            amount,
            estimates
          });
        }

      } catch (e) {
        console.warn("Estimation failed", e);
        const msg = e.message || "Failed to estimate conversion";
        // If estimation is simply unavailable (e.g., non-VRPC/bridge paths), allow user to proceed.
        const isUnavailable = msg.toLowerCase().includes("unavailable");
        setEstimateError(isUnavailable ? null : msg);
        setPathEstimates({});
      } finally {
        setEstimating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, sourceCoin, destCurrency, destNetwork, availablePaths, updateWizardState]);

  const handleNext = () => {
     updateWizardState({ amount });
     navigation.navigate('SendRecipient');
  };

  const currentEstimate = pathEstimates[selectedPath?.pathId];
  const isValid = amount && parseFloat(amount) > 0 && validationState === 'valid' && !estimateError && (!estimating || currentEstimate);

  const pathOptions = useMemo(() => {
    if (!availablePaths || availablePaths.length === 0) return selectedPath ? [selectedPath] : [];
    
    // Sort paths by estimated receive (best first)
    const pathsWithEstimates = availablePaths.map(p => ({
      ...p,
      isBest: p.pathId === selectedPath?.pathId,
      estimation: pathEstimates[p.pathId] || null
    }));

    // Sort by estimated amount descending
    pathsWithEstimates.sort((a, b) => {
      const aAmount = a.estimation?.estimatedReceive ? Number(a.estimation.estimatedReceive) : 0;
      const bAmount = b.estimation?.estimatedReceive ? Number(b.estimation.estimatedReceive) : 0;
      return bAmount - aAmount;
    });

    return pathsWithEstimates;
  }, [availablePaths, selectedPath, pathEstimates]);

  const formatAmountDisplay = (val) => {
    if (!val) return '0';
    return val;
  };

  const formatEstimate = (val) => {
    if (!val) return '---';
    return BigNumber(val).toFormat(6, BigNumber.ROUND_HALF_UP);
  };

  const handleRouteChange = () => {
    console.log("Route change button pressed, paths:", pathOptions.length);
    setRouteSheetVisible(true);
  };

  const destTicker = getDisplayTicker(destCurrency);

  // Color coding
  const amountColor = validationState === 'exceeds' ? '#FF4444' : '#1A1A1A';
  const balanceColor = validationState === 'exceeds' ? '#FF4444' : '#888';
  const maxButtonStyle = validationState === 'exceeds' ? styles.maxButtonProminent : styles.maxButton;
  const maxButtonTextStyle = validationState === 'exceeds' ? styles.maxButtonTextProminent : styles.maxButtonText;

  let errorMessage = null;
  if (validationState === 'exceeds') {
    errorMessage = 'Amount exceeds available balance';
  }

  const ctaDisabled = !isValid || estimating;

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Text style={styles.mainTitle}>Amount to send</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.currencyLabel}>{sourceCoin?.display_ticker}</Text>
          <View style={styles.amountRow}>
             <Text 
               style={[styles.amountText, { fontSize: amount.length > 8 ? 40 : 56, color: amountColor }]} 
               numberOfLines={1} 
               adjustsFontSizeToFit
             >
               {formatAmountDisplay(amount)}
             </Text>
          </View>
          
          <View style={styles.balanceContainer}>
             <Text style={[styles.balanceText, { color: balanceColor }]}>
               Available: {BigNumber(availableBalance).toFormat(6, BigNumber.ROUND_DOWN)}
             </Text>
             <TouchableOpacity onPress={handleMax} style={maxButtonStyle}>
                <Text style={maxButtonTextStyle}>MAX</Text>
             </TouchableOpacity>
          </View>
        </View>

        {/* Estimate Card */}
        <View style={styles.infoCard}>
           {
             estimating ? (
               <View style={styles.estimatingContainer}>
                 <ActivityIndicator size="small" color={Colors.primaryColor} style={{ marginRight: 8 }} />
                 <Text style={styles.estimatingText}>Finding best route...</Text>
               </View>
             ) : estimateError ? (
               <Text style={styles.estimateErrorText}>{estimateError}</Text>
             ) : (
               <View>
                 {/* Only show estimate if we have one */}
                 {selectedPath && pathEstimates[selectedPath.pathId] ? (
                   <View style={styles.estimateRow}>
                      <Text style={styles.estimateLabel}>Estimated receive:</Text>
                      <Text style={styles.estimateValue}>
                        {formatAmountDisplay(pathEstimates[selectedPath.pathId].estimatedReceive)} {destTicker}
                      </Text>
                      
                      {!userManuallySelectedPath.current && availablePaths.length > 1 && (
                         <TouchableOpacity onPress={() => setRouteSheetVisible(true)} style={styles.routeBadge}>
                           <Text style={styles.routeBadgeText}>Best path</Text>
                           <MaterialCommunityIcons name="chevron-down" size={14} color="white" />
                         </TouchableOpacity>
                      )}
                   </View>
                 ) : null}
                 
                 {/* Show path selection if available but no estimate yet or direct */}
                 {!pathEstimates[selectedPath?.pathId] && availablePaths.length > 1 && (
                     <TouchableOpacity onPress={() => setRouteSheetVisible(true)} style={{ alignSelf: 'center', padding: 8 }}>
                       <Text style={{ color: Colors.primaryColor, fontWeight: '600' }}>View options</Text>
                     </TouchableOpacity>
                 )}
               </View>
             )
           }
        </View>
        
        <View style={{ flex: 1 }} />
      </View>
      
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <SendOverviewWidget 
          sourceCoin={sourceCoin} 
          destCurrency={destCurrency} 
          destNetwork={destNetwork} 
        />
        
        {/* Modern CTA Button */}
        <View style={[styles.ctaContainer, isSmall ? { paddingBottom: 3 } : { paddingBottom: 6 }]}>
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : (
            <GradientButton
              onPress={handleNext}
              disabled={ctaDisabled}
              style={{ width: '100%' }}
              leftIcon={
                <View style={{ width: 24, alignItems: 'center' }}>
                  {estimating ? (
                    <ActivityIndicator color={'white'} size={16} />
                  ) : null}
                </View>
              }
            rightIcon={<View style={{ width: 24 }} />}
          >
            Next
          </GradientButton>
        )}
      </View>
      </View>

      {/* Full-width keypad at bottom - outside main container */}
      <View style={[styles.fullWidthKeypadContainer, isSmall ? { paddingTop: 0, paddingBottom: Platform.OS === 'ios' ? 4 : 2 } : { paddingTop: 0, paddingBottom: Platform.OS === 'ios' ? 6 : 4 }]}>
        <NumericKeypad
          value={amount}
          onChange={setAmount}
          decimalPlaces={8}
          keyWidth={undefined}
          keyHeight={isSmall ? 36 : 50}
          fontSize={isSmall ? 22 : 28}
          keyRadius={0}
          keyBackground={'transparent'}
          containerPaddingHorizontal={0}
          rowSpacing={isSmall ? 2 : 4}
        />
      </View>

      {routeSheetVisible && (
        <RouteSelectionSheet
          visible={routeSheetVisible}
          paths={pathOptions}
          destCurrency={destCurrency}
          destTicker={destTicker}
          sourceCoin={sourceCoin}
          amount={amount}
          onClose={() => {
            console.log("Closing route sheet");
            setRouteSheetVisible(false);
          }}
          onSelect={(path) => {
            console.log("User manually selected path:", path.pathId);
            userManuallySelectedPath.current = true; // Mark as user selection
            updateWizardState({ selectedPath: path });
            setRouteSheetVisible(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  overviewWidget: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  overviewIconContainer: {
    marginRight: 8,
  },
  overviewTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: 'black',
  },
  overviewNetwork: {
    fontSize: 12,
    color: '#666',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  balanceText: {
    fontSize: 14,
    marginRight: 8,
  },
  maxButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  maxButtonProminent: {
    backgroundColor: '#FF4444',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  maxButtonTextProminent: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  infoCard: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  routeLink: {
    fontSize: 16,
    color: Colors.primaryColor,
    fontWeight: '600',
    textAlign: 'center',
  },
  routeStatic: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 4
  },
  placeholderText: {
    fontSize: 18,
    color: '#ccc',
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  errorBanner: {
    backgroundColor: '#FFE8E6',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  errorBannerText: {
    color: '#B71C1C',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidthKeypadContainer: {
    backgroundColor: 'white',
    paddingTop: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
});

export default SendAmount;
