import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {CONVERSION_DISABLED} from '../../../env/index';
import SkeletonLoader, {SkeletonRow} from '../../components/SkeletonLoader';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {getConversionPaths} from '../../utils/api/routers/getConversionPaths';
import {
  ERC20,
  ETH,
  VRPC,
  WYRE_SERVICE,
} from '../../utils/constants/intervalConstants';
import {useSendWizard} from './SendWizardContext';
import {ErrorMessage, WizardHeading, WizardScreen} from './components/WizardUI';
import {TargetNetworkSheet} from './components/SelectionSheets';
import {
  buildTargetOptions,
  isPopularTarget,
} from './wizardUtils';

const PATH_CHANNELS = [VRPC, ETH, ERC20, WYRE_SERVICE];

const SendWizardSelectTarget = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const {state, setTarget} = useSendWizard();
  const {sourceCoin, channel} = state;
  const [paths, setPaths] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [pendingTarget, setPendingTarget] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const channelType = channel?.split('.')[0];
  const sourceNetworkId =
    channel?.split('.')[2] || sourceCoin?.system_id || sourceCoin?.id;
  const conversionSupported = PATH_CHANNELS.includes(channelType);

  useEffect(() => {
    if (!sourceCoin || !channel) {
      setLoading(false);
      return undefined;
    }

    if (!PATH_CHANNELS.includes(channelType)) {
      setPaths({});
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);
    getConversionPaths(sourceCoin, channel, {
      src: sourceCoin.currency_id || sourceCoin.id,
    })
      .then(result => {
        if (active) setPaths(result || {});
      })
      .catch(pathError => {
        if (active) {
          setPaths({});
          setError(pathError.message || 'Conversion routes are unavailable.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channel, channelType, sourceCoin]);

  const options = useMemo(
    () =>
      buildTargetOptions(
        paths,
        sourceCoin,
        CONVERSION_DISABLED,
        sourceNetworkId,
      ),
    [paths, sourceCoin, sourceNetworkId],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(option =>
      [
        option.name,
        option.ticker,
        option.id,
        option.fullyqualifiedname,
        ...(option.networkOptions || []).flatMap(network => [
          network.name,
          network.ticker,
          network.id,
          network.fullyqualifiedname,
          network.networkName,
        ]),
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalized)),
    );
  }, [options, query]);
  const sendOption = filtered.find(option => !option.isConversion);
  const popular = filtered.filter(option => option.isConversion && isPopularTarget(option));
  const other = filtered.filter(option => option.isConversion && !isPopularTarget(option));

  const chooseRoute = (target, route) => {
    setPendingTarget(null);
    setTarget(target, route);
    navigation.navigate('SendWizardAmount');
  };

  const chooseNetwork = target => {
    const directRoute = target.routes.find(route => !route.via) || target.routes[0];
    chooseRoute(target, directRoute);
  };

  const chooseTarget = target => {
    const networkOptions = target.networkOptions || [target];
    if (networkOptions.length > 1) {
      setPendingTarget(target);
      return;
    }

    chooseNetwork(networkOptions[0]);
  };

  const chooseDirectSend = target => {
    const directRoute =
      target.routes.find(route => !route.isCrossChain && !route.via) ||
      target.routes.find(route => !route.isCrossChain) ||
      target.routes[0];
    chooseRoute(target, directRoute);
  };

  const renderOption = option => (
    <Pressable
      key={option.id}
      onPress={() => chooseTarget(option)}
      style={({pressed}) => [styles.optionRow, pressed && styles.pressed]}>
      <View style={styles.optionLogo}>
        {RenderSquareCoinLogo(option.coinId || option.id, {}, 40, 40)}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.optionName, {color: theme.colors.textPrimary}]}>
        {option.name}
      </Text>
      {(option.networkOptions || []).length > 1 ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.textSubtle}
        />
      ) : null}
    </Pressable>
  );

  if (!sourceCoin) {
    return (
      <WizardScreen>
        <WizardHeading>Select a source first</WizardHeading>
        <ErrorMessage>The transfer source is missing. Go back and choose an Asset and Card.</ErrorMessage>
      </WizardScreen>
    );
  }

  return (
    <WizardScreen scroll={false}>
      <View style={styles.header}>
        <Text style={[styles.mainTitle, {color: theme.colors.textPrimary}]}>
          What should the recipient receive?
        </Text>
        <View
          style={[
            styles.search,
            {
              backgroundColor: searchFocused
                ? theme.colors.background
                : theme.colors.input,
              borderColor: searchFocused
                ? theme.colors.primary
                : 'transparent',
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
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={theme.colors.textSubtle}
            style={styles.searchIcon}
          />
        </View>
      </View>
      {loading ? (
        <SkeletonLoader accessibilityLabel="Loading transfer options" style={styles.skeleton}>
          <SkeletonRow labelWidth="18%" valueWidth="78%" />
          <SkeletonRow labelWidth="18%" valueWidth="66%" />
          <SkeletonRow labelWidth="18%" valueWidth="72%" />
        </SkeletonLoader>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ErrorMessage>{error}</ErrorMessage>
          {sendOption ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>Send</Text>
              <Pressable
                onPress={() => chooseDirectSend(sendOption)}
                style={({pressed}) => [
                  styles.sendPrimary,
                  {backgroundColor: theme.colors.surfaceMuted},
                  pressed && styles.pressed,
                ]}>
                <View style={styles.optionLogo}>
                  {RenderSquareCoinLogo(sendOption.coinId || sendOption.id, {}, 40, 40)}
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionName, {color: theme.colors.textPrimary}]}>
                    {sendOption.name}
                  </Text>
                  <Text style={[styles.optionTicker, {color: theme.colors.textSecondary}]}>
                    {sendOption.ticker}
                  </Text>
                </View>
              </Pressable>
              {sendOption.routes.some(route => route.isCrossChain) ? (
                <Pressable
                  onPress={() =>
                    setPendingTarget({
                      ...sendOption,
                      networkOptions: sendOption.networkOptions
                        .map(option => ({
                          ...option,
                          routes: option.routes.filter(
                            route => route.isCrossChain,
                          ),
                        }))
                        .filter(option => option.routes.length > 0),
                    })
                  }
                  style={({pressed}) => [styles.crossChain, pressed && styles.pressed]}>
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.crossChainText, {color: theme.colors.textSecondary}]}>Cross-chain send available</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.textSubtle}
                  />
                </Pressable>
              ) : null}
              {!conversionSupported ? (
                <Text
                  style={[
                    styles.cardCapability,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Conversions aren’t available from this Card. Choose another
                  Card with conversion support to convert this asset.
                </Text>
              ) : null}
            </View>
          ) : null}
          {popular.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>Popular conversions</Text>
              {popular.map(renderOption)}
            </View>
          ) : null}
          {other.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>More conversions</Text>
              {other.map(renderOption)}
            </View>
          ) : null}
          {!sendOption && popular.length === 0 && other.length === 0 ? (
            <Text style={[styles.empty, {color: theme.colors.textSecondary}]}>
              No matching transfer options.
            </Text>
          ) : null}
        </ScrollView>
      )}
      <TargetNetworkSheet
        target={pendingTarget}
        options={pendingTarget?.networkOptions || []}
        visible={Boolean(pendingTarget)}
        onClose={() => setPendingTarget(null)}
        onSelect={chooseNetwork}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  content: {paddingBottom: 32},
  skeleton: {paddingHorizontal: 20, paddingTop: 20},
  header: {paddingHorizontal: 20, paddingBottom: 16},
  mainTitle: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.2,
    ...fontStyle('bold'),
  },
  search: {
    height: 52,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  searchIcon: {marginHorizontal: 16},
  section: {marginBottom: 24},
  sectionLabel: {
    paddingHorizontal: 20,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...fontStyle('semiBold'),
  },
  sendPrimary: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  crossChain: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  crossChainText: {flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 19, ...fontStyle('regular')},
  cardCapability: {
    paddingHorizontal: 20,
    paddingTop: 4,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  optionRow: {paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center'},
  optionLogo: {width: 40, height: 40, marginRight: 28},
  optionCopy: {flex: 1},
  optionName: {flex: 1, fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  optionTicker: {fontSize: 13, lineHeight: 18, marginTop: 2, ...fontStyle('medium')},
  pressed: {opacity: 0.7},
  empty: {padding: 32, textAlign: 'center', fontSize: 15, lineHeight: 22, ...fontStyle('regular')},
});

export default SendWizardSelectTarget;
