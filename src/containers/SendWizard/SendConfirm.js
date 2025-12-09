// Wizard confirm step: review preflight and dispatch send without legacy modal
import React, { useMemo, useState, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import { useWizardState } from './state/WizardStateContext';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { send } from '../../utils/api/routers/send';
import { sendConvertOrCrossChain } from '../../utils/api/routers/sendConvertOrCrossChain';
import { API_GET_BALANCES, API_GET_TRANSACTIONS, API_GET_FIATPRICE, API_SEND } from '../../utils/constants/intervalConstants';
import { expireCoinData } from '../../actions/actionCreators';
import { useDispatch } from 'react-redux';

const Row = ({ label, value, muted }) => (
  <View style={styles.row}>
    <Text style={[styles.label, muted ? styles.muted : null]}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const SendConfirm = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { wizardState, clearWizardState } = useWizardState();
  const {
    sourceCoin,
    sourceSubWallet,
    destCurrency,
    destNetwork,
    amount,
    recipient,
    memo,
    selectedPath,
    preflightResult,
    estimates,
  } = wizardState;

  const activeAccount = useObjectSelector((state) => state.authentication.activeAccount);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Review & Send',
      headerBackTitle: 'Back',
      headerShadowVisible: false,
    });
  }, [navigation]);

  const [submitting, setSubmitting] = useState(false);

  const destTicker = destCurrency?.display_ticker || destCurrency?.name || destCurrency?.fullyqualifiedname || '';
  const sourceTicker = sourceCoin?.display_ticker || sourceCoin?.name || '';

  const isDirect = useMemo(() => {
    const destId = destCurrency?.currency_id || destCurrency?.currencyid || destCurrency?.id;
    return (
      sourceCoin?.currency_id === destId &&
      (destNetwork === sourceCoin?.system_id ||
        destNetwork === sourceCoin?.id ||
        selectedPath?.pathId === 'same-network')
    );
  }, [sourceCoin, destCurrency, destNetwork, selectedPath]);
  
  // Estimated receive amount from wizard estimates or preflight
  const estimatedReceive = useMemo(() => {
    // First check the estimates from the Amount screen
    if (estimates && selectedPath?.pathId && estimates[selectedPath.pathId]) {
      const est = estimates[selectedPath.pathId];
      if (est.estimatedReceive) {
        return new BigNumber(est.estimatedReceive).toFormat(6);
      }
    }
    // Fall back to preflight estimate
    const r = preflightResult?.result || preflightResult;
    if (r?.estimate?.estimatedcurrencyout) {
      return new BigNumber(r.estimate.estimatedcurrencyout).toFormat(6);
    }
    // For direct sends (no conversion), receive = send amount
    if (isDirect) {
      return new BigNumber(amount).toFormat(6);
    }
    return null;
  }, [estimates, selectedPath, preflightResult, isDirect, amount]);

  // Resolve destination network to friendly name
  const destNetworkDisplay = useMemo(() => {
    if (!destNetwork) return '—';
    // Common known networks
    if (destNetwork === 'ETH' || destNetwork === '.eth' || destNetwork === 'vETH') return 'Ethereum';
    if (destNetwork === 'VRSC' || destNetwork === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV') return 'Verus';
    if (destNetwork === 'VRSCTEST' || destNetwork === 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq') return 'Verus Testnet';
    // Try to get from preflight names
    const r = preflightResult?.result || preflightResult;
    const names = r?.names instanceof Map ? Object.fromEntries(r.names) : (r?.names || {});
    if (names[destNetwork]) return names[destNetwork];
    // Try selectedPath
    if (selectedPath?.networkName) return selectedPath.networkName;
    return destNetwork;
  }, [destNetwork, preflightResult, selectedPath]);

  const feeDisplay = useMemo(() => {
    if (!preflightResult || preflightResult.err) return null;
    const r = preflightResult.result || preflightResult;
    
    // Get friendly names map from preflight (maps i-addresses to names)
    const names = r.names instanceof Map ? Object.fromEntries(r.names) : (r.names || {});
    
    // VRPC preflight returns validation.fees in satoshis; bridge returns validation.fees or fee info.
    if (r.validation?.fees) {
      const entries = Object.entries(r.validation.fees);
      if (entries.length > 0) {
        const [currId, satVal] = entries[0];
        // Convert satoshis to coins (8 decimal places)
        const coinVal = new BigNumber(satVal).dividedBy(new BigNumber(10).pow(8));
        // Look up friendly name, fallback to currency ID
        const currName = names[currId] || currId;
        return `${coinVal.toFormat(8)} ${currName}`;
      }
    }
    if (r.fee && r.feeCurr) {
      return `${r.fee} ${r.feeCurr}`;
    }
    if (r.result?.fee && r.result?.feeCurr) {
      return `${r.result.fee} ${r.result.feeCurr}`;
    }
    return null;
  }, [preflightResult]);

  const handleSend = async () => {
    if (!preflightResult || preflightResult.err) {
      Alert.alert('Error', 'Preflight missing or invalid.');
      return;
    }

    setSubmitting(true);
    try {
      const channelId = sourceSubWallet?.api_channels?.[API_SEND];
      if (!channelId) throw new Error('No send channel available.');

      let res;

      if (isDirect) {
        const amtBn = BigNumber(amount);
        res = await send(
          sourceCoin,
          activeAccount,
          recipient,
          amtBn,
          channelId,
          { memo }
        );
      } else {
        const params = preflightResult.result || preflightResult;
        res = await sendConvertOrCrossChain(
          sourceCoin,
          activeAccount,
          channelId,
          params
        );
      }

      if (res.err) throw new Error(res.result || 'Send failed');

      // Expire caches
      dispatch(expireCoinData(sourceCoin.id, API_GET_FIATPRICE));
      dispatch(expireCoinData(sourceCoin.id, API_GET_TRANSACTIONS));
      dispatch(expireCoinData(sourceCoin.id, API_GET_BALANCES));

      Alert.alert('Success', 'Transaction submitted.', [
        {
          text: 'OK',
          onPress: () => {
            clearWizardState();
            navigation.popToTop();
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to send');
    } finally {
      setSubmitting(false);
    }
  };

  if (!preflightResult) {
    return (
      <View style={styles.centered}>
        <Text>No preflight available. Go back and try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review transfer</Text>
        <Row label="From" value={`${amount} ${sourceTicker}`} />
        <Row label="To currency" value={destTicker} />
        <Row label="Destination network" value={destNetworkDisplay} />
        <Row label="Recipient" value={recipient ? `${recipient.substring(0, 10)}...${recipient.substring(recipient.length - 8)}` : '—'} />
        {selectedPath?.via && (
          <Row label="Via" value={selectedPath.viaName || selectedPath.via?.name || selectedPath.via?.currencyid || '—'} />
        )}
        {selectedPath?.isPreconvert && (
          <Row label="Preconvert" value="Yes" />
        )}
        {memo ? <Row label="Memo" value={memo} /> : null}
        <Divider style={{ marginVertical: 12 }} />
        {estimatedReceive && (
          <Row label="Estimated receive" value={`≈ ${estimatedReceive} ${destTicker}`} />
        )}
        {feeDisplay && <Row label="Estimated fee" value={feeDisplay} />}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSend}
          disabled={submitting}
          buttonColor="#4DA6FF"
          contentStyle={{ height: 48 }}
        >
          {submitting ? <ActivityIndicator animating color="white" /> : 'Send'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  muted: {
    color: '#999',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default SendConfirm;

