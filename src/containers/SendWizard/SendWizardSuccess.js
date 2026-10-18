import React, {useCallback} from 'react';
import {BackHandler, Platform, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import AnimatedSuccessCheckmark from '../../components/AnimatedSuccessCheckmark';
import CopyAction from '../../components/CopyAction';
import FadedScrollView from '../../components/FadedScrollView';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {useSendWizard} from './SendWizardContext';
import {
  TransferConnector,
  TransferNode,
} from './components/TransferSummary';
import {FlatRow, WizardFooter, WizardScreen} from './components/WizardUI';
import {useWizardFiat} from './useWizardFiat';
import {
  getDestinationNetwork,
  getTransactionId,
  shortenRecipient,
} from './wizardUtils';

const SendWizardSuccess = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const {state} = useSendWizard();
  const {
    amount,
    estimate,
    preflightResult,
    recipientAddress,
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
  const title = isConversion
    ? 'Conversion sent'
    : isBridge
    ? 'Bridge transaction sent'
    : 'Transaction sent';
  const showReceive = Boolean(isConversion && estimatedReceive != null);
  const recipientLabel = shortenRecipient(recipientAddress);
  const showRecipientRow =
    !showReceive || recipientLabel !== recipientAddress;

  const finish = useCallback(() => {
    const parent = navigation.getParent?.();
    if (parent && typeof parent.reset === 'function') {
      parent.reset({
        index: 0,
        routes: [{name: 'Home', params: {screen: 'WalletHome'}}],
      });
      return;
    }
    navigation.navigate('Home', {screen: 'WalletHome'});
  }, [navigation]);

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
        containerStyle={styles.scrollViewport}
        contentContainerStyle={styles.content}
        fadeBackgroundColor={theme.colors.background}>
        <View style={styles.titleRow}>
          <AnimatedSuccessCheckmark style={styles.successAnimation} />
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
        <View style={styles.summary}>
          <TransferNode
            amount={truncateDecimal(displayAmount, 8)}
            coinId={sourceCoin?.id}
            fiat={formatFiat(displayAmount, sourceCoin?.id)}
            label={showReceive ? 'You paid' : 'You sent'}
            ticker={sourceCoin?.display_ticker || ''}
          />
          {showReceive ? (
            <>
              {route?.via ? (
                <TransferConnector>{`via ${route.viaFqn || route.via}`}</TransferConnector>
              ) : null}
              <TransferNode
                amount={`≈ ${truncateDecimal(BigNumber(estimatedReceive), 8)}`}
                coinId={target.coinId || target.id}
                fiat={formatFiat(estimatedReceive, target.coinId || target.id)}
                name={recipientLabel}
                suffix="receives"
                ticker={target.ticker}
              />
            </>
          ) : null}
        </View>
        <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
          {showRecipientRow ? (
            <FlatRow
              label="To"
              numberOfLines={0}
              value={recipientAddress}
              valueStyle={recipientAddress.endsWith('@') ? null : styles.address}
            />
          ) : null}
          {isBridge ? (
            <FlatRow
              label="Destination"
              value={getDestinationNetwork(route)}
            />
          ) : null}
          <FlatRow
            label="Arrives"
            value={isBridge ? 'After cross-chain confirmations' : 'Usually within minutes'}
          />
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
      <WizardFooter bottomSpacing={40} horizontalSpacing={24} onPress={finish}>Done</WizardFooter>
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  scrollViewport: {flex: 1},
  content: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28},
  titleRow: {flexDirection: 'row', alignItems: 'center'},
  successAnimation: {width: 64, height: 64, marginLeft: -10},
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
