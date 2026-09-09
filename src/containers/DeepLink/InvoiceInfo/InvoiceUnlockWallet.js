import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, View} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import ProgressHeader from '../../../components/ProgressHeader';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {InvoiceSourceRow, useInvoiceStyles} from './InvoicePaymentParts';

export const InvoiceWalletPicker = ({accounts, onSelect, onCancel}) => {
  const {styles} = useInvoiceStyles();
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <ProgressHeader
        title="Pay invoice"
        borderless
        progress={0.2}
        showBack
        onBack={onCancel}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Unlock wallet
        </Text>
        <Text style={styles.subtitle}>
          Choose a wallet to pay this invoice.
        </Text>
        {accounts.map(item => (
          <InvoiceSourceRow
            key={item.key}
            title={item.title}
            onPress={() => onSelect(item.account)}
          />
        ))}
      </ScrollView>
      <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
        <AppButton variant="text" onPress={onCancel}>
          Back to invoice
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

export const InvoiceWalletPassword = ({
  account,
  password,
  onChangePassword,
  onUnlock,
  onBack,
}) => {
  const {styles} = useInvoiceStyles();
  const [footerHeight, setFooterHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <View
        onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        <ProgressHeader
          title="Pay invoice"
          borderless
          progress={0.3}
          showBack
          onBack={onBack}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {paddingBottom: footerHeight + 24},
          ]}
          keyboardShouldPersistTaps="handled"
          contentInset={{bottom: 0}}
          extraHeight={headerHeight + 48}
          extraScrollHeight={footerHeight}>
          <Text accessibilityRole="header" style={styles.title}>
            Unlock wallet
          </Text>
          <View style={styles.form}>
            <InvoiceSourceRow title={account?.id} />
            <AppTextInput
              label="Password"
              accessibilityLabel="Wallet password"
              secureTextEntry
              value={password}
              onChangeText={onChangePassword}
              placeholder="Enter password"
              returnKeyType="done"
              onSubmitEditing={password.length ? onUnlock : undefined}
            />
          </View>
        </KeyboardAwareScrollView>
        <View
          onLayout={event => setFooterHeight(event.nativeEvent.layout.height)}>
          <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
            <AppButton disabled={!password.length} onPress={onUnlock}>
              Unlock
            </AppButton>
            <AppButton variant="text" onPress={onBack}>
              Choose another wallet
            </AppButton>
          </SafeBottomActionStack>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
