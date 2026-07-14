import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import QRCode from 'react-native-qrcode-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Checkbox, Text} from 'react-native-paper';
import BigNumber from 'bignumber.js';
import {useDispatch, useSelector} from 'react-redux';
import {fontStyle} from '../../globals/fonts';
import {VerusPayLogo} from '../../images/customIcons';
import {
  expireCoinData,
  setActiveApp,
  setActiveCoin,
  setActiveSection,
  setCoinSubWallet,
} from '../../actions/actionCreators';
import BottomSheetModal from '../../components/BottomSheetModal';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import GradientButton from '../../components/GradientButton';
import SkeletonLoader, {SkeletonBlock, SkeletonText} from '../../components/SkeletonLoader';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {
  RenderPlainCoinLogo,
  RenderSquareCoinLogo,
} from '../../utils/CoinData/Graphics';
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
import {truncateDecimal} from '../../utils/math';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import ReceiveSubwalletSheet from './ReceiveSubwalletSheet';
import {createReceiveDetailsStyles} from './receive.styles';
import {
  generateReceiveInvoice,
  sanitizeNumericInput,
  validateAmountInput,
  validateSlippageInput,
} from './receiveInvoice';

const getDecimalSeparator = () =>
  (1.1).toLocaleString().replace(/1/g, '') || '.';

const getExplicitAddressRecords = (activeAccount, coinObj, card) => {
  if (!activeAccount || !coinObj || !card) return [];
  const channel = card.api_channels?.[API_GET_ADDRESSES];
  const addresses = activeAccount.keys?.[coinObj.id]?.[channel]?.addresses;
  if (!Array.isArray(addresses)) return [];

  return addresses.filter(Boolean).map((address, index) => ({
    address,
    label: card.address_info?.[index]?.label || (index === 0 ? 'Address' : `Address ${index + 1}`),
  }));
};

const receiveCardsForCoin = (coinObj, allSubWallets) =>
  (allSubWallets[coinObj?.id] || []).filter(
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

const SheetHeader = ({onClose, styles, theme, title = 'Payment request'}) => (
  <View style={styles.header}>
    <View style={styles.headerSpacer} />
    <Text style={styles.sheetTitle}>{title}</Text>
    <TouchableOpacity
      accessibilityLabel="Close payment request"
      accessibilityRole="button"
      onPress={onClose}
      style={styles.close}>
      <MaterialCommunityIcons
        color={theme.colors.textPrimary}
        name="close"
        size={18}
      />
    </TouchableOpacity>
  </View>
);

const NumericKeypad = ({height, onChange, styles, theme, value}) => {
  const decimalSeparator = useMemo(getDecimalSeparator, []);
  const rows = useMemo(
    () => [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [decimalSeparator, '0', 'backspace-outline'],
    ],
    [decimalSeparator],
  );

  const press = key => {
    let next = value || '';
    if (key === 'backspace-outline') next = next.slice(0, -1);
    else if (key === decimalSeparator) {
      if (!next.includes('.') && !next.includes(',')) {
        next = next ? `${next}${decimalSeparator}` : `0${decimalSeparator}`;
      }
    } else if (next.length < 18) {
      next = next === '0' ? key : `${next}${key}`;
    }
    onChange(next);
  };

  return (
    <View style={styles.keypad}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keyRow}>
          {row.map(key => (
            <TouchableOpacity
              accessibilityLabel={key === 'backspace-outline' ? 'Delete digit' : key}
              accessibilityRole="button"
              activeOpacity={0.35}
              key={key}
              onPress={() => press(key)}
              style={[styles.key, {height}]}>
              {key === 'backspace-outline' ? (
                <MaterialCommunityIcons
                  color={theme.colors.textPrimary}
                  name={key}
                  size={24}
                />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

const ReceiveAssetDetails = ({navigation, route}) => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createReceiveDetailsStyles(theme), [theme]);
  const sheetStyles = useMemo(
    () => ({
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
      },
      headerSpacer: {width: 34, height: 34},
      sheetTitle: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: 16,
        textAlign: 'center',
        ...fontStyle('semiBold'),
      },
      close: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceMuted,
      },
    }),
    [theme],
  );
  const isSmall = Dimensions.get('window').height <= 667 || Dimensions.get('window').width <= 375;
  const activeCoins = useObjectSelector(state => state.coins.activeCoinsForUser || []);
  const allSubWallets = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const rates = useObjectSelector(state => state.ledger.rates || {});
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const generalSettings = useSelector(state => state.settings.generalWalletSettings);
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
  const [selectedCardId, setSelectedCardId] = useState(route.params?.subWalletId || null);
  const selectedCard = useMemo(
    () => cards.find(card => card.id === selectedCardId) || null,
    [cards, selectedCardId],
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
  const [requestVisible, setRequestVisible] = useState(false);
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [amountFiat, setAmountFiat] = useState(false);
  const [subject, setSubject] = useState('');
  const [allowConversion, setAllowConversion] = useState(true);
  const [maxSlippage, setMaxSlippage] = useState('0.5');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [invoiceQr, setInvoiceQr] = useState(null);
  const [showVerusIcon, setShowVerusIcon] = useState(false);
  const [qrSaved, setQrSaved] = useState(false);
  const qrRef = useRef(null);
  const decimalSeparator = useMemo(getDecimalSeparator, []);

  useEffect(() => {
    if (selectedCardId == null && cards.length === 1) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  useEffect(() => {
    setSelectedAddressIndex(0);
    setRequestVisible(false);
    setInvoiceQr(null);
    setStep('amount');
    setAmount('');
    setSubject('');
    setError(null);
  }, [selectedCardId]);

  useEffect(() => {
    setRequestVisible(false);
    setInvoiceQr(null);
    setStep('amount');
    setAmount('');
    setSubject('');
    setError(null);
  }, [activeAccount?.accountHash]);

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
  }, [cards.length, navigation, theme]);

  const conversionEligible =
    coinObj?.proto === 'vrsc' &&
    selectedCard?.id !== 'PRIVATE_WALLET' &&
    selectedCard?.channel !== DLIGHT_PRIVATE;
  const rateChannel = selectedCard?.api_channels?.[API_GET_FIATPRICE];
  const priceMap =
    rates[GENERAL]?.[coinObj?.id] || rates[rateChannel]?.[coinObj?.id] || {};
  const price = priceMap[displayCurrency];
  const normalizedAmount = sanitizeNumericInput(amount);
  const amountValid = validateAmountInput(normalizedAmount) == null;
  const amountPreview = useMemo(() => {
    if (!amountValid || !price) return null;
    return amountFiat
      ? `≈ ${truncateDecimal(Number(normalizedAmount) / Number(price), 8)} ${coinObj.display_ticker}`
      : `≈ ${truncateDecimal(Number(normalizedAmount) * Number(price), 2)} ${displayCurrency}`;
  }, [amountFiat, amountValid, coinObj, displayCurrency, normalizedAmount, price]);
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

  const closeRequest = useCallback(() => {
    setRequestVisible(false);
    setStep('amount');
    setAmount('');
    setSubject('');
    setInvoiceQr(null);
    setError(null);
    setQrSaved(false);
  }, []);

  const createInvoice = useCallback(async () => {
    const amountError = validateAmountInput(normalizedAmount);
    const slippageError =
      conversionEligible && allowConversion && generalSettings.allowSettingVerusPaySlippage
        ? validateSlippageInput(sanitizeNumericInput(maxSlippage))
        : null;
    if (amountError || slippageError) {
      setError(amountError || slippageError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await generateReceiveInvoice({
        address,
        allowConversion: conversionEligible && allowConversion,
        amountFiat,
        amountValue: normalizedAmount,
        coinObj,
        displayCurrency,
        maxSlippageValue: sanitizeNumericInput(maxSlippage),
        memo: subject,
        priceMap,
        subWallet: selectedCard,
      });
      setInvoiceQr(result.qrString);
      setShowVerusIcon(result.showVerusIcon);
      setStep('result');
    } catch (e) {
      setError(e.message || 'Unable to create this payment request.');
    } finally {
      setLoading(false);
    }
  }, [
    address,
    allowConversion,
    amountFiat,
    coinObj,
    conversionEligible,
    displayCurrency,
    generalSettings.allowSettingVerusPaySlippage,
    maxSlippage,
    normalizedAmount,
    priceMap,
    selectedCard,
    subject,
  ]);

  const shareInvoice = useCallback(async () => {
    if (!invoiceQr) return;
    const currency = amountFiat ? displayCurrency : coinObj.display_ticker;
    await Share.share({
      message: `Please pay me ${amount} ${currency}${subject ? ` for '${subject}'` : ''} with ${invoiceQr}`,
    });
  }, [amount, amountFiat, coinObj, displayCurrency, invoiceQr, subject]);

  const saveQr = useCallback(() => {
    if (!qrRef.current || qrSaved) return;
    qrRef.current.toDataURL(async data => {
      const path = `${RNFS.CachesDirectoryPath}/VerusPayQR_${Date.now()}.png`;
      try {
        await RNFS.writeFile(path, data, 'base64');
        await CameraRoll.save(path, {type: 'photo'});
        await RNFS.unlink(path);
        setQrSaved(true);
      } catch (e) {
        setError(e.message || 'Unable to save the QR image.');
      }
    });
  }, [qrSaved]);

  if (!coinObj) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.sheetSubtitle}>Asset not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedCard) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.sheetHeading}>Choose a Card</Text>
          <Text style={[styles.sheetSubtitle, {textAlign: 'center'}]}>
            This Asset needs an explicit receive-compatible Card.
          </Text>
          <View style={{width: '100%', marginTop: 24}}>
            <AppButton onPress={() => setCardSheetVisible(true)}>
              Choose Card
            </AppButton>
          </View>
        </View>
        <ReceiveSubwalletSheet
          balanceMap={balanceMap}
          coinObj={coinObj}
          onClose={() => setCardSheetVisible(false)}
          onSelect={card => {
            setSelectedCardId(card.id);
            setCardSheetVisible(false);
          }}
          subWallets={cards}
          visible={cardSheetVisible}
        />
      </SafeAreaView>
    );
  }

  const renderAmountStep = () => (
    <View>
      <View style={styles.amountStepContent}>
        <Text style={styles.amountStepHeading}>What's the amount?</Text>
        <View style={styles.amountRow}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>
            {amount ? amount.replace('.', decimalSeparator) : `0${decimalSeparator}00`}
          </Text>
          <Text style={styles.currency}>
            {amountFiat ? displayCurrency : coinObj.display_ticker}
          </Text>
        </View>
        <View style={styles.estimateWrap}>
          {amountPreview ? (
            <Text style={styles.estimate}>{amountPreview}</Text>
          ) : null}
        </View>
        {price ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              if (amount && price && Number(price) > 0) {
                const current = Number(sanitizeNumericInput(amount));
                const converted = amountFiat
                  ? truncateDecimal(current / Number(price), 8)
                  : truncateDecimal(current * Number(price), 2);
                setAmount(String(converted));
              }
              setAmountFiat(value => !value);
            }}
            style={styles.switch}>
            <MaterialCommunityIcons
              color={theme.colors.textSecondary}
              name="swap-vertical"
              size={16}
            />
            <Text style={styles.switchText}>
              Switch to {amountFiat ? coinObj.display_ticker : displayCurrency}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.keypadWrap}>
        <NumericKeypad
          height={isSmall ? 40 : 48}
          onChange={setAmount}
          styles={styles}
          theme={theme}
          value={amount}
        />
      </View>
      {error ? <Text style={[styles.error, styles.amountError]}>{error}</Text> : null}
      <View style={styles.amountStepFooter}>
        <AppButton
          disabled={!amountValid}
          onPress={() =>
            conversionEligible ? setStep('subject') : createInvoice()
          }>
          Next
        </AppButton>
      </View>
    </View>
  );

  const renderSubjectStep = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.sheetBody}>
        <Text style={styles.amountStepHeading}>What is it for?</Text>
        <Text style={styles.sheetSubtitle}>Optional</Text>
        <TextInput
          autoFocus
          onChangeText={setSubject}
          placeholder="e.g. Dinner"
          placeholderTextColor={theme.colors.textSubtle}
          returnKeyType="next"
          style={styles.subjectInput}
          value={subject}
        />
        <View style={styles.subjectFooter}>
          <AppButton onPress={() => setStep('settings')}>Next</AppButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderSettingsStep = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.sheetBody}>
        <View style={styles.settingsIntro}>
          <Text style={styles.amountStepHeading}>Allow conversions</Text>
          <Text style={styles.sheetSubtitle}>
            Sender can pay with currencies that can auto-convert to{' '}
            {coinObj.display_ticker}. Easy for them, easy for you.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{checked: allowConversion}}
          onPress={() => setAllowConversion(value => !value)}
          style={styles.optionCard}>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Enable conversions</Text>
            <Text style={styles.optionSubtitle}>
              Max. slippage: {maxSlippage || '0.5'}%
            </Text>
          </View>
          <Checkbox.Android
            color={theme.colors.primary}
            onPress={() => setAllowConversion(value => !value)}
            status={allowConversion ? 'checked' : 'unchecked'}
            uncheckedColor={theme.colors.textSubtle}
          />
        </TouchableOpacity>
        {allowConversion && generalSettings.allowSettingVerusPaySlippage ? (
          <>
            <Text style={[styles.label, styles.slippageLabel]}>Max slippage (%)</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setMaxSlippage}
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.slippageInput}
              value={maxSlippage}
            />
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.settingsFooter}>
          <AppButton disabled={loading} onPress={createInvoice}>
            {loading ? 'Creating…' : 'Create payment link'}
          </AppButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderResultStep = () => (
    <View style={styles.result}>
      <View style={styles.resultQr}>
        <QRCode
          getRef={ref => {
            qrRef.current = ref;
          }}
          logo={showVerusIcon ? require('../../images/customIcons/Verus.png') : undefined}
          logoBackgroundColor="#FFFFFF"
          logoBorderRadius={80}
          logoSize={showVerusIcon ? 48 : undefined}
          size={220}
          value={invoiceQr || '-'}
        />
      </View>
      <Text style={styles.resultText}>
        Scan to pay {amount} {amountFiat ? displayCurrency : coinObj.display_ticker}
        {address ? ` to ${address.slice(0, 5)}...${address.slice(-5)}` : ''}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.resultActions}>
        <GradientButton
          contentStyle={styles.resultButtonContent}
          disabled={!conversionEligible && qrSaved}
          leftIcon={
            <MaterialCommunityIcons
              color={theme.colors.onPrimary}
              name={
                conversionEligible
                  ? 'share-variant'
                  : qrSaved
                    ? 'check'
                    : 'content-save'
              }
              size={20}
            />
          }
          onPress={conversionEligible ? shareInvoice : saveQr}
          style={[
            styles.resultPrimaryButton,
            !conversionEligible && qrSaved && styles.savedResultButton,
          ]}
          topColor={!conversionEligible && qrSaved ? theme.colors.success : undefined}
          bottomColor={!conversionEligible && qrSaved ? theme.colors.success : undefined}>
          {conversionEligible
            ? 'Share payment link'
            : qrSaved
              ? 'QR image saved'
              : 'Save QR to camera roll'}
        </GradientButton>
        <AppButton
          onPress={() => {
            setAmount('');
            setSubject('');
            setInvoiceQr(null);
            setError(null);
            setQrSaved(false);
            setStep('amount');
          }}
          style={styles.resultSecondaryButton}
          variant="secondary">
          New payment request
        </AppButton>
      </View>
    </View>
  );

  const addressLoading = activeAccount == null;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {RenderSquareCoinLogo(coinObj.id, {}, 32, 32)}
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
                <View style={{width: 200, height: 200, alignItems: 'center', justifyContent: 'center'}}>
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
                onPress={() => setNetworksVisible(true)}
                style={styles.networkPill}>
                <View style={styles.networkIcons}>
                  {supportedNetworks.slice(0, 3).map((network, index) => (
                    <View
                      key={network.id}
                      style={[
                        styles.networkIcon,
                        {
                          backgroundColor:
                            network.theme_color || theme.colors.textSecondary,
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
                    <Text ellipsizeMode="middle" numberOfLines={1} selectable style={styles.address}>
                      {selectedCard.name}
                    </Text>
                    <CopyAction
                      accessibilityLabel="Copy VerusID"
                      value={selectedCard.name}
                    />
                  </View>
                  <Text style={[styles.label, {marginTop: 12}]}>i-Address</Text>
                </>
              ) : (
                <Text style={styles.label}>{selectedAddressRecord?.label || 'Address'}</Text>
              )}
              <TouchableOpacity
                accessibilityRole={addressRecords.length > 1 ? 'button' : undefined}
                activeOpacity={addressRecords.length > 1 ? 0.7 : 1}
                disabled={addressRecords.length <= 1}
                onPress={() => setAddressSheetVisible(true)}
                style={styles.addressRow}>
                <Text ellipsizeMode="middle" numberOfLines={1} selectable style={styles.address}>
                  {address || 'No address is available for this Card.'}
                </Text>
                <CopyAction
                  accessibilityLabel="Copy receive address"
                  disabled={!address}
                  value={address}
                />
                {addressRecords.length > 1 ? (
                  <MaterialCommunityIcons
                    color={theme.colors.textSubtle}
                    name="chevron-down"
                    size={20}
                  />
                ) : null}
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            accessibilityLabel="Create payment request"
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={!address}
            onPress={() => setRequestVisible(true)}
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
          style={[
            styles.footer,
            {paddingBottom: Math.max(insets.bottom, 32)},
          ]}>
          <AppButton onPress={() => navigation.navigate('Home')}>Done</AppButton>
        </View>
      </View>

      <BottomSheetModal
        contentContainerStyle={styles.sheet}
        floating={false}
        maxHeight="90%"
        onClose={closeRequest}
        visible={requestVisible}>
        <SheetHeader onClose={closeRequest} styles={sheetStyles} theme={theme} />
        {step === 'amount'
          ? renderAmountStep()
          : step === 'subject'
            ? renderSubjectStep()
            : step === 'settings'
              ? renderSettingsStep()
              : renderResultStep()}
      </BottomSheetModal>

      <BottomSheetModal
        contentContainerStyle={styles.sheet}
        floating={false}
        maxHeight="70%"
        onClose={() => setAddressSheetVisible(false)}
        visible={addressSheetVisible}>
        <SheetHeader
          onClose={() => setAddressSheetVisible(false)}
          styles={sheetStyles}
          theme={theme}
          title="Choose address"
        />
        <View style={styles.sheetBody}>
          <Text style={styles.sheetHeading}>Choose address</Text>
          <Text style={styles.sheetSubtitle}>
            Select the labeled address to show in the QR code and request.
          </Text>
          {addressRecords.map((record, index) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={`${record.address}-${index}`}
              onPress={() => {
                setSelectedAddressIndex(index);
                setAddressSheetVisible(false);
              }}
              style={styles.optionCard}>
              <View style={{flex: 1}}>
                <Text style={styles.optionTitle}>{record.label}</Text>
                <Text ellipsizeMode="middle" numberOfLines={1} style={styles.sheetSubtitle}>
                  {record.address}
                </Text>
              </View>
              {index === selectedAddressIndex ? (
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="check-circle"
                  size={22}
                />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        contentContainerStyle={styles.sheet}
        floating={false}
        maxHeight="70%"
        onClose={() => setNetworksVisible(false)}
        visible={networksVisible}>
        <SheetHeader
          onClose={() => setNetworksVisible(false)}
          styles={sheetStyles}
          theme={theme}
          title="Supported chains"
        />
        <View style={styles.supportedChainsBody}>
          <Text style={styles.supportedChainsDescription}>
            This address supports all currencies on all chains in the Verus ecosystem.
          </Text>
          <View style={styles.networkList}>
            {supportedNetworks.map(network => (
              <View key={network.id} style={styles.networkListItem}>
                {RenderSquareCoinLogo(network.id, {}, 32, 32)}
                <View style={styles.networkListText}>
                  <Text style={styles.networkListTitle}>{network.display_name}</Text>
                  <Text style={styles.networkListTicker}>{network.display_ticker}</Text>
                </View>
              </View>
            ))}
          </View>
          <AppButton onPress={() => setNetworksVisible(false)}>
            Got it
          </AppButton>
        </View>
      </BottomSheetModal>

      <ReceiveSubwalletSheet
        balanceMap={balanceMap}
        coinObj={coinObj}
        onClose={() => setCardSheetVisible(false)}
        onSelect={card => {
          setSelectedCardId(card.id);
          setCardSheetVisible(false);
        }}
        subWallets={cards}
        visible={cardSheetVisible}
      />
    </SafeAreaView>
  );
};

export default ReceiveAssetDetails;
