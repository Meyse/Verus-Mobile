import roots from './roots.styles';
import buttons from './buttons.styles';
import text from './text.styles';
import containers from './containers.styles';
import {StyleSheet} from 'react-native';
import misc from './misc.styles';
import tables from './tables.styles';

const Styles = StyleSheet.create({
  ...roots,
  ...buttons,
  ...text,
  ...containers,
  ...misc,
  ...tables,
});

export {default as appButtonStyles} from './components/appButton.styles';
export {default as appEncryptionRequestInfoStyles} from './deeplink/appEncryptionRequestInfo.styles';
export {default as appSearchStyles} from './components/appSearch.styles';
export {default as appTextInputStyles} from './components/appTextInput.styles';
export {default as authenticationRequestInfoStyles} from './deeplink/authenticationRequestInfo.styles';
export {default as authorityInfoSheetStyles} from './deeplink/authorityInfoSheet.styles';
export {default as confirmPayStepStyles} from './deeplink/confirmPayStep.styles';
export {default as copyActionStyles} from './components/copyAction.styles';
export {default as dataRequestInfoStyles} from './deeplink/dataRequestInfo.styles';
export {default as deepLinkRequestReviewStyles} from './components/deepLinkRequestReview.styles';
export {default as genericRequestCompleteStyles} from './deeplink/genericRequestComplete.styles';
export {default as gradientButtonStyles} from './components/gradientButton.styles';
export {default as highRiskStepStyles} from './deeplink/highRiskStep.styles';
export {default as identityPickerSheetStyles} from './deeplink/identityPickerSheet.styles';
export {default as identityUpdateRequestInfoStyles} from './deeplink/identityUpdateRequestInfo.styles';
export {default as invoiceInfoStyles} from './deeplink/invoiceInfo.styles';
export {default as listSelectionModalStyles} from './components/listSelectionModal.styles';
export {default as reviewStepStyles} from './deeplink/reviewStep.styles';
export {default as revokeRecoverFlowStyles} from './components/revokeRecoverFlow.styles';
export {default as spendableKeyRequestInfoStyles} from './deeplink/spendableKeyRequestInfo.styles';
export {default as signedOutFlowStyles} from './components/signedOutFlow.styles';
export {default as signedOutSheetStyles} from './components/signedOutSheet.styles';
export {default as createSignedInStyles} from './components/signedIn.styles';
export {default as skeletonLoaderStyles} from './components/skeletonLoader.styles';
export {createSignedOutFlowStyles} from './components/signedOutFlow.styles';
export {createSignedOutSheetStyles} from './components/signedOutSheet.styles';
export {default as vdxfUniValueModalInnerAreaStyles} from './components/vdxfUniValueModalInnerArea.styles';
export {default as verusIdObjectDataStyles} from './components/verusIdObjectData.styles';

export {createSelectionSheetStyles} from './components/selectionSheet.styles';

export default Styles;
