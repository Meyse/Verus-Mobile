import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch} from 'react-redux';
import AppButton from '../../components/AppButton';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {
  addResolvedAsset,
  ASSET_IDENTIFIER_ERROR,
  classifyAssetIdentifier,
  resolveAssetIdentifier,
} from '../../utils/CoinData/assetIdentifierService';
import {createManageAssetsStyles} from './manageAssets.styles';

const LOOKUP_DELAY_MS = 450;

const PHASE = {
  INPUT: 'input',
  RESOLVING: 'resolving',
  REVIEW: 'review',
  ADDING: 'adding',
  SUCCESS: 'success',
};

const PHASE_TITLES = {
  [PHASE.INPUT]: 'Add by identifier',
  [PHASE.RESOLVING]: 'Add by identifier',
  [PHASE.REVIEW]: 'Review asset',
  [PHASE.ADDING]: 'Adding asset',
  [PHASE.SUCCESS]: 'Asset added',
};

const INITIAL_STATE = {
  phase: PHASE.INPUT,
  input: '',
  result: null,
  error: null,
  addedCoin: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'INPUT_CHANGED':
      return {
        ...INITIAL_STATE,
        input: action.input,
        error: action.error || null,
      };
    case 'RESOLVE_STARTED':
      return {
        ...state,
        phase: PHASE.RESOLVING,
        result: null,
        error: null,
      };
    case 'RESOLVE_SUCCEEDED':
      return {
        ...state,
        phase: PHASE.INPUT,
        result: action.result,
        error: null,
      };
    case 'RESOLVE_FAILED':
      return {
        ...state,
        phase: PHASE.INPUT,
        result: null,
        error: action.error,
      };
    case 'REVIEW':
      return {...state, phase: PHASE.REVIEW, error: null};
    case 'BACK_TO_INPUT':
      return {...state, phase: PHASE.INPUT, error: null};
    case 'ADD_STARTED':
      return {...state, phase: PHASE.ADDING, error: null};
    case 'ADD_FAILED':
      return {...state, phase: PHASE.REVIEW, error: action.error};
    case 'ADD_SUCCEEDED':
      return {
        ...state,
        phase: PHASE.SUCCESS,
        error: null,
        addedCoin: action.addedCoin,
      };
    default:
      return state;
  }
};

const getErrorMessage = error => {
  if (error?.code === ASSET_IDENTIFIER_ERROR.DUPLICATE) {
    return 'Already in your wallet.';
  }

  return error?.message || 'The asset could not be resolved.';
};

const getNetworkName = network => {
  if (network === 'homestead') return 'Ethereum';
  if (network === 'goerli') return 'Goerli testnet';
  return network || 'Unavailable';
};

const getPbaasLaunchStatus = (result, pbaasCoin) => {
  const {currencyDefinition, launchSystem} = result;
  const bestHeight = launchSystem?.bestheight;

  if (bestHeight == null) return 'Unknown';

  const startBlock =
    currencyDefinition.launchsystemid !== pbaasCoin.system_id
      ? 1
      : currencyDefinition.startblock;
  const pending = startBlock > bestHeight;
  const failed =
    !pending &&
    currencyDefinition.minpreconversion?.length > 0 &&
    currencyDefinition.minpreconversion.every(amount => amount > 0) &&
    currencyDefinition.bestcurrencystate?.supply === 0;

  if (failed) return 'Failed to launch';
  if (pending) return `Pending · starts at block ${startBlock}`;
  return 'Active';
};

const ReviewRow = ({label, styles, value}) => (
  <View style={styles.identifierReviewRow}>
    <Text style={styles.identifierReviewLabel}>{label}</Text>
    <Text selectable style={styles.identifierReviewValue}>
      {String(value)}
    </Text>
  </View>
);

const DetectedSystem = ({classification, resolving, result, styles, theme}) => {
  if (!classification.kind) return null;

  const ethereum = classification.kind === 'erc20';
  const resolved = result != null;
  let description = 'Metadata will be retrieved automatically.';

  if (resolving) {
    description = 'Retrieving asset metadata…';
  } else if (resolved) {
    description = 'Metadata is ready to review.';
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityState={{busy: resolving}}
      style={styles.identifierDetected}
      testID="asset-identifier-detected-system">
      <View style={styles.identifierDetectedIcon}>
        {resolving ? (
          <ActivityIndicator color={theme.colors.primary} size={18} />
        ) : (
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name={ethereum ? 'ethereum' : 'alpha-v-circle-outline'}
            size={20}
          />
        )}
      </View>
      <View style={styles.identifierDetectedCopy}>
        <Text style={styles.identifierDetectedEyebrow}>
          {resolved ? 'Detected system' : 'Automatic detection'}
        </Text>
        <Text style={styles.identifierDetectedTitle}>
          {ethereum ? 'Ethereum contract' : 'Verus currency'}
        </Text>
        <Text style={styles.identifierDetectedDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const TrustCallout = ({result, styles, theme}) => {
  const trusted = result.catalogueMatch != null;
  const dynamicContract = result.kind === 'erc20' && !trusted;
  let calloutStyle = styles.identifierCalloutInfo;
  let iconColor = theme.colors.primary;
  let iconName = 'information-outline';
  let title = 'Resolved from the Verus network';
  let description =
    'Review the currency and launch-system details before adding it.';

  if (trusted) {
    calloutStyle = styles.identifierCalloutTrusted;
    iconColor = theme.colors.success;
    iconName = 'shield-check-outline';
    title = 'Matches the wallet catalogue';
    description =
      'This metadata matches an asset included with Verus Mobile.';
  } else if (dynamicContract) {
    calloutStyle = styles.identifierCalloutWarning;
    iconColor = theme.colors.warning;
    iconName = 'alert-outline';
    title = 'Verify this contract';
    description =
      'Token details came directly from the contract. Confirm the address before trusting its name, symbol, or decimals.';
  }

  return (
    <View
      accessibilityRole={dynamicContract ? 'alert' : undefined}
      style={[styles.identifierCallout, calloutStyle]}>
      <MaterialCommunityIcons
        color={iconColor}
        name={iconName}
        size={21}
      />
      <View style={styles.identifierCalloutCopy}>
        <Text style={styles.identifierCalloutTitle}>{title}</Text>
        <Text style={styles.identifierCalloutDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const ReviewContent = ({pbaasCoin, result, styles, theme}) => {
  const pbaas = result.kind === 'pbaas';
  const currency = pbaas ? result.currencyDefinition : null;
  const name = pbaas
    ? result.catalogueMatch?.display_name || currency.fullyqualifiedname
    : result.name;
  const ticker = pbaas
    ? result.catalogueMatch?.display_ticker || currency.fullyqualifiedname
    : result.symbol;

  return (
    <>
      <View style={styles.identifierReviewHeader}>
        <View style={styles.identifierReviewIcon}>
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name={pbaas ? 'alpha-v-circle-outline' : 'ethereum'}
            size={24}
          />
        </View>
        <View style={styles.identifierReviewHeaderCopy}>
          <Text accessibilityRole="header" style={styles.identifierReviewName}>
            {name}
          </Text>
          <Text style={styles.identifierReviewTicker}>{ticker}</Text>
        </View>
      </View>

      <View
        style={styles.identifierReviewCard}
        testID={`asset-identifier-${result.kind}-review`}>
        <ReviewRow label="Name" styles={styles} value={name} />
        <ReviewRow label="Ticker" styles={styles} value={ticker} />
        {pbaas ? (
          <>
            <ReviewRow
              label="System"
              styles={styles}
              value={
                result.friendlyNames[currency.systemid] || currency.systemid
              }
            />
            <ReviewRow
              label="Launch system"
              styles={styles}
              value={
                result.launchSystem.fullyqualifiedname ||
                currency.launchsystemid ||
                currency.systemid
              }
            />
            <ReviewRow
              label="Currency ID"
              styles={styles}
              value={currency.currencyid}
            />
            <ReviewRow
              label="Launch status"
              styles={styles}
              value={getPbaasLaunchStatus(result, pbaasCoin)}
            />
          </>
        ) : (
          <>
            <ReviewRow
              label="Network"
              styles={styles}
              value={getNetworkName(result.network)}
            />
            <ReviewRow
              label="Contract"
              styles={styles}
              value={result.canonicalAddress}
            />
            <ReviewRow
              label="Decimals"
              styles={styles}
              value={result.decimals}
            />
          </>
        )}
      </View>

      <TrustCallout result={result} styles={styles} theme={theme} />
    </>
  );
};

const AddAssetByIdentifier = ({navigation}) => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const {compact} = useOnboardingSmallDeviceLayout();
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useObjectSelector(
    state => state.coins.activeCoinList || [],
  );
  const activeCoins = useObjectSelector(
    state => state.coins.activeCoinsForUser || [],
  );
  const [state, stateDispatch] = useReducer(reducer, INITIAL_STATE);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const addingRef = useRef(false);
  const activeCoinsRef = useRef(activeCoins);
  activeCoinsRef.current = activeCoins;

  const pbaasCoin = useMemo(() => {
    try {
      return CoinDirectory.findCoinObj(
        activeAccount?.testnetOverrides?.VRSC || 'VRSC',
      );
    } catch (error) {
      return null;
    }
  }, [activeAccount?.testnetOverrides?.VRSC]);

  const ethereumCoin = useMemo(() => {
    try {
      return CoinDirectory.findCoinObj(
        activeAccount?.testnetOverrides?.ETH || 'ETH',
      );
    } catch (error) {
      return null;
    }
  }, [activeAccount?.testnetOverrides?.ETH]);

  const classification = useMemo(
    () => classifyAssetIdentifier(state.input),
    [state.input],
  );
  const resolving = state.phase === PHASE.RESOLVING;
  const adding = state.phase === PHASE.ADDING;

  useEffect(
    () => () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!classification.kind || classification.error) return undefined;

    const timer = setTimeout(async () => {
      stateDispatch({type: 'RESOLVE_STARTED'});

      try {
        const result = await resolveAssetIdentifier({
          activeCoins: activeCoinsRef.current,
          ethereumCoin,
          identifier: classification.identifier,
          pbaasCoin,
        });

        if (
          mountedRef.current &&
          requestIdRef.current === requestId
        ) {
          stateDispatch({type: 'RESOLVE_SUCCEEDED', result});
        }
      } catch (error) {
        if (
          mountedRef.current &&
          requestIdRef.current === requestId
        ) {
          stateDispatch({
            type: 'RESOLVE_FAILED',
            error: getErrorMessage(error),
          });
        }
      }
    }, LOOKUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    classification.error,
    classification.identifier,
    classification.kind,
    ethereumCoin,
    pbaasCoin,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: PHASE_TITLES[state.phase],
      gestureEnabled: !adding,
    });
  }, [adding, navigation, state.phase]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (addingRef.current || adding) {
          event.preventDefault();
          return;
        }

        if (state.phase === PHASE.REVIEW) {
          event.preventDefault();
          stateDispatch({type: 'BACK_TO_INPUT'});
        }
      }),
    [adding, navigation, state.phase],
  );

  const handleInputChange = useCallback(input => {
    const nextClassification = classifyAssetIdentifier(input);
    stateDispatch({
      type: 'INPUT_CHANGED',
      input,
      error: nextClassification.error?.message,
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (addingRef.current || !state.result) return;

    addingRef.current = true;
    stateDispatch({type: 'ADD_STARTED'});

    try {
      const addedCoin = await addResolvedAsset({
        activeAccount,
        activeCoinList,
        activeCoins: activeCoinsRef.current,
        dispatch,
        result: state.result,
      });

      if (mountedRef.current) {
        stateDispatch({type: 'ADD_SUCCEEDED', addedCoin});
      }
    } catch (error) {
      if (mountedRef.current) {
        stateDispatch({
          type: 'ADD_FAILED',
          error: getErrorMessage(error),
        });
      }
    } finally {
      addingRef.current = false;
    }
  }, [activeAccount, activeCoinList, dispatch, state.result]);

  const renderInput = state.phase === PHASE.INPUT || resolving;
  const renderReview = state.phase === PHASE.REVIEW || adding;
  const continueDisabled =
    state.result == null ||
    resolving ||
    Boolean(state.error) ||
    !classification.identifier;
  const successName =
    state.addedCoin?.display_name ||
    state.addedCoin?.display_ticker ||
    'The asset';

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={styles.screen}
      testID="add-asset-by-identifier-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={68}
        style={styles.keyboardAvoider}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.identifierContent,
            compact && styles.identifierContentCompact,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
          {renderInput ? (
            <>
              <View style={styles.identifierIntro}>
                <Text accessibilityRole="header" style={styles.identifierTitle}>
                  Add any supported asset
                </Text>
                <Text style={styles.identifierDescription}>
                  Enter a Verus currency name or i-address, or paste an
                  Ethereum token contract. The wallet detects the system
                  automatically.
                </Text>
              </View>

              <View style={styles.identifierFieldGroup}>
                <Text
                  nativeID="asset-identifier-label"
                  style={styles.identifierFieldLabel}>
                  Asset identifier
                </Text>
                <TextInput
                  accessibilityLabel="Asset identifier"
                  accessibilityLabelledBy="asset-identifier-label"
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  numberOfLines={3}
                  onChangeText={handleInputChange}
                  placeholder="Currency name, i-address, or 0x contract"
                  placeholderTextColor={theme.colors.textSubtle}
                  spellCheck={false}
                  style={[
                    styles.identifierInput,
                    state.error && styles.identifierInputError,
                  ]}
                  testID="asset-identifier-input"
                  textAlignVertical="top"
                  value={state.input}
                />
                {state.error ? (
                  <View
                    accessibilityLiveRegion="assertive"
                    accessibilityRole="alert"
                    style={styles.identifierInlineError}
                    testID="asset-identifier-error">
                    <MaterialCommunityIcons
                      color={theme.colors.danger}
                      name="alert-circle-outline"
                      size={18}
                    />
                    <Text style={styles.identifierInlineErrorText}>
                      {state.error}
                    </Text>
                  </View>
                ) : null}
              </View>

              <DetectedSystem
                classification={classification}
                resolving={resolving}
                result={state.result}
                styles={styles}
                theme={theme}
              />
            </>
          ) : null}

          {renderReview && state.result ? (
            <>
              {adding ? (
                <View
                  accessibilityLiveRegion="polite"
                  accessibilityState={{busy: true}}
                  style={styles.identifierAdding}
                  testID="asset-identifier-adding">
                  <ActivityIndicator color={theme.colors.primary} size={28} />
                  <Text style={styles.identifierAddingTitle}>
                    Adding this asset…
                  </Text>
                  <Text style={styles.identifierAddingDescription}>
                    Keep this screen open while the wallet is updated.
                  </Text>
                </View>
              ) : (
                <Text style={styles.identifierReviewIntro}>
                  Confirm the resolved metadata before adding this asset to
                  your wallet.
                </Text>
              )}

              <ReviewContent
                pbaasCoin={pbaasCoin}
                result={state.result}
                styles={styles}
                theme={theme}
              />

              {state.error ? (
                <View
                  accessibilityLiveRegion="assertive"
                  accessibilityRole="alert"
                  style={styles.identifierInlineError}
                  testID="asset-identifier-add-error">
                  <MaterialCommunityIcons
                    color={theme.colors.danger}
                    name="alert-circle-outline"
                    size={18}
                  />
                  <Text style={styles.identifierInlineErrorText}>
                    {state.error}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {state.phase === PHASE.SUCCESS ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.identifierSuccess}
              testID="asset-identifier-success">
              <View style={styles.identifierSuccessIcon}>
                <MaterialCommunityIcons
                  color={theme.colors.success}
                  name="check-circle-outline"
                  size={40}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={styles.identifierSuccessTitle}>
                Asset added
              </Text>
              <Text style={styles.identifierSuccessDescription}>
                {successName} is now available in your wallet.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {renderInput ? (
          <SafeBottomActionStack
            bottomSpacing={14}
            gap={8}
            horizontalSpacing={20}
            safeAreaSpacing={12}
            style={styles.identifierFooter}>
            <AppButton
              accessibilityLabel="Continue to asset review"
              accessibilityState={{
                busy: resolving,
                disabled: continueDisabled,
              }}
              disabled={continueDisabled}
              loading={resolving}
              onPress={() => stateDispatch({type: 'REVIEW'})}
              testID="asset-identifier-continue"
              variant="primary">
              {resolving ? 'Resolving asset' : 'Continue to review'}
            </AppButton>
          </SafeBottomActionStack>
        ) : null}

        {renderReview ? (
          <SafeBottomActionStack
            bottomSpacing={14}
            gap={8}
            horizontalSpacing={20}
            safeAreaSpacing={12}
            style={styles.identifierFooter}>
            <AppButton
              accessibilityLabel="Add asset to wallet"
              accessibilityState={{busy: adding, disabled: adding}}
              disabled={adding}
              loading={adding}
              onPress={handleAdd}
              testID="asset-identifier-add"
              variant="primary">
              {adding ? 'Adding asset' : 'Add asset'}
            </AppButton>
            {!adding ? (
              <AppButton
                accessibilityLabel="Back to identifier"
                onPress={() => stateDispatch({type: 'BACK_TO_INPUT'})}
                testID="asset-identifier-back"
                variant="secondary">
                Back to edit
              </AppButton>
            ) : null}
          </SafeBottomActionStack>
        ) : null}

        {state.phase === PHASE.SUCCESS ? (
          <SafeBottomActionStack
            bottomSpacing={14}
            gap={8}
            horizontalSpacing={20}
            safeAreaSpacing={12}
            style={styles.identifierFooter}>
            <AppButton
              accessibilityLabel="Back to Manage assets"
              onPress={() => navigation.navigate('ManageAssets')}
              testID="asset-identifier-manage-assets"
              variant="primary">
              Back to Manage assets
            </AppButton>
            <AppButton
              accessibilityLabel="Return to wallet"
              onPress={() => navigation.navigate('Home')}
              testID="asset-identifier-return-wallet"
              variant="secondary">
              Return to wallet
            </AppButton>
          </SafeBottomActionStack>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddAssetByIdentifier;
