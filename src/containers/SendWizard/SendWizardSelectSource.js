import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {fontStyle} from '../../globals/fonts';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import {WALLET_APP_SEND} from '../../utils/constants/apps';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {USD} from '../../utils/constants/currencies';
import {truncateDecimal} from '../../utils/math';
import {useSendWizard} from './SendWizardContext';
import {WizardScreen} from './components/WizardUI';
import {SourceCardSheet} from './components/SelectionSheets';

const SendWizardSelectSource = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const {state, setSource} = useSendWizard();
  const [query, setQuery] = useState('');
  const [pendingAsset, setPendingAsset] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const coins = useObjectSelector(stateValue => stateValue.coins.activeCoinsForUser);
  const cardsByCoin = useObjectSelector(stateValue => extractDisplaySubWallets(stateValue));
  const balances = useObjectSelector(stateValue =>
    extractLedgerData(stateValue, 'balances', API_GET_BALANCES),
  );
  const rates = useObjectSelector(stateValue => stateValue.ledger.rates);
  const showBalance = useObjectSelector(stateValue => stateValue.coins.showBalance);
  const displayCurrency = useObjectSelector(
    stateValue => stateValue.settings.generalWalletSettings.displayCurrency || USD,
  );

  const sourcesByAsset = useMemo(() => {
    return coins
      .map(coin => {
        const cards = (cardsByCoin[coin.id] || [])
          .filter(
            card =>
              card.compatible_apps?.includes(WALLET_APP_SEND) &&
              Boolean(card.api_channels?.[API_SEND]),
          )
          .map(card => {
            const balance = BigNumber(balances?.[coin.id]?.[card.id]?.total || 0);
            return {
              coin,
              card,
              balance: balance.toString(),
              channel: card.api_channels[API_SEND],
            };
          })
          .filter(source => BigNumber(source.balance).isGreaterThan(0))
          .sort((first, second) =>
            BigNumber(second.balance).comparedTo(first.balance),
          );

        if (cards.length === 0) return null;
        return {
          coin,
          cards,
          total: cards.reduce(
            (total, source) => total.plus(source.balance),
            BigNumber(0),
          ),
          rate: cards
            .map(source =>
              source.card.api_channels?.[API_GET_FIATPRICE] == null
                ? null
                : rates?.[source.card.api_channels[API_GET_FIATPRICE]]?.[coin.id]?.[
                    displayCurrency
                  ],
            )
            .find(value => value != null),
        };
      })
      .filter(Boolean)
      .sort((first, second) => second.total.comparedTo(first.total));
  }, [balances, cardsByCoin, coins, displayCurrency, rates]);

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sourcesByAsset;
    return sourcesByAsset.filter(({coin}) =>
      [coin.display_name, coin.display_ticker, coin.id]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(normalized)),
    );
  }, [query, sourcesByAsset]);

  const chooseSource = source => {
    setPendingAsset(null);
    setSource({
      sourceCoin: source.coin,
      sourceSubWallet: source.card,
      sourceBalance: source.balance,
      channel: source.channel,
    });
    navigation.navigate('SendWizardSelectTarget');
  };

  const chooseAsset = asset => {
    if (asset.cards.length === 1) chooseSource(asset.cards[0]);
    else setPendingAsset(asset);
  };

  return (
    <WizardScreen scroll={false}>
      <View style={styles.header}>
        <Text style={[styles.mainTitle, {color: theme.colors.textPrimary}]}>Select asset to send or convert</Text>
        <View
          style={[
            styles.search,
            {
              backgroundColor: searchFocused ? theme.colors.inputFocused : theme.colors.input,
              borderColor: searchFocused ? theme.colors.primary : 'transparent',
            },
          ]}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={() => setSearchFocused(false)}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search currencies"
            placeholderTextColor={theme.colors.textSubtle}
            returnKeyType="search"
            style={[styles.searchInput, {color: theme.colors.textPrimary}]}
            value={query}
          />
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textSubtle} style={styles.searchIcon} />
        </View>
      </View>
      <FlatList
        data={filteredAssets}
        keyExtractor={item => item.coin.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyBody, {color: theme.colors.textSecondary}]}>
              {query.trim()
                ? 'No assets match your search.'
                : 'No assets with balance available to send.'}
            </Text>
          </View>
        }
        renderItem={({item}) => {
          const fiat = item.rate == null
            ? null
            : formatCurrency({
                amount: item.total.multipliedBy(item.rate).decimalPlaces(2).toFixed(2),
                code: displayCurrency,
              })[0];
          const fiatDisplay = showBalance ? fiat || '—' : '*****';
          const cryptoDisplay = showBalance
            ? `${truncateDecimal(item.total, 8)} ${item.coin.display_ticker}`
            : `*** ${item.coin.display_ticker}`;
          return (
            <Pressable
              onPress={() => chooseAsset(item)}
              style={({pressed}) => [styles.assetRow, pressed && styles.pressed]}>
              <View style={styles.assetLogo}>{RenderSquareCoinLogo(item.coin.id, {}, 38, 38)}</View>
              <View style={styles.assetCopy}>
                <View style={styles.titleRow}>
                  <Text numberOfLines={1} style={[styles.assetName, {color: theme.colors.textPrimary}]}>{item.coin.display_name}</Text>
                  <Text style={[styles.fiatValue, {color: showBalance && !fiat ? theme.colors.textSubtle : theme.colors.textPrimary}]}>{fiatDisplay}</Text>
                </View>
                <Text style={[styles.cryptoValue, {color: theme.colors.textSecondary}]}>
                  {cryptoDisplay}{item.cards.length > 1 ? ` · ${item.cards.length} Cards` : ''}
                </Text>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
      />
      <SourceCardSheet
        cards={pendingAsset?.cards || []}
        selectedId={state.sourceSubWallet?.id}
        visible={Boolean(pendingAsset)}
        onClose={() => setPendingAsset(null)}
        onSelect={chooseSource}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  list: {paddingBottom: 24},
  header: {paddingHorizontal: 16, paddingBottom: 12},
  mainTitle: {fontSize: 28, lineHeight: 34, marginTop: 8, marginBottom: 4, letterSpacing: -0.2, ...fontStyle('bold')},
  search: {height: 52, marginTop: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center'},
  searchInput: {flex: 1, height: 52, paddingHorizontal: 16, fontSize: 16, lineHeight: 22, ...fontStyle('regular')},
  searchIcon: {marginHorizontal: 16},
  assetRow: {paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center'},
  assetLogo: {width: 38, height: 38, marginRight: 16},
  assetCopy: {flex: 1, minWidth: 0},
  titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  assetName: {flexShrink: 1, fontSize: 17, lineHeight: 22, ...fontStyle('semiBold')},
  fiatValue: {fontSize: 16, lineHeight: 22, marginLeft: 12, ...fontStyle('semiBold')},
  cryptoValue: {fontSize: 16, lineHeight: 22, marginTop: 6, ...fontStyle('medium')},
  pressed: {opacity: 0.7},
  empty: {paddingHorizontal: 32, paddingTop: 64, alignItems: 'center'},
  emptyBody: {fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
});

export default SendWizardSelectSource;
