import React, {useCallback} from 'react';
import {BackHandler, Platform, StyleSheet} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import TransactionResult from '../../components/TransactionResult';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {useSendWizard} from './SendWizardContext';
import {TransferNode} from './components/TransferSummary';
import {FlatRow} from './components/WizardUI';
import {getExplorerTxUrl} from './wizardUtils';

const MONOSPACE = Platform.select({ios: 'Menlo', default: 'monospace'});

// The result of the Advanced form (PR 266 pick ADV): the old result's facts
// (title by kind, amount, destination, transaction ID, explorer) drawn by the
// shared TransactionResult, as the wizard's Sent step is.
const SendWizardAdvancedResult = () => {
  const navigation = useNavigation();
  const {state} = useSendWizard();
  const review = state.advancedReview;
  const result = review?.result || {};
  const coinObj = review?.sendModal?.coinObj;
  const output = result.output || {};
  const txid = result.txid;
  const explorerUrl = getExplorerTxUrl(coinObj, txid);
  const amount = output.satoshis != null ? satsToCoins(BigNumber(output.satoshis)) : null;
  const title = output.burn === true
    ? 'Burn sent'
    : output.preconvert
    ? 'Pre-conversion sent'
    : output.convertto
    ? 'Conversion sent'
    : output.exportto
    ? 'Transfer sent'
    : 'Transaction sent';
  const destination = result.destination;

  const finish = useCallback(() => {
    const parent = navigation.getParent?.();
    if (parent && typeof parent.reset === 'function') {
      parent.reset({index: 0, routes: [{name: 'Home', params: {screen: 'WalletHome'}}]});
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
    <TransactionResult
      actions={[{label: 'Done', onPress: finish}]}
      amount={
        amount ? (
          <TransferNode
            amount={truncateDecimal(amount, 8)}
            coinId={coinObj?.id}
            copyValue={amount.toFixed()}
            label={output.convertto ? 'You paid' : 'You sent'}
            ticker={coinObj?.display_ticker || ''}
          />
        ) : null
      }
      caption={
        output.convertto || output.exportto
          ? 'Conversions and cross-chain transfers can take a few minutes to complete after they confirm.'
          : 'You can follow the transaction from this Asset’s activity.'
      }
      details={
        destination ? (
          <FlatRow
            copyValue={destination}
            label={output.burn === true ? 'Burn output' : 'To'}
            numberOfLines={0}
            value={destination}
            valueStyle={destination.includes('@') ? undefined : styles.mono}
          />
        ) : null
      }
      success
      title={title}
      transactions={txid ? [explorerUrl ? {txid, explorerUrl} : {txid}] : []}
    />
  );
};

const styles = StyleSheet.create({
  mono: {fontFamily: MONOSPACE, fontSize: 13, lineHeight: 18},
});

export default SendWizardAdvancedResult;
