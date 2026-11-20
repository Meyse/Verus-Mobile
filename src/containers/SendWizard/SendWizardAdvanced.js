import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Keyboard, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useHeaderHeight} from '@react-navigation/elements';
import {Info} from 'lucide-react-native';
import AppAddressInput from '../../components/AppAddressInput';
import AppSwitch from '../../components/AppSwitch';
import AppTextInput from '../../components/AppTextInput';
import CardTitle from '../../components/CardTitle';
import InfoSheet from '../../components/InfoSheet';
import {InfoSheetTopic} from '../../components/InfoSheetSection';
import KeyboardAvoidingForm from '../../components/KeyboardAvoidingForm';
import SelectionSheet, {SelectionRow} from '../../components/SelectionSheet';
import SkeletonLoader, {SkeletonBlock} from '../../components/SkeletonLoader';
import TextAction from '../../components/TextAction';
import useSheetDismissal from '../../components/useSheetDismissal';
import useConvertOrCrossChainForm from '../../components/SendModal/ConvertOrCrossChainSend/useConvertOrCrossChainForm';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_MAPPING_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
} from '../../utils/constants/sendModal';
import {getSubWalletCardTitleForAccount} from '../../utils/subwallet/cardPresentation';
import {
  VerusIdFormField,
  VerusIdFormScrollContext,
  useVerusIdFormScroll,
} from '../Services/ServiceComponents/VerusIdService/VerusIdFormScroll';
import {addressBookRecordMatchesContext} from '../../utils/addressBook/addressBook';
import {useSendWizard} from './SendWizardContext';
import {ADVANCED_FORM_HELP, getAdvancedFormData} from './advancedForm';
import AddressBookSheet from './components/AddressBookSheet';
import {
  ErrorMessage,
  WIZARD_CONTENT_INSET,
  WIZARD_CONTENT_TOP_INSET,
  WizardFooter,
  WizardScreen,
} from './components/WizardUI';
import {shortAddress} from './wizardUtils';

// The Advanced form (PR 266 pick ADV, option A "Same page"): every value of a
// conversion, a pre-conversion, a cross-chain transfer or an off-chain send by
// hand, as on upstream's unguided form. The fields, their conditions, the
// checks and the prepared transaction come from useConvertOrCrossChainForm,
// the same logic as the old send modal. Only the look is new.
const SendWizardAdvanced = () => {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const theme = useOnboardingTheme();
  const {keyboardVisible} = useOnboardingSmallDeviceLayout();
  const {state, setAdvancedReview} = useSendWizard();
  const {sourceCoin, sourceSubWallet} = state;
  const activeAccount = useObjectSelector(value => value.authentication.activeAccount);
  const [data, setData] = useState(() => getAdvancedFormData(sourceCoin));
  const [preparing, setPreparing] = useState(false);
  const [selfOpen, setSelfOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const formScroll = useVerusIdFormScroll(keyboardVisible, true);

  const sendModal = useMemo(
    () => ({coinObj: sourceCoin, subWallet: sourceSubWallet, data}),
    [data, sourceCoin, sourceSubWallet],
  );
  const updateSendFormData = useCallback((key, value) => {
    setData(current => ({...current, [key]: value}));
  }, []);
  const form = useConvertOrCrossChainForm({
    sendModal,
    updateSendFormData: (key, value) => {
      form.setFormErrors({});
      updateSendFormData(key, value);
    },
    setLoading: loading => setPreparing(Boolean(loading)),
    inlineMessages: true,
    onPrepared: ({preflight, balances}) => {
      setAdvancedReview({preflight, balances, sendModal, networkName: form.networkName});
      navigation.navigate('SendWizardAdvancedConfirm');
    },
  });
  const update = (key, value) => {
    form.setFormErrors({});
    updateSendFormData(key, value);
  };

  // Back waits while the transaction is prepared, so Confirm never opens
  // over the screen the user left.
  const preparingRef = useRef(false);
  preparingRef.current = preparing;
  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (preparingRef.current) event.preventDefault();
      }),
    [navigation],
  );

  // Help of the old form: one info action beside Close.
  useLayoutEffect(() => {
    navigation.setOptions({
      wizardNavigationDisabled: preparing,
      wizardRightAccessory: (
        <Pressable
          accessibilityLabel="About the advanced form"
          accessibilityRole="button"
          disabled={preparing}
          hitSlop={4}
          onPress={() => {
            Keyboard.dismiss();
            setHelpOpen(true);
          }}
          style={styles.infoButton}>
          <Info color={theme.colors.textSubtle} size={23} strokeWidth={2.2} />
        </Pressable>
      ),
    });
  }, [navigation, preparing, theme.colors.textSubtle]);

  const cardTitle = useMemo(
    () =>
      sourceSubWallet
        ? getSubWalletCardTitleForAccount(sourceSubWallet, activeAccount, sourceCoin)
        : null,
    [activeAccount, sourceCoin, sourceSubWallet],
  );

  if (!sourceCoin || !sourceSubWallet) {
    return (
      <WizardScreen contentContainerStyle={styles.fallback}>
        <ErrorMessage>Go back and choose an asset and address.</ErrorMessage>
      </WizardScreen>
    );
  }

  const locked = form.lockedInputs;
  const destDisabled = Boolean(locked[SEND_MODAL_TO_ADDRESS_FIELD]);
  const amountDisabled = Boolean(locked[SEND_MODAL_AMOUNT_FIELD]);
  const preconvert = Boolean(data[SEND_MODAL_IS_PRECONVERT]);
  const advanced = Boolean(data[SEND_MODAL_ADVANCED_FORM]);
  const balancesLoading = form.localBalances == null && !form.balanceError;
  const ticker = sourceCoin.display_ticker;
  const exportTo = data[SEND_MODAL_EXPORTTO_FIELD] || '';
  // Upstream's estimate line under Amount: it shows only with a price estimate
  // from a suggestion, so it stays empty on this form.
  const estimate = data[SEND_MODAL_PRICE_ESTIMATE];
  const estimateLine =
    form.isConversion && !form.isExport && estimate != null && form.processedAmount != null
      ? `≈ ${Number((form.processedAmount * estimate.price).toFixed(8))} ${estimate.name}`
      : null;
  const showReceiveAs =
    form.showExportField && data[SEND_MODAL_SHOW_MAPPING_FIELD] && !form.isConversion;
  const showPreconvert =
    (preconvert || advanced) && Boolean(data[SEND_MODAL_SHOW_IS_PRECONVERT]);
  const selfAddresses = selfOpen ? form.processSelfSuggestionPaths() : [];

  const pressSelf = () => {
    Keyboard.dismiss();
    if (form.selfUsesList) setSelfOpen(true);
    else form.handleSelfPressed();
  };

  const field = (key, label, extra = {}) => (
    <VerusIdFormField key={key} style={styles.field}>
      {focusProps => (
        <AppTextInput
          {...focusProps}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!locked[key] && !preparing}
          label={label}
          onChangeText={text => update(key, text)}
          returnKeyType="done"
          value={data[key] || ''}
          {...extra}
        />
      )}
    </VerusIdFormField>
  );

  return (
    <WizardScreen scroll={false}>
      <KeyboardAvoidingForm keyboardVerticalOffset={headerHeight} style={styles.screen}>
        <VerusIdFormScrollContext.Provider value={formScroll.context}>
          <ScrollView
            ref={formScroll.scrollRef}
            contentContainerStyle={[styles.content, formScroll.keyboardPadding]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={formScroll.onContentSizeChange}
            onLayout={formScroll.onLayout}
            style={styles.screen}>
            <View
              accessible
              accessibilityLabel={`Send from ${cardTitle?.text || sourceSubWallet.name}`}
              style={styles.field}>
              <Text style={[theme.typography.labelMd, styles.label, {color: theme.colors.textSecondary}]}>
                Send from
              </Text>
              <View style={styles.sendFrom}>
                <AssetCoinLogo coinId={sourceCoin.id} size={24} />
                <CardTitle
                  containerStyle={styles.sendFromTitle}
                  style={[theme.typography.inputValue, {color: theme.colors.textPrimary}]}
                  title={cardTitle}
                />
              </View>
            </View>
            {balancesLoading ? (
              <SkeletonLoader accessibilityLabel="Loading balance">
                {[0, 1, 2].map(index => (
                  <View key={index} style={styles.field}>
                    <SkeletonBlock height={19} radius={4} width={96} />
                    <SkeletonBlock height={48} radius={12} style={styles.skeletonInput} width="100%" />
                  </View>
                ))}
              </SkeletonLoader>
            ) : (
              <>
                <VerusIdFormField style={styles.field}>
                  {focusProps => (
                    <AppAddressInput
                      {...focusProps}
                      accessibilityLabel="Address"
                      editable={!destDisabled && !preparing}
                      errorText={form.formErrors.destination}
                      invalid={Boolean(form.formErrors.destination)}
                      label="Address"
                      onChangeText={text => update(SEND_MODAL_TO_ADDRESS_FIELD, text)}
                      placeholder="Address or VerusID"
                      technical={!String(data[SEND_MODAL_TO_ADDRESS_FIELD] || '').includes('@')}
                      value={data[SEND_MODAL_TO_ADDRESS_FIELD] || ''}
                    />
                  )}
                </VerusIdFormField>
                {destDisabled ? null : (
                  <View style={styles.addressActions}>
                    <TextAction
                      accessibilityHint="Opens your saved addresses"
                      disabled={preparing}
                      onPress={() => {
                        Keyboard.dismiss();
                        setAddressBookOpen(true);
                      }}
                      size="small">
                      Address book
                    </TextAction>
                    <TextAction
                      accessibilityHint="Fills in one of your own addresses"
                      disabled={preparing}
                      onPress={pressSelf}
                      size="small">
                      Self
                    </TextAction>
                  </View>
                )}
                {field(SEND_MODAL_AMOUNT_FIELD, 'Amount', {
                  editable: !amountDisabled && !preparing,
                  errorText: form.formErrors.amount,
                  helperText: estimateLine,
                  invalid: Boolean(form.formErrors.amount),
                  keyboardType: 'decimal-pad',
                  placeholder: '0',
                  endAccessory: (
                    <View style={styles.amountEnd}>
                      <Text
                        numberOfLines={1}
                        style={[theme.typography.bodySm, styles.amountTicker, {color: theme.colors.textSecondary}]}>
                        {ticker}
                      </Text>
                      {amountDisabled ? null : (
                        <TextAction
                          accessibilityLabel="Use maximum available amount"
                          disabled={form.localBalances == null || preparing}
                          onPress={form.maxAmount}
                          variant="chip">
                          MAX
                        </TextAction>
                      )}
                    </View>
                  ),
                })}
                {form.showConversionField
                  ? field(SEND_MODAL_CONVERTTO_FIELD, preconvert ? 'Preconvert to' : 'Convert to', {
                      placeholder: 'Currency name or ID',
                    })
                  : null}
                {form.showViaField
                  ? field(SEND_MODAL_VIA_FIELD, 'Via', {placeholder: 'Optional'})
                  : null}
                {form.showExportField
                  ? field(SEND_MODAL_EXPORTTO_FIELD, 'Export to', {
                      placeholder: locked[SEND_MODAL_EXPORTTO_FIELD] ? undefined : 'Optional',
                    })
                  : null}
                {showReceiveAs
                  ? field(SEND_MODAL_MAPPING_FIELD, 'Receive as', {
                      placeholder: exportTo.length > 0 ? 'Required' : 'Optional',
                    })
                  : null}
                {showPreconvert ? (
                  <View style={styles.switchRow}>
                    <Text style={[theme.typography.bodyMd, styles.switchLabel, {color: theme.colors.textPrimary}]}>
                      Send as preconvert
                    </Text>
                    <View style={styles.switchSlot}>
                      <AppSwitch
                        accessibilityLabel="Send as preconvert"
                        color={theme.colors.success}
                        disabled={!advanced || preparing}
                        onValueChange={value => update(SEND_MODAL_IS_PRECONVERT, value)}
                        value={preconvert}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </VerusIdFormScrollContext.Provider>
        <View onLayout={formScroll.onFooterLayout} style={[styles.footer, {backgroundColor: theme.colors.background}]}>
          <WizardFooter
            above={
              form.balanceError ? (
                <ErrorMessage style={styles.footerError}>
                  The balance didn’t load. Check your connection and try again.
                </ErrorMessage>
              ) : form.formErrors.form ? (
                <ErrorMessage style={styles.footerError}>{form.formErrors.form}</ErrorMessage>
              ) : null
            }
            bottomSpacing={keyboardVisible ? 8 : 24}
            disabled={balancesLoading}
            includeBottomInset={!keyboardVisible}
            loading={preparing}
            loadingText="Preparing…"
            onPress={() => {
              Keyboard.dismiss();
              if (form.balanceError) form.retryBalances();
              else form.submitData();
            }}
            safeAreaSpacing={keyboardVisible ? 0 : 12}>
            {form.balanceError ? 'Try again' : 'Continue'}
          </WizardFooter>
        </View>
      </KeyboardAvoidingForm>
      <SelfAddressList
        addresses={selfAddresses}
        onClose={() => setSelfOpen(false)}
        onSelect={item => update(SEND_MODAL_TO_ADDRESS_FIELD, item.values[SEND_MODAL_TO_ADDRESS_FIELD])}
        visible={selfOpen}
      />
      <AdvancedAddressBook
        asset={ticker}
        network={form.networkName}
        onClose={() => setAddressBookOpen(false)}
        onSelect={record => update(SEND_MODAL_TO_ADDRESS_FIELD, record.address)}
        visible={addressBookOpen}
      />
      <InfoSheet
        onClose={() => setHelpOpen(false)}
        title="Advanced form"
        visible={helpOpen}>
        {ADVANCED_FORM_HELP.map(topic => (
          <InfoSheetTopic key={topic.title} title={topic.title}>{topic.body}</InfoSheetTopic>
        ))}
      </InfoSheet>
    </WizardScreen>
  );
};

// Self of the old form: the wallet's own addresses (upstream's list).
const SelfAddressList = ({addresses, onClose, onSelect, visible}) => {
  const dismissal = useSheetDismissal({visible, onClose});
  return (
    <SelectionSheet
      title="Your addresses"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {addresses.map(item => (
        <SelectionRow
          key={item.key}
          accessibilityLabel={item.description}
          title={shortAddress(item.description)}
          titleMonospace
          onPress={() => dismissal.dismiss(() => onSelect(item))}
        />
      ))}
    </SelectionSheet>
  );
};

// The old form's Address Book: saved addresses for this asset and network.
const AdvancedAddressBook = ({asset, network, onClose, onSelect, visible}) => {
  const [records, setRecords] = useState(null);
  const context = useMemo(() => ({asset, network}), [asset, network]);
  return (
    <AddressBookSheet
      context={context}
      matchingCount={records == null ? 0 : records.filter(record =>
        addressBookRecordMatchesContext(record, context)).length}
      onClose={onClose}
      onRecordsLoaded={setRecords}
      onSelect={record => {
        onSelect(record);
        onClose();
      }}
      visible={visible}
    />
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  fallback: {paddingTop: WIZARD_CONTENT_TOP_INSET, paddingHorizontal: WIZARD_CONTENT_INSET},
  content: {
    flexGrow: 1,
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingTop: WIZARD_CONTENT_TOP_INSET,
    paddingBottom: 24,
  },
  field: {marginBottom: 16},
  label: {marginBottom: 8},
  sendFrom: {minHeight: 24, flexDirection: 'row', alignItems: 'center'},
  sendFromTitle: {flex: 1, marginLeft: 10},
  skeletonInput: {marginTop: 8},
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -12,
    marginBottom: 4,
    gap: 16,
  },
  amountEnd: {flexDirection: 'row', alignItems: 'center', paddingRight: 4, maxWidth: '55%'},
  amountTicker: {flexShrink: 1, marginRight: 4},
  switchRow: {
    minHeight: 48,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {flex: 1, marginRight: 12},
  switchSlot: {minWidth: 52, alignItems: 'flex-end'},
  footer: {flexShrink: 0},
  footerError: {marginHorizontal: 0, marginVertical: 0, marginBottom: 8},
  infoButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
});

export default SendWizardAdvanced;
