import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {CONVERSION_DISABLED} from '../../../env/index';
import AppSearchField from '../../components/AppSearchField';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {fontStyle} from '../../globals/fonts';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
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
import {
  WIZARD_CONTENT_INSET,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import {SourceCardSheet} from './components/SelectionSheets';
import {
  buildSendTarget,
  getRecipientAddressType,
  getSourceAddressType,
  isConversionChannel,
  SEND_WIZARD_MODE,
} from './wizardUtils';

const SendWizardSelectSource = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const {mode, state, setSource} = useSendWizard();
  const [query, setQuery] = useState('');
  const [pendingAsset, setPendingAsset] = useState(null);
  const [cardSheetVisible, setCardSheetVisible] = useState(false);
  // A scanned request names its asset, or only an address. Then only the
  // asset, or the assets that can go to that address, show.
  const scanRequest = state.scanRequest;
  const scanAddressType = scanRequest?.address && !scanRequest.coinId
    ? getRecipientAddressType(scanRequest.address)
    : null;
  const autoOpenedCards = useRef(false);

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
            card => {
              const channel = card.api_channels?.[API_SEND];
              const canSend =
                card.compatible_apps?.includes(WALLET_APP_SEND) &&
                Boolean(channel);

              return (
                canSend &&
                (mode !== SEND_WIZARD_MODE.CONVERT ||
                  (!CONVERSION_DISABLED && isConversionChannel(channel)))
              );
            },
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
      .filter(asset =>
        scanRequest?.coinId
          ? asset.coin.id === scanRequest.coinId
          : scanRequest?.address
          ? getSourceAddressType(asset.coin) === scanAddressType
          : true,
      )
      .sort((first, second) => second.total.comparedTo(first.total));
  }, [
    balances,
    cardsByCoin,
    coins,
    displayCurrency,
    mode,
    rates,
    scanAddressType,
    scanRequest,
  ]);

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
    const sourceState = {
      sourceCoin: source.coin,
      sourceSubWallet: source.card,
      sourceBalance: source.balance,
      channel: source.channel,
    };

    if (mode === SEND_WIZARD_MODE.SEND) {
      const sourceNetworkId =
        source.channel?.split('.')[2] ||
        source.coin.system_id ||
        source.coin.id;
      const target = buildSendTarget({}, source.coin, sourceNetworkId);
      const route =
        target.routes.find(
          candidate => !candidate.isCrossChain && !candidate.via,
        ) || target.routes[0];

      setSource(sourceState, target, route);
      navigation.navigate('SendWizardAmount');
      // A request with an amount opens Confirm; Back still reaches Amount.
      if (scanRequest?.amount) navigation.navigate('SendWizardConfirm');
      return;
    }

    setSource(sourceState);
    navigation.navigate('SendWizardSelectTarget');
  };

  const chooseAsset = asset => {
    if (asset.cards.length === 1) chooseSource(asset.cards[0]);
    else {
      setPendingAsset(asset);
      setCardSheetVisible(true);
    }
  };

  // The scanned asset is on several cards: ask for the card at once.
  const requestedAsset =
    scanRequest?.coinId && filteredAssets.length === 1 ? filteredAssets[0] : null;
  useEffect(() => {
    if (!requestedAsset || autoOpenedCards.current) return;
    if (requestedAsset.cards.length < 2) return;
    autoOpenedCards.current = true;
    setPendingAsset(requestedAsset);
    setCardSheetVisible(true);
  }, [requestedAsset]);

  return (
    <WizardScreen scroll={false}>
      <AppSearchField
        accessibilityLabel="Search currencies"
        onChangeText={setQuery}
        placeholder="Search currencies"
        resultCount={filteredAssets.length}
        style={styles.searchSpacing}
        value={query}
      />
      <FlatList
        data={filteredAssets}
        keyExtractor={item => item.coin.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            {scanAddressType && !query.trim() ? (
              <Text style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>
                No asset for this address
              </Text>
            ) : null}
            <Text style={[styles.emptyBody, {color: theme.colors.textSecondary}]}>
              {query.trim()
                ? 'No assets match your search.'
                : scanAddressType
                ? 'This address is for assets you don’t hold.'
                : `No assets with balance available to ${
                    mode === SEND_WIZARD_MODE.CONVERT ? 'convert' : 'send'
                  }.`}
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
              <View style={styles.assetLogo}>
                <AssetCoinLogo coinId={item.coin.id} size={38} />
              </View>
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
        description={`Choose the card to ${
          mode === SEND_WIZARD_MODE.CONVERT ? 'convert' : 'send'
        } from.`}
        selectedId={state.sourceSubWallet?.id}
        visible={cardSheetVisible}
        onClose={() => setCardSheetVisible(false)}
        onClosed={() => setPendingAsset(null)}
        onSelect={chooseSource}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  list: {paddingBottom: 24},
  searchSpacing: {
    marginTop: WIZARD_CONTENT_TOP_INSET,
    marginHorizontal: WIZARD_CONTENT_INSET,
    marginBottom: 14,
  },
  assetRow: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetLogo: {width: 38, height: 38, marginRight: 16},
  assetCopy: {flex: 1, minWidth: 0},
  titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  assetName: {flexShrink: 1, fontSize: 17, lineHeight: 22, ...fontStyle('semiBold')},
  fiatValue: {fontSize: 16, lineHeight: 22, marginLeft: 12, ...fontStyle('semiBold')},
  cryptoValue: {fontSize: 16, lineHeight: 22, marginTop: 6, ...fontStyle('medium')},
  pressed: {opacity: 0.7},
  empty: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingTop: 64,
    alignItems: 'center',
  },
  emptyTitle: {fontSize: 17, lineHeight: 22, textAlign: 'center', ...fontStyle('semiBold')},
  emptyBody: {fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
});

export default SendWizardSelectSource;
