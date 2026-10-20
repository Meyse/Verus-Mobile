import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Keyboard, Platform, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import SelectionSheet, {SelectionAction, SelectionRow} from '../../../components/SelectionSheet';
import AppTextInput from '../../../components/AppTextInput';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  arrivalForFee, customNetworkFee, FEE_TIERS, formatFeeAmount,
  formatGwei, previewNetworkFee,
} from '../networkFeeUtils';
import {FlatRow} from './WizardUI';

const EMPTY_KEYBOARD = {height: 0, visible: false};

const FeeValue = ({amount, caption}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={styles.value}>
      <Text style={[theme.typography.labelMd, styles.right, {color: theme.colors.textPrimary}]}>{amount}</Text>
      {caption ? <Text style={[theme.typography.caption, styles.right, {color: theme.colors.textSecondary}]}>{caption}</Text> : null}
    </View>
  );
};

export {FeeValue};

export default function NetworkFeeSheet({visible, onClose, onChoose, kind, quote, choice, review, confirmedReview, maximum, ticker, formatFiat, previews}) {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const [custom, setCustom] = useState(false);
  const [fields, setFields] = useState({rate: '', base: '', priority: ''});
  const [keyboard, setKeyboard] = useState(EMPTY_KEYBOARD);
  const preserveKeyboard = useRef(false);
  const dismissal = useSheetDismissal({visible, onClose, onClosed: () => {
    preserveKeyboard.current = false;
    setCustom(false);
    setKeyboard(EMPTY_KEYBOARD);
  }});

  useEffect(() => {
    if (visible) preserveKeyboard.current = false;
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', event => {
      if (!preserveKeyboard.current) setKeyboard({visible: true, height: event?.endCoordinates?.height || 0});
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      if (!preserveKeyboard.current) setKeyboard(EMPTY_KEYBOARD);
    });
    return () => { show.remove(); hide.remove(); };
  }, [visible]);

  const close = () => { preserveKeyboard.current = true; dismissal.close(); };
  const apply = next => {
    preserveKeyboard.current = true;
    dismissal.dismiss(() => onChoose(next));
  };
  const openCustom = () => {
    const fee = choice.id === 'custom' ? choice.fee : quote?.tiers?.[1];
    setFields(kind === 'btc' ? {rate: fee ? String(fee.feePerByte) : '', base: '', priority: ''} : {
      rate: '',
      base: fee ? formatGwei(BigInt(fee.maxFeePerGas) - BigInt(fee.maxPriorityFeePerGas)) : '',
      priority: fee ? formatGwei(fee.maxPriorityFeePerGas) : '',
    });
    setCustom(true);
  };
  const validation = useMemo(() => customNetworkFee(kind, fields, quote, maximum), [kind, fields, quote, maximum]);
  const summary = validation.fee ? previewNetworkFee(kind, validation.fee, review, quote) : null;
  const slowWarning = validation.fee && quote?.tiers &&
    arrivalForFee(kind, {id: 'custom', fee: validation.fee}, quote) === 'Can take a long time';
  const keyboardHeight = Math.max(1, windowHeight - keyboard.height - insets.top - 12 - 8);
  const suffix = unit => <Text style={[theme.typography.bodyMd, {color: theme.colors.textSecondary}]}>{unit}</Text>;
  const setField = name => value => setFields(current => ({...current, [name]: value}));

  return (
    <SelectionSheet
      title={custom ? 'Custom fee' : 'Network fee'}
      visible={visible}
      onClose={close}
      onClosed={dismissal.onClosed}
      backAccessibilityLabel="Back to network fee options"
      onBack={custom ? () => { Keyboard.dismiss(); setCustom(false); } : undefined}
      avoidKeyboard={custom}
      maxHeight={custom && keyboard.visible ? keyboardHeight : '76%'}
      contentContainerStyle={custom && keyboard.visible ? {marginBottom: 8} : null}
      footer={custom ? (
        <SafeBottomActionStack
          horizontalSpacing={0}
          includeBottomInset={false}
          safeAreaSpacing={0}
          bottomSpacing={0}
          style={styles.footer}>
          <AppButton disabled={!validation.fee} onPress={() => apply({id: 'custom', fee: validation.fee})}>
            Use this fee
          </AppButton>
        </SafeBottomActionStack>
      ) : null}>
      {custom ? (
        <>
          {kind === 'btc' ? (
            <AppTextInput
              label="Fee rate"
              keyboardType="decimal-pad"
              value={fields.rate}
              onChangeText={setField('rate')}
              rightAccessory={suffix('sat/vB')}
              helperText={quote?.tiers ? `Normal: ${quote.tiers[1].feePerByte} sat/vB` : undefined}
              errorText={validation.error}
              themeMode={theme.mode}
            />
          ) : (
            <>
              <AppTextInput
                label="Max base fee"
                keyboardType="decimal-pad"
                value={fields.base}
                onChangeText={setField('base')}
                rightAccessory={suffix('Gwei')}
                helperText={quote?.baseFeePerGas != null ? `Now: ${formatGwei(quote.baseFeePerGas)} Gwei` : undefined}
                errorText={validation.error}
                themeMode={theme.mode}
              />
              <AppTextInput
                containerStyle={styles.secondField}
                label="Priority fee"
                keyboardType="decimal-pad"
                value={fields.priority}
                onChangeText={setField('priority')}
                rightAccessory={suffix('Gwei')}
                helperText={quote?.tiers ? `Normal: ${formatGwei(quote.tiers[1].maxPriorityFeePerGas)} Gwei` : undefined}
                themeMode={theme.mode}
              />
            </>
          )}
          {slowWarning ? <Text style={[theme.typography.caption, styles.warning, {color: theme.colors.warning}]}>It can take a long time to confirm.</Text> : null}
          <View style={[styles.summary, {borderTopColor: theme.colors.border}]}>
            <FlatRow label="Network fee">
              <FeeValue
                amount={formatFeeAmount(summary?.likelyFee, ticker, true) || 'Calculated on review'}
                caption={kind === 'eth' && summary?.fee ? `Up to ${formatFeeAmount(summary.fee, ticker)}` : null}
              />
            </FlatRow>
          </View>
        </>
      ) : (
        <>
          {quote?.tiers?.map((fee, index) => {
            const tier = FEE_TIERS[index];
            const result = previews?.[tier.id];
            const amount = result ? (kind === 'eth' ? result.likelyFee : result.fee) : null;
            const money = amount != null ? formatFiat(amount) : null;
            return <SelectionRow
              key={tier.id}
              title={tier.title}
              subtitle={tier[kind === 'btc' ? 'btcTime' : 'ethTime']}
              selected={choice.id === tier.id}
              value={formatFeeAmount(amount, ticker, kind === 'eth') || (result === false ? 'Unavailable' : '…')}
              valueLabel={money ? `≈ ${money}` : null}
              onPress={() => apply({id: tier.id})}
            />;
          })}
          {choice.id === 'custom' ? (
            <SelectionRow
              title="Custom fee"
              subtitle={kind === 'btc' ? `${choice.fee.feePerByte} sat/vB`
                : `${formatGwei(BigInt(choice.fee.maxFeePerGas) - BigInt(choice.fee.maxPriorityFeePerGas))} + ${formatGwei(choice.fee.maxPriorityFeePerGas)} Gwei`}
              value={formatFeeAmount(kind === 'eth' ? confirmedReview?.likelyFee : confirmedReview?.fee, ticker, kind === 'eth')}
              selected
              onPress={openCustom}
            />
          ) : <SelectionAction title="Custom fee" onPress={openCustom} />}
        </>
      )}
    </SelectionSheet>
  );
}

const styles = StyleSheet.create({
  value: {flexShrink: 1, alignItems: 'flex-end'},
  right: {textAlign: 'right'},
  secondField: {marginTop: 20},
  warning: {marginTop: 8},
  summary: {marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth},
  footer: {paddingTop: 12},
});
