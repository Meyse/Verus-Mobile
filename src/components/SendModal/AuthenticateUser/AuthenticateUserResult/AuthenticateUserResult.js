import React, { useEffect } from 'react';
import { ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { closeSendModal } from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import AnimatedSuccessCheckmark from '../../../AnimatedSuccessCheckmark';

import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {SEND_MODAL_INVOICE_CONTEXT} from '../../../../utils/constants/sendModal';
import {InvoicePaymentLoading} from '../../../../containers/DeepLink/InvoiceInfo/InvoicePaymentParts';

const AuthenticateUserResult = props => {
  const isInvoice = useObjectSelector(state => !!state.sendModal.data[SEND_MODAL_INVOICE_CONTEXT]);
  async function onMount() {
    setTimeout(() => {
      closeSendModal()
    }, 500)
  }
  
  useEffect(() => {
    onMount()
  }, [])

  if (isInvoice) return <InvoicePaymentLoading title="Wallet unlocked" />;

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
      }}>
      <View style={Styles.focalCenter}>
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {`Account unlocked!`}
        </Text>
        <View style={{paddingVertical: 16}}>
          <AnimatedSuccessCheckmark
            style={{
              width: 128,
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default AuthenticateUserResult