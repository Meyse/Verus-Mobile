import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import AppTextInput from '../../components/AppTextInput';
import {SettingsSwitchRow} from '../Settings/components/SettingsScaffold';
import {sanitizeNumericInput, validateSlippageInput} from './receiveInvoice';
import ReceiveRequestSheet from './ReceiveRequestSheet';

const ReceiveConversionsSheet = ({
  allowConversion,
  allowSlippageSetting,
  maxSlippage,
  onApply,
  onClose,
  ticker,
  visible,
}) => {
  const [allowed, setAllowed] = useState(allowConversion);
  const [slippage, setSlippage] = useState(maxSlippage);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!visible) return;
    setAllowed(allowConversion);
    setSlippage(maxSlippage);
    setError(null);
  }, [allowConversion, maxSlippage, visible]);

  return (
    <ReceiveRequestSheet
      onApply={() => {
        const nextError = allowed && allowSlippageSetting
          ? validateSlippageInput(sanitizeNumericInput(slippage))
          : null;
        setError(nextError);
        if (nextError) return null;
        return () => onApply({allowConversion: allowed, maxSlippage: slippage});
      }}
      onClose={onClose}
      title="Conversions"
      visible={visible}>
      <SettingsSwitchRow
        description={`Senders can pay with currencies that convert to ${ticker}.`}
        descriptionNumberOfLines={0}
        last
        onValueChange={setAllowed}
        title="Allow conversions"
        value={allowed}
      />
      {allowed && allowSlippageSetting ? (
        <View style={styles.slippage}>
          <AppTextInput
            errorText={error}
            keyboardType="decimal-pad"
            label="Max slippage (%)"
            onChangeText={value => {
              setSlippage(value);
              setError(null);
            }}
            value={slippage}
          />
        </View>
      ) : null}
    </ReceiveRequestSheet>
  );
};

const styles = StyleSheet.create({slippage: {marginTop: 20}});
export default ReceiveConversionsSheet;
