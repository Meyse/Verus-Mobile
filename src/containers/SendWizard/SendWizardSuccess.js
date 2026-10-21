import React, {useCallback} from 'react';
import {BackHandler, Platform, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import BigNumber from 'bignumber.js';
import AnimatedSuccessCheckmark from '../../components/AnimatedSuccessCheckmark';
import CopyAction from '../../components/CopyAction';
import FadedScrollView from '../../components/FadedScrollView';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {useSendWizard} from './SendWizardContext';
import {useInvoiceFlow} from './invoiceFlow';
import {
  TransferConnector,
  TransferNode,
} from './components/TransferSummary';
import {formatEstimatedAmount} from './components/impactFormat';
import {FlatRow, WizardFooter, WizardScreen} from './components/WizardUI';
import {useWizardFiat} from './useWizardFiat';
import {
  getDestinationNetwork,
  getTransactionId,
  shortAddress,
} from './wizardUtils';

const SendWizardSuccess = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const {state} = useSendWizard();
  const invoiceFlow = useInvoiceFlow();
  const {
    amount,
    estimate,
    preflightResult,
    route,
    sourceCoin,
    sourceSubWallet,
    target,
    txResult,
  } = state;
  const {format: formatFiat} = useWizardFiat(sourceSubWallet);
  const txid = getTransactionId(txResult);
  const estimatedReceive =
    preflightResult?.estimate?.estimatedcurrencyout ||
    estimate?.estimatedcurrencyout;
  const isConversion = Boolean(target?.isConversion);
  const isBridge = Boolean(route?.isCrossChain);
  const displayAmount =
    !isConversion && !isBridge && preflightResult?.value != null
      ? BigNumber(preflightResult.value)
      : preflightResult?.submittedsats && preflightResult?.output?.satoshis
      ? satsToCoins(BigNumber(preflightResult.output.satoshis))
      : BigNumber(amount || 0);
  const title = invoiceFlow
    ? 'Payment sent'
    : isConversion
    ? 'Conversion sent'
    : isBridge
    ? 'Bridge transaction sent'
    : 'Transaction sent';
  const showReceive = Boolean(isConversion && estimatedReceive != null);

  const finish = useCallback(() => {
    // An invoice hands back to its request, or closes the invoice.
    if (invoiceFlow) {
      invoiceFlow.onPaid();
      return;
    }
    const parent = navigation.getParent?.();
    if (parent && typeof parent.reset === 'function') {
      parent.reset({
        index: 0,
        routes: [{name: 'Home', params: {screen: 'WalletHome'}}],
      });
      return;
    }
    navigation.navigate('Home', {screen: 'WalletHome'});
  }, [invoiceFlow, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        finish();
        return true;
      });
      return () => subscription.remove();
    }, [finish]),
  );

  return (
    <WizardScreen scroll={false}>
      <FadedScrollView
        containerStyle={[styles.scrollViewport, {marginTop: insets.top}]}
        contentContainerStyle={[styles.content, smallDevice && styles.contentCompact]}
        fadeBackgroundColor={theme.colors.background}>
        <View style={styles.titleRow}>
          <AnimatedSuccessCheckmark
            style={smallDevice ? styles.successAnimationCompact : styles.successAnimation}
          />
          <Text
            accessibilityRole="header"
            style={[
              theme.typography.headlineMd,
              styles.title,
              {color: theme.colors.textPrimary},
            ]}>
            {title}
          </Text>
        </View>
        <View style={[styles.summary, smallDevice && styles.sectionCompact]}>
          <TransferNode
            amount={truncateDecimal(displayAmount, 8)}
            coinId={sourceCoin?.id}
            fiat={formatFiat(displayAmount, sourceCoin?.id)}
            label={showReceive || invoiceFlow ? 'You paid' : 'You sent'}
            ticker={sourceCoin?.display_ticker || ''}
          />
          {showReceive ? (
            <>
              {route?.via ? (
                <TransferConnector>{`via ${route.viaFqn || route.via}`}</TransferConnector>
              ) : null}
              <TransferNode
                amount={`≈ ${formatEstimatedAmount(estimatedReceive)}`}
                coinId={target.coinId || target.id}
                fiat={formatFiat(estimatedReceive, target.coinId || target.id)}
                label={
                  invoiceFlow
                    ? `${shortAddress(state.recipientAddress, 4)} receives`
                    : 'You receive'
                }
                ticker={target.ticker}
              />
            </>
          ) : null}
        </View>
        <View
          style={[
            styles.rows,
            smallDevice && styles.sectionCompact,
            {borderTopColor: theme.colors.border},
          ]}>
          {isBridge ? (
            <FlatRow
              label="Destination"
              value={getDestinationNetwork(route)}
            />
          ) : null}
          {txid ? (
            <View style={[styles.txRow, {borderBottomColor: theme.colors.border}]}>
              <View style={styles.txCopy}>
                <Text style={[styles.txLabel, {color: theme.colors.textSecondary}]}>Transaction ID</Text>
                <Text
                  ellipsizeMode="middle"
                  numberOfLines={1}
                  style={[styles.txid, {color: theme.colors.textPrimary}]}>
                  {txid}
                </Text>
              </View>
              <CopyAction
                accessibilityLabel="Copy transaction ID"
                copiedAccessibilityLabel="Transaction ID copied"
                value={txid}
              />
            </View>
          ) : null}
        </View>
        <Text style={[theme.typography.caption, styles.infoNote, {color: theme.colors.textSubtle}]}>
          {isConversion
            ? 'The final amount can change slightly until it confirms.'
            : isBridge
            ? 'Cross-chain transfers need confirmations on both networks.'
            : 'You can follow the transaction from this Asset’s activity.'}
        </Text>
      </FadedScrollView>
      <WizardFooter
        bottomSpacing={smallDevice ? 24 : 40}
        horizontalSpacing={24}
        onPress={finish}>
        Done
      </WizardFooter>
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  scrollViewport: {flex: 1},
  content: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28},
  titleRow: {flexDirection: 'row', alignItems: 'center'},
  contentCompact: {paddingTop: 16},
  successAnimation: {width: 64, height: 64, marginLeft: -10},
  successAnimationCompact: {width: 48, height: 48, marginLeft: -6},
  sectionCompact: {marginTop: 12},
  title: {flex: 1, marginLeft: 4},
  summary: {marginTop: 24},
  rows: {marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth},
  address: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, lineHeight: 18},
  txRow: {minHeight: 58, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center'},
  txCopy: {flex: 1, minWidth: 0, marginRight: 8},
  txLabel: {fontSize: 14, lineHeight: 19, ...fontStyle('regular')},
  txid: {fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  infoNote: {marginTop: 14},
});

export default SendWizardSuccess;
