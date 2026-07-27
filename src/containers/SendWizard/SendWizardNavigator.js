import React, {useMemo, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import BigNumber from 'bignumber.js';
import {CONVERSION_DISABLED} from '../../../env/index';
import AppButton from '../../components/AppButton';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import {WALLET_APP_SEND} from '../../utils/constants/apps';
import {
  API_GET_BALANCES,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {SendWizardProvider} from './SendWizardContext';
import SendWizardSelectSource from './SendWizardSelectSource';
import SendWizardSelectTarget from './SendWizardSelectTarget';
import SendWizardAmount from './SendWizardAmount';
import SendWizardRecipient from './SendWizardRecipient';
import SendWizardConfirm from './SendWizardConfirm';
import SendWizardSuccess from './SendWizardSuccess';
import SendWizardHeader, {
  getSendWizardProgress,
} from './components/SendWizardHeader';
import {
  buildSendTarget,
  isConversionChannel,
  SEND_WIZARD_MODE,
} from './wizardUtils';

const Stack = createStackNavigator();

const closeWizard = navigation => {
  const parent = navigation.getParent?.();
  if (parent?.goBack) parent.goBack();
  else navigation.goBack();
};

const goBackOrClose = navigation => {
  if (navigation.canGoBack?.()) navigation.goBack();
  else closeWizard(navigation);
};

const SendWizardNavigator = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useOnboardingTheme();
  const requestedMode = route.params?.mode;
  const mode =
    requestedMode === SEND_WIZARD_MODE.CONVERT
      ? SEND_WIZARD_MODE.CONVERT
      : SEND_WIZARD_MODE.SEND;
  const initialCoinId = route.params?.initialCoinId;
  const initialSubWalletId = route.params?.initialSubWalletId;
  const coins = useObjectSelector(state => state.coins.activeCoinsForUser);
  const cardsByCoin = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const initialSource = useMemo(() => {
    if (!initialCoinId) return null;
    const sourceCoin = coins.find(coin => coin.id === initialCoinId);
    if (!sourceCoin) return null;

    const eligibleCards = (cardsByCoin[sourceCoin.id] || []).filter(
      card => {
        const channel = card.api_channels?.[API_SEND];
        const canSend =
          card.compatible_apps?.includes(WALLET_APP_SEND) && Boolean(channel);

        return (
          canSend &&
          (mode !== SEND_WIZARD_MODE.CONVERT ||
            (!CONVERSION_DISABLED && isConversionChannel(channel)))
        );
      },
    );
    let sourceSubWallet;
    if (initialSubWalletId) {
      sourceSubWallet = eligibleCards.find(
        card => card.id === initialSubWalletId,
      );
      if (
        !sourceSubWallet ||
        !BigNumber(
          balances?.[sourceCoin.id]?.[sourceSubWallet.id]?.total || 0,
        ).isGreaterThan(0)
      ) {
        return null;
      }
    } else {
      sourceSubWallet = eligibleCards.find(card =>
        BigNumber(
          balances?.[sourceCoin.id]?.[card.id]?.total || 0,
        ).isGreaterThan(0),
      );
    }
    if (!sourceSubWallet) return null;

    return {
      sourceCoin,
      sourceSubWallet,
      sourceBalance: String(
        balances?.[sourceCoin.id]?.[sourceSubWallet.id]?.total || 0,
      ),
      channel: sourceSubWallet.api_channels[API_SEND],
    };
  }, [
    balances,
    cardsByCoin,
    coins,
    initialCoinId,
    initialSubWalletId,
    mode,
  ]);
  const initialState = useMemo(() => {
    if (!initialSource || mode !== SEND_WIZARD_MODE.SEND) {
      return initialSource;
    }

    const sourceNetworkId =
      initialSource.channel?.split('.')[2] ||
      initialSource.sourceCoin.system_id ||
      initialSource.sourceCoin.id;
    const target = buildSendTarget(
      {},
      initialSource.sourceCoin,
      sourceNetworkId,
    );
    const directRoute =
      target.routes.find(candidate => !candidate.isCrossChain && !candidate.via) ||
      target.routes[0];

    return {...initialSource, target, route: directRoute};
  }, [initialSource, mode]);
  const hasInitialSource = Boolean(initialSource);
  let initialRouteName = 'SendWizardSelectSource';
  if (hasInitialSource) {
    initialRouteName =
      mode === SEND_WIZARD_MODE.SEND
        ? 'SendWizardAmount'
        : 'SendWizardSelectTarget';
  }
  const invalidInitialSource = Boolean(
    initialCoinId && coins.length > 0 && !initialSource,
  );
  const progressAnimation = useRef({
    generation: 0,
    value: new Animated.Value(
      getSendWizardProgress(initialRouteName, mode, hasInitialSource),
    ),
  }).current;

  if (invalidInitialSource) {
    return (
      <View style={[styles.errorState, {backgroundColor: theme.colors.background}]}>
        <Text style={[styles.errorTitle, {color: theme.colors.textPrimary}]}>
          Transfer unavailable
        </Text>
        <Text style={[styles.errorBody, {color: theme.colors.textSecondary}]}>
          This Asset or Card is unavailable or has no spendable balance.
        </Text>
        <AppButton
          onPress={() => navigation.goBack()}
          style={styles.errorAction}
          variant="secondary">
          Close
        </AppButton>
      </View>
    );
  }

  return (
    <SendWizardProvider
      key={
        initialState
          ? `${mode}:${initialState.sourceCoin.id}:${initialState.sourceSubWallet.id}`
          : `${mode}:manual`
      }
      initialState={initialState}
      mode={mode}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={() => ({
          title: '',
          cardStyle: {backgroundColor: theme.colors.background},
          header: ({navigation, options, route: headerRoute}) => (
            <SendWizardHeader
              disabled={Boolean(options.wizardNavigationDisabled)}
              onBack={
                headerRoute.name === 'SendWizardSuccess'
                  ? undefined
                  : () => goBackOrClose(navigation)
              }
              onClose={() => closeWizard(navigation)}
              progress={getSendWizardProgress(
                headerRoute.name,
                mode,
                hasInitialSource,
              )}
              progressAnimation={progressAnimation}
            />
          ),
        })}>
        <Stack.Screen name="SendWizardSelectSource" component={SendWizardSelectSource} />
        <Stack.Screen name="SendWizardSelectTarget" component={SendWizardSelectTarget} />
        <Stack.Screen name="SendWizardAmount" component={SendWizardAmount} />
        <Stack.Screen name="SendWizardRecipient" component={SendWizardRecipient} />
        <Stack.Screen name="SendWizardConfirm" component={SendWizardConfirm} />
        <Stack.Screen
          name="SendWizardSuccess"
          component={SendWizardSuccess}
          options={{gestureEnabled: false}}
        />
      </Stack.Navigator>
    </SendWizardProvider>
  );
};

const styles = StyleSheet.create({
  errorState: {flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center'},
  errorTitle: {fontSize: 20, lineHeight: 26, textAlign: 'center', ...fontStyle('bold')},
  errorBody: {fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center', ...fontStyle('regular')},
  errorAction: {minWidth: 160, marginTop: 24},
});

export default SendWizardNavigator;
