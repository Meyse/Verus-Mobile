import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedSuccessCheckmark from '../../components/AnimatedSuccessCheckmark';
import CopyAction from '../../components/CopyAction';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {useSendWizard} from './SendWizardContext';
import {WizardFooter, WizardScreen} from './components/WizardUI';
import {getTransactionId} from './wizardUtils';

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
    target,
    txResult,
  } = state;
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
    ? 'Conversion sent!'
    : isBridge
    ? 'Bridge transaction sent!'
    : 'Transaction sent!';
  const subtitle = isConversion
    ? 'Your conversion has been submitted to the Verus network.'
    : isBridge
    ? 'Your cross-chain transfer is on its way.'
    : 'Your transaction has been submitted to the network.';

  const finish = () => {
    const parent = navigation.getParent?.();
    if (parent && typeof parent.reset === 'function') {
      parent.reset({
        index: 0,
        routes: [{name: 'Home', params: {screen: 'WalletHome'}}],
      });
      return;
    }
    navigation.navigate('Home', {screen: 'WalletHome'});
  };

  return (
    <WizardScreen scroll={false}>
      <View style={styles.content}>
        <AnimatedSuccessCheckmark style={styles.successAnimation} />
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>{title}</Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          {subtitle}
        </Text>
        <View style={[styles.summary, {backgroundColor: theme.colors.surfaceMuted}]}>
          <View style={styles.amountRow}>
            {RenderSquareCoinLogo(sourceCoin?.id, {}, 36, 36)}
            <View style={styles.amountCopy}>
              <Text style={[styles.amountLabel, {color: theme.colors.textSecondary}]}>SENT</Text>
              <Text style={[styles.amountValue, {color: theme.colors.textPrimary}]}>
                {truncateDecimal(displayAmount, 8)} {sourceCoin?.display_ticker || ''}
              </Text>
            </View>
          </View>
          {isConversion && estimatedReceive != null ? (
            <>
              <View style={styles.arrowContainer}>
                <MaterialCommunityIcons name="arrow-down" size={20} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.amountRow}>
                {RenderSquareCoinLogo(target.coinId || target.id, {}, 36, 36)}
                <View style={styles.amountCopy}>
                  <Text style={[styles.amountLabel, {color: theme.colors.textSecondary}]}>ESTIMATED RECEIVE</Text>
                  <Text style={[styles.amountValue, {color: theme.colors.textPrimary}]}>
                    ≈ {truncateDecimal(BigNumber(estimatedReceive), 8)} {target.ticker}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
          <ResultRow theme={theme} label="To" value={recipientAddress || ''} />
          {isBridge ? (
            <ResultRow
              theme={theme}
              label="Destination"
              value={route?.exportToFqn || route?.exportTo || ''}
            />
          ) : null}
          <ResultRow
            theme={theme}
            label="Expected arrival"
            value={isBridge ? 'After cross-chain confirmations' : 'Usually within minutes'}
          />
          {txid ? (
            <View style={[styles.txRow, {borderTopColor: theme.colors.border}]}>
              <View style={styles.txCopy}>
                <Text style={[styles.txLabel, {color: theme.colors.textSecondary}]}>Transaction ID</Text>
                <Text
                  ellipsizeMode="middle"
                  numberOfLines={1}
                  selectable
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
        <Text style={[styles.infoNote, {color: theme.colors.textSubtle}]}>
          {isConversion
            ? 'The received amount can change slightly until the conversion confirms.'
            : isBridge
            ? 'Cross-chain transfers need confirmations on both networks.'
            : 'You can follow the transaction from this Asset’s activity.'}
        </Text>
      </View>
      <WizardFooter bottomSpacing={40} horizontalSpacing={24} onPress={finish}>Done</WizardFooter>
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  content: {flex: 1, paddingHorizontal: 24, paddingTop: 80, alignItems: 'center'},
  successAnimation: {width: 90, height: 90},
  title: {fontSize: 28, lineHeight: 34, textAlign: 'center', marginTop: 18, ...fontStyle('bold')},
  subtitle: {fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, marginBottom: 32, maxWidth: 320, ...fontStyle('regular')},
  summary: {width: '100%', borderRadius: 16, padding: 20, marginBottom: 24},
  amountRow: {flexDirection: 'row', alignItems: 'center'},
  amountCopy: {flex: 1, marginLeft: 12},
  amountLabel: {fontSize: 12, lineHeight: 17, letterSpacing: 0.5, ...fontStyle('regular')},
  amountValue: {fontSize: 18, lineHeight: 24, marginTop: 2, ...fontStyle('bold')},
  arrowContainer: {alignItems: 'center', paddingVertical: 12},
  detailRow: {paddingTop: 16, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  detailLabel: {fontSize: 14, lineHeight: 19, ...fontStyle('regular')},
  detailValue: {maxWidth: '60%', textAlign: 'right', fontSize: 14, lineHeight: 19, ...fontStyle('semiBold')},
  txRow: {minHeight: 58, paddingTop: 16, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center'},
  txCopy: {flex: 1, minWidth: 0},
  txLabel: {fontSize: 13, lineHeight: 18, ...fontStyle('regular')},
  txid: {fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: 'Menlo'},
  infoNote: {fontSize: 13, lineHeight: 18, textAlign: 'center', ...fontStyle('regular')},
});

const ResultRow = ({label, theme, value}) => (
  <View style={[styles.detailRow, {borderTopColor: theme.colors.border}]}>
    <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>{label}</Text>
    <Text numberOfLines={2} style={[styles.detailValue, {color: theme.colors.textPrimary}]}>{value}</Text>
  </View>
);

export default SendWizardSuccess;
