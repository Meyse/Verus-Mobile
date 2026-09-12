import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {Dimensions, ScrollView, TouchableOpacity, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {
  expireCoinData,
  setActiveApp,
  setActiveCoin,
  setActiveSection,
  setCoinSubWallet,
} from '../../actions/actionCreators';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../components/SkeletonLoader';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {VerusPayLogo} from '../../images/customIcons';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {AssetCoinLogo, RenderPlainCoinLogo} from '../../utils/CoinData/Graphics';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {WALLET_APP_RECEIVE} from '../../utils/constants/apps';
import {
  API_GET_ADDRESSES,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  DLIGHT_PRIVATE,
  GENERAL,
} from '../../utils/constants/intervalConstants';
import {USD} from '../../utils/constants/currencies';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {getSubWalletNetworkLabel} from '../../utils/subwallet/cardPresentation';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import ReceiveAddressSheet from './ReceiveAddressSheet';
import ReceivePaymentRequestFlow from './ReceivePaymentRequestFlow';
import ReceiveSubwalletSheet from './ReceiveSubwalletSheet';
import SupportedChainsSheet from './SupportedChainsSheet';
import {createReceiveDetailsStyles} from './receive.styles';

// Addresses come from the keys of the active account, addressed by the Card's
// own address channel. This is the single source for the copied address and
// for the address encoded in the receive QR.
export const getExplicitAddressRecords = (activeAccount, coinObj, card) => {
  if (!activeAccount || !coinObj || !card) return [];
  const channel = card.api_channels?.[API_GET_ADDRESSES];
  const addresses = activeAccount.keys?.[coinObj.id]?.[channel]?.addresses;
  if (!Array.isArray(addresses)) return [];

  return addresses.filter(Boolean).map((address, index) => ({
    address,
    label:
      card.address_info?.[index]?.label ||
      (index === 0 ? 'Address' : `Address ${index + 1}`),
  }));
};

const receiveCardsForCoin = (coinObj, allSubWallets) =>
  ((allSubWallets && allSubWallets[coinObj?.id]) || []).filter(
    wallet =>
      wallet.compatible_apps?.includes(WALLET_APP_RECEIVE) &&
      wallet.api_channels?.[API_GET_ADDRESSES] != null,
  );

const getSupportedNetworks = coinObj => {
  if (!coinObj || (coinObj.proto !== 'vrsc' && !coinObj.is_pbaas)) return [];

  const root = coinObj.testnet ? coinsList.VRSCTEST : coinsList.VRSC;
  const networks = root ? [root] : [];

  Object.values(coinsList).forEach(network => {
    if (
      network.proto === 'vrsc' &&
      network.id !== 'VRSC' &&
      network.id !== 'VRSCTEST' &&
      network.currency_id === network.system_id &&
      !!network.testnet === !!coinObj.testnet
    ) {
      networks.push(network);
    }
  });

  return networks;
};

const ReceiveAssetDetails = ({navigation, route}) => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createReceiveDetailsStyles(theme), [theme]);
  const isSmall =
    Dimensions.get('window').height <= 667 ||
    Dimensions.get('window').width <= 375;
  const activeCoins = useObjectSelector(
    state => state.coins.activeCoinsForUser || [],
  );
  const allSubWallets = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const rates = useObjectSelector(state => state.ledger.rates || {});
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const generalSettings = useSelector(
    state => state.settings.generalWalletSettings,
  );
  const coinObj = useMemo(() => {
    const active = activeCoins.find(coin => coin.id === route.params?.coinId);
    if (active) return active;
    try {
      return CoinDirectory.findCoinObj(route.params?.coinId);
    } catch (e) {
      return null;
    }
  }, [activeCoins, route.params?.coinId]);
  const cards = useMemo(
    () => receiveCardsForCoin(coinObj, allSubWallets),
    [allSubWallets, coinObj],
  );
  const [selectedCardId, setSelectedCardId] = useState(
    route.params?.subWalletId || null,
  );
  const resolvedCardId =
    selectedCardId ?? (cards.length === 1 ? cards[0].id : null);
  const selectedCard = useMemo(
    () => cards.find(card => card.id === resolvedCardId) || null,
    [cards, resolvedCardId],
  );
  const addressRecords = useMemo(
    () => getExplicitAddressRecords(activeAccount, coinObj, selectedCard),
    [activeAccount, coinObj, selectedCard],
  );
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const selectedAddressRecord = addressRecords[selectedAddressIndex] || null;
  const address = selectedAddressRecord?.address || null;
  const [cardSheetVisible, setCardSheetVisible] = useState(false);
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [networksVisible, setNetworksVisible] = useState(false);
  const [requestActive, setRequestActive] = useState(false);

  useEffect(() => {
    if (cards.length === 1 && selectedCardId !== cards[0].id) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  useEffect(() => {
    setSelectedAddressIndex(0);
  }, [resolvedCardId, activeAccount?.accountHash]);

  useEffect(() => {
    if (!coinObj || !selectedCard) return;
    const appKey = coinObj.default_app;
    const sections = coinObj.apps?.[appKey]?.data || [];
    const receiveSection = sections.find(section => section.key === WALLET_APP_RECEIVE);
    dispatch(setActiveCoin(coinObj));
    dispatch(setActiveApp(appKey));
    if (receiveSection) dispatch(setActiveSection(receiveSection));
    dispatch(setCoinSubWallet(coinObj.id, selectedCard));
    dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));
    dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
  }, [coinObj, dispatch, selectedCard]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackTitle: 'Back',
      headerShadowVisible: false,
      headerShown: !requestActive,
      headerTintColor: theme.colors.textPrimary,
      headerStyle: {
        backgroundColor: theme.colors.background,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerRight:
        cards.length > 1
          ? () => (
              <TouchableOpacity
                accessibilityLabel="Choose Card"
                accessibilityRole="button"
                onPress={() => setCardSheetVisible(true)}
                style={styles.headerRightButton}>
                <MaterialCommunityIcons
                  color={theme.colors.textPrimary}
                  name="tune-vertical"
                  size={24}
                />
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [cards.length, navigation, requestActive, styles, theme]);

  const conversionEligible =
    coinObj?.proto === 'vrsc' &&
    selectedCard?.id !== 'PRIVATE_WALLET' &&
    selectedCard?.channel !== DLIGHT_PRIVATE;
  const rateChannel = selectedCard?.api_channels?.[API_GET_FIATPRICE];
  const priceMap =
    rates[GENERAL]?.[coinObj?.id] || rates[rateChannel]?.[coinObj?.id] || {};
  const price = priceMap[displayCurrency];
  const supportedNetworks = useMemo(
    () => getSupportedNetworks(coinObj),
    [coinObj],
  );
  const balanceMap = useMemo(
    () =>
      cards.reduce((result, card) => {
        result[card.id] = balances[coinObj?.id]?.[card.id]?.total || 0;
        return result;
      }, {}),
    [balances, cards, coinObj?.id],
  );
  const cardContextLabel = useMemo(() => {
    if (!selectedCard) return '';
    const networkName = getSubWalletNetworkLabel(selectedCard, coinObj);
    return [selectedCard.name, networkName].filter(Boolean).join(' · ');
  }, [coinObj, selectedCard]);
  const requestContextKey = [
    coinObj?.id,
    selectedCard?.id,
    address,
    activeAccount?.accountHash,
  ].join('|');

  const openCardSheet = useCallback(() => setCardSheetVisible(true), []);
  const closeCardSheet = useCallback(() => setCardSheetVisible(false), []);
  const openAddressSheet = useCallback(() => setAddressSheetVisible(true), []);
  const closeAddressSheet = useCallback(() => setAddressSheetVisible(false), []);
  const openNetworks = useCallback(() => setNetworksVisible(true), []);
  const closeNetworks = useCallback(() => setNetworksVisible(false), []);
  const startRequest = useCallback(() => setRequestActive(true), []);
  const exitRequest = useCallback(() => setRequestActive(false), []);
  const goHome = useCallback(() => navigation.navigate('Home'), [navigation]);
  const selectCard = useCallback(card => {
    setSelectedCardId(card.id);
    setCardSheetVisible(false);
  }, []);

  const renderCardSheet = () => (
    <ReceiveSubwalletSheet
      balanceMap={balanceMap}
      coinObj={coinObj}
      onClose={closeCardSheet}
      onSelect={selectCard}
      selectedId={resolvedCardId}
      subWallets={cards}
      visible={cardSheetVisible}
    />
  );

  const addressLoading = activeAccount == null;

  const renderAddressRow = () => (
    <TouchableOpacity
      accessibilityRole={addressRecords.length > 1 ? 'button' : undefined}
      activeOpacity={addressRecords.length > 1 ? 0.7 : 1}
      disabled={addressRecords.length <= 1}
      onPress={openAddressSheet}
      style={styles.addressRow}>
      {address ? (
        <>
          <Text
            ellipsizeMode="middle"
            numberOfLines={1}
            selectable
            style={[styles.address, styles.identifier]}>
            {address}
          </Text>
          <CopyAction
            accessibilityLabel="Copy receive address"
            value={address}
          />
        </>
      ) : (
        // Missing data is a sentence, not a value: it reads as body copy that
        // wraps fully and offers no copy affordance. Only a real address gets
        // the identifier treatment and the copy control.
        <Text style={styles.addressMissing}>
          No address is available for this Card.
        </Text>
      )}
      {addressRecords.length > 1 ? (
        <MaterialCommunityIcons
          color={theme.colors.textSubtle}
          name="chevron-down"
          size={20}
        />
      ) : null}
    </TouchableOpacity>
  );

  if (!coinObj) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateTitle}>Asset unavailable</Text>
          <Text style={styles.stateBody}>
            This Asset could not be loaded from the wallet directory.
          </Text>
          <View style={styles.stateAction}>
            <AppButton onPress={goHome}>Done</AppButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateTitle}>No Card available</Text>
          <Text style={styles.stateBody}>
            {coinObj.display_name} has no receive-compatible Card in this
            wallet.
          </Text>
          <View style={styles.stateAction}>
            <AppButton onPress={goHome}>Done</AppButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedCard) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateTitle}>Choose a Card</Text>
          <Text style={styles.stateBody}>
            {coinObj.display_name} is available through more than one Card.
          </Text>
          <View style={styles.stateAction}>
            <AppButton onPress={openCardSheet}>Choose Card</AppButton>
          </View>
        </View>
        {renderCardSheet()}
      </SafeAreaView>
    );
  }

  if (requestActive) {
    return (
      <ReceivePaymentRequestFlow
        address={address}
        allowSlippageSetting={
          generalSettings.allowSettingVerusPaySlippage === true
        }
        card={selectedCard}
        cardContextLabel={cardContextLabel}
        coinObj={coinObj}
        contextKey={requestContextKey}
        conversionEligible={conversionEligible}
        displayCurrency={displayCurrency}
        isSmall={isSmall}
        navigation={navigation}
        onExit={exitRequest}
        price={price}
        priceMap={priceMap}
      />
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AssetCoinLogo coinId={coinObj.id} size={32} />
              <Text style={styles.title}>{coinObj.display_name}</Text>
            </View>
            <Text style={styles.ticker}>{coinObj.display_ticker}</Text>
          </View>
          <View style={styles.qrWrap}>
            <View style={styles.qrSurface}>
              {addressLoading ? (
                <SkeletonLoader accessibilityLabel="Loading receive address">
                  <SkeletonBlock height={200} radius={8} width={200} />
                </SkeletonLoader>
              ) : address ? (
                <QRCode size={200} value={address} />
              ) : (
                <View
                  style={{
                    width: 200,
                    height: 200,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialCommunityIcons
                    color={theme.colors.textSubtle}
                    name="qrcode"
                    size={72}
                  />
                </View>
              )}
            </View>
            {supportedNetworks.length > 0 ? (
              <TouchableOpacity
                accessibilityLabel="View supported chains"
                accessibilityRole="button"
                activeOpacity={0.7}
                onPress={openNetworks}
                style={styles.networkPill}>
                <View style={styles.networkIcons}>
                  {supportedNetworks.slice(0, 3).map((network, index) => (
                    <View
                      key={network.id}
                      style={[
                        styles.networkIcon,
                        {
                          marginLeft: index > 0 ? -12 : 0,
                          zIndex: index + 1,
                        },
                      ]}>
                      {RenderPlainCoinLogo(network.id, {}, 20, 20)}
                    </View>
                  ))}
                  {supportedNetworks.length > 3 ? (
                    <View
                      style={[
                        styles.networkIcon,
                        styles.moreNetworks,
                        {marginLeft: -12, zIndex: 10},
                      ]}>
                      <Text style={styles.moreNetworksText}>
                        +{supportedNetworks.length - 3}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.networkText}>Supported chains</Text>
                <MaterialCommunityIcons
                  color={theme.colors.textSecondary}
                  name="chevron-right"
                  size={16}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          {addressLoading ? (
            <SkeletonLoader accessibilityLabel="Loading address record">
              <SkeletonText height={13} width="28%" />
              <SkeletonBlock height={56} radius={12} style={{marginTop: 8}} />
            </SkeletonLoader>
          ) : (
            <>
              {selectedCard.name?.endsWith('@') ? (
                <>
                  <Text style={styles.label}>VerusID</Text>
                  <View style={styles.addressRow}>
                    <Text
                      ellipsizeMode="middle"
                      numberOfLines={1}
                      selectable
                      style={styles.address}>
                      {selectedCard.name}
                    </Text>
                    <CopyAction
                      accessibilityLabel="Copy VerusID"
                      value={selectedCard.name}
                    />
                  </View>
                  <Text style={[styles.label, {marginTop: 12}]}>i-Address</Text>
                  {renderAddressRow()}
                </>
              ) : (
                <>
                  <Text style={styles.label}>
                    {selectedAddressRecord?.label || 'Address'}
                  </Text>
                  {renderAddressRow()}
                </>
              )}
              {cardContextLabel ? (
                <Text style={styles.cardMeta}>{cardContextLabel}</Text>
              ) : null}
            </>
          )}
          <TouchableOpacity
            accessibilityLabel="Create payment request"
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={!address}
            onPress={startRequest}
            style={[styles.requestCard, !address && {opacity: 0.5}]}>
            <Text style={styles.requestTitle}>
              {conversionEligible
                ? 'Easy to share payment request'
                : 'Create payment request'}
            </Text>
            {conversionEligible ? (
              <View style={styles.requestPreview}>
                <VerusPayLogo height={48} width={48} />
              </View>
            ) : null}
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="chevron-right"
              size={24}
            />
          </TouchableOpacity>
        </ScrollView>
        <View
          style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 32)}]}>
          <AppButton onPress={goHome}>Done</AppButton>
        </View>
      </View>

      <ReceiveAddressSheet
        records={addressRecords}
        selectedIndex={selectedAddressIndex}
        onSelect={setSelectedAddressIndex}
        onClose={closeAddressSheet}
        visible={addressSheetVisible}
      />
      <SupportedChainsSheet
        networks={supportedNetworks}
        onClose={closeNetworks}
        visible={networksVisible}
      />
      {renderCardSheet()}
    </SafeAreaView>
  );
};

export default ReceiveAssetDetails;
