import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {CONVERSION_DISABLED} from '../../../env/index';
import AppSearchField from '../../components/AppSearchField';
import SkeletonLoader, {SkeletonRow} from '../../components/SkeletonLoader';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {getConversionPaths} from '../../utils/api/routers/getConversionPaths';
import {useSendWizard} from './SendWizardContext';
import {
  ErrorMessage,
  WIZARD_CONTENT_INSET,
  WizardHeading,
  WizardScreen,
} from './components/WizardUI';
import {TargetNetworkSheet} from './components/SelectionSheets';
import {
  buildTargetOptions,
  isConversionChannel,
  isPopularTarget,
} from './wizardUtils';

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
  const [networkSheetVisible, setNetworkSheetVisible] = useState(false);
  const sourceNetworkId =
    channel?.split('.')[2] || sourceCoin?.system_id || sourceCoin?.id;

  useEffect(() => {
    if (!sourceCoin || !channel) {
      setLoading(false);
      return undefined;
    }

    if (!isConversionChannel(channel)) {
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
  }, [channel, sourceCoin]);

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
  const conversionOptions = useMemo(
    () => options.filter(option => option.isConversion),
    [options],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversionOptions;
    return conversionOptions.filter(option =>
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
  }, [conversionOptions, query]);
  const popular = filtered.filter(isPopularTarget);
  const other = filtered.filter(option => !isPopularTarget(option));

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
      setNetworkSheetVisible(true);
      return;
    }

    chooseNetwork(networkOptions[0]);
  };

  const renderOption = option => (
    <Pressable
      key={option.id}
      onPress={() => chooseTarget(option)}
      style={({pressed}) => [styles.optionRow, pressed && styles.pressed]}>
      <View style={styles.optionLogo}>
        <AssetCoinLogo
          coinId={option.coinId || option.id}
          showBadge={!option.isGrouped}
          size={40}
        />
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
      <WizardHeading>What should the recipient receive?</WizardHeading>
      <AppSearchField
        accessibilityLabel="Search currencies"
        onChangeText={setQuery}
        placeholder="Search currencies"
        resultCount={filtered.length}
        style={styles.searchSpacing}
        value={query}
      />
      {loading ? (
        <SkeletonLoader accessibilityLabel="Loading transfer options" style={styles.skeleton}>
          <SkeletonRow labelWidth="18%" valueWidth="78%" />
          <SkeletonRow labelWidth="18%" valueWidth="66%" />
          <SkeletonRow labelWidth="18%" valueWidth="72%" />
        </SkeletonLoader>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ErrorMessage>{error}</ErrorMessage>
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
          {popular.length === 0 && other.length === 0 ? (
            <Text style={[styles.empty, {color: theme.colors.textSecondary}]}>
              {query.trim()
                ? 'No matching conversion options.'
                : 'No conversion routes available.'}
            </Text>
          ) : null}
        </ScrollView>
      )}
      <TargetNetworkSheet
        target={pendingTarget}
        options={pendingTarget?.networkOptions || []}
        visible={networkSheetVisible}
        onClose={() => setNetworkSheetVisible(false)}
        onClosed={() => setPendingTarget(null)}
        onSelect={chooseNetwork}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  content: {paddingBottom: 32},
  skeleton: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingTop: 20,
  },
  searchSpacing: {
    marginHorizontal: WIZARD_CONTENT_INSET,
    marginBottom: 14,
  },
  section: {marginBottom: 24},
  sectionLabel: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...fontStyle('semiBold'),
  },
  optionRow: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLogo: {width: 40, height: 40, marginRight: 28},
  optionName: {flex: 1, fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  pressed: {opacity: 0.7},
  empty: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 32,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
});

export default SendWizardSelectTarget;
