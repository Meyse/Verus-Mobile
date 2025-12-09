/*
  SendSource Screen
  - Step 1 of Unified Transfer Wizard
  - Selects source asset and subwallet
  - Based on ReceiveAssetsList
*/

import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { View, FlatList, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { List, Text } from 'react-native-paper';
import { formatCurrency } from 'react-native-format-currency';
import { useSelector } from 'react-redux';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { extractDisplaySubWallets } from '../../utils/subwallet/extractSubWallets';
import { extractLedgerData } from '../../utils/ledger/extractLedgerData';
import { API_GET_BALANCES, GENERAL, WYRE_SERVICE } from '../../utils/constants/intervalConstants';
import { USD } from '../../utils/constants/currencies';
import { RenderSquareCoinLogo } from '../../utils/CoinData/Graphics';
import Colors from '../../globals/colors';
import BigNumber from 'bignumber.js';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import SourceSubWalletSheet from './components/SourceSubWalletSheet';
import { useWizardState } from './state/WizardStateContext';
import { getGroupedSources } from './utils/addressBook';

const SendSource = () => {
  const navigation = useNavigation();
  const { updateWizardState } = useWizardState();

  const activeCoinsForUser = useObjectSelector((state) => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector((state) => extractDisplaySubWallets(state));
  const balances = useObjectSelector((state) => extractLedgerData(state, 'balances', API_GET_BALANCES));
  const rates = useObjectSelector((state) => state.ledger.rates);
  const activeAccount = useObjectSelector((state) => state.authentication.activeAccount);

  const displayCurrency = useSelector(
    (state) => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const showBalance = useSelector((state) => state.coins.showBalance);
  
  const [subwalletSheetVisible, setSubwalletSheetVisible] = useState(false);
  const [pendingCoin, setPendingCoin] = useState(null);
  const [groupedSources, setGroupedSources] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () => null,
      headerBackTitle: 'Back',
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: 'white',
        elevation: 0,
        shadowOpacity: 0,
      },
    });
  }, [navigation]);

  const getRate = useCallback(
    (coinId) => {
      return rates[WYRE_SERVICE] &&
        rates[WYRE_SERVICE][coinId] &&
        rates[WYRE_SERVICE][coinId][displayCurrency]
        ? rates[WYRE_SERVICE][coinId][displayCurrency]
        : rates[GENERAL] &&
            rates[GENERAL][coinId] &&
            rates[GENERAL][coinId][displayCurrency]
        ? rates[GENERAL][coinId][displayCurrency]
        : null;
    },
    [rates, displayCurrency],
  );

  const assets = useMemo(() => {
    return activeCoinsForUser
      .filter((coinObj) => (allSubWallets[coinObj.id] || []).length > 0)
      .map((coinObj) => {
        const subWallets = allSubWallets[coinObj.id] || [];
        let crypto = BigNumber(0);
        subWallets.forEach((wallet) => {
          const total =
            balances[coinObj.id] &&
            balances[coinObj.id][wallet.id] &&
            balances[coinObj.id][wallet.id].total != null
              ? BigNumber(balances[coinObj.id][wallet.id].total)
              : BigNumber(0);
          crypto = crypto.plus(total);
        });

        const rate = getRate(coinObj.id) || 0;
        const fiat = Number(crypto.multipliedBy(rate));

        return {
          coinObj,
          crypto: crypto.toNumber(),
          fiat,
        };
      })
      .filter(item => item.crypto > 0) // Only show assets with balance
      .sort((a, b) => b.fiat - a.fiat);
  }, [activeCoinsForUser, allSubWallets, balances, getRate]);

  const filteredAssets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return assets;

    return assets.filter(({ coinObj }) => {
      const name = (coinObj.display_name || '').toLowerCase();
      const ticker = (coinObj.display_ticker || '').toLowerCase();
      const id = (coinObj.id || '').toLowerCase();

      return (
        name.includes(query) ||
        ticker.includes(query) ||
        id.includes(query)
      );
    });
  }, [assets, searchTerm]);

  const onSelectSource = useCallback(
    (coinObj, subWallet) => {
      // Find full wallet object from allSubWallets using the ID if needed, 
      // but subWallet passed here might be the simplified row object or the full wallet object.
      // Let's ensure we get the full wallet object for state.
      
      const fullWallet = (allSubWallets[coinObj.id] || []).find(w => w.id === subWallet.subWalletId || w.id === subWallet.id);

      if (fullWallet) {
        updateWizardState({
          sourceCoin: coinObj,
          sourceSubWallet: fullWallet,
        });
        navigation.navigate('SendDestination');
      }
    },
    [updateWizardState, navigation, allSubWallets]
  );

  const handleAssetPress = useCallback(
    (coinObj) => {
      // Group sources for this coin
      const sources = getGroupedSources(coinObj.id, allSubWallets, balances, activeAccount, CoinDirectory);
      
      // Calculate total rows across all groups
      let totalAddresses = 0;
      sources.forEach(group => {
        totalAddresses += group.rows.length;
      });

      if (totalAddresses === 0) return;

      if (totalAddresses === 1) {
        // Auto-select the only source
        const group = sources[0];
        const walletRow = group.rows[0];
        onSelectSource(coinObj, walletRow);
      } else {
        setPendingCoin(coinObj);
        setGroupedSources(sources);
        setSubwalletSheetVisible(true);
      }
    },
    [allSubWallets, balances, activeAccount, onSelectSource],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const { coinObj, fiat, crypto } = item;
      const fiatRounded = BigNumber(fiat).decimalPlaces(2, BigNumber.ROUND_HALF_UP);
      const [fiatFormatted] = formatCurrency({ amount: fiatRounded.toFixed(2), code: displayCurrency });
      const cryptoAmount = BigNumber(crypto || 0);
      const cryptoFormatted = cryptoAmount.isFinite()
        ? cryptoAmount.decimalPlaces(4, BigNumber.ROUND_DOWN).toFixed(4)
        : '0.0000';

      return (
        <List.Item
          onPress={() => handleAssetPress(coinObj)}
          rippleColor="transparent"
          title={() => (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{coinObj.display_name}</Text>
              <Text style={styles.fiatValue}>
                {showBalance ? fiatFormatted : '*****'}
              </Text>
            </View>
          )}
          description={() => (
            <Text style={styles.cryptoValue}>
              {showBalance ? `${cryptoFormatted} ${coinObj.display_ticker}` : `*** ${coinObj.display_ticker}`}
            </Text>
          )}
          left={() => (
            <View style={styles.leftContainer}>{RenderSquareCoinLogo(coinObj.id, {}, 38, 38)}</View>
          )}
          style={styles.listItem}
          contentStyle={styles.listItemContent}
        />
      );
    },
    [displayCurrency, handleAssetPress, showBalance],
  );

  return (
    <View style={styles.listContainer}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={styles.mainTitle}>Send asset</Text>
        <RNTextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search assets"
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
      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.coinObj.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
              {searchTerm.trim().length > 0
                ? 'No assets match your search.'
                : 'No assets available yet.'}
            </Text>
          </View>
        )}
      />
      {subwalletSheetVisible && pendingCoin && (
        <SourceSubWalletSheet
          visible={subwalletSheetVisible}
          coinObj={pendingCoin}
          groupedSources={groupedSources}
          onClose={() => {
            setSubwalletSheetVisible(false);
            setPendingCoin(null);
          }}
          onSelect={(wallet) => {
            setSubwalletSheetVisible(false);
            const coinRef = pendingCoin;
            setPendingCoin(null);
            onSelectSource(coinRef, wallet);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  listContent: {
    paddingBottom: 16,
  },
  listItem: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listItemContent: {
    paddingVertical: 0,
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
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fiatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 12,
  },
  cryptoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginTop: 6,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 16,
    marginTop: 8,
  },
});

export default SendSource;
