import React from "react";
import { View, TouchableWithoutFeedback, Keyboard, FlatList, Animated } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, Divider, Checkbox, List, Text } from "react-native-paper";
import {
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_MAPPING_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
} from '../../../../utils/constants/sendModal';
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import AnimatedActivityIndicatorBox from "../../../AnimatedActivityIndicatorBox";
import { getCoinLogo } from "../../../../utils/CoinData/CoinData";
import MissingInfoRedirect from "../../../MissingInfoRedirect/MissingInfoRedirect";
import CoreSendFormModule from "../../../FormModules/CoreSendFormModule";
import ConvertFormModule from "../../../FormModules/ConvertFormModule";
import ExportFormModule from "../../../FormModules/ExportFormModule";
import { useObjectSelector } from "../../../../hooks/useObjectSelector";
import useConvertOrCrossChainForm from "../useConvertOrCrossChainForm";

import InvoicePaymentForm from '../../../../containers/DeepLink/InvoiceInfo/InvoicePaymentForm';
import {
  InvoicePaymentError,
  InvoicePaymentLoading,
} from '../../../../containers/DeepLink/InvoiceInfo/InvoicePaymentParts';

// The form's logic lives in useConvertOrCrossChainForm, which the wizard's
// Advanced form shares (PR 266 pick ADV). This screen keeps its old look for
// invoices, burns and the send modal.
const ConvertOrCrossChainSendForm = ({ setLoading, setModalHeight, updateSendFormData, navigation, cancel }) => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const {
    isBurnChangePrice,
    isInvoice,
    balanceError,
    formErrors,
    FIELD_TITLES,
    searchMode,
    selectedField,
    processedAmount,
    localNetworkName,
    localBalances,
    suggestions,
    loadingSuggestions,
    isConversion,
    isVia,
    isExport,
    showConversionField,
    showViaField,
    showExportField,
    fadeSearchMode,
    fadeNormalForm,
    getFieldPlaceholder,
    handleSearch,
    handleFieldFocus,
    handleDoneSearching,
    selectSuggestion,
    retryBalances,
    updateInvoiceFormData,
    submitData,
    maxAmount,
    handleSelfPressed,
    networkName,
  } = useConvertOrCrossChainForm({
    sendModal,
    updateSendFormData,
    setLoading,
    setModalHeight,
    onPrepared: params => navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, params),
  });

    if (isInvoice) {
    if (localBalances == null) {
      return balanceError ? (
        <InvoicePaymentError
          title="Balance didn’t load"
          message="Check your connection and try again."
          onRetry={retryBalances}
          onClose={cancel}
        />
      ) : (
        <InvoicePaymentLoading onClose={cancel} />
      );
    }

    return (
      <InvoicePaymentForm
        sendModal={sendModal}
        updateSendFormData={updateInvoiceFormData}
        errors={formErrors}
        onContinue={submitData}
        onBack={cancel}
      />
    );
  }

  return localBalances == null ? (<AnimatedActivityIndicatorBox />) : (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{flex: 1, backgroundColor: Colors.secondaryColor}}>
        {searchMode ? (
          <Animated.View
            style={{
              backgroundColor: Colors.secondaryColor,
              ...Styles.fullWidth,
              justifyContent: 'flex-start',
              alignItems: 'center',
              backgroundColor: Colors.secondaryColor,
              flex: 1,
              opacity: fadeSearchMode,
            }}>
            <View style={{width: '92%', paddingTop: 8}}>
              <View style={Styles.flexRow}>
                <TextInput
                  label={FIELD_TITLES[selectedField]}
                  value={sendModal.data[selectedField]}
                  onChangeText={handleSearch}
                  mode="outlined"
                  style={{
                    flex: 1,
                  }}
                />
                <Button
                  onPress={() => handleSearch('')}
                  textColor={Colors.primaryColor}
                  style={{
                    alignSelf: 'center',
                    marginTop: 6,
                  }}
                  compact>
                  {'Clear'}
                </Button>
              </View>
            </View>
            {loadingSuggestions ? (
              <AnimatedActivityIndicatorBox />
            ) : suggestions.length == 0 ? (
              <MissingInfoRedirect
                icon={'alert-circle-outline'}
                label={getFieldPlaceholder(selectedField)}
              />
            ) : (
              <FlatList
                data={suggestions}
                style={{
                  width: '100%',
                }}
                ListHeaderComponent={
                  <List.Item
                    title={
                      <Text
                        style={{...Styles.listItemTableCell, fontWeight: 'bold'}}>
                        {'Name'}
                      </Text>
                    }
                    right={() =>
                      selectedField !== SEND_MODAL_EXPORTTO_FIELD &&
                      selectedField !== SEND_MODAL_MAPPING_FIELD &&
                      selectedField !== SEND_MODAL_TO_ADDRESS_FIELD ? (
                        <Text
                          style={{
                            ...Styles.listItemTableCell,
                            fontWeight: 'bold',
                          }}>
                          {'est. price in ' + sendModal.coinObj.display_ticker}
                        </Text>
                      ) : null
                    }
                  />
                }
                renderItem={({item, index}) => (
                  <List.Item
                    title={item.title}
                    key={index.toString()}
                    description={item.description}
                    onPress={() => selectSuggestion(item)}
                    right={() => (
                      <Text style={Styles.listItemTableCell}>{item.right}</Text>
                    )}
                    left={props => {
                      const Logo = getCoinLogo(
                        item.logoid,
                        item.logoproto,
                        'dark',
                      );

                      return (
                        <View style={{justifyContent: 'center', paddingLeft: 8}}>
                          <Logo
                            width={36}
                            height={36}
                            style={{
                              alignSelf: 'center',
                            }}
                          />
                        </View>
                      );
                    }}
                  />
                )}
              />
            )}
          </Animated.View>
        ) : (
          <Animated.View style={{flex: 1, opacity: fadeNormalForm}}>
            <KeyboardAwareScrollView
              style={{
                backgroundColor: Colors.secondaryColor,
                ...Styles.fullWidth,
                flex: 1,
              }}
              contentContainerStyle={{
                justifyContent: 'flex-start',
                alignItems: 'center',
                backgroundColor: Colors.secondaryColor,
              }}
              resetScrollToCoords={{x: 0, y: 0}}
              scrollEnabled={true}
              enableOnAndroid={true}
              extraScrollHeight={150}
              keyboardShouldPersistTaps="handled">
              <CoreSendFormModule
                destDisabled={
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                    SEND_MODAL_TO_ADDRESS_FIELD
                  ]
                }
                amountDisabled={
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                    SEND_MODAL_AMOUNT_FIELD
                  ]
                }
                sendingFromLabel={
                  isBurnChangePrice ? "Burning from" : "Sending from"
                }
                sendingFromValue={sendModal.subWallet.name}
                recipientAddressLabel={
                  isBurnChangePrice
                    ? "Burn output address (does not receive funds)"
                    : "Recipient address"
                }
                recipientAddressValue={
                  sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD]
                }
                onRecipientAddressChange={text =>
                  updateSendFormData(SEND_MODAL_TO_ADDRESS_FIELD, text)
                }
                onSelfPress={() => handleSelfPressed()}
                amountValue={sendModal.data[SEND_MODAL_AMOUNT_FIELD]}
                amountLabel={
                  isBurnChangePrice ? "Amount to burn" : "Amount"
                }
                onAmountChange={text =>
                  updateSendFormData(SEND_MODAL_AMOUNT_FIELD, text)
                }
                onMaxPress={() => maxAmount()}
                maxButtonDisabled={localBalances == null}
                networkName={networkName}
                recipientAsset={sendModal.coinObj.display_ticker}
                recipientNetwork={networkName}
                estimatedResultSubtitle={
                  isConversion &&
                  !isExport &&
                  sendModal.data[SEND_MODAL_PRICE_ESTIMATE] != null &&
                  processedAmount != null
                    ? `≈ ${Number(
                        (
                          processedAmount *
                          sendModal.data[SEND_MODAL_PRICE_ESTIMATE].price
                        ).toFixed(8),
                      )} ${sendModal.data[SEND_MODAL_PRICE_ESTIMATE].name}`
                    : null
                }
              />
              {showConversionField || showViaField ? (
                <ConvertFormModule
                  convertDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_CONVERTTO_FIELD
                    ]
                  }
                  viaDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_VIA_FIELD
                    ]
                  }
                  isConversion={isConversion}
                  isPreconvert={sendModal.data[SEND_MODAL_IS_PRECONVERT]}
                  advancedForm={sendModal.data[SEND_MODAL_ADVANCED_FORM]}
                  convertToField={sendModal.data[SEND_MODAL_CONVERTTO_FIELD]}
                  viaField={sendModal.data[SEND_MODAL_VIA_FIELD]}
                  handleFieldFocusVia={() =>
                    handleFieldFocus(SEND_MODAL_VIA_FIELD)
                  }
                  handleFieldFocusConvertTo={() =>
                    handleFieldFocus(SEND_MODAL_CONVERTTO_FIELD)
                  }
                  onViaChange={text =>
                    updateSendFormData(SEND_MODAL_VIA_FIELD, text)
                  }
                  onConvertToChange={text =>
                    updateSendFormData(SEND_MODAL_CONVERTTO_FIELD, text)
                  }
                  isVia={isVia}
                  showConversionField={showConversionField}
                  showViaField={showViaField}
                />
              ) : null}
              {showExportField && (
                <ExportFormModule
                  exporttoDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_EXPORTTO_FIELD
                    ]
                  }
                  mappingDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_MAPPING_FIELD
                    ]
                  }
                  isExport={isExport}
                  isConversion={isConversion}
                  exportToField={sendModal.data[SEND_MODAL_EXPORTTO_FIELD]}
                  handleNetworkFieldFocus={() =>
                    handleFieldFocus(SEND_MODAL_EXPORTTO_FIELD)
                  }
                  onSystemChange={text =>
                    updateSendFormData(SEND_MODAL_EXPORTTO_FIELD, text)
                  }
                  localNetworkName={localNetworkName}
                  advancedForm={sendModal.data[SEND_MODAL_ADVANCED_FORM]}
                  isPreconvert={sendModal.data[SEND_MODAL_IS_PRECONVERT]}
                  showMappingField={sendModal.data[SEND_MODAL_SHOW_MAPPING_FIELD]}
                  mappingField={sendModal.data[SEND_MODAL_MAPPING_FIELD]}
                  handleMappingFieldFocus={() =>
                    handleFieldFocus(SEND_MODAL_MAPPING_FIELD)
                  }
                  onMappingChange={text =>
                    updateSendFormData(SEND_MODAL_MAPPING_FIELD, text)
                  }
                />
              )}
              {(sendModal.data[SEND_MODAL_IS_PRECONVERT] ||
                sendModal.data[SEND_MODAL_ADVANCED_FORM]) &&
                sendModal.data[SEND_MODAL_SHOW_IS_PRECONVERT] && (
                  <React.Fragment>
                    <View style={{...Styles.wideBlockDense}}>
                      <Divider />
                    </View>
                    <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
                      <Checkbox.Item
                        color={Colors.primaryColor}
                        disabled={
                          sendModal.data[SEND_MODAL_ADVANCED_FORM] ? false : true
                        }
                        label={'Send as preconvert'}
                        status={
                          sendModal.data[SEND_MODAL_IS_PRECONVERT]
                            ? 'checked'
                            : 'unchecked'
                        }
                        onPress={
                          sendModal.data[SEND_MODAL_ADVANCED_FORM]
                            ? () =>
                                updateSendFormData(
                                  SEND_MODAL_IS_PRECONVERT,
                                  !sendModal.data[SEND_MODAL_IS_PRECONVERT],
                                )
                            : undefined
                        }
                        mode="android"
                      />
                    </View>
                  </React.Fragment>
                )}
            </KeyboardAwareScrollView>
          </Animated.View>
        )}
        <Button
          onPress={searchMode ? handleDoneSearching : submitData}
          mode="contained"
          loading={loadingSuggestions}
          disabled={loadingSuggestions || (!searchMode && localBalances == null)}
          style={{width: 100, alignSelf: 'center'}}>
          {searchMode ? 'Done' : isBurnChangePrice ? 'Review burn' : 'Send'}
        </Button>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ConvertOrCrossChainSendForm;
